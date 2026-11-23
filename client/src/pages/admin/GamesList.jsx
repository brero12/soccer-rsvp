import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { api } from "../../api";
import { Badge, GameActions, fmtWall } from "./shared";

const FILTERS = {
  upcoming: (g) => ["open", "closed", "draft"].includes(g.state),
  finished: (g) => g.state === "finished",
  disabled: (g) => g.state === "disabled",
  all: () => true,
};

export default function GamesList() {
  const { community } = useOutletContext();
  const [games, setGames] = useState(null);
  const [tab, setTab] = useState("upcoming");
  const load = () => api(`/admin/games?communityId=${community.id}`).then(setGames);
  useEffect(() => { load(); }, [community.id]);

  if (!games) return <p>Loading…</p>;
  let shown = games.filter(FILTERS[tab]);
  if (tab === "upcoming") shown = [...shown].reverse(); // soonest first

  return (
    <>
      <div className="flex gap-2 text-sm">
        {Object.keys(FILTERS).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1 capitalize ${tab === t ? "bg-slate-800 text-white" : "bg-white shadow"}`}>{t}</button>
        ))}
      </div>
      {shown.length === 0 && <p className="text-slate-500">Nothing here.</p>}
      {shown.map((g) => (
        <div key={g._id} className="rounded-xl bg-white p-4 shadow">
          <div className="flex items-center justify-between">
            <b>{g.title}</b><Badge state={g.state} />
          </div>
          <p className="text-sm">{fmtWall(g.startsAtLocal)}</p>
          <p className="text-sm text-slate-500">
            {g.teamCount} teams of {g.playersPerTeam} · {g.confirmed}/{g.maxPlayers} confirmed · {g.waiting} waiting
          </p>
          <GameActions g={g} community={community} onChange={load} />
        </div>
      ))}
    </>
  );
}