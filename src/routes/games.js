const router = require("express").Router();
const { Game, Signup, Community } = require("../models");
const { HttpError, wrap, normalizePhone } = require("../utils/http");
const { requirePlayer, isAdmin } = require("../middleware/auth");
const { joinGame, cancelSignup } = require("../services/games");
const { buildWhatsAppText } = require("../services/whatsapp");
const { gameState } = require("../utils/gameState");

async function loadList(gameId) {
  const game = await Game.findById(gameId).catch(() => null);
  if (!game || ["draft", "disabled"].includes(game.status)) throw new HttpError(404, "Game not found");
  const community = await Community.findById(game.communityId);
  const signups = await Signup.find({ gameId: game._id, status: { $ne: "cancelled" } }).sort({ seq: 1 }).lean();
  return {
    game, community, state: gameState(game),
    confirmed: signups.filter((s) => s.status === "confirmed"),
    waitlist: signups.filter((s) => s.status === "waitlist"),
  };
}

// Public: never expose phones here, only display names
router.get("/g/:gameId", wrap(async (req, res) => {
  const { game, community, state, confirmed, waitlist } = await loadList(req.params.gameId);
  const strip = (s) => ({ id: s._id, name: s.displayName, ownerId: s.ownerPlayerId,
                          playerId: s.playerId, isCompanion: s.isCompanion });
  res.json({ game, state, timezone: community.timezone,
             confirmed: confirmed.map(strip), waitlist: waitlist.map(strip) });
}));

router.get("/g/:gameId/text", wrap(async (req, res) => {
  const { game, community, confirmed, waitlist } = await loadList(req.params.gameId);
  const base = process.env.PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
  const url = `${base}/c/${community.slug}/g/${game.id}`;
  res.type("text/plain").send(buildWhatsAppText({ game, community, confirmed, waitlist, url }));
}));

router.post("/g/:gameId/join", requirePlayer, wrap(async (req, res) => {
  const companions = (req.body.companions || [])
    .map((c) => ({ name: String(c.name || "").trim(), phone: c.phone ? normalizePhone(c.phone) : null }))
    .filter((c) => c.name);
  const created = await joinGame({ gameId: req.params.gameId, actor: req.player, companions });
  res.status(201).json(created);
}));

router.delete("/signups/:id", requirePlayer, wrap(async (req, res) => {
  const s = await Signup.findById(req.params.id);
  if (!s) throw new HttpError(404, "Not found");
  await cancelSignup({
    signupId: s._id, actor: req.player,
    isAdmin: await isAdmin(req, s.communityId),
    withCompanions: req.query.group === "true",
  });
  res.sendStatus(204);
}));

module.exports = router;