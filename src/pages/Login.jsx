import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { signIn, friendlyAuthError } from "../firebase/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/online";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      navigate(from, { replace: true });
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
      <h1 className="text-2xl font-semibold text-stone-100">Se connecter</h1>

      <form onSubmit={handleSubmit} className="w-full max-w-xs flex flex-col gap-3">
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
          Se connecter
        </button>
      </form>

      <p className="text-sm text-stone-400">
        Pas encore de compte ?{" "}
        <Link to="/signup" className="text-emerald-500 hover:underline">
          Créer un compte
        </Link>
      </p>
    </div>
  );
}
