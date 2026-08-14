import { useCallback, useEffect, useRef, useState } from "react";
import {
  doc,
  collection,
  addDoc,
  setDoc,
  updateDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase/config";

// STUN publics uniquement (pas de TURN) : suffisant sur la plupart des
// réseaux, mais un appel peut échouer derrière certains NAT/pare-feux
// d'entreprise stricts. Voir le README pour ajouter un serveur TURN.
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

// P1 est toujours l'appelant, P2 toujours le répondeur : ça évite toute
// négociation sur "qui commence" quand les deux cliquent en même temps.
export function useVoiceCall(code, mySeat) {
  const [status, setStatus] = useState("idle"); // idle | connecting | connected | ended | error
  const [errorMessage, setErrorMessage] = useState("");
  const [muted, setMuted] = useState(false);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const unsubsRef = useRef([]);
  const statusRef = useRef("idle");

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const callDocRef = doc(db, "rooms", code, "voice", "call");

  const stopListeners = useCallback(() => {
    unsubsRef.current.forEach((u) => u());
    unsubsRef.current = [];
  }, []);

  const teardownConnection = useCallback(() => {
    stopListeners();
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
  }, [stopListeners]);

  const wipeSignaling = useCallback(async () => {
    try {
      const callerCands = await getDocs(collection(callDocRef, "callerCandidates"));
      await Promise.all(callerCands.docs.map((d) => deleteDoc(d.ref)));
      const calleeCands = await getDocs(collection(callDocRef, "calleeCandidates"));
      await Promise.all(calleeCands.docs.map((d) => deleteDoc(d.ref)));
      await deleteDoc(callDocRef);
    } catch {
      // le salon a peut-être déjà disparu, rien à faire
    }
  }, [callDocRef]);

  const hangUp = useCallback(async () => {
    teardownConnection();
    await wipeSignaling();
    setStatus("idle");
  }, [teardownConnection, wipeSignaling]);

  const start = useCallback(async () => {
    setErrorMessage("");
    setStatus("connecting");

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setStatus("error");
      setErrorMessage("Micro refusé ou indisponible. Autorise l'accès au micro pour appeler.");
      return;
    }
    localStreamRef.current = stream;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    pc.ontrack = (e) => {
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = e.streams[0];
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") setStatus("connected");
      if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
        if (statusRef.current === "connected") setStatus("ended");
      }
    };

    const isCaller = mySeat === "P1";
    const myCandidates = isCaller ? "callerCandidates" : "calleeCandidates";
    const theirCandidates = isCaller ? "calleeCandidates" : "callerCandidates";

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        addDoc(collection(callDocRef, myCandidates), e.candidate.toJSON());
      }
    };

    const unsubTheirCandidates = onSnapshot(
      collection(callDocRef, theirCandidates),
      (snap) => {
        snap.docChanges().forEach((change) => {
          if (change.type === "added" && pc.remoteDescription) {
            pc.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch(() => {});
          }
        });
      }
    );
    unsubsRef.current.push(unsubTheirCandidates);

    if (isCaller) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await setDoc(
        callDocRef,
        { offer: { type: offer.type, sdp: offer.sdp } },
        { merge: false }
      );

      const unsubDoc = onSnapshot(callDocRef, (snap) => {
        const data = snap.data();
        if (data?.answer && !pc.currentRemoteDescription) {
          pc.setRemoteDescription(new RTCSessionDescription(data.answer)).catch(() => {});
        }
        if (!snap.exists() && statusRef.current !== "idle") {
          teardownConnection();
          setStatus("ended");
        }
      });
      unsubsRef.current.push(unsubDoc);
    } else {
      const unsubDoc = onSnapshot(callDocRef, async (snap) => {
        const data = snap.data();
        if (data?.offer && !pc.currentRemoteDescription) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await updateDoc(callDocRef, {
            answer: { type: answer.type, sdp: answer.sdp },
          });
        }
        if (!snap.exists() && statusRef.current !== "idle") {
          teardownConnection();
          setStatus("ended");
        }
      });
      unsubsRef.current.push(unsubDoc);
    }
  }, [callDocRef, mySeat, teardownConnection]);

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const next = !muted;
    localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  }, [muted]);

  // Si l'autre joueur raccroche (le doc de signalisation disparaît) pendant
  // qu'on est encore en idle, rien à faire ici — c'est start()/onSnapshot(callDocRef)
  // qui gère la fin d'appel une fois la connexion établie.

  useEffect(() => {
    return () => {
      teardownConnection();
      if (statusRef.current !== "idle") wipeSignaling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, errorMessage, muted, start, hangUp, toggleMute, remoteAudioRef };
}

// Permet d'afficher un bandeau "appel entrant" côté P2 sans démarrer le micro
// tant que le joueur n'a pas cliqué pour répondre.
export function useIncomingCallFlag(code, mySeat, active) {
  const [incoming, setIncoming] = useState(false);
  useEffect(() => {
    if (mySeat !== "P2" || !active) {
      setIncoming(false);
      return undefined;
    }
    const callDocRef = doc(db, "rooms", code, "voice", "call");
    const unsub = onSnapshot(callDocRef, (snap) => {
      setIncoming(Boolean(snap.exists() && snap.data()?.offer && !snap.data()?.answer));
    });
    return unsub;
  }, [code, mySeat, active]);
  return incoming;
}
