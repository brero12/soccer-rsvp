const mongoose = require("mongoose");
const { Game, Signup, Team, Player, Membership } = require("../models");
const { HttpError } = require("../utils/http");

const MAX_COMPANIONS = 3;

async function joinGame({ gameId, actor, companions = [] }) {
  if (companions.length > MAX_COMPANIONS) throw new HttpError(400, `Max ${MAX_COMPANIONS} companions`);

  const session = await mongoose.startSession();
  let created;
  try {
    await session.withTransaction(async () => {
      const probe = await Game.findById(gameId).session(session);
      if (!probe || probe.status !== "open") throw new HttpError(409, "This list is not open");
      if (probe.startsAt < new Date()) throw new HttpError(409, "This game is finishedd");

      const membership = await Membership.findOne({ communityId: probe.communityId, playerId: actor._id }).session(session);
      if (!membership) throw new HttpError(403, "Not a member of this community");
      if (membership.blockedGamesRemaining > 0)
        throw new HttpError(403, `You are blocked for ${membership.blockedGamesRemaining} more game(s)`);
      if (membership.role === "guest" && companions.length)
        throw new HttpError(403, "Guests can only sign up themselves");

      // Resolve people: actor first, then companions (create unclaimed accounts for those with phone)
      const people = [{ name: actor.nickName || actor.name, playerId: actor._id, isCompanion: false }];
      for (const c of companions) {
        let playerId;
        if (c.phone) {
          const p = await Player.findOneAndUpdate(
            { phone: c.phone },
            { $setOnInsert: { phone: c.phone, name: c.name, claimed: false } },
            { upsert: true, new: true, session }
          );
          playerId = p._id;
          await Membership.updateOne(
            { communityId: probe.communityId, playerId },
            { $setOnInsert: { role: "player" } },
            { upsert: true, session }
          );
        }
        people.push({ name: c.name, playerId, isCompanion: true });
      }

      // Bumping the counter also serialises concurrent joins on this game (write conflict => retry).
      const game = await Game.findOneAndUpdate(
        { _id: gameId, status: "open" },
        { $inc: { signupSeq: people.length } },
        { new: true, session }
      );

      let confirmed = await Signup.countDocuments({ gameId, status: "confirmed" }).session(session);
      let waiting = await Signup.countDocuments({ gameId, status: "waitlist" }).session(session);

      const docs = people.map((p, i) => {
        let status;
        if (confirmed < game.maxPlayers) { status = "confirmed"; confirmed++; }
        else if (waiting < game.maxWaitlist) { status = "waitlist"; waiting++; }
        else throw new HttpError(409, "The list and waitlist are full");
        return {
          gameId, communityId: game.communityId, ownerPlayerId: actor._id,
          playerId: p.playerId, displayName: p.name, isCompanion: p.isCompanion,
          status, seq: game.signupSeq - people.length + i + 1,
        };
      });

      try {
        created = await Signup.insertMany(docs, { session });
      } catch (e) {
        if (e.code === 11000) throw new HttpError(409, "One of these players is already on the list");
        throw e;
      }
    });
  } finally {
    session.endSession();
  }
  return created;
}

// Promote waitlisted players while there is room (used after cancel and after maxPlayers increases)
async function promoteWaitlist(gameId, session, vacatedSignupId = null) {
  const game = await Game.findById(gameId).session(session);
  let confirmed = await Signup.countDocuments({ gameId, status: "confirmed" }).session(session);
  let first = true;
  while (confirmed < game.maxPlayers) {
    const next = await Signup.findOneAndUpdate(
      { gameId, status: "waitlist" },
      { $set: { status: "confirmed" } },
      { sort: { seq: 1 }, new: true, session }
    );
    if (!next) break;
    confirmed++;
    // The first promoted player takes the team slot the dropped player left
    if (first && vacatedSignupId) {
      await Team.updateOne(
        { gameId, "slots.signupId": vacatedSignupId },
        { $set: { "slots.$.signupId": next._id } },
        { session }
      );
    }
    first = false;
  }
  // If nobody could fill the slot, it stays vacated (null) for the admin
  if (vacatedSignupId) {
    await Team.updateOne(
      { gameId, "slots.signupId": vacatedSignupId },
      { $set: { "slots.$.signupId": null } },
      { session }
    );
  }
}

async function cancelSignup({ signupId, actor, isAdmin, withCompanions = false }) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const target = await Signup.findById(signupId).session(session);
      if (!target) throw new HttpError(404, "Signup not found");
      const game = await Game.findById(target.gameId).session(session);
      if (!isAdmin && game.endsAt < new Date()) throw new HttpError(409, "This game is finished");

      const allowed = isAdmin
        || String(target.ownerPlayerId) === String(actor._id)
        || (target.playerId && String(target.playerId) === String(actor._id));
      if (!allowed) throw new HttpError(403, "You cannot drop this player");

      let ids = [target._id];
      if (withCompanions && String(target.ownerPlayerId) === String(actor._id)) {
        const group = await Signup.find({
          gameId: target.gameId, ownerPlayerId: target.ownerPlayerId,
          status: { $ne: "cancelled" },
        }).session(session);
        ids = group.map((s) => s._id);
      }

      for (const id of ids) {
        const s = await Signup.findOneAndUpdate(
          { _id: id, status: { $in: ["confirmed", "waitlist"] } },
          { $set: { status: "cancelled", cancelledAt: new Date(), cancelledBy: actor._id } },
          { new: false, session }
        ); // returns the doc as it was BEFORE the update
        if (s && s.status === "confirmed") await promoteWaitlist(s.gameId, session, s._id);
      }
    });
  } finally {
    session.endSession();
  }
}

module.exports = { joinGame, cancelSignup, promoteWaitlist };