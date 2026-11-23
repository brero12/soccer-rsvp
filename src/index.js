require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const { gameState } = require("./utils/gameState");
const cookieParser = require("cookie-parser");
const { loadSession } = require("./middleware/auth");

const app = express();
app.set("trust proxy", 1); // Render sits behind a proxy (needed for secure cookies and rate limits)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "https://apis.google.com"],
      "frame-src": ["'self'", "https://accounts.google.com", "https://*.firebaseapp.com"],
      "connect-src": [
        "'self'",
        "https://identitytoolkit.googleapis.com",
        "https://securetoken.googleapis.com",
        "https://www.googleapis.com",
      ],
      "img-src": ["'self'", "data:", "https://*.googleusercontent.com"],
    },
  },
  // Helmet's default blocks the Google popup from talking back to your page
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
}));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use(loadSession);

const path = require("path");
const fs = require("fs");
const { Game, Signup, Community } = require("./models");

app.get("/health", (_req, res) => res.send("ok"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api", require("./routes/games"));

// ---- Frontend + link preview ----
const dist = path.join(__dirname, "../client/dist");
app.use(express.static(dist, { index: false }));

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const indexHtml = () => fs.readFileSync(path.join(dist, "index.html"), "utf8");

// WhatsApp reads these tags when the link is pasted into the group
app.get("/c/:slug/g/:gameId", async (req, res, next) => {
  try {
    const game = await Game.findById(req.params.gameId).catch(() => null);
    const community = game && await Community.findById(game.communityId);
    if (!game || !community || game.status === "disabled" || game.status === "draft")
      return res.send(indexHtml());
    const taken = await Signup.countDocuments({ gameId: game._id, status: "confirmed" });
    const when = new Intl.DateTimeFormat("en-CA", {
      timeZone: community.timezone, weekday: "long", month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit",
    }).format(game.startsAt);
    const left = Math.max(game.maxPlayers - taken, 0);
    const desc = gameState(game) === "finished"
  ? `${when} @ ${game.locationName || "TBA"} | Finished`
  : `${when} @ ${game.locationName || "TBA"} | ${left ? `${left} spots left` : "Full, join the waitlist"}`;const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    const tags = `<title>${esc(game.title)}</title>
<meta property="og:type" content="website">
<meta property="og:title" content="⚽ ${esc(game.title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">`;
    res.send(indexHtml().replace("<!--OG-->", tags));
  } catch (e) { next(e); }
});

// SPA fallback for every other non-API GET (works on Express 4 and 5)
app.use((req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api")) return next();
  res.send(indexHtml());
});

app.use((err, _req, res, _next) => {
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : "Server error" });
});

const PORT = process.env.PORT || 3000;
mongoose.connect(process.env.MONGODB_URI)
  .then(() => app.listen(PORT, () => console.log(`Listening on ${PORT}`)))
  .catch((e) => { console.error(e); process.exit(1); });