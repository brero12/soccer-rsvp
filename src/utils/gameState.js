function gameState(game, now = new Date()) {
  if (game.status === "disabled") return "disabled";
  if (game.status === "draft") return "draft";
  if (game.endsAt < now) return "finished";
  return game.status === "closed" ? "closed" : "open";
}
module.exports = { gameState };