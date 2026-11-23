const router = require("express").Router();
const mongoose = require("mongoose");
const { DateTime } = require("luxon");
const { Game, Signup, Membership, Community } = require("../models");
const { HttpError, wrap } = require("../utils/http");
const { requirePlayer, assertAdmin } = require("../middleware/auth");
const { promoteWaitlist } = require("../services/games");
const { gameState } = require("../utils/gameState");

router.use(requirePlayer);

// "2026-11-22T09:45" typed by the admin = wall-clock time in the COMMUNITY's zone
const parseLocal = (str, tz) => {
  const dt = DateTime.fromISO(String(str), { zone: tz });
  if (!dt.isValid) throw new HttpError(400, "Invalid date or time");
  return dt.toUTC().toJSDate();
};
const toLocal = (d, tz) => DateTime.fromJSDate(d, { zone: tz }).toFormat("yyyy-LL-dd'T'HH:mm");

function buildGameData(body, tz) {
  const out = {};
  for (const k of ["title", "description", "locationName", "locationUrl"]) if (k in body) out[k] = body[k];
  if ("maxWaitlist" in body) out.maxWaitlist = Math.max(0, parseInt(body.maxWaitlist, 10) || 0);
  if ("startsAt" in body) out.startsAt = parseLocal(body.startsAt, tz);
  if ("endsAt" in body) out.endsAt = parseLocal(body.endsAt, tz);
  if ("teamCount" in body) {
    out.teamCount = Number(body.teamCount);
    if (![2, 3].includes(out.teamCount)) throw new HttpError(400, "Teams must be 2 or 3");
  }
  if ("playersPerTeam" in body) {
    out.playersPerTeam = Number(body.playersPerTeam);
    if (!Number.isInteger(out.playersPerTeam) || out.playersPerTeam < 1 || out.playersPerTeam > 30)
      throw new HttpError(400, "Players per team must be between 1 and 30");
  }
  return out;
}

function toAdminGame(g, tz, counts = {}) {
  return {
    ...g.toObject(),
    state: gameState(g),
    startsAtLocal: toLocal(g.startsAt, tz),
    endsAtLocal: toLocal(g.endsAt, tz),
    confirmed: counts.confirmed || 0,
    waiting: counts.waitlist || 0,
  };
}

router.get("/communities", wrap(async (req, res) => {
  if (req.lvl !== "strong") throw new HttpError(403, "Admin only");
  const ms = await Membership.find({ playerId: req.player._id, role: "admin" }).populate("communityId");
  res.json(ms.map((m) => ({
    id: m.communityId.id, name: m.communityId.name, slug: m.communityId.slug,
    joinCode: m.communityId.joinCode, timezone: m.communityId.timezone,
  })));
}));

router.post("/games", wrap(async (req, res) => {
  const { communityId } = req.body;
  await assertAdmin(req, communityId);
  const community = await Community.findById(communityId);
  const data = buildGameData(req.body, community.timezone);
  if (!data.startsAt || !data.endsAt) throw new HttpError(400, "Start and end time are required");
  if (data.endsAt <= data.startsAt) throw new HttpError(400, "End time must be after start time");
  data.maxPlayers = (data.teamCount ?? 2) * (data.playersPerTeam ?? 9);
  const game = await Game.create({
    ...data, communityId, createdBy: req.player._id,
    status: req.body.publish ? "open" : "draft",
  });
  res.status(201).json(toAdminGame(game, community.timezone));
}));

router.get("/games", wrap(async (req, res) => {
  const { communityId } = req.query;
  await assertAdmin(req, communityId);
  const community = await Community.findById(communityId);
  const [games, counts] = await Promise.all([
    Game.find({ communityId }).sort({ startsAt: -1 }),
    Signup.aggregate([
      { $match: { communityId: new mongoose.Types.ObjectId(communityId), status: { $in: ["confirmed", "waitlist"] } } },
      { $group: { _id: { g: "$gameId", s: "$status" }, n: { $sum: 1 } } },
    ]),
  ]);
  const by = {};
  for (const c of counts) (by[c._id.g] ||= {})[c._id.s] = c.n;
  res.json(games.map((g) => toAdminGame(g, community.timezone, by[g._id] || {})));
}));

router.get("/games/:id", wrap(async (req, res) => {
  const game = await Game.findById(req.params.id).catch(() => null);
  if (!game) throw new HttpError(404, "Not found");
  await assertAdmin(req, game.communityId);
  const community = await Community.findById(game.communityId);
  res.json(toAdminGame(game, community.timezone));
}));

router.patch("/games/:id", wrap(async (req, res) => {
  const game = await Game.findById(req.params.id).catch(() => null);
  if (!game) throw new HttpError(404, "Not found");
  await assertAdmin(req, game.communityId);
  const community = await Community.findById(game.communityId);

  Object.assign(game, buildGameData(req.body, community.timezone));
  if ("teamCount" in req.body || "playersPerTeam" in req.body)
    game.maxPlayers = game.teamCount * game.playersPerTeam;
  if (game.endsAt <= game.startsAt) throw new HttpError(400, "End time must be after start time");
  if (["draft", "open", "closed"].includes(req.body.status)) game.status = req.body.status;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const confirmed = await Signup.countDocuments({ gameId: game._id, status: "confirmed" }).session(session);
      if (confirmed > game.maxPlayers)
        throw new HttpError(409, `${confirmed} players are already confirmed but this setup has ${game.maxPlayers} slots. Remove ${confirmed - game.maxPlayers} player(s) first.`);
      await game.save({ session });
      await promoteWaitlist(game._id, session); // slots increased: waitlist moves up (FIFO)
    });
  } finally { session.endSession(); }
  res.json(toAdminGame(game, community.timezone));
}));

router.post("/games/:id/disable", wrap(async (req, res) => {
  const game = await Game.findById(req.params.id).catch(() => null);
  if (!game) throw new HttpError(404, "Not found");
  await assertAdmin(req, game.communityId);
  game.status = "disabled"; await game.save();
  res.json({ ok: true });
}));

// Admin adds players by name (they count toward the slots)
router.post("/games/:id/players", wrap(async (req, res) => {
  const game = await Game.findById(req.params.id).catch(() => null);
  if (!game) throw new HttpError(404, "Not found");
  await assertAdmin(req, game.communityId);
  const names = (req.body.names || []).map((n) => String(n).trim()).filter(Boolean);

  const session = await mongoose.startSession();
  let created;
  try {
    await session.withTransaction(async () => {
      const g = await Game.findByIdAndUpdate(game._id, { $inc: { signupSeq: names.length } }, { new: true, session });
      let confirmed = await Signup.countDocuments({ gameId: g._id, status: "confirmed" }).session(session);
      let waiting = await Signup.countDocuments({ gameId: g._id, status: "waitlist" }).session(session);
      const docs = names.map((name, i) => {
        let status;
        if (confirmed < g.maxPlayers) { status = "confirmed"; confirmed++; }
        else if (waiting < g.maxWaitlist) { status = "waitlist"; waiting++; }
        else throw new HttpError(409, "List is full");
        return {
          gameId: g._id, communityId: g.communityId, ownerPlayerId: req.player._id,
          displayName: name, status, addedByAdmin: true, seq: g.signupSeq - names.length + i + 1,
        };
      });
      created = await Signup.insertMany(docs, { session });
    });
  } finally { session.endSession(); }
  res.status(201).json(created);
}));

module.exports = router;