import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Trophy } from "lucide-react";
import BackLink from "../components/BackLink";
import Avatar from "../components/Avatar";
import { RankedName, tierForRank, frameStyleFromId } from "../components/Rank";
import { useAuth } from "../hooks/useAuth";
import { GAMES_BY_ID } from "../games/registry";
import {
  subscribeToTopPlayers,
  getMyEntry,
  ensureSeasonRollover,
  seasonNumberFromKey,
  currentSeasonKey,
  daysUntilNextSeason,
} from "../firebase/leaderboard";

export default function Leaderboard() {
  const { gameId } = useParams();
  const game = GAMES_BY_ID[gameId];
  const { user, profile } = useAuth();

  const [top, setTop] = useState([]);
  const [myEntry, setMyEntry] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!gameId) return;
    ensureSeasonRollover(gameId).catch(() => {});
    setLoadError(null);
    const unsub = subscribeToTopPlayers(gameId, 10, setTop, setLoadError);
    return unsub;
  }, [gameId]);

  useEffect(() => {
    if (!gameId || !user) return;
    getMyEntry(gameId, user.uid).then(setMyEntry).catch(() => {});
  }, [gameId, user, top]);

  if (!game) return <Navigate to="/" replace />;

  const season = currentSeasonKey();
  const seasonNum = seasonNumberFromKey(season);
  const daysLeft = daysUntilNextSeason();
  const myRank = user ? top.findIndex((p) => p.uid === user.uid) + 1 || null : null;
  const tenthWins = top[9]?.wins ?? 0;
  const myWins = myEntry?.wins ?? 0;
  const winsNeeded = myRank ? 0 : Math.max(0, tenthWins - myWins + 1 || (top.length < 10 ? 1 : 0));

  return (
    <div className="min-h-screen flex flex-col items-center gap-6 px-6 py-10">
      <BackLink to={`/games/${gameId}`} className="self-start">
        {game.label}
      </BackLink>

      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-stone-100">
          <Trophy className="w-6 h-6 text-amber-400" />
          Tableau des champions
        </h1>
        <p className="text-sm text-stone-500">
          {game.label} · Saison {seasonNum} · se termine dans {daysLeft} jour{daysLeft > 1 ? "s" : ""}
        </p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-2">
        {loadError && (
          <p className="text-sm text-red-400 text-center py-8">
            Impossible de charger le classement pour l'instant. Réessaie dans un instant ou
            préviens l'organisateur si ça persiste.
          </p>
        )}
        {!loadError && top.length === 0 && (
          <p className="text-sm text-stone-500 text-center py-8">
            Aucune victoire enregistrée en ligne ce mois-ci pour l'instant — sois le premier !
          </p>
        )}
        {top.map((p, i) => {
          const rank = i + 1;
          const tier = tierForRank(rank);
          const isMe = user?.uid === p.uid;
          return (
            <div
              key={p.uid}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${
                isMe ? "border-emerald-700 bg-emerald-950/30" : "border-stone-800 bg-stone-900/40"
              }`}
              style={
                tier
                  ? { boxShadow: `inset 3px 0 0 0 ${tier.glow}`, background: `linear-gradient(90deg, ${tier.glow}14, transparent 40%)` }
                  : undefined
              }
            >
              <span className="w-5 text-sm font-semibold text-stone-500 tabular-nums text-center">{rank}</span>
              <Avatar url={p.avatarUrl} name={p.name} size={38} frame={tier} />
              <div className="flex-1 min-w-0">
                <RankedName name={p.name} tier={tier} className="block truncate text-sm text-stone-100" />
                {tier && <span className="text-[11px] text-stone-500">{tier.label}</span>}
              </div>
              <span className="text-sm font-medium text-stone-200 tabular-nums">{p.wins}</span>
            </div>
          );
        })}
      </div>

      {user && (
        <div className="w-full max-w-sm text-center text-sm rounded-xl border border-stone-800 bg-stone-900/40 px-4 py-3">
          {myRank ? (
            <p className="text-stone-200">
              Tu es <span className="font-semibold text-emerald-400">#{myRank} mondial</span> avec {myWins}{" "}
              victoire{myWins > 1 ? "s" : ""} cette saison.
            </p>
          ) : (
            <p className="text-stone-400">
              Tu as {myWins} victoire{myWins > 1 ? "s" : ""} cette saison — encore{" "}
              <span className="font-semibold text-stone-200">
                {winsNeeded} victoire{winsNeeded > 1 ? "s" : ""}
              </span>{" "}
              pour entrer dans le Top 10.
            </p>
          )}
          {profile?.equippedFrame && frameStyleFromId(profile.equippedFrame) && (
            <p className="mt-1 text-xs text-stone-500">Cadre équipé : {frameStyleFromId(profile.equippedFrame).label}</p>
          )}
        </div>
      )}
    </div>
  );
}
