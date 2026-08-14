import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./config";

const USERS = "users";

export async function signUp(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  await setDoc(doc(db, USERS, cred.user.uid), {
    displayName,
    avatarUrl: null,
    email,
    createdAt: serverTimestamp(),
  });
  return cred.user;
}

export async function signIn(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signOutUser() {
  await signOut(auth);
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, USERS, uid));
  return snap.exists() ? snap.data() : null;
}

export async function updateUserProfile(uid, { displayName, avatarUrl }) {
  const updates = {};
  if (displayName !== undefined) updates.displayName = displayName;
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
  await setDoc(doc(db, USERS, uid), updates, { merge: true });
  if (auth.currentUser && displayName !== undefined) {
    await updateProfile(auth.currentUser, { displayName });
  }
}

export async function equipFrame(uid, frameId) {
  await setDoc(doc(db, USERS, uid), { equippedFrame: frameId }, { merge: true });
}

export function friendlyAuthError(code) {
  switch (code) {
    case "auth/email-already-in-use":
      return "Un compte existe déjà avec cet e-mail.";
    case "auth/invalid-email":
      return "Adresse e-mail invalide.";
    case "auth/weak-password":
      return "Mot de passe trop court (6 caractères minimum).";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "E-mail ou mot de passe incorrect.";
    default:
      return "Une erreur est survenue, réessaie.";
  }
}
