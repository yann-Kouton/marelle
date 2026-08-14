import { useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { RotateCcw } from "lucide-react";
import BackLink from "../components/BackLink";
import { GAMES_BY_ID } from "../games/registry";

export default function GameLocal() {
  const { gameId } = useParams();
  const game = GAMES_BY_ID[gameId];
  const [state, setState] = useState(() => game?.createInitialState());

  if (!game) return <Navigate to="/" replace />;

  const { BoardComponent, StatusBarComponent } = game;

  function handleCellClick(index) {
    setState((s) => game.applyMove(s, index));
  }

  function restart() {
    const nextFirst = state.winner === "P1" ? "P2" : "P1";
    setState(game.createInitialState(nextFirst));
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

      {game.instructions && (
        <p className="text-xs text-stone-500 max-w-xs text-center">{game.instructions}</p>
      )}
    </div>
  );
}
