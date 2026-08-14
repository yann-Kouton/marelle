import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BackLink from "../components/BackLink";
import { createRoom, joinRoom } from "../firebase/rooms";
import { useAuth } from "../hooks/useAuth";
import Avatar from "../components/Avatar";

export default function OnlineLobby() {
  const { user, profile } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const displayName = profile?.displayName || user?.displayName || "Joueur";

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { code: roomCode } = await createRoom(user, profile);
      navigate(`/online/${roomCode}`);
    } catch (err) {
      setError("Impossible de créer le salon. Réessaie.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    setError("");
    if (!code.trim()) return setError("Entre le code du salon.");
    setLoading(true);
    try {
      await joinRoom(code.trim(), user, profile);
      navigate(`/online/${code.trim().toUpperCase()}`);
    } catch (err) {
      if (err.message === "salon-introuvable") setError("Ce salon n'existe pas.");
      else if (err.message === "salon-complet") setError("Ce salon est déjà complet.");
      else setError("Impossible de rejoindre ce salon.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6">
      <BackLink to="/" className="self-start" />

      <div className="flex flex-col items-center gap-2">
        <Avatar url={profile?.avatarUrl} name={displayName} size={56} />
        <div className="flex items-center gap-2">
          <p className="text-stone-200 font-medium">{displayName}</p>
          <Link to="/profile" className="text-xs text-emerald-500 hover:underline">
            modifier
          </Link>
        </div>
      </div>

      <h1 className="text-2xl font-semibold text-stone-100">Jouer en ligne</h1>

      <div className="w-full max-w-xs flex flex-col gap-4">
        <form onSubmit={handleCreate} className="flex flex-col gap-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition-colors"
          >
            Créer un salon
          </button>
        </form>

        <div className="flex items-center gap-2 text-stone-600 text-xs">
          <div className="flex-1 h-px bg-stone-800" />
          ou
          <div className="flex-1 h-px bg-stone-800" />
        </div>

        <form onSubmit={handleJoin} className="flex flex-col gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Code du salon"
            maxLength={6}
            className="w-full bg-stone-800 text-stone-100 placeholder-stone-500 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-600 tracking-widest text-center font-mono"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-stone-800 hover:bg-stone-700 disabled:opacity-50 border border-stone-700 text-stone-100 font-medium py-2.5 rounded-xl transition-colors"
          >
            Rejoindre le salon
          </button>
        </form>

        {error && <p className="text-sm text-red-400 text-center">{error}</p>}
      </div>
    </div>
  );
}
