import { useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { RotateCcw } from "lucide-react";
import BackLink from "../components/BackLink";
import { GAMES_BY_ID, createGameState } from "../games/registry";

export default function GameLocal() {
  const { gameId } = useParams();
  const game = GAMES_BY_ID[gameId];
  const variablePlayers = Boolean(game) && game.minPlayers !== game.maxPlayers;

  const [numPlayers, setNumPlayers] = useState(game?.minPlayers ?? 2);
  const [started, setStarted] = useState(!variablePlayers);
  const [state, setState] = useState(() => (variablePlayers || !game ? null : createGameState(game, 2)));

  if (!game) return <Navigate to="/" replace />;

  const { BoardComponent, StatusBarComponent } = game;

  function newState(firstPlayer = "P1") {
    return createGameState(game, numPlayers, firstPlayer);
  }

  function handleCellClick(index) {
    setState((s) => game.applyMove(s, index));
  }

  function restart() {
    const rotation = state.players || ["P1", "P2"];
    const idx = rotation.indexOf(state.winner);
    const nextFirst = idx === -1 ? rotation[0] : rotation[(idx + 1) % rotation.length];
    setState(newState(nextFirst));
  }

  function startGame() {
    setState(newState());
    setStarted(true);
  }

  if (variablePlayers && !started) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-6 py-10">
        <BackLink to={`/games/${gameId}`} className="self-start">
          {game.label}
        </BackLink>

        <div className="text-center">
          <h1 className="text-2xl font-semibold text-stone-100">Combien de joueurs ?</h1>
          <p className="text-stone-500 text-sm mt-1">Même écran, chacun joue à son tour.</p>
        </div>

        <div className="flex items-center gap-3">
          {Array.from(
            { length: game.maxPlayers - game.minPlayers + 1 },
            (_, i) => game.minPlayers + i
          ).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNumPlayers(n)}
              className={`w-16 h-16 rounded-2xl text-2xl font-semibold border transition-colors ${
                numPlayers === n
                  ? "bg-emerald-700 border-emerald-600 text-white"
                  : "bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700"
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        {game.playerColorLabels && (
          <div className="flex items-center gap-3 text-xs text-stone-500">
            {Object.keys(game.playerColorLabels)
              .slice(0, numPlayers)
              .map((p) => (
                <span key={p}>{game.playerColorLabels[p]}</span>
              ))}
          </div>
        )}

        <button
          onClick={startGame}
          className="bg-emerald-700 hover:bg-emerald-600 text-white font-medium px-8 py-3 rounded-xl transition-colors"
        >
          Commencer
        </button>
      </div>
    );
  }

  const playable = game.getPlayableCells(state);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 py-10">
      <BackLink to={`/games/${gameId}`} className="self-start">
        {game.label}
      </BackLink>

      <StatusBarComponent state={state} />

      <BoardComponent state={state} playable={playable} onCellClick={handleCellClick} />

      {state.winner && (
        <button
          onClick={restart}
          className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white font-medium px-5 py-2.5 rounded-xl transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Rejouer
        </button>
      )}

      {variablePlayers && !state.winner && (
        <button
          onClick={() => setStarted(false)}
          className="text-xs text-stone-500 hover:text-stone-300 transition-colors"
        >
          Changer le nombre de joueurs
        </button>
      )}

      {game.instructions && (
        <p className="text-xs text-stone-500 max-w-xs text-center">{game.instructions}</p>
      )}
    </div>
  );
}
