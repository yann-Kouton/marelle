import { Link } from "react-router-dom";
import { Grid3x3, Sprout, ChevronRight, Dices } from "lucide-react";
import { isFirebaseConfigured } from "../firebase/config";
import { useAuth } from "../hooks/useAuth";
import { GAMES } from "../games/registry";
import Avatar from "../components/Avatar";

const ICONS = {
  marelle: Grid3x3,
  awale: Sprout,
  ludo: Dices,
};

export default function Home() {
  const { user, profile, loading } = useAuth();
  const displayName = profile?.displayName || user?.displayName;

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      {isFirebaseConfigured && !loading && (
        <div className="absolute top-4 right-4">
          {user ? (
            <Link to="/profile" className="flex items-center gap-2">
              <Avatar url={profile?.avatarUrl} name={displayName} size={32} />
              <span className="text-sm text-stone-300">{displayName}</span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="text-sm bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 px-3 py-1.5 rounded-lg"
            >
              Se connecter
            </Link>
          )}
        </div>
      )}

      <div>
        <h1 className="text-3xl font-semibold text-stone-100 tracking-tight">Jeux de plateau</h1>
        <p className="text-stone-400 mt-2 max-w-sm">
          Une sélection de jeux de stratégie traditionnels, sans hasard — à jouer en local ou en
          ligne avec un ami.
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-sm">
        {GAMES.map((game) => {
          const Icon = ICONS[game.id] ?? Grid3x3;
          return (
            <Link
              key={game.id}
              to={`/games/${game.id}`}
              className="flex items-center gap-4 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-xl px-4 py-3.5 text-left transition-colors"
            >
              <div className="w-10 h-10 shrink-0 rounded-lg bg-stone-700 flex items-center justify-center">
                <Icon className="w-5 h-5 text-stone-200" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-stone-100 font-medium">{game.label}</p>
                <p className="text-stone-400 text-sm truncate">{game.shortDescription}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-stone-500 shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
