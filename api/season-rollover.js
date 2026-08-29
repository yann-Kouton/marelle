// Fonction serverless Vercel — équivalent d'une Cloud Function planifiée,
// mais hébergée là où le reste du projet vit déjà (aucune nouvelle brique
// d'infra, gratuit sur le plan Hobby).
//
// Rôle : distribuer les cadres Diamant/Or/Bronze au podium d'une saison
// écoulée, avec le Firebase Admin SDK (donc en dehors des Firestore
// Security Rules — c'est le seul endroit autorisé à écrire `frames`).
//
// Déclenchement :
// - "à la demande", appelée par le client au chargement du classement
//   (voir src/firebase/leaderboard.js) — mêmes garanties qu'avant.
// - + un Vercel Cron (voir vercel.json) une fois par jour, pour se
//   rapprocher du changement à minuit le 1er sans dépendre d'une visite.
//
// La logique est idempotente (document `leaderboardMeta/{gameId}` retient
// la dernière saison distribuée), donc aucun risque à l'appeler plusieurs
// fois ou en parallèle (client + cron).
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const SEASON_EPOCH = { year: 2026, month: 8 }; // saison 1 = août 2026
const VALID_GAME_IDS = ["marelle", "awale", "ludo"];

function currentSeasonKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function seasonNumberFromKey(seasonKey) {
  const [y, m] = seasonKey.split("-").map(Number);
  return (y - SEASON_EPOCH.year) * 12 + (m - SEASON_EPOCH.month) + 1;
}

function previousSeasonKey(seasonKey) {
  const [y, m] = seasonKey.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return currentSeasonKey(d);
}

function getDb() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT manquante");
    const serviceAccount = JSON.parse(
      Buffer.from(raw, "base64").toString("utf8")
    );
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getFirestore();
}

async function rolloverOneGame(db, gameId) {
  const now = currentSeasonKey();
  const prev = previousSeasonKey(now);
  const metaRef = db.collection("leaderboardMeta").doc(gameId);

  const alreadyDone = await db.runTransaction(async (tx) => {
    const snap = await tx.get(metaRef);
    const last = snap.exists ? snap.data().lastGrantedSeason : null;
    if (last === prev) return true;
    tx.set(metaRef, { lastGrantedSeason: prev }, { merge: true });
    return false;
  });
  if (alreadyDone) return { gameId, granted: false };

  const top3Snap = await db
    .collection("leaderboardEntries")
    .where("gameId", "==", gameId)
    .where("season", "==", prev)
    .orderBy("wins", "desc")
    .limit(3)
    .get();

  const tiers = ["diamond", "gold", "bronze"];
  const seasonNum = seasonNumberFromKey(prev);

  await Promise.all(
    top3Snap.docs
      .map((d) => d.data())
      .filter((p) => p.wins > 0)
      .map((p, i) =>
        db
          .collection("users")
          .doc(p.uid)
          .update({
            frames: FieldValue.arrayUnion(`${gameId}-${tiers[i]}-s${seasonNum}`),
          })
          .catch(() => {})
      )
  );

  return { gameId, granted: true, season: prev };
}

export default async function handler(req, res) {
  const gameId = req.query?.gameId;
  const games = gameId ? [gameId] : VALID_GAME_IDS;

  if (games.some((g) => !VALID_GAME_IDS.includes(g))) {
    res.status(400).json({ error: "gameId invalide" });
    return;
  }

  try {
    const db = getDb();
    const results = await Promise.all(games.map((g) => rolloverOneGame(db, g)));
    res.status(200).json({ results });
  } catch (err) {
    console.error("[season-rollover]", err);
    res.status(500).json({ error: "rollover-failed" });
  }
}
