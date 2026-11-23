const fmt = (d, tz, opts) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, ...opts }).format(d);

function buildWhatsAppText({ game, community, confirmed, waitlist, url }) {
  const tz = community.timezone;
  const day = fmt(game.startsAt, tz, { weekday: "long", month: "short", day: "numeric" });
  const start = fmt(game.startsAt, tz, { hour: "numeric", minute: "2-digit" });
  const end = fmt(game.endsAt, tz, { hour: "numeric", minute: "2-digit" });

  const lines = [];
  if (game.description) lines.push(game.description, "");
  lines.push(`Time: ${day}, ${start} - ${end}`);
  lines.push("Please RSVP for a spot", "");
  if (game.locationName) lines.push(`Location: ${game.locationName}${game.locationUrl ? ` (${game.locationUrl})` : ""}`, "");
  lines.push(`Spots: ${confirmed.length}/${game.maxPlayers}`, "");
  confirmed.forEach((s, i) => lines.push(`${i + 1}. ${s.displayName}`));
  if (waitlist.length) {
    lines.push("", "Waitlist:");
    waitlist.forEach((s, i) => lines.push(`W${i + 1}. ${s.displayName}`));
  }
  lines.push("", `RSVP here: ${url}`);
  return lines.join("\n");
}

module.exports = { buildWhatsAppText };