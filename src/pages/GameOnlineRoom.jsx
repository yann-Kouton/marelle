import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { RotateCcw, Copy, Check } from "lucide-react";
import Chat from "../components/Chat";
import Avatar from "../components/Avatar";
import VoiceCallBar from "../components/VoiceCallBar";
import BackLink from "../components/BackLink";
import ChampionArrival from "../components/ChampionArrival";
import { RankedName, tierForRank, frameStyleFromId } from "../components/Rank";
import { useAuth } from "../hooks/useAuth";
import { useVoiceCall } from "../hooks/useVoiceCall";
import { GAMES_BY_ID } from "../games/registry";
import { getTopPlayers, recordWin } from "../firebase/leaderboard";
import {
  subscribeToRoom,
  subscribeToChat,
  updateGameState,
  sendChatMessage,
  joinRoom,
  requestRematch,
  applyRematch,
} from "../firebase/rooms";

const SEATS = ["P1", "P2", "P3", "P4"];

export default function GameOnlineRoom() {
  const { gameId, code } = useParams();
  const game = GAMES_BY_ID[gameId];
  const { user, profile } = useAuth();
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [top10, setTop10] = useState([]);
  const [arrivalQueue, setArrivalQueue] = useState([]);
  const prevPlayersRef = useRef(null);
  const prevWinnerRef = useRef(null);

  // Sièges réellement utilisés par ce salon (2 à 4 selon le jeu / le choix
  // fait à la création). Avant que `room` soit chargé, on suppose 2 (jeux à
  // nombre de joueurs fixe, cas le plus courant) pour l'affichage initial.
  const seats = SEATS.slice(0, room?.numPlayers || 2);

  // Classement mondial du jeu (Top 10), pour styliser les avatars/pseudos
  // et détecter l'arrivée d'un joueur Diamant/Or/Bronze dans le salon.
  useEffect(() => {
    if (!gameId) return;
    getTopPlayers(gameId, 10)
      .then(setTop10)
      .catch(() => {});
  }, [gameId]);

  function tierFor(uid) {
    if (!uid) return null;
    const idx = top10.findIndex((p) => p.uid === uid);
    return idx === -1 ? null : tierForRank(idx + 1);
  }

  function frameFor(player) {
    if (!player) return null;
    return tierFor(player.uid) || (player.equippedFrame ? frameStyleFromId(player.equippedFrame) : null);
  }

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

  const seat = room && user ? seats.find((s) => room.players[s]?.uid === user.uid) || null : null;

  // Annonce l'arrivée d'un joueur Diamant/Or/Bronze quand son siège passe de
  // vide à occupé (rejoint la partie ou reprend sa place après reconnexion).
  useEffect(() => {
    if (!room || top10.length === 0) {
      if (room) {
        const snapshot = {};
        seats.forEach((s) => {
          snapshot[s] = room.players[s];
        });
        prevPlayersRef.current = snapshot;
      }
      return;
    }
    const prev = prevPlayersRef.current;
    if (prev) {
      seats.forEach((seatKey) => {
        const wasEmpty = !prev[seatKey];
        const nowPlayer = room.players[seatKey];
        if (wasEmpty && nowPlayer) {
          const tier = tierFor(nowPlayer.uid);
          if (tier && tier.key !== "top10") {
            setArrivalQueue((q) => [...q, { name: nowPlayer.name, tier }]);
          }
        }
      });
    }
    const snapshot = {};
    seats.forEach((s) => {
      snapshot[s] = room.players[s];
    });
    prevPlayersRef.current = snapshot;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, top10]);

  // Enregistre la victoire en ligne du gagnant (une seule fois par partie,
  // uniquement depuis le client du gagnant lui-même).
  useEffect(() => {
    const winner = room?.game?.winner;
    if (!room || !seat || !winner) {
      if (room && !room.game.winner) prevWinnerRef.current = null;
      return;
    }
    if (winner !== "draw" && winner === seat && prevWinnerRef.current !== winner) {
      recordWin(gameId, user, profile).catch(() => {});
    }
    prevWinnerRef.current = winner;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.game?.winner, seat]);

  const allSeatsFilled = room ? seats.every((s) => room.players[s]) : false;
  // L'appel vocal (1 à 1) n'est proposé que pour les salons à 2 joueurs — le
  // généraliser à une conférence à plusieurs demanderait de refaire la
  // logique WebRTC (un seul appelant/répondant pour l'instant).
  const isTwoPlayerRoom = (room?.numPlayers || 2) === 2;
  const voice = useVoiceCall(code, seat, isTwoPlayerRoom && allSeatsFilled);

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

  // Dès que tous les joueurs du salon ont demandé la revanche, on relance.
  useEffect(() => {
    if (!room || seats.length === 0) return;
    const everyoneReady = seats.every((s) => room.rematch?.[s]);
    if (!everyoneReady) return;
    const idx = seats.indexOf(room.game.winner);
    const nextFirst = idx === -1 ? seats[0] : seats[(idx + 1) % seats.length];
    applyRematch(code, gameId, nextFirst, room.numPlayers || 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const names = {};
  seats.forEach((s, i) => {
    names[s] = room.players[s]?.name || (i === 0 ? "Joueur 1" : "en attente…");
  });
  const waitingForPlayers = !allSeatsFilled;
  const missingCount = seats.filter((s) => !room.players[s]).length;
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

      <div className="w-full max-w-sm flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-2">
        {seats.map((s, i) => (
          <div key={s} className="flex items-center gap-4">
            <div
              className={`flex items-center gap-2 rounded-full px-1.5 py-1 ${
                !waitingForPlayers && !winner && room.game.turn === s ? "ring-2 ring-emerald-600" : ""
              }`}
            >
              <Avatar url={room.players[s]?.avatarUrl} name={names[s]} size={36} frame={frameFor(room.players[s])} />
              <RankedName name={names[s]} tier={tierFor(room.players[s]?.uid)} className="text-sm text-stone-300" />
            </div>
            {i < seats.length - 1 && <span className="text-stone-600 text-xs">vs</span>}
          </div>
        ))}
      </div>

      {isTwoPlayerRoom && !waitingForPlayers && <VoiceCallBar voice={voice} opponentPresent={allSeatsFilled} />}

      {waitingForPlayers ? (
        <p className="text-stone-400 text-sm text-center">
          En attente de {missingCount > 1 ? `${missingCount} joueurs` : "1 joueur"}… partage le code du salon pour
          inviter.
        </p>
      ) : (
        <StatusBarComponent state={room.game} names={names} youAre={seat} />
      )}

      <BoardComponent
        state={room.game}
        playable={playable}
        onCellClick={handleCellClick}
        disabled={waitingForPlayers || room.game.turn !== seat}
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
            {room.rematch?.[seat] ? "En attente des autres joueurs…" : "Demander une revanche"}
          </button>
        </div>
      )}

      <div className="w-full max-w-sm">
        <Chat messages={messages} onSend={handleSend} myUid={user?.uid} />
      </div>

      <ChampionArrival
        event={arrivalQueue[0] || null}
        onDone={() => setArrivalQueue((q) => q.slice(1))}
      />
    </div>
  );
}
