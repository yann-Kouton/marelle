import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signUp, friendlyAuthError } from "../firebase/auth";

export default function Signup() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!displayName.trim()) return setError("Choisis un pseudo.");
    setLoading(true);
    try {
      await signUp(email.trim(), password, displayName.trim());
      navigate("/profile", { replace: true });
    } catch (err) {
      setError(friendlyAuthError(err.code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6">
      <Link to="/" className="text-stone-500 text-sm self-start hover:text-stone-300">
        ← Retour
      </Link>
      <h1 className="text-2xl font-semibold text-stone-100">Créer un compte</h1>

      <form onSubmit={handleSubmit} className="w-full max-w-xs flex flex-col gap-3">
        <div>
          <label className="text-xs text-stone-400">Pseudo</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={20}
            placeholder="ex. Esmel"
            className="w-full mt-1 bg-stone-800 text-stone-100 placeholder-stone-500 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>
        <div>
          <label className="text-xs text-stone-400">E-mail</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mt-1 bg-stone-800 text-stone-100 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>
        <div>
          <label className="text-xs text-stone-400">Mot de passe</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mt-1 bg-stone-800 text-stone-100 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition-colors mt-2"
        >
          Créer mon compte
        </button>
      </form>

      <p className="text-sm text-stone-400">
        Déjà un compte ?{" "}
        <Link to="/login" className="text-emerald-500 hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
