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
import { GAMES_BY_ID } from "../games/registry";

const ROOMS = "rooms";
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans caractères ambigus

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
  };
}

// Crée un salon pour le jeu `gameId` et y place le créateur comme P1.
// Réessaie si le code existe déjà.
export async function createRoom(gameId, user, profile) {
  const game = GAMES_BY_ID[gameId];
  if (!game) throw new Error("jeu-inconnu");

  const p1 = playerFrom(user, profile);
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    const ref = doc(db, ROOMS, code);
    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists()) throw new Error("code-pris");
        tx.set(ref, {
          code,
          gameId,
          createdAt: serverTimestamp(),
          status: "waiting", // waiting | playing | finished
          players: { P1: p1, P2: null },
          game: game.createInitialState("P1"),
          rematch: { P1: false, P2: false },
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

// Rejoint un salon existant en tant que P2 (ou reprend sa place si déjà connu).
export async function joinRoom(code, user, profile) {
  const cleanCode = code.trim().toUpperCase();
  const ref = doc(db, ROOMS, cleanCode);
  const player = playerFrom(user, profile);

  const seat = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("salon-introuvable");
    const data = snap.data();

    if (data.players.P1?.uid === user.uid) {
      tx.update(ref, { "players.P1": player });
      return "P1";
    }
    if (data.players.P2?.uid === user.uid) {
      tx.update(ref, { "players.P2": player });
      return "P2";
    }
    if (!data.players.P2) {
      tx.update(ref, { "players.P2": player, status: "playing" });
      return "P2";
    }
    throw new Error("salon-complet");
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

export async function applyRematch(code, gameId, firstPlayer) {
  const game = GAMES_BY_ID[gameId];
  if (!game) throw new Error("jeu-inconnu");
  const ref = doc(db, ROOMS, code);
  await updateDoc(ref, {
    game: game.createInitialState(firstPlayer),
    rematch: { P1: false, P2: false },
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
