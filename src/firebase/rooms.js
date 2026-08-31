import {
  doc,
  collection,
  setDoc,
  updateDoc,
  onSnapshot,
  getDoc,
  serverTimestamp,
  runTransaction,
  addDoc,
  query,
  orderBy,
  limit,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./config";
import { GAMES_BY_ID, createGameState } from "../games/registry";

const ROOMS = "rooms";
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans caractères ambigus
const SEATS = ["P1", "P2", "P3", "P4"];

function generateRoomCode(length = 5) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

function playerFrom(user, profile) {
  return {
    uid: user.uid,
    name: profile?.displayName || user.displayName || "Joueur",
    avatarUrl: profile?.avatarUrl || null,
    equippedFrame: profile?.equippedFrame || null,
  };
}

// Crée un salon pour le jeu `gameId` et y place le créateur comme P1.
// `numPlayers` (2 à 4 selon le jeu) fixe le nombre de sièges du salon ;
// ignoré (toujours 2) pour les jeux à nombre de joueurs fixe. Réessaie si
// le code existe déjà.
export async function createRoom(gameId, user, profile, numPlayers) {
  const game = GAMES_BY_ID[gameId];
  if (!game) throw new Error("jeu-inconnu");

  const n = Math.max(game.minPlayers, Math.min(game.maxPlayers, numPlayers || game.minPlayers));
  const seats = SEATS.slice(0, n);
  const p1 = playerFrom(user, profile);

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    const ref = doc(db, ROOMS, code);
    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists()) throw new Error("code-pris");
        const players = {};
        const rematch = {};
        seats.forEach((s) => {
          players[s] = s === "P1" ? p1 : null;
          rematch[s] = false;
        });
        tx.set(ref, {
          code,
          gameId,
          numPlayers: n,
          createdAt: serverTimestamp(),
          status: "waiting", // waiting | playing | finished
          players,
          game: createGameState(game, n, "P1"),
          rematch,
        });
      });
      return { code, seat: "P1" };
    } catch (err) {
      if (err.message !== "code-pris") throw err;
      // sinon on retente avec un nouveau code
    }
  }
  throw new Error("Impossible de générer un salon, réessaie.");
}

// Consulte un salon sans le rejoindre (pour vérifier qu'il correspond au bon jeu).
export async function peekRoom(code) {
  const ref = doc(db, ROOMS, code.trim().toUpperCase());
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

// Rejoint un salon existant sur le premier siège libre (ou reprend sa place
// si l'utilisateur occupait déjà un siège — reconnexion).
export async function joinRoom(code, user, profile) {
  const cleanCode = code.trim().toUpperCase();
  const ref = doc(db, ROOMS, cleanCode);
  const player = playerFrom(user, profile);

  const seat = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("salon-introuvable");
    const data = snap.data();
    const seats = SEATS.slice(0, data.numPlayers || 2);

    const existing = seats.find((s) => data.players[s]?.uid === user.uid);
    if (existing) {
      tx.update(ref, { [`players.${existing}`]: player });
      return existing;
    }

    const empty = seats.find((s) => !data.players[s]);
    if (!empty) throw new Error("salon-complet");

    const willBeFull = seats.every((s) => s === empty || data.players[s]);
    tx.update(ref, {
      [`players.${empty}`]: player,
      ...(willBeFull ? { status: "playing" } : {}),
    });
    return empty;
  });

  return { code: cleanCode, seat };
}

export function subscribeToRoom(code, callback, onError) {
  const ref = doc(db, ROOMS, code);
  return onSnapshot(
    ref,
    (snap) => callback(snap.exists() ? snap.data() : null),
    onError
  );
}

export async function updateGameState(code, newGameState) {
  const ref = doc(db, ROOMS, code);
  await updateDoc(ref, { game: newGameState });
}

export async function requestRematch(code, seat) {
  const ref = doc(db, ROOMS, code);
  await updateDoc(ref, { [`rematch.${seat}`]: true });
}

export async function applyRematch(code, gameId, firstPlayer, numPlayers) {
  const game = GAMES_BY_ID[gameId];
  if (!game) throw new Error("jeu-inconnu");
  const seats = SEATS.slice(0, numPlayers || 2);
  const rematch = {};
  seats.forEach((s) => {
    rematch[s] = false;
  });
  const ref = doc(db, ROOMS, code);
  await updateDoc(ref, {
    game: createGameState(game, numPlayers || 2, firstPlayer),
    rematch,
  });
}

export async function leaveRoom(code) {
  const ref = doc(db, ROOMS, code);
  await deleteDoc(ref).catch(() => {});
}

// --- Chat texte ---

export async function sendChatMessage(code, { uid, name, avatarUrl, text }) {
  const colRef = collection(db, ROOMS, code, "messages");
  await addDoc(colRef, {
    uid,
    name,
    avatarUrl: avatarUrl || null,
    text: text.slice(0, 500),
    createdAt: serverTimestamp(),
  });
}

export function subscribeToChat(code, callback) {
  const colRef = collection(db, ROOMS, code, "messages");
  const q = query(colRef, orderBy("createdAt", "asc"), limit(200));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}
