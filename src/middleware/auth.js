const jwt = require("jsonwebtoken");
const { Player, Membership } = require("../models");
const { HttpError } = require("../utils/http");

const prod = process.env.NODE_ENV === "production";

// lvl: "basic" (PIN) or "strong" (password / Google)
function startSession(res, playerId, lvl) {
  const token = jwt.sign({ sub: String(playerId), lvl }, process.env.JWT_SECRET, { expiresIn: "180d" });
  res.cookie("sid", token, {
    httpOnly: true, secure: prod, sameSite: "lax", maxAge: 180 * 24 * 3600 * 1000,
  });
}

async function loadSession(req, _res, next) {
  try {
    const token = req.cookies.sid;
    if (token) {
      const { sub, lvl } = jwt.verify(token, process.env.JWT_SECRET);
      req.player = await Player.findById(sub);
      req.lvl = lvl;
    }
  } catch { /* invalid/expired token: treat as logged out */ }
  next();
}

const requirePlayer = (req, _res, next) =>
  req.player ? next() : next(new HttpError(401, "Please sign in"));

// Returns true if the player is an admin of the community AND logged in strongly
async function isAdmin(req, communityId) {
  if (!req.player || req.lvl !== "strong") return false;
  const m = await Membership.findOne({ communityId, playerId: req.player._id, role: "admin" });
  return !!m;
}

async function assertAdmin(req, communityId) {
  if (!(await isAdmin(req, communityId))) throw new HttpError(403, "Admin only");
}

module.exports = { startSession, loadSession, requirePlayer, isAdmin, assertAdmin };