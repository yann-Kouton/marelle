import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Board from "../components/Board";
import StatusBar from "../components/StatusBar";
import Chat from "../components/Chat";
import Avatar from "../components/Avatar";
import VoiceCallBar from "../components/VoiceCallBar";
import { useAuth } from "../hooks/useAuth";
import { useVoiceCall } from "../hooks/useVoiceCall";
import {
  subscribeToRoom,
  subscribeToChat,
  updateGameState,
  sendChatMessage,
  joinRoom,
  requestRematch,
  applyRematch,
} from "../firebase/rooms";
import { getPlayableCells, playCell } from "../game/engine";

export default function OnlineRoom() {
  const { code } = useParams();
  const { user, profile } = useAuth();
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Tente de rejoindre le salon (ou de reprendre sa place) dès l'arrivée sur l'URL.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    joinRoom(code, user, profile).catch((err) => {
      if (cancelled) return;
      if (err.message === "salon-introuvable") setError("Ce salon n'existe pas ou a été fermé.");
      else if (err.message === "salon-complet") setError("Ce salon est déjà complet.");
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, user]);

  useEffect(() => {
    const unsub = subscribeToRoom(
      code,
      (data) => setRoom(data),
      () => setError("Connexion au salon perdue.")
    );
    const unsubChat = subscribeToChat(code, setMessages);
    return () => {
      unsub();
      unsubChat();
    };
  }, [code]);

  const seat =
    room && user
      ? room.players.P1?.uid === user.uid
        ? "P1"
        : room.players.P2?.uid === user.uid
        ? "P2"
        : null
      : null;

  const voice = useVoiceCall(code, seat);

  const handleCellClick = useCallback(
    (index) => {
      if (!room || !seat || room.game.winner) return;
      if (room.game.turn !== seat) return;
      const next = playCell(room.game, index);
      if (next !== room.game) updateGameState(code, next);
    },
    [room, seat, code]
  );

  async function handleSend(text) {
    await sendChatMessage(code, {
      uid: user.uid,
      name: profile?.displayName || user.displayName || "Joueur",
      avatarUrl: profile?.avatarUrl,
      text,
    });
  }

  async function handleRematch() {
    await requestRematch(code, seat);
  }

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // Dès que les deux joueurs ont demandé la revanche, on relance la partie.
  useEffect(() => {
    if (room?.rematch?.P1 && room?.rematch?.P2) {
      applyRematch(code, room.game.winner === "P1" ? "P2" : "P1");
    }
  }, [room?.rematch, code, room?.game.winner]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-red-400">{error}</p>
        <Link to="/online" className="text-emerald-500 hover:underline">
          Retour au lobby
        </Link>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-stone-400">Connexion au salon…</p>
      </div>
    );
  }

  const names = {
    P1: room.players.P1?.name || "Joueur 1",
    P2: room.players.P2?.name || "en attente…",
  };
  const waitingForOpponent = !room.players.P2;
  const playable = seat && room.game.turn === seat ? getPlayableCells(room.game) : [];

  return (
    <div className="min-h-screen flex flex-col items-center gap-6 px-6 py-8">
      <div className="w-full max-w-sm flex items-center justify-between">
        <Link to="/" className="text-stone-500 text-sm hover:text-stone-300">
          ← Quitter
        </Link>
        <button
          onClick={copyCode}
          className="text-xs bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-lg px-3 py-1.5 text-stone-200 font-mono tracking-widest"
        >
          {copied ? "Copié !" : `Code : ${code}`}
        </button>
      </div>

      <div className="w-full max-w-sm flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <Avatar url={room.players.P1?.avatarUrl} name={names.P1} size={36} />
          <span className="text-sm text-stone-300">{names.P1}</span>
        </div>
        <span className="text-stone-600 text-xs">vs</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-stone-300">{names.P2}</span>
          <Avatar url={room.players.P2?.avatarUrl} name={names.P2} size={36} />
        </div>
      </div>

      {!waitingForOpponent && (
        <VoiceCallBar code={code} mySeat={seat} voice={voice} opponentPresent={!waitingForOpponent} />
      )}

      {waitingForOpponent ? (
        <p className="text-stone-400 text-sm">
          En attente d'un adversaire… partage le code du salon pour l'inviter.
        </p>
      ) : (
        <StatusBar state={room.game} names={names} youAre={seat} />
      )}

      <Board
        board={room.game.board}
        playable={playable}
        selected={room.game.selected}
        winningLine={room.game.winningLine}
        onCellClick={handleCellClick}
        disabled={waitingForOpponent || room.game.turn !== seat}
      />

      {room.game.winner && (
        <button
          onClick={handleRematch}
          disabled={room.rematch?.[seat]}
          className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-xl transition-colors"
        >
          {room.rematch?.[seat] ? "En attente de l'adversaire…" : "Demander une revanche"}
        </button>
      )}

      <div className="w-full max-w-sm">
        <Chat messages={messages} onSend={handleSend} myUid={user?.uid} />
      </div>
    </div>
  );
}
