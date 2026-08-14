import { Trophy } from "lucide-react";

export default function StatusBar({ state, names = { P1: "Joueur 1", P2: "Joueur 2" }, youAre = null }) {
  const { turn, winner } = state;

  let message;
  if (winner === "draw") {
    message = "Match nul — les graines sont réparties à égalité.";
  } else if (winner) {
    if (youAre) {
      message = winner === youAre ? "Tu remportes la partie !" : "Tu perds cette manche.";
    } else {
      message = `${names[winner]} remporte la partie.`;
    }
  } else {
    message = `${names[turn]} joue`;
  }

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <p className="flex items-center gap-1.5 text-lg font-medium text-stone-100">
        {winner && winner !== "draw" && <Trophy className="w-5 h-5 text-amber-400" />}
        {message}
      </p>
      {!winner && youAre && (
        <p className="text-xs uppercase tracking-wide text-stone-400">tu es {names[youAre]}</p>
      )}
    </div>
  );
}
