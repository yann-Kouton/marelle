import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { RotateCcw, Copy, Check } from "lucide-react";
import Chat from "../components/Chat";
import Avatar from "../components/Avatar";
import VoiceCallBar from "../components/VoiceCallBar";
import BackLink from "../components/BackLink";
import { useAuth } from "../hooks/useAuth";
import { useVoiceCall } from "../hooks/useVoiceCall";
import { GAMES_BY_ID } from "../games/registry";
import {
  subscribeToRoom,
  subscribeToChat,
  updateGameState,
  sendChatMessage,
  joinRoom,
  requestRematch,
  applyRematch,
} from "../firebase/rooms";

export default function GameOnlineRoom() {
  const { gameId, code } = useParams();
  const game = GAMES_BY_ID[gameId];
  const { user, profile } = useAuth();
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Tente de rejoindre le salon (ou de reprendre sa place) dès l'arrivée sur l'URL.
  useEffect(() => {
    if (!user || !game) return;
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
  }, [code, user, gameId]);

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
      if (!room || !game || !seat || room.game.winner) return;
      if (room.game.turn !== seat) return;
      const next = game.applyMove(room.game, index);
      if (next !== room.game) updateGameState(code, next);
    },
    [room, game, seat, code]
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
      const nextFirst = room.game.winner === "P1" ? "P2" : "P1";
      applyRematch(code, gameId, nextFirst);
    }
  }, [room?.rematch, code, gameId, room?.game.winner]);

  if (!game) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-red-400">Ce jeu n'existe pas.</p>
        <Link to="/" className="text-emerald-500 hover:underline">
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-red-400">{error}</p>
        <Link to={`/games/${gameId}/online`} className="text-emerald-500 hover:underline">
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

  if (room.gameId !== gameId) {
    const actualGame = GAMES_BY_ID[room.gameId];
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-red-400">
          Ce code correspond à un salon {actualGame?.label || "d'un autre jeu"}.
        </p>
        <Link
          to={actualGame ? `/games/${room.gameId}/online/${code}` : "/"}
          className="text-emerald-500 hover:underline"
        >
          {actualGame ? `Y aller (${actualGame.label})` : "Retour à l'accueil"}
        </Link>
      </div>
    );
  }

  const { BoardComponent, StatusBarComponent } = game;
  const names = {
    P1: room.players.P1?.name || "Joueur 1",
    P2: room.players.P2?.name || "en attente…",
  };
  const waitingForOpponent = !room.players.P2;
  const playable = seat && room.game.turn === seat ? game.getPlayableCells(room.game) : [];
  const winner = room.game.winner;

  let resultText = null;
  if (winner && seat) {
    if (winner === "draw") resultText = "Match nul.";
    else resultText = winner === seat ? "Bien joué, tu as gagné !" : "Pas cette fois — retente ta chance.";
  }

  return (
    <div className="min-h-screen flex flex-col items-center gap-6 px-6 py-8">
      <div className="w-full max-w-sm flex items-center justify-between">
        <BackLink to={`/games/${gameId}`}>Quitter</BackLink>
        <button
          onClick={copyCode}
          className="flex items-center gap-1.5 text-xs bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-lg px-3 py-1.5 text-stone-200 font-mono tracking-widest"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
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
        <StatusBarComponent state={room.game} names={names} youAre={seat} />
      )}

      <BoardComponent
        state={room.game}
        playable={playable}
        onCellClick={handleCellClick}
        disabled={waitingForOpponent || room.game.turn !== seat}
      />

      {winner && (
        <div className="flex flex-col items-center gap-1.5">
          {resultText && <p className="text-sm text-stone-400">{resultText}</p>}
          <button
            onClick={handleRematch}
            disabled={room.rematch?.[seat]}
            className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-xl transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            {room.rematch?.[seat] ? "En attente de l'adversaire…" : "Demander une revanche"}
          </button>
        </div>
      )}

      <div className="w-full max-w-sm">
        <Chat messages={messages} onSend={handleSend} myUid={user?.uid} />
      </div>
    </div>
  );
}
