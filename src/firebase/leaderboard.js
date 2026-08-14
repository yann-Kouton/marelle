// Classement mondial par jeu, par saison (1 saison = 1 mois calendaire).
//
// Modèle de données choisi pour rester 100% client (pas de Cloud Functions) :
// - une entrée par (jeu, saison, joueur) dans `leaderboardEntries`, id =
//   `${gameId}_${season}_${uid}` ; le classement d'une saison passée n'a donc
//   jamais besoin d'être "remis à zéro" côté données, on filtre juste par
//   `season` pour afficher la saison en cours.
// - un petit document `leaderboardMeta/{gameId}` qui retient la dernière
//   saison pour laquelle les cadres Diamant/Or/Bronze ont été distribués,
//   pour ne le faire qu'une fois par saison écoulée.
//
// Limite assumée : sans backend planifié, le changement de saison (et donc
// la distribution des cadres) n'est déclenché que lorsqu'un client visite le
// classement après le changement de mois — pas exactement à minuit le 1er.
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { db } from "./config";

const ENTRIES = "leaderboardEntries";

const SEASON_EPOCH = { year: 2026, month: 8 }; // saison 1 = août 2026

export function currentSeasonKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function seasonNumberFromKey(seasonKey) {
  const [y, m] = seasonKey.split("-").map(Number);
  return (y - SEASON_EPOCH.year) * 12 + (m - SEASON_EPOCH.month) + 1;
}

export function daysUntilNextSeason(date = new Date()) {
  const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return Math.ceil((next - date) / 86400000);
}

// Enregistre une victoire en ligne pour la saison en cours. Chaque joueur ne
// peut écrire que sur sa propre entrée (voir firestore.rules).
export async function recordWin(gameId, user, profile) {
  const season = currentSeasonKey();
  const id = `${gameId}_${season}_${user.uid}`;
  await setDoc(
    doc(db, ENTRIES, id),
    {
      gameId,
      season,
      uid: user.uid,
      name: profile?.displayName || user.displayName || "Joueur",
      avatarUrl: profile?.avatarUrl || null,
      wins: increment(1),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function getTopPlayers(gameId, max = 10, season = currentSeasonKey()) {
  const q = query(
    collection(db, ENTRIES),
    where("gameId", "==", gameId),
    where("season", "==", season),
    orderBy("wins", "desc"),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

export function subscribeToTopPlayers(gameId, max, callback) {
  const season = currentSeasonKey();
  const q = query(
    collection(db, ENTRIES),
    where("gameId", "==", gameId),
    where("season", "==", season),
    orderBy("wins", "desc"),
    limit(max)
  );
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => d.data())));
}

export async function getMyEntry(gameId, uid) {
  const season = currentSeasonKey();
  const snap = await getDoc(doc(db, ENTRIES, `${gameId}_${season}_${uid}`));
  return snap.exists() ? snap.data() : { wins: 0 };
}

// Distribue (une seule fois par saison écoulée) les cadres Diamant/Or/Bronze
// au podium de la saison qui vient de se terminer.
//
// Fait via l'API serverless /api/season-rollover (Firebase Admin SDK) et
// non plus en écriture Firestore directe depuis le client : le champ
// `frames` n'est plus modifiable par aucun client (voir firestore.rules),
// donc plus aucun joueur ne peut se l'auto-attribuer. La fonction est
// idempotente côté serveur, un échec réseau ici n'est pas grave — on
// retentera à la prochaine visite du classement (ou via le Vercel Cron).
export async function ensureSeasonRollover(gameId) {
  try {
    await fetch(`/api/season-rollover?gameId=${encodeURIComponent(gameId)}`);
  } catch {
    // Pas grave : nouvelle tentative à la prochaine visite du classement.
  }
}
