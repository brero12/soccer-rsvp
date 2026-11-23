import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { api } from "../../api";
import AdminLogin from "../../components/AdminLogin";

export default function AdminLayout() {
  const [communities, setCommunities] = useState(null);
  const boot = () => api("/admin/communities").then(setCommunities).catch(() => setCommunities([]));
  useEffect(() => { boot(); }, []);

  if (communities === null) return <p className="p-6">Loading…</p>;
  if (!communities.length) return <AdminLogin onDone={boot} />;
  const community = communities[0];

  const tab = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm ${isActive ? "bg-green-600 text-white" : "bg-white shadow"}`;

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">{community.name}</h1>
          <p className="text-xs text-slate-500">Group code: <b>{community.joinCode}</b></p>
        </div>
        <nav className="flex items-center gap-2">
          <NavLink end to="/admin" className={tab}>Home</NavLink>
          <NavLink end to="/admin/games" className={tab}>Games</NavLink>
          <NavLink to="/admin/games/new" className={tab}>+ New</NavLink>
          <button className="text-xs text-slate-500"
            onClick={async () => { await api("/auth/logout", { method: "POST" }); setCommunities([]); }}>
            Sign out
          </button>
        </nav>
      </header>
      <Outlet context={{ community }} />
    </main>
  );
}