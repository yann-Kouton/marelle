import { Mic, MicOff, Loader2, AlertTriangle } from "lucide-react";

const LABELS = {
  idle: "Vocal indisponible",
  connecting: "Connexion…",
  connected: "En vocal",
  error: "Erreur micro",
};

export default function VoiceCallBar({ voice, opponentPresent }) {
  const { status, errorMessage, muted, toggleMute, remoteAudioRef } = voice;

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
          {!opponentPresent ? "En attente d'un adversaire" : LABELS[status]}
        </span>
      </div>

      <button
        onClick={toggleMute}
        disabled={!opponentPresent || status === "error"}
        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors font-medium disabled:opacity-40 ${
          muted
            ? "bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200"
            : "bg-emerald-700 hover:bg-emerald-600 text-white"
        }`}
      >
        {status === "error" ? (
          <AlertTriangle className="w-4 h-4" />
        ) : status === "connecting" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : muted ? (
          <MicOff className="w-4 h-4" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
        {muted ? "Activer le micro" : "Couper le micro"}
      </button>

      {status === "error" && (
        <p className="text-xs text-red-400 basis-full">{errorMessage}</p>
      )}
    </div>
  );
}
