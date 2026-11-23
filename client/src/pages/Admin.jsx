import { useEffect, useState } from "react";
import { signInWithPopup, signInWithEmailAndPassword } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { api } from "../api";

const input = "rounded-lg border border-slate-300 px-3 py-2 w-full";
const emptyForm = { title: "", description: "", startsAt: "", endsAt: "", locationName: "",
  locationUrl: "", maxPlayers: 18, maxWaitlist: 6, publish: true };

function Login({ onDone }) {
  const [f, setF] = useState({ phone: "", password: "", email: "" });
  const [err, setErr] = useState("");
  const run = (fn) => async () => { setErr(""); try { await fn(); onDone(); } catch (e) { setErr(e.message); } };
  const fb = async (cred) => api("/auth/firebase", { method: "POST", body: { idToken: await cred.user.getIdToken() } });

  return (
    <div className="mx-auto mt-10 max-w-sm space-y-3 rounded-xl bg-white p-4 shadow">
      <h1 className="text-lg font-bold">Admin sign in</h1>
      <button className="w-full rounded-lg border py-2"
        onClick={run(async () => fb(await signInWithPopup(auth, googleProvider)))}>Continue with Google</button>
      <hr />
      <input className={input} placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      <input className={input} placeholder="Phone (or leave empty if using email)" value={f.phone}
        onChange={(e) => setF({ ...f, phone: e.target.value })} />
      <input className={input} type="password" placeholder="Password" value={f.password}
        onChange={(e) => setF({ ...f, password: e.target.value })} />
      <div className="flex gap-2">
        <button className="flex-1 rounded-lg bg-green-600 py-2 text-white"
          onClick={run(async () => f.email
            ? fb(await signInWithEmailAndPassword(auth, f.email, f.password))
            : api("/auth/login-password", { method: "POST", body: { phone: f.phone, password: f.password } }))}>
          Sign in
        </button>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}

export default function Admin() {
  const [communities, setCommunities] = useState(null); // null = loading, [] = not logged in
  const [games, setGames] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [msg, setMsg] = useState("");

  const community = communities?.[0];
  const boot = () => api("/admin/communities").then(setCommunities).catch(() => setCommunities([]));
  const loadGames = () => community &&
    api(`/admin/games?communityId=${community.id}`).then(setGames);
  useEffect(() => { boot(); }, []);
  useEffect(() => { loadGames(); }, [community?.id]);

  if (communities === null) return <p className="p-6">Loading…</p>;
  if (!communities.length) return <Login onDone={boot} />;

  const link = (g) => `${location.origin}/c/${community.slug}/g/${g._id}`;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function create(e) {
    e.preventDefault();
    await api("/admin/games", { method: "POST", body: {
      ...form, communityId: community.id,
      startsAt: new Date(form.startsAt).toISOString(), endsAt: new Date(form.endsAt).toISOString(),
      maxPlayers: +form.maxPlayers, maxWaitlist: +form.maxWaitlist } });
    setForm(emptyForm); loadGames();
  }
  async function copyText(g) {
    const t = await (await fetch(`/api/g/${g._id}/text`)).text();
    await navigator.clipboard.writeText(t); setMsg("List copied. Paste it in WhatsApp.");
  }
  async function disable(g) {
    if (confirm(`Disable "${g.title}"?`)) { await api(`/admin/games/${g._id}/disable`, { method: "POST" }); loadGames(); }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4">
      <h1 className="text-xl font-bold">{community.name} · Admin</h1>
      <p className="text-sm text-slate-500">Group code to share: <b>{community.joinCode}</b></p>
      {msg && <p className="rounded bg-green-100 p-2 text-sm">{msg}</p>}

      <form onSubmit={create} className="grid grid-cols-2 gap-3 rounded-xl bg-white p-4 shadow">
        <h2 className="col-span-2 font-semibold">New convocation list</h2>
        <input className={`${input} col-span-2`} placeholder="Title" value={form.title} onChange={set("title")} required />
        <textarea className={`${input} col-span-2`} rows={3} placeholder="Description (e.g. bring a blue/red shirt)"
          value={form.description} onChange={set("description")} />
        <label className="text-sm">Start<input type="datetime-local" className={input} value={form.startsAt} onChange={set("startsAt")} required /></label>
        <label className="text-sm">End<input type="datetime-local" className={input} value={form.endsAt} onChange={set("endsAt")} required /></label>
        <input className={input} placeholder="Location name" value={form.locationName} onChange={set("locationName")} />
        <input className={input} placeholder="Google Maps link" value={form.locationUrl} onChange={set("locationUrl")} />
        <label className="text-sm">Main list slots<input type="number" min="1" className={input} value={form.maxPlayers} onChange={set("maxPlayers")} /></label>
        <label className="text-sm">Waitlist slots<input type="number" min="0" className={input} value={form.maxWaitlist} onChange={set("maxWaitlist")} /></label>
        <button className="col-span-2 rounded-lg bg-green-600 py-2 font-semibold text-white">Create and publish</button>
      </form>

      <section className="space-y-3">
        {games.map((g) => (
          <div key={g._id} className="rounded-xl bg-white p-4 shadow">
            <div className="flex justify-between">
              <b>{g.title}</b>
              <span className="text-sm text-slate-500">{g.status}</span>
            </div>
            <p className="text-sm">{new Date(g.startsAt).toLocaleString()} · {g.maxPlayers} slots + {g.maxWaitlist} waitlist</p>
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              <button onClick={() => copyText(g)} className="text-green-700">Copy WhatsApp text</button>
              <a className="text-green-700" target="_blank" rel="noreferrer"
                href={`https://wa.me/?text=${encodeURIComponent(link(g))}`}>Share link on WhatsApp</a>
              <a className="text-slate-600" href={link(g)} target="_blank" rel="noreferrer">Open</a>
              {g.status !== "disabled" && <button onClick={() => disable(g)} className="text-red-600">Disable</button>}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}