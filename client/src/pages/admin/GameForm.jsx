import { useEffect, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { api } from "../../api";

const input = "w-full rounded-lg border border-slate-300 px-3 py-2";
const empty = { title: "", description: "", startsAt: "", endsAt: "", locationName: "", locationUrl: "",
  teamCount: 2, playersPerTeam: 9, maxWaitlist: 6, publish: true };

export default function GameForm() {
  const { id } = useParams();
  const { community } = useOutletContext();
  const nav = useNavigate();
  const [f, setF] = useState(empty);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    api(`/admin/games/${id}`).then((g) => setF({
      title: g.title, description: g.description || "",
      startsAt: g.startsAtLocal, endsAt: g.endsAtLocal,
      locationName: g.locationName || "", locationUrl: g.locationUrl || "",
      teamCount: g.teamCount, playersPerTeam: g.playersPerTeam, maxWaitlist: g.maxWaitlist,
    })).catch((e) => setErr(e.message));
  }, [id]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const total = Number(f.teamCount) * Number(f.playersPerTeam || 0);

  async function submit(e) {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      const body = { ...f, teamCount: +f.teamCount, playersPerTeam: +f.playersPerTeam, maxWaitlist: +f.maxWaitlist };
      if (id) { await api(`/admin/games/${id}`, { method: "PATCH", body }); nav("/admin/games"); }
      else { await api("/admin/games", { method: "POST", body: { ...body, communityId: community.id } }); nav("/admin"); }
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-3 rounded-xl bg-white p-4 shadow">
      <h2 className="col-span-2 font-semibold">{id ? "Edit game" : "New convocation list"}</h2>
      <input className={`${input} col-span-2`} placeholder="Title" value={f.title} onChange={set("title")} required />
      <textarea className={`${input} col-span-2`} rows={3} placeholder="Description (e.g. bring a blue or red shirt)"
        value={f.description} onChange={set("description")} />

      <label className="text-sm">Start<input type="datetime-local" className={input} value={f.startsAt} onChange={set("startsAt")} required /></label>
      <label className="text-sm">End<input type="datetime-local" className={input} value={f.endsAt} onChange={set("endsAt")} required /></label>
      <p className="col-span-2 -mt-2 text-xs text-slate-500">Times are in {community.timezone}</p>

      <input className={input} placeholder="Location name" value={f.locationName} onChange={set("locationName")} />
      <input className={input} placeholder="Google Maps link" value={f.locationUrl} onChange={set("locationUrl")} />

      <div className="col-span-2">
        <p className="mb-1 text-sm">Teams</p>
        <div className="flex gap-2">
          {[2, 3].map((n) => (
            <button type="button" key={n} onClick={() => setF({ ...f, teamCount: n })}
              className={`flex-1 rounded-lg py-2 ${+f.teamCount === n ? "bg-green-600 text-white" : "bg-slate-100"}`}>
              {n} teams
            </button>
          ))}
        </div>
      </div>
      <label className="text-sm">Players per team
        <input type="number" min="1" max="30" className={input} value={f.playersPerTeam} onChange={set("playersPerTeam")} />
      </label>
      <label className="text-sm">Waitlist slots
        <input type="number" min="0" className={input} value={f.maxWaitlist} onChange={set("maxWaitlist")} />
      </label>
      <p className="col-span-2 rounded-lg bg-slate-50 p-2 text-sm">
        Main list: <b>{total} slots</b> ({f.teamCount} × {f.playersPerTeam || 0})
      </p>

      {!id && (
        <label className="col-span-2 flex gap-2 text-sm">
          <input type="checkbox" checked={f.publish} onChange={set("publish")} /> Publish now (uncheck to save as draft)
        </label>
      )}
      {err && <p className="col-span-2 text-sm text-red-600">{err}</p>}
      <button disabled={busy} className="col-span-2 rounded-lg bg-green-600 py-2 font-semibold text-white disabled:opacity-50">
        {id ? "Save changes" : "Create game"}
      </button>
    </form>
  );
}