import { Trophy } from "lucide-react";

const DEFAULT_NAMES = { P1: "Joueur 1", P2: "Joueur 2", P3: "Joueur 3", P4: "Joueur 4" };

export default function StatusBar({ state, names = DEFAULT_NAMES, youAre = null }) {
  const { turn, winner, dice, mustRoll, lastMove } = state;

  let message;
  if (winner) {
    if (youAre) {
      message = winner === youAre ? "Tu remportes la partie !" : "Tu perds cette manche.";
    } else {
      message = `${names[winner]} remporte la partie.`;
    }
  } else if (mustRoll) {
    const passedForcement = lastMove?.type === "roll" && lastMove.noMove;
    message = passedForcement
      ? `${names[lastMove.player]} n'avait aucun coup possible — au tour de ${names[turn]}`
      : youAre === turn
      ? "Lance le dé"
      : `${names[turn]} lance le dé`;
  } else {
    message = youAre === turn ? `Déplace un pion (${dice})` : `${names[turn]} déplace un pion (${dice})`;
  }

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <p className="flex items-center gap-1.5 text-lg font-medium text-stone-100">
        {winner && <Trophy className="w-5 h-5 text-amber-400" />}
        {message}
      </p>
      {!winner && youAre && (
        <p className="text-xs uppercase tracking-wide text-stone-400">tu es {names[youAre]}</p>
      )}
    </div>
  );
}
