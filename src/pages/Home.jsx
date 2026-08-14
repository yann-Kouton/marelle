import { Link } from "react-router-dom";
import { isFirebaseConfigured } from "../firebase/config";
import { useAuth } from "../hooks/useAuth";
import Avatar from "../components/Avatar";

export default function Home() {
  const { user, profile, loading } = useAuth();
  const displayName = profile?.displayName || user?.displayName;

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center gap-8 px-6 text-center">
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
        <h1 className="text-3xl font-semibold text-stone-100 tracking-tight">
          La marelle à trois pions
        </h1>
        <p className="text-stone-400 mt-2 max-w-sm">
          Aussi appelé Tapatan, Achi, ou jeu du char. Aligne tes 3 pions pour gagner.
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          to="/local"
          className="bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-100 font-medium py-3 rounded-xl transition-colors"
        >
          Jouer en local (même écran)
        </Link>
        <Link
          to={user ? "/online" : "/login"}
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
