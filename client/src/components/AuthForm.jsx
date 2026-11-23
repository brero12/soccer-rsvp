import { useState } from "react";
import { api } from "../api";

const POSITIONS = ["", "Goalkeeper", "Defender", "Midfielder", "Winger", "Striker", "Any"];
const input = "w-full rounded-lg border border-slate-300 px-3 py-2";

export default function AuthForm({ slug, onDone }) {
  const [mode, setMode] = useState("register");
  const [f, setF] = useState({ joinCode: "", phone: "", name: "", nickName: "",
    position: "", pin: "", consent: false, asGuest: false });
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  async function submit(e) {
    e.preventDefault(); setErr("");
    try {
      const me = mode === "register"
        ? await api("/auth/register", { method: "POST", body: { slug, ...f } })
        : await api("/auth/login", { method: "POST", body: { phone: f.phone, pin: f.pin } });
      onDone(me);
    } catch (e) { setErr(e.message); }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl bg-white p-4 shadow">
      <div className="flex gap-2 text-sm">
        {["register", "login"].map((m) => (
          <button type="button" key={m} onClick={() => setMode(m)}
            className={`flex-1 rounded-lg py-2 ${mode === m ? "bg-green-600 text-white" : "bg-slate-100"}`}>
            {m === "register" ? "New here" : "I have an account"}
          </button>
        ))}
      </div>
      {mode === "register" && <input className={input} placeholder="Group code (from WhatsApp)" value={f.joinCode} onChange={set("joinCode")} required />}
      <input className={input} placeholder="Phone number" inputMode="tel" value={f.phone} onChange={set("phone")} required />
      {mode === "register" && (<>
        <input className={input} placeholder="Name" value={f.name} onChange={set("name")} required />
        <input className={input} placeholder="Nickname (optional)" value={f.nickName} onChange={set("nickName")} />
        <select className={input} value={f.position} onChange={set("position")}>
          {POSITIONS.map((p) => <option key={p} value={p}>{p || "Preferred position (optional)"}</option>)}
        </select>
      </>)}
      <input className={input} placeholder={mode === "register" ? "Choose a 4-6 digit PIN" : "Your PIN"}
        type="password" inputMode="numeric" maxLength={6} value={f.pin} onChange={set("pin")} required />
      {mode === "register" && (<>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={f.asGuest} onChange={set("asGuest")} />
          I'm a guest (only me, no companions)</label>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={f.consent} onChange={set("consent")} />
          I agree that my data may be used to organize games and contact me about them.</label>
      </>)}
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button className="w-full rounded-lg bg-green-600 py-2 font-semibold text-white">
        {mode === "register" ? "Create account" : "Sign in"}
      </button>
    </form>
  );
}