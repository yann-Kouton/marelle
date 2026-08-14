import { useState } from "react";
import { Link } from "react-router-dom";
import Board from "../components/Board";
import StatusBar from "../components/StatusBar";
import { createInitialState, getPlayableCells, playCell } from "../game/engine";

export default function Local() {
  const [state, setState] = useState(() => createInitialState());

  function handleCellClick(index) {
    setState((s) => playCell(s, index));
  }

  function restart() {
    setState(createInitialState(state.winner === "P1" ? "P2" : "P1"));
  }

  const playable = getPlayableCells(state);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 py-10">
      <Link to="/" className="text-stone-500 text-sm self-start hover:text-stone-300">
        ← Retour
      </Link>

      <StatusBar state={state} />

      <Board
        board={state.board}
        playable={playable}
        selected={state.selected}
        winningLine={state.winningLine}
        onCellClick={handleCellClick}
      />

      {state.winner && (
        <button
          onClick={restart}
          className="bg-emerald-700 hover:bg-emerald-600 text-white font-medium px-5 py-2.5 rounded-xl transition-colors"
        >
          Rejouer
        </button>
      )}

      <p className="text-xs text-stone-500 max-w-xs text-center">
        Placez vos 3 pions à tour de rôle, puis glissez-les vers une case adjacente libre
        pour aligner 3 pions.
      </p>
    </div>
  );
}
