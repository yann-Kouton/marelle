import { useState } from "react";
import { Link } from "react-router-dom";
import Board from "../components/Board";
import StatusBar from "../components/StatusBar";
import { createInitialState, getPlayableCells, playCell } from "../game/engine";

export default function Local() {
  // État du jeu
  const [state, setState] = useState(() => createInitialState());

  // État pour savoir si la partie a démarré
  const [gameStarted, setGameStarted] = useState(false);

  // État des pseudos (valeurs par défaut)
  const [names, setNames] = useState({
    P1: "Joueur 1",
    P2: "Joueur 2",
  });

  // Fonction appelée quand le formulaire est soumis
  function handleStartGame(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const p1 = formData.get("p1")?.trim() || "Joueur 1";
    const p2 = formData.get("p2")?.trim() || "Joueur 2";
    setNames({ P1: p1, P2: p2 });
    setGameStarted(true);
  }

  // Fonction pour rejouer (sans réinitialiser les pseudos)
  function restart() {
    // On alterne le premier joueur pour l'équité
    setState(createInitialState(state.winner === "P1" ? "P2" : "P1"));
  }

  function handleCellClick(index) {
    setState((s) => playCell(s, index));
  }

  const playable = getPlayableCells(state);

  // === Écran de saisie des pseudos (avant le début de la partie) ===
  if (!gameStarted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6">
        <Link to="/" className="text-stone-500 text-sm self-start hover:text-stone-300">
          ← Retour
        </Link>
        <h1 className="text-2xl font-semibold text-stone-100">Partie locale</h1>
        <form onSubmit={handleStartGame} className="w-full max-w-xs flex flex-col gap-4">
          <div>
            <label className="text-xs text-stone-400">Pseudo Joueur 1</label>
            <input
              name="p1"
              placeholder="Joueur 1"
              className="w-full mt-1 bg-stone-800 text-stone-100 placeholder-stone-500 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
          <div>
            <label className="text-xs text-stone-400">Pseudo Joueur 2</label>
            <input
              name="p2"
              placeholder="Joueur 2"
              className="w-full mt-1 bg-stone-800 text-stone-100 placeholder-stone-500 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
          <button
            type="submit"
            className="bg-emerald-700 hover:bg-emerald-600 text-white font-medium py-2.5 rounded-xl transition-colors"
          >
            Démarrer la partie
          </button>
        </form>
      </div>
    );
  }

  // === Écran de jeu (une fois la partie lancée) ===
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 py-10">
      <Link to="/" className="text-stone-500 text-sm self-start hover:text-stone-300">
        ← Retour
      </Link>

      {/* ON PASSE LES PSEUDOS À StatusBar */}
      <StatusBar state={state} names={names} />

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