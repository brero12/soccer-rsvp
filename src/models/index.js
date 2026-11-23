const mongoose = require("mongoose");
const { Schema, Types } = mongoose;

const Community = mongoose.model("Community", new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  timezone: { type: String, default: "America/Vancouver" },
  joinCode: { type: String, required: true },
  defaultMaxWaitlist: { type: Number, default: 6 },
  noShowBlockGames: { type: Number, default: 2 },
}, { timestamps: true }));

const Player = mongoose.model("Player", new Schema({
  phone: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  nickName: String,
  position: String,
  age: Number,
  photoUrl: String,
  email: { type: String, lowercase: true, sparse: true, unique: true },
  firebaseUid: { type: String, sparse: true, unique: true },
  pinHash: { type: String, select: false },
  passwordHash: { type: String, select: false },
  claimed: { type: Boolean, default: false },
  failedAttempts: { type: Number, default: 0 },
  lockUntil: Date,
  consent: { acceptedAt: Date, version: String },
}, { timestamps: true }));

const Membership = mongoose.model("Membership", new Schema({
  communityId: { type: Types.ObjectId, ref: "Community", required: true },
  playerId: { type: Types.ObjectId, ref: "Player", required: true },
  role: { type: String, enum: ["guest", "player", "admin"], default: "player" },
  blockedGamesRemaining: { type: Number, default: 0 },
  noShowCount: { type: Number, default: 0 },
}, { timestamps: true }).index({ communityId: 1, playerId: 1 }, { unique: true }));

const Game = mongoose.model("Game", new Schema({
  communityId: { type: Types.ObjectId, ref: "Community", required: true, index: true },
  title: { type: String, required: true },
  description: String,
  startsAt: { type: Date, required: true },
  endsAt: { type: Date, required: true },
  locationName: String,
  locationUrl: String,
  maxPlayers: { type: Number, required: true, min: 1 },
  maxWaitlist: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ["draft", "open", "closed", "disabled"], default: "draft" },
  signupSeq: { type: Number, default: 0 },
  teamCount: { type: Number, enum: [2, 3], default: 2 },
  playersPerTeam: { type: Number, min: 1, default: 9 },
  createdBy: { type: Types.ObjectId, ref: "Player" },
}, { timestamps: true }));

const signupSchema = new Schema({
  gameId: { type: Types.ObjectId, ref: "Game", required: true },
  communityId: { type: Types.ObjectId, required: true },
  ownerPlayerId: { type: Types.ObjectId, ref: "Player", required: true },
  playerId: { type: Types.ObjectId, ref: "Player" },     // absent for name-only companions
  displayName: { type: String, required: true },
  isCompanion: { type: Boolean, default: false },
  status: { type: String, enum: ["confirmed", "waitlist", "cancelled"], required: true },
  seq: { type: Number, required: true },                  // FIFO order
  attendance: { type: String, enum: ["unknown", "attended", "no_show"], default: "unknown" },
  addedByAdmin: { type: Boolean, default: false },
  cancelledAt: Date,
  cancelledBy: { type: Types.ObjectId, ref: "Player" },   // audit trail
}, { timestamps: true });
signupSchema.index({ gameId: 1, status: 1, seq: 1 });
// A player can only have ONE active signup per game (DB-level guarantee)
signupSchema.index({ gameId: 1, playerId: 1 }, {
  unique: true,
  partialFilterExpression: { playerId: { $exists: true }, status: { $in: ["confirmed", "waitlist"] } },
});
const Signup = mongoose.model("Signup", signupSchema);

const Team = mongoose.model("Team", new Schema({
  gameId: { type: Types.ObjectId, required: true, index: true },
  name: { type: String, enum: ["red", "blue", "white"], required: true },
  slots: [{ _id: false, signupId: { type: Types.ObjectId, default: null } }],
}));

module.exports = { Community, Player, Membership, Game, Signup, Team };