export default function StatusBar({ state, names = { P1: "Joueur 1", P2: "Joueur 2" }, youAre = null }) {
  const { turn, phase, winner, placed } = state;

  let message;
  if (winner) {
    message = `${names[winner]} remporte la partie 🎉`;
  } else if (phase === "placement") {
    message = `${names[turn]} pose un pion (${placed[turn]}/3)`;
  } else {
    message = `${names[turn]} déplace un pion`;
  }

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <p className="text-lg font-medium text-stone-100">{message}</p>
      {!winner && (
        <p className="text-xs uppercase tracking-wide text-stone-400">
          Phase de {phase === "placement" ? "pose" : "déplacement"}
          {youAre && ` · tu es ${names[youAre]}`}
        </p>
      )}
    </div>
  );
}
