const router = require("express").Router();
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { Player, Membership, Community } = require("../models");
const { HttpError, wrap, normalizePhone } = require("../utils/http");
const { startSession, requirePlayer } = require("../middleware/auth");

const CONSENT_VERSION = "2026-11";
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30 });
router.use(limiter);

if (process.env.FIREBASE_SERVICE_ACCOUNT && !getApps().length) {
  initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
}

const publicPlayer = (p) => ({
  id: p.id, name: p.name, nickName: p.nickName, phone: p.phone,
  position: p.position, photoUrl: p.photoUrl,
});

// Register (or claim an unclaimed account created by a friend's signup)
router.post("/register", wrap(async (req, res) => {
  const { slug, joinCode, name, nickName, position, age, pin, consent, asGuest } = req.body;
  const phone = normalizePhone(req.body.phone);

  if (!consent) throw new HttpError(400, "You must accept the data use terms");
  if (!name || !name.trim()) throw new HttpError(400, "Name is required");
  if (!/^\d{4,6}$/.test(String(pin))) throw new HttpError(400, "PIN must be 4 to 6 digits");

  const community = await Community.findOne({ slug });
  if (!community || community.joinCode !== joinCode) throw new HttpError(403, "Wrong community code");

  let player = await Player.findOne({ phone });
  if (player && player.claimed) throw new HttpError(409, "This phone is already registered. Please sign in.");

  player = player || new Player({ phone });
  Object.assign(player, {
    name: name.trim(), nickName, position, age,
    pinHash: await bcrypt.hash(String(pin), 10),
    claimed: true,
    consent: { acceptedAt: new Date(), version: CONSENT_VERSION },
  });
  await player.save();

  await Membership.updateOne(
    { communityId: community._id, playerId: player._id },
    { $setOnInsert: { role: asGuest ? "guest" : "player" } },
    { upsert: true }
  );

  startSession(res, player._id, "basic");
  res.status(201).json(publicPlayer(player));
}));

// Sign in on a new device: phone + PIN
router.post("/login", wrap(async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const player = await Player.findOne({ phone }).select("+pinHash");
  if (!player || !player.pinHash) throw new HttpError(401, "Invalid phone or PIN");

  if (player.lockUntil && player.lockUntil > new Date())
    throw new HttpError(429, "Too many attempts. Try again in a few minutes.");

  const ok = await bcrypt.compare(String(req.body.pin || ""), player.pinHash);
  if (!ok) {
    player.failedAttempts += 1;
    if (player.failedAttempts >= 5) {
      player.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      player.failedAttempts = 0;
    }
    await player.save();
    throw new HttpError(401, "Invalid phone or PIN");
  }
  player.failedAttempts = 0; player.lockUntil = undefined;
  await player.save();

  startSession(res, player._id, "basic");
  res.json(publicPlayer(player));
}));

// Admin: phone + password (strong session)
router.post("/login-password", wrap(async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const player = await Player.findOne({ phone }).select("+passwordHash");
  const ok = player?.passwordHash && await bcrypt.compare(String(req.body.password || ""), player.passwordHash);
  if (!ok) throw new HttpError(401, "Invalid credentials");
  startSession(res, player._id, "strong");
  res.json(publicPlayer(player));
}));

// Admin: Firebase (email+password or Google). Client sends the Firebase ID token.
router.post("/firebase", wrap(async (req, res) => {
  const decoded = await getAuth().verifyIdToken(req.body.idToken);
  if (!decoded.email || decoded.email_verified === false)
    throw new HttpError(401, "Verified email required");

  // Players must already exist and be linked by uid or email (admins are pre-created).
  const player = await Player.findOne({ $or: [{ firebaseUid: decoded.uid }, { email: decoded.email }] });
  if (!player) throw new HttpError(403, "No account linked to this email. Ask a community admin.");
  if (!player.firebaseUid) { player.firebaseUid = decoded.uid; await player.save(); }

  startSession(res, player._id, "strong");
  res.json(publicPlayer(player));
}));

router.get("/me", requirePlayer, (req, res) => res.json(publicPlayer(req.player)));
router.post("/logout", (_req, res) => { res.clearCookie("sid"); res.sendStatus(204); });

module.exports = router;