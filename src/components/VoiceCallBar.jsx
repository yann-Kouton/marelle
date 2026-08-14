import { Phone, PhoneOff, Mic, MicOff, Loader2 } from "lucide-react";
import { useIncomingCallFlag } from "../hooks/useVoiceCall";

const LABELS = {
  idle: "Vocal",
  connecting: "Connexion…",
  connected: "En appel",
  ended: "Appel terminé",
  error: "Erreur micro",
};

export default function VoiceCallBar({ code, mySeat, voice, opponentPresent }) {
  const { status, errorMessage, muted, start, hangUp, toggleMute, remoteAudioRef } = voice;
  const incoming = useIncomingCallFlag(code, mySeat, status === "idle");

  return (
    <div className="w-full max-w-sm flex items-center justify-between gap-3 bg-stone-900/60 border border-stone-700 rounded-xl px-3 py-2">
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            status === "connected"
              ? "bg-emerald-500"
              : status === "connecting"
              ? "bg-amber-500"
              : status === "error"
              ? "bg-red-500"
              : "bg-stone-600"
          }`}
        />
        <span className="text-sm text-stone-300">
          {incoming && status === "idle" ? "Appel entrant…" : LABELS[status]}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {status === "idle" || status === "ended" ? (
          <button
            onClick={start}
            disabled={!opponentPresent}
            title={!opponentPresent ? "En attente d'un adversaire" : undefined}
            className="flex items-center gap-1.5 text-sm bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            <Phone className="w-4 h-4" />
            {incoming ? "Répondre" : "Appeler"}
          </button>
        ) : (
          <>
            {(status === "connected" || status === "connecting") && (
              <button
                onClick={toggleMute}
                className="flex items-center gap-1.5 text-sm bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                {status === "connecting" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : muted ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
                {muted ? "Réactiver" : "Couper"}
              </button>
            )}
            <button
              onClick={hangUp}
              className="flex items-center gap-1.5 text-sm bg-red-800 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              <PhoneOff className="w-4 h-4" />
              Raccrocher
            </button>
          </>
        )}
      </div>

      {status === "error" && (
        <p className="text-xs text-red-400 basis-full">{errorMessage}</p>
      )}
    </div>
  );
}
