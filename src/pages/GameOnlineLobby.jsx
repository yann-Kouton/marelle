import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import BackLink from "../components/BackLink";
import Avatar from "../components/Avatar";
import { createRoom, joinRoom, peekRoom } from "../firebase/rooms";
import { useAuth } from "../hooks/useAuth";
import { GAMES_BY_ID } from "../games/registry";

export default function GameOnlineLobby() {
  const { gameId } = useParams();
  const game = GAMES_BY_ID[gameId];
  const { user, profile } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const variablePlayers = Boolean(game) && game.minPlayers !== game.maxPlayers;
  const [numPlayers, setNumPlayers] = useState(game?.minPlayers ?? 2);

  if (!game) return <Navigate to="/" replace />;

  const displayName = profile?.displayName || user?.displayName || "Joueur";

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { code: roomCode } = await createRoom(gameId, user, profile, numPlayers);
      navigate(`/games/${gameId}/online/${roomCode}`);
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
      const room = await peekRoom(code);
      if (!room) {
        setError("Ce salon n'existe pas.");
        return;
      }
      if (room.gameId !== gameId) {
        const otherGame = GAMES_BY_ID[room.gameId];
        setError(`Ce code correspond à un salon ${otherGame?.label || "d'un autre jeu"}.`);
        return;
      }
      await joinRoom(code.trim(), user, profile);
      navigate(`/games/${gameId}/online/${code.trim().toUpperCase()}`);
    } catch (err) {
      if (err.message === "salon-complet") setError("Ce salon est déjà complet.");
      else setError("Impossible de rejoindre ce salon.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6">
      <BackLink to={`/games/${gameId}`} className="self-start">
        {game.label}
      </BackLink>

      <div className="flex flex-col items-center gap-2">
        <Avatar url={profile?.avatarUrl} name={displayName} size={56} />
        <div className="flex items-center gap-2">
          <p className="text-stone-200 font-medium">{displayName}</p>
          <Link to="/profile" className="text-xs text-emerald-500 hover:underline">
            modifier
          </Link>
        </div>
      </div>

      <h1 className="text-2xl font-semibold text-stone-100">{game.label} en ligne</h1>

      <div className="w-full max-w-xs flex flex-col gap-4">
        {variablePlayers && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-stone-500">Nombre de joueurs du salon</p>
            <div className="flex items-center gap-2">
              {Array.from(
                { length: game.maxPlayers - game.minPlayers + 1 },
                (_, i) => game.minPlayers + i
              ).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNumPlayers(n)}
                  className={`w-11 h-11 rounded-xl text-lg font-semibold border transition-colors ${
                    numPlayers === n
                      ? "bg-emerald-700 border-emerald-600 text-white"
                      : "bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            {numPlayers > 2 && (
              <p className="text-[11px] text-stone-600 text-center max-w-[15rem]">
                L'appel vocal est réservé aux salons à 2 joueurs.
              </p>
            )}
          </div>
        )}

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
