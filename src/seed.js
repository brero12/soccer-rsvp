require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { Community, Player, Membership } = require("./models");
const { normalizePhone } = require("./utils/http");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const community = await Community.findOneAndUpdate(
    { slug: "Moody-Aliens" },
    { $setOnInsert: { name: "Moody Aliens", slug: "moody-aliens", joinCode: "TEST-FC" } },
    { upsert: true, new: true }
  );
  const phone = normalizePhone(process.env.ADMIN_PHONE);
  const player = await Player.findOneAndUpdate(
    { phone },
    { $set: { name: "Admin", claimed: true, email: process.env.ADMIN_EMAIL.toLowerCase(),
          passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 10) } },
    { upsert: true, new: true }
  );
  await Membership.updateOne(
    { communityId: community._id, playerId: player._id },
    { $set: { role: "admin" } }, { upsert: true }
  );
  console.log("Seeded. Community id:", community.id);
  process.exit(0);
})();