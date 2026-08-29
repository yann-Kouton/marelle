import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
// réseaux, mais la connexion peut échouer derrière certains NAT/pare-feux
// d'entreprise stricts. Voir le README pour ajouter un serveur TURN.
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

// Plus d'appel / réponse : dès que les deux joueurs sont dans le salon
// (`active` = true), on établit la connexion WebRTC en arrière-plan, micro
// coupé par défaut. Le seul geste du joueur est d'activer/désactiver son
// micro. P1 est toujours l'offreur, P2 toujours le répondeur : ça évite
// toute négociation sur "qui commence".
export function useVoiceCall(code, mySeat, active) {
  const [status, setStatus] = useState("idle"); // idle | connecting | connected | error
  const [errorMessage, setErrorMessage] = useState("");
  const [muted, setMuted] = useState(true); // micro coupé tant qu'on ne l'active pas

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const unsubsRef = useRef([]);
  const statusRef = useRef("idle");
  const mutedRef = useRef(true);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  // Mémoïsé sur `code` uniquement : recréer la ref à chaque render ferait
  // repartir l'effet de connexion en boucle.
  const callDocRef = useMemo(() => doc(db, "rooms", code, "voice", "call"), [code]);

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

  // Connexion/déconnexion pilotée uniquement par `active` (les deux joueurs
  // présents ou non) : plus aucun bouton "appeler" / "raccrocher" à gérer.
  useEffect(() => {
    if (!active) {
      teardownConnection();
      setStatus("idle");
      return undefined;
    }

    let cancelled = false;
    setErrorMessage("");
    setStatus("connecting");

    (async () => {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        if (!cancelled) {
          setStatus("error");
          setErrorMessage("Micro refusé ou indisponible. Autorise l'accès au micro pour discuter.");
        }
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      // On applique tout de suite l'état muet courant (micro coupé par défaut).
      stream.getAudioTracks().forEach((t) => (t.enabled = !mutedRef.current));
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      pc.ontrack = (e) => {
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = e.streams[0];
      };
      pc.onconnectionstatechange = () => {
        if (cancelled) return;
        if (pc.connectionState === "connected") setStatus("connected");
        if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
          // On repasse en "connecting" plutôt qu'en erreur définitive : si
          // l'adversaire revient, `active` redeviendra true et on retentera.
          if (statusRef.current === "connected") setStatus("connecting");
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
        });
        unsubsRef.current.push(unsubDoc);
      }
    })();

    return () => {
      cancelled = true;
      teardownConnection();
      // Un seul côté nettoie les documents de signalisation pour éviter
      // que les deux joueurs ne se marchent dessus au même instant.
      if (mySeat === "P1") wipeSignaling();
    };
  }, [active, code, mySeat, callDocRef, teardownConnection, wipeSignaling]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !next));
      }
      return next;
    });
  }, []);

  return { status, errorMessage, muted, toggleMute, remoteAudioRef };
}
