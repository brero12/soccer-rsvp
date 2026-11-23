import { useState } from "react";
import { signInWithPopup, signInWithEmailAndPassword } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { api } from "../api";

const input = "rounded-lg border border-slate-300 px-3 py-2 w-full";

export default function AdminLogin({ onDone }) {
  const [f, setF] = useState({ phone: "", password: "", email: "" });
  const [err, setErr] = useState("");

  const run = (fn) => async () => {
    setErr("");
    try { await fn(); onDone(); } catch (e) { setErr(e.message); }
  };
  const fb = async (cred) =>
    api("/auth/firebase", { method: "POST", body: { idToken: await cred.user.getIdToken() } });

  return (
    <div className="mx-auto mt-10 max-w-sm space-y-3 rounded-xl bg-white p-4 shadow">
      <h1 className="text-lg font-bold">Admin sign in</h1>
      <button className="w-full rounded-lg border py-2"
        onClick={run(async () => fb(await signInWithPopup(auth, googleProvider)))}>
        Continue with Google
      </button>
      <hr />
      <input className={input} placeholder="Email" value={f.email}
        onChange={(e) => setF({ ...f, email: e.target.value })} />
      <input className={input} placeholder="Phone (leave empty if using email)" value={f.phone}
        onChange={(e) => setF({ ...f, phone: e.target.value })} />
      <input className={input} type="password" placeholder="Password" value={f.password}
        onChange={(e) => setF({ ...f, password: e.target.value })} />
      <button className="w-full rounded-lg bg-green-600 py-2 text-white"
        onClick={run(async () => f.email
          ? fb(await signInWithEmailAndPassword(auth, f.email, f.password))
          : api("/auth/login-password", { method: "POST", body: { phone: f.phone, password: f.password } }))}>
        Sign in
      </button>
      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}