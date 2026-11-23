import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";

const STATE = {
  open: ["Open", "bg-green-100 text-green-800"],
  closed: ["Sign-ups closed", "bg-amber-100 text-amber-800"],
  draft: ["Draft", "bg-slate-100 text-slate-700"],
  finished: ["Finished", "bg-slate-200 text-slate-700"],
  disabled: ["Disabled", "bg-red-100 text-red-700"],
};
export const Badge = ({ state }) => (
  <span className={`rounded-full px-2 py-0.5 text-xs ${STATE[state][1]}`}>{STATE[state][0]}</span>
);

// "2026-11-22T09:45" is already the community's wall-clock time: show it as-is
export const fmtWall = (s) => new Date(s).toLocaleString([], {
  weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
});

export function GameActions({ g, community, onChange }) {
  const [msg, setMsg] = useState("");
  const link = `${location.origin}/c/${community.slug}/g/${g._id}`;
  const live = ["open", "closed", "finished"].includes(g.state);

  const copyText = async () => {
    const t = await (await fetch(`/api/g/${g._id}/text`)).text();
    await navigator.clipboard.writeText(t);
    setMsg("Copied. Paste it in your WhatsApp group.");
  };
  const setStatus = (status) => async () => {
    await api(`/admin/games/${g._id}`, { method: "PATCH", body: { status } });
    onChange();
  };
  const disable = async () => {
    if (!confirm(`Disable "${g.title}"? Players won't be able to see it.`)) return;
    await api(`/admin/games/${g._id}/disable`, { method: "POST" });
    onChange();
  };
  const btn = "text-sm text-green-700";

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-4">
        {live && <button className={btn} onClick={copyText}>Copy WhatsApp text</button>}
        {live && <a className={btn} target="_blank" rel="noreferrer"
          href={`https://wa.me/?text=${encodeURIComponent(link)}`}>Share link</a>}
        {live && <a className="text-sm text-slate-600" href={link} target="_blank" rel="noreferrer">Open</a>}
        <Link className="text-sm text-slate-600" to={`/admin/games/${g._id}/edit`}>Edit</Link>
        {g.state === "draft" && <button className={btn} onClick={setStatus("open")}>Publish</button>}
        {g.state === "disabled" && <button className={btn} onClick={setStatus("open")}>Enable</button>}
        {g.state !== "disabled" && <button className="text-sm text-red-600" onClick={disable}>Disable</button>}
      </div>
      {msg && <p className="text-sm text-green-700">{msg}</p>}
    </div>
  );
}