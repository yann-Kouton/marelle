import { Link, Navigate, useParams } from "react-router-dom";
import { isFirebaseConfigured } from "../firebase/config";
import { useAuth } from "../hooks/useAuth";
import { GAMES_BY_ID } from "../games/registry";
import BackLink from "../components/BackLink";

export default function GameHome() {
  const { gameId } = useParams();
  const game = GAMES_BY_ID[gameId];
  const { user, loading } = useAuth();

  if (!game) return <Navigate to="/" replace />;

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center gap-8 px-6 text-center">
      <BackLink to="/" className="absolute top-4 left-4">
        Tous les jeux
      </BackLink>

      <div>
        <h1 className="text-3xl font-semibold text-stone-100 tracking-tight">{game.label}</h1>
        <p className="text-stone-500 text-sm mt-1">{game.aka}</p>
        <p className="text-stone-400 mt-2 max-w-sm">{game.shortDescription}</p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          to={`/games/${gameId}/local`}
          className="bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-100 font-medium py-3 rounded-xl transition-colors"
        >
          Jouer en local (même écran)
        </Link>
        <Link
          to={user ? `/games/${gameId}/online` : "/login"}
          className={`font-medium py-3 rounded-xl transition-colors ${
            isFirebaseConfigured
              ? "bg-emerald-700 hover:bg-emerald-600 text-white"
              : "bg-stone-800/50 text-stone-500 border border-stone-800 cursor-not-allowed pointer-events-none"
          }`}
        >
          Jouer en ligne (salon)
        </Link>
        {!isFirebaseConfigured && (
          <p className="text-xs text-stone-500">
            Mode en ligne indisponible : configure tes clés Firebase dans .env
          </p>
        )}
        {isFirebaseConfigured && !user && !loading && (
          <p className="text-xs text-stone-500">
            Un compte est nécessaire pour jouer en ligne (avatar et pseudo visibles par
            l'adversaire).
          </p>
        )}
      </div>
    </div>
  );
}
