# ⚽ Soccer RSVP

A mobile-first web app that replaces the manual RSVP lists posted in WhatsApp groups for weekly pickup soccer games. Players sign up in one tap from a shared link, and admins manage the games from a dashboard.

**Live demo:** [Soccer RSVP Demo Landing](https://soccer-rsvp.onrender.com/) · **Admin demo:** [Soccer RSVP Demo Admin](https://soccer-rsvp.onrender.com/admin) phone: +11234567890 pass: Test.2026

![Screenshot](docs/screenshot-game.png)

## The problem

Organizing a weekly game through a WhatsApp group means copying a numbered list, editing it by hand, and chasing people who drop out. This app keeps one source of truth, handles the waitlist automatically, and still outputs the list in the same text format the group already uses, ready to paste.

## Features

**Players**
- Sign up with phone, name and a PIN. Nickname and position are optional.
- Join a game with up to 3 companions. Guests can only sign up themselves.
- Drop yourself, or your whole group, at any time.
- Waitlist with automatic **FIFO promotion** when someone drops.
- Accept data-use consent at sign-up (stored with timestamp and version).

**Admins**
- Create, edit, publish and disable game lists (date, time, location, slots, waitlist size).
- Choose the team setup per game (2 or 3 teams, players per team). Slots are calculated from it and stay editable.
- Home view for the next game, plus a filterable list of upcoming, finished and disabled games.
- One-click **"Copy WhatsApp text"** and a share link with a rich link preview.
- Multi-community data model with multiple admins per community.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React, Vite, React Router, Tailwind CSS |
| Backend | Node.js, Express, Mongoose |
| Database | MongoDB Atlas |
| Auth | Phone + PIN for players; Firebase Auth (Google, email/password) and phone + password for admins; JWT in httpOnly cookies |
| Hosting | Render (single web service serving API and built frontend) |

## Technical highlights

- **Race-safe sign-ups.** When 20 people tap "join" at once, MongoDB transactions plus an atomic counter on the game document serialize the requests, so the last spot can never be given twice. Drop, waitlist promotion and slot refill happen in one transaction.
- **Database-level guarantees.** A partial unique index prevents the same player from being active twice on a game, even if the application logic had a bug.
- **Layered auth without SMS.** Players use a hashed PIN with rate limiting and lockout after repeated failures. Admin actions require a "strong" session (password or Google), so a PIN session can never perform them.
- **Time zones done right.** Dates are stored in UTC, and wall-clock input is converted using the community's time zone (Luxon). This fixed an off-by-one-hour bug between the browser and server.
- **Derived game state.** "Finished" is calculated from the end time instead of a scheduled job, which keeps the app correct on hosts that sleep.
- **WhatsApp link previews.** The server injects per-game Open Graph tags (title, date, spots left) into the SPA's HTML, so shared links render as rich cards.
- **Privacy by default.** Public endpoints expose display names only, never phone numbers.

## Project structure

```text
src/                Express API
  models/           Mongoose schemas (Community, Player, Membership, Game, Signup, Team)
  services/         Join, drop and waitlist logic (transactions), WhatsApp text builder
  routes/           auth, player-facing games, admin
  middleware/       Session and role checks
client/             React app (player page + admin dashboard)
```

## Run locally

Requires Node 20+ and a MongoDB Atlas cluster (transactions need a replica set).

```bash
git clone https://github.com/brero12/soccer-rsvp.git
cd soccer-rsvp
cp .env.example .env        # fill in MongoDB, JWT secret, Firebase service account, admin seed values
npm install
npm run seed                # creates the first community and admin
npm start                   # API on :3000

cd client
cp .env.example .env        # Firebase web config (VITE_FIREBASE_*)
npm install
npm run dev                 # app on :5173
```

## Deploy (Render)

Build command: `npm install && npm run build` · Start command: `npm start`.
Set the environment variables from `.env.example`, plus the `VITE_FIREBASE_*` values, which are needed at build time.

## Roadmap

- [ ] Team builder (red / blue / white) with automatic slot refill when a player drops
- [ ] Attendance tracking and temporary sign-up blocks for no-shows
- [ ] Admin tools: PIN reset, member management, promote to admin
- [ ] Stats dashboard (players, games, fill rate, no-show rate)
- [ ] Profile photos, installable PWA, push notifications for waitlist promotion

## Author

**brero12** · [Bryan Rodriguez Linkedin](https://www.linkedin.com/in/bryan-rodriguez-eng/)