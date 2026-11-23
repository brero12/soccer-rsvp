import { Link } from "react-router-dom";

function Hero() {
  return (
    <svg viewBox="0 0 400 240" className="w-full rounded-2xl shadow-lg" role="img"
      aria-label="Soccer pitch with a ball">
      <rect width="400" height="240" fill="#15803d" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={i * 80} width="40" height="240" fill="#16a34a" />
      ))}
      <g fill="none" stroke="#fff" strokeWidth="3" opacity="0.9">
        <rect x="16" y="16" width="368" height="208" />
        <line x1="200" y1="16" x2="200" y2="224" />
        <circle cx="200" cy="120" r="36" />
        <rect x="16" y="68" width="56" height="104" />
        <rect x="328" y="68" width="56" height="104" />
      </g>
      <circle cx="200" cy="120" r="4" fill="#fff" />
      {/* ball */}
      <g transform="translate(262 150)">
        <ellipse cx="0" cy="26" rx="20" ry="5" fill="#000" opacity="0.25" />
        <circle r="22" fill="#fff" stroke="#111" strokeWidth="2" />
        <polygon points="0,-9 9,-3 5,8 -5,8 -9,-3" fill="#111" />
        <g stroke="#111" strokeWidth="2">
          <line x1="0" y1="-9" x2="0" y2="-21" />
          <line x1="9" y1="-3" x2="20" y2="-7" />
          <line x1="5" y1="8" x2="12" y2="18" />
          <line x1="-5" y1="8" x2="-12" y2="18" />
          <line x1="-9" y1="-3" x2="-20" y2="-7" />
        </g>
      </g>
    </svg>
  );
}

const STEPS = [
  ["📲", "Open the game link", "Find it in your WhatsApp group."],
  ["✍️", "Sign up in seconds", "Phone, name and a PIN. That's it."],
  ["✅", "Tap “I'm in”", "Bring up to 3 friends. Drop out any time."],
];

export default function Landing() {
  return (
    <main className="mx-auto max-w-lg space-y-8 p-5">
      <header className="space-y-2 pt-4 text-center">
        <h1 className="text-3xl font-extrabold">⚽ Soccer RSVP</h1>
        <p className="text-slate-600">
          Reserve your spot for the weekly pickup game. No more counting names in the group chat.
        </p>
      </header>

      <Hero />

      <section className="rounded-xl bg-white p-4 shadow">
        <h2 className="mb-3 font-semibold">How it works</h2>
        <ol className="space-y-3">
          {STEPS.map(([icon, title, text]) => (
            <li key={title} className="flex gap-3">
              <span className="text-2xl">{icon}</span>
              <div><p className="font-medium">{title}</p><p className="text-sm text-slate-500">{text}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid grid-cols-2 gap-3 text-center text-sm">
        <div className="rounded-xl bg-white p-3 shadow">🕐<p className="font-medium">Waitlist</p>
          <p className="text-slate-500">If someone drops, the next in line moves up automatically.</p></div>
        <div className="rounded-xl bg-white p-3 shadow">👥<p className="font-medium">Bring friends</p>
          <p className="text-slate-500">Add up to 3 players when you sign up.</p></div>
      </section>

      <p className="rounded-lg bg-green-50 p-3 text-center text-sm text-green-900">
        To join a game, open the link your organizer shared in the WhatsApp group.
      </p>

      <footer className="pb-6 text-center text-xs text-slate-400">
        <Link to="/admin" className="underline">Organizer login</Link>
      </footer>
    </main>
  );
}