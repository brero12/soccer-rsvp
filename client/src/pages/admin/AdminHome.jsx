import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { api } from "../../api";
import { Badge, GameActions, fmtWall } from "./shared";

export default function AdminHome() {
  const { community } = useOutletContext();
  const [main, setMain] = useState(undefined); // undefined = loading, null = none

  const load = async () => {
    const games = await api(`/admin/games?communityId=${community.id}`);
    const next = games
      .filter((g) => ["open", "closed"].includes(g.state))
      .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))[0];
    setMain(next ? { game: next, list: await api(`/g/${next._id}`) } : null);
  };
  useEffect(() => { load(); }, [community.id]);

  async function remove(s) {
    if (!confirm(`Remove ${s.name} from the list?`)) return;
    await api(`/signups/${s.id}`, { method: "DELETE" });
    load();
  }

  if (main === undefined) return <p>Loading…</p>;
  if (main === null) return (
    <div className="space-y-3 rounded-xl bg-white p-6 text-center shadow">
      <p className="text-slate-600">No upcoming game.</p>
      <Link to="/admin/games/new" className="inline-block rounded-lg bg-green-600 px-4 py-2 font-semibold text-white">
        Create a game
      </Link>
      <div><Link to="/admin/games" className="text-sm text-slate-600">See all games</Link></div>
    </div>
  );

  const { game: g, list } = main;
  const Row = ({ s, i, prefix = "" }) => (
    <li className="flex justify-between border-b border-slate-100 py-2">
      <span>{prefix}{i + 1}. {s.name}</span>
      <button className="text-xs text-red-600" onClick={() => remove(s)}>Remove</button>
    </li>
  );

  return (
    <>
      <section className="rounded-xl bg-white p-4 shadow">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">⚽ {g.title}</h2><Badge state={g.state} />
        </div>
        <p className="text-sm">{fmtWall(g.startsAtLocal)} – {fmtWall(g.endsAtLocal).split(", ").pop()}</p>
        {g.locationName && <p className="text-sm">📍 {g.locationName}</p>}
        <p className="mt-1 text-sm font-semibold">
          {g.teamCount} teams of {g.playersPerTeam} · {list.confirmed.length}/{g.maxPlayers} confirmed ·
          {" "}{list.waitlist.length}/{g.maxWaitlist} waiting
        </p>
        <GameActions g={g} community={community} onChange={load} />
      </section>

      <section className="rounded-xl bg-white p-4 shadow">
        <h3 className="font-semibold">Players</h3>
        <ul>{list.confirmed.map((s, i) => <Row key={s.id} s={s} i={i} />)}</ul>
        {list.waitlist.length > 0 && (<>
          <h3 className="mt-4 font-semibold">Waitlist</h3>
          <ul>{list.waitlist.map((s, i) => <Row key={s.id} s={s} i={i} prefix="W" />)}</ul>
        </>)}
      </section>

      <div className="flex gap-3">
        <Link to="/admin/games/new" className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white">+ New game</Link>
        <Link to="/admin/games" className="rounded-lg bg-white px-4 py-2 text-sm shadow">All games</Link>
      </div>
    </>
  );
}