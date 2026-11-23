import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import AuthForm from "../components/AuthForm";

export default function GamePage() {
  const { slug, gameId } = useParams();
  const [data, setData] = useState(null);
  const [me, setMe] = useState(null);
  const [companions, setCompanions] = useState([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => api(`/g/${gameId}`).then(setData).catch((e) => setErr(e.message));
  useEffect(() => {
    load();
    api("/auth/me").then(setMe).catch(() => {});
    const t = setInterval(load, 15000); // keep the list fresh
    return () => clearInterval(t);
  }, [gameId]);

  if (err && !data) return <p className="p-6">{err}</p>;
  if (!data) return <p className="p-6">Loading…</p>;

  const { game, state, timezone, confirmed, waitlist } = data;
  const fmt = (d, o) => new Intl.DateTimeFormat([], { timeZone: timezone, ...o }).format(new Date(d));
  const all = [...confirmed, ...waitlist];
  const mine = me ? all.filter((s) => s.ownerId === me.id || s.playerId === me.id) : [];
  const joined = me && all.some((s) => s.playerId === me.id);
  const when = `${fmt(game.startsAt, { dateStyle: "full", timeStyle: "short" })} – ${fmt(game.endsAt, { timeStyle: "short" })}`;
  const open = state === "open";

  async function join() {
    setBusy(true); setErr("");
    try {
      await api(`/g/${gameId}/join`, { method: "POST",
        body: { companions: companions.filter((c) => c.name.trim()) } });
      setCompanions([]); await load();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  async function drop(id, group = false) {
    if (!confirm(group ? "Drop yourself and all your companions?" : "Drop this player?")) return;
    try { await api(`/signups/${id}${group ? "?group=true" : ""}`, { method: "DELETE" }); await load(); }
    catch (e) { setErr(e.message); }
  }

  const Row = ({ s, i, prefix = "" }) => (
    <li className="flex items-center justify-between border-b border-slate-100 py-2">
      <span>{prefix}{i + 1}. {s.name}{s.isCompanion && <em className="text-slate-400"> (+1)</em>}</span>
      {open && mine.some((m) => m.id === s.id) && (
        <button onClick={() => drop(s.id)} className="text-sm text-red-600">Drop</button>
      )}
    </li>
  );

  return (
    <main className="mx-auto max-w-lg space-y-4 p-4">
      <header className="rounded-xl bg-green-700 p-4 text-white">
        <h1 className="text-xl font-bold">⚽ {game.title}</h1>
        <p>{game.teamCount} teams of {game.playersPerTeam}</p>
        <p>{when}</p>
        {game.locationName && <p>📍 {game.locationUrl
          ? <a className="underline" href={game.locationUrl} target="_blank" rel="noreferrer">{game.locationName}</a>
          : game.locationName}</p>}
        {game.description && <p className="mt-2 whitespace-pre-line text-sm">{game.description}</p>}
        <p className="mt-2 font-semibold">{confirmed.length}/{game.maxPlayers} confirmed</p>
      </header>
      {state === "finished" && <p className="rounded-lg bg-slate-200 p-3 text-center font-semibold">🏁 This game is finished</p>}
      {state === "closed" && <p className="rounded-lg bg-amber-100 p-3 text-center font-semibold">Sign-ups are closed</p>}

      {err && <p className="rounded bg-red-100 p-2 text-sm text-red-700">{err}</p>}

      {!me && open && <AuthForm slug={slug} onDone={setMe} />}

      {me && open && (
        <section className="space-y-3 rounded-xl bg-white p-4 shadow">
          <p className="text-sm text-slate-500">Signed in as <b>{me.nickName || me.name}</b></p>
          {!joined && (<>
            {companions.map((c, i) => (
              <div key={i} className="flex gap-2">
                <input className="w-1/2 rounded border px-2 py-1" placeholder="Friend's name" value={c.name}
                  onChange={(e) => setCompanions(companions.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                <input className="w-1/2 rounded border px-2 py-1" placeholder="Phone (optional)" value={c.phone || ""}
                  onChange={(e) => setCompanions(companions.map((x, j) => j === i ? { ...x, phone: e.target.value } : x))} />
              </div>
            ))}
            {companions.length < 3 && (
              <button onClick={() => setCompanions([...companions, { name: "", phone: "" }])}
                className="text-sm text-green-700">+ Add a friend (max 3)</button>
            )}
            <button disabled={busy} onClick={join}
              className="w-full rounded-lg bg-green-600 py-3 font-semibold text-white disabled:opacity-50">
              {companions.length ? `I'm in (+${companions.length})` : "I'm in"}
            </button>
          </>)}
          {mine.length > 1 && (
            <button onClick={() => drop(mine[0].id, true)} className="text-sm text-red-600">
              Drop my whole group
            </button>
          )}
        </section>
      )}

      <section className="rounded-xl bg-white p-4 shadow">
        <h2 className="font-semibold">Players</h2>
        <ul>{confirmed.map((s, i) => <Row key={s.id} s={s} i={i} />)}</ul>
        {waitlist.length > 0 && (<>
          <h2 className="mt-4 font-semibold">Waitlist</h2>
          <ul>{waitlist.map((s, i) => <Row key={s.id} s={s} i={i} prefix="W" />)}</ul>
        </>)}
      </section>
    </main>
  );
}