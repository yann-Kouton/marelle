import { useEffect, useRef, useState } from "react";
import { PITS_P1, PITS_P2, SEEDS_TO_WIN, computeSowPath } from "./engine";

// Rangée du haut affichée de droite à gauche pour respecter le sens de
// semis antihoraire visible sur un vrai plateau (P2 face au joueur).
const TOP_ORDER = [...PITS_P2].reverse();
const BOTTOM_ORDER = [...PITS_P1];

const SEED_TONES = ["#e4cd97", "#cfa85f", "#a97a3c", "#8a5a35", "#c98f4a"];

function seededRand(n) {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// Poussière dorée flottant sur le plateau — positions stables (calculées une
// seule fois) pour une ambiance scintillante sans re-render inutile.
const BOARD_SPARKLES = Array.from({ length: 18 }).map((_, i) => {
  const r1 = seededRand(i * 3.17 + 1.3);
  const r2 = seededRand(i * 7.71 + 4.9);
  const r3 = seededRand(i * 11.31 + 9.2);
  return {
    top: `${5 + r1 * 90}%`,
    left: `${3 + r2 * 94}%`,
    size: 2 + Math.round(r3 * 2),
    delay: (r1 * 3.2).toFixed(2),
    duration: (2.1 + r2 * 2.6).toFixed(2),
  };
});

// Position façon "tas de graines" : spirale de phyllotaxie (angle d'or),
// pour un remplissage organique du trou quel que soit le nombre de graines.
function seedPosition(i, total, radiusPct) {
  const angle = i * 137.50776 * (Math.PI / 180);
  const r = total > 1 ? radiusPct * Math.sqrt(i / (total - 1)) : 0;
  return { x: r * Math.cos(angle), y: r * Math.sin(angle) };
}

function SeedPile({ pitIndex, count, justLanded, lifting, capturing }) {
  const seeds = [];
  for (let i = 0; i < count; i++) {
    const { x, y } = seedPosition(i, count, 34);
    const rot = seededRand(pitIndex * 97 + i * 13) * 70 - 35;
    const tone = SEED_TONES[Math.floor(seededRand(pitIndex * 31 + i * 7) * SEED_TONES.length)];
    const isNew = justLanded === i;
    const cls = capturing ? "seed-capture" : lifting ? "seed-lift" : isNew ? "seed-land" : "";
    seeds.push(
      <span
        key={i}
        className={`absolute rounded-[45%] ${cls}`}
        style={{
          left: `${50 + x}%`,
          top: `${50 + y}%`,
          width: "23%",
          aspectRatio: "1.35 / 1",
          transform: `translate(-50%, -50%) rotate(${rot}deg)`,
          background: `radial-gradient(circle at 32% 28%, ${tone}, #4a2f1a 88%)`,
          boxShadow: "0 1px 1.5px rgba(0,0,0,0.55), inset 0 0.5px 0 rgba(255,255,255,0.35)",
          "--seed-rot": `${rot}deg`,
        }}
      />
    );
  }
  return <>{seeds}</>;
}

export default function Board({ state, playable = [], onCellClick, disabled = false }) {
  const { board, captured, lastMove } = state;
  const persistentCaptured = lastMove?.capturedIndices || [];

  const [displayBoard, setDisplayBoard] = useState(board);
  const [animating, setAnimating] = useState(false);
  const [landedPit, setLandedPit] = useState(null); // { index, seedIdx }
  const [liftingPit, setLiftingPit] = useState(null);
  const [capturingPits, setCapturingPits] = useState([]);
  const prevBoardRef = useRef(board);
  const timeoutsRef = useRef([]);

  useEffect(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    const schedule = (fn, ms) => {
      const id = setTimeout(fn, ms);
      timeoutsRef.current.push(id);
    };

    const newBoard = board;

    if (!lastMove) {
      // Nouvelle partie / restauration : pas d'animation, on synchronise.
      setDisplayBoard(newBoard);
      setAnimating(false);
      setLiftingPit(null);
      setCapturingPits([]);
      prevBoardRef.current = newBoard;
      return;
    }

    const oldBoard = prevBoardRef.current;
    const pit = lastMove.pit;
    const path = computeSowPath(oldBoard, pit);
    const stepMs = Math.max(45, Math.min(140, 650 / Math.max(path.length, 1)));

    setAnimating(true);
    const lifted = [...oldBoard];
    lifted[pit] = 0;
    setLiftingPit(pit);
    setDisplayBoard(lifted);

    schedule(() => setLiftingPit(null), 190);

    let running = [...lifted];
    path.forEach((idx, step) => {
      schedule(() => {
        running = [...running];
        running[idx] += 1;
        setDisplayBoard(running);
        setLandedPit({ index: idx, seedIdx: running[idx] - 1 });
      }, 200 + step * stepMs);
    });

    const sowEnd = 200 + path.length * stepMs;

    schedule(() => setLandedPit(null), sowEnd + 120);

    if (lastMove.capturedIndices?.length) {
      schedule(() => setCapturingPits(lastMove.capturedIndices), sowEnd + 150);
      schedule(() => {
        setDisplayBoard(newBoard);
        setCapturingPits([]);
        setAnimating(false);
      }, sowEnd + 150 + 500);
    } else {
      schedule(() => {
        setDisplayBoard(newBoard);
        setAnimating(false);
      }, sowEnd + 150);
    }

    prevBoardRef.current = newBoard;
    return () => timeoutsRef.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function renderPit(i) {
    const seeds = displayBoard[i];
    const isPlayable = playable.includes(i) && !animating;
    const wasCaptured = persistentCaptured.includes(i);
    const isCapturingNow = capturingPits.includes(i);
    const isLifting = liftingPit === i;
    const justLanded = landedPit?.index === i ? landedPit.seedIdx : null;

    return (
      <button
        key={i}
        type="button"
        onClick={() => onCellClick?.(i)}
        disabled={disabled || !isPlayable}
        className={`relative w-full max-w-[5.5rem] sm:max-w-[6rem] aspect-square mx-auto rounded-full transition-transform
          ${isPlayable ? "hover:-translate-y-0.5 cursor-pointer" : "cursor-default"}
          ${isPlayable ? "active:translate-y-0" : ""}
          ${justLanded !== null ? "pit-pulse" : ""}
        `}
        style={{
          background: "radial-gradient(circle at 35% 28%, #46291a, #170c07 74%)",
          boxShadow: isPlayable
            ? "inset 0 4px 8px rgba(0,0,0,0.75), inset 0 -2px 4px rgba(255,255,255,0.08), inset 0 0 0 1.5px rgba(217,153,45,0.4), 0 0 0 3px rgba(217,153,45,0.65), 0 0 16px 2px rgba(217,153,45,0.4)"
            : "inset 0 4px 8px rgba(0,0,0,0.75), inset 0 -2px 4px rgba(255,255,255,0.08), inset 0 0 0 1.5px rgba(217,153,45,0.2)",
          outline: wasCaptured && !isCapturingNow ? "2px solid rgba(251,191,36,0.55)" : "none",
          outlineOffset: "2px",
        }}
        aria-label={`Trou ${i + 1}, ${seeds} graine${seeds > 1 ? "s" : ""}`}
      >
        {/* Reflet vitré doré, pour un aspect "coupe précieuse" */}
        <span
          className="absolute inset-0 rounded-full pointer-events-none pit-gleam"
          style={{ background: "radial-gradient(circle at 30% 16%, rgba(255,238,200,0.16), transparent 48%)" }}
        />
        <SeedPile
          pitIndex={i}
          count={seeds}
          justLanded={justLanded}
          lifting={isLifting}
          capturing={isCapturingNow}
        />
                    <span
          className="absolute left-1/2 -translate-x-1/2 top-full mt-1 sm:mt-1.5 flex items-center justify-center rounded-full min-w-[1rem] h-4 sm:min-w-[1.3rem] sm:h-[1.3rem] text-[9px] sm:text-sm font-bold tabular-nums text-stone-100 pointer-events-none"
          style={{
            padding: "0 0.15rem",
            background: "linear-gradient(155deg, #5a3a20, #2c1a0d)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.15), 0 0 0 1.5px rgba(217,153,45,0.55)",
          }}
        >
          {seeds}
        </span>
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-2xl mx-auto">
      <StatusStrip turn={state.turn} winner={state.winner} />

      <div className="relative w-full">
        {/* Aura dorée pulsante derrière le plateau */}
        <div
          className="absolute -inset-4 sm:-inset-7 rounded-[2.5rem] board-aura pointer-events-none"
          style={{
            background: "radial-gradient(60% 85% at 50% 40%, rgba(217,153,45,0.4), transparent 72%)",
            filter: "blur(20px)",
          }}
        />

        <div
          className="relative overflow-hidden flex w-full items-stretch gap-1.5 sm:gap-4 p-2 sm:p-6 rounded-[1.75rem]"
          style={{
            background:
              "radial-gradient(140% 160% at 25% -10%, rgba(255,255,255,0.07), transparent 55%), repeating-linear-gradient(100deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 4px), linear-gradient(155deg, #8a5a34 0%, #6b4226 45%, #4a2d17 100%)",
            boxShadow:
              "inset 0 2px 3px rgba(255,255,255,0.12), inset 0 -10px 20px rgba(0,0,0,0.45), 0 0 0 1.5px rgba(217,153,45,0.3), 0 20px 45px -16px rgba(0,0,0,0.65)",
            border: "1px solid rgba(0,0,0,0.35)",
          }}
        >
          {/* Balayage lumineux façon vernis précieux */}
          <div className="absolute inset-0 board-shimmer pointer-events-none" />

          {/* Poussière dorée scintillante */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[1.75rem]">
            {BOARD_SPARKLES.map((s, i) => (
              <span
                key={i}
                className="absolute rounded-full board-sparkle"
                style={{
                  top: s.top,
                  left: s.left,
                  width: s.size,
                  height: s.size,
                  background: "#ffe9b8",
                  boxShadow: "0 0 6px 1.5px rgba(255,214,120,0.85)",
                  animationDelay: `${s.delay}s`,
                  animationDuration: `${s.duration}s`,
                }}
              />
            ))}
          </div>

          <Store player="P2" count={captured.P2} turn={state.turn} winner={state.winner} />

          <div className="relative flex flex-1 min-w-0 flex-col justify-between gap-3 sm:gap-4 py-1">
            <div className="grid grid-cols-6 gap-1 sm:gap-4">{TOP_ORDER.map(renderPit)}</div>
            <div
              className="h-px w-full rounded-full"
              style={{ background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.4) 15%, rgba(217,153,45,0.35) 50%, rgba(0,0,0,0.4) 85%, transparent)" }}
            />
            <div className="grid grid-cols-6 gap-1 sm:gap-4">{BOTTOM_ORDER.map(renderPit)}</div>
          </div>

          <Store player="P1" count={captured.P1} turn={state.turn} winner={state.winner} />
        </div>
      </div>
    </div>
  );
}

function Store({ player, count, turn, winner }) {
  const isActive = !winner && turn === player;
  const color = player === "P1" ? "var(--p1-color, #4C6FCC)" : "var(--p2-color, #D69A2D)";
  const prevCount = useRef(count);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (count !== prevCount.current) {
      setPulse(true);
      const id = setTimeout(() => setPulse(false), 420);
      prevCount.current = count;
      return () => clearTimeout(id);
    }
  }, [count]);

  return (
    <div className="relative flex flex-col items-center justify-between gap-2 w-9 sm:w-[5.75rem] shrink-0">
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: color, boxShadow: isActive ? `0 0 8px ${color}` : "none" }}
      />
      <div
        className={`relative flex-1 w-full rounded-[1.4rem] overflow-hidden ${pulse ? "store-pulse" : ""}`}
        style={{
          background: "radial-gradient(circle at 35% 22%, #46291a, #170c07 76%)",
          boxShadow: `inset 0 3px 8px rgba(0,0,0,0.75), inset 0 -2px 3px rgba(255,255,255,0.05), inset 0 0 0 1.5px rgba(217,153,45,0.2)${
            isActive ? `, 0 0 0 2px ${color}55, 0 0 14px 1px ${color}55` : ""
          }`,
        }}
      >
        <span
          className="absolute inset-0 pointer-events-none pit-gleam"
          style={{ background: "radial-gradient(circle at 30% 14%, rgba(255,238,200,0.14), transparent 45%)" }}
        />
        <SeedPile pitIndex={player === "P1" ? 100 : 200} count={Math.min(count, 25)} />
      </div>
      <span className="text-xs sm:text-sm font-medium text-stone-300 tabular-nums">
        {count}/{SEEDS_TO_WIN}
      </span>
    </div>
  );
}

function StatusStrip({ turn, winner }) {
  if (winner) return null;
  const color = turn === "P1" ? "var(--p1-color, #4C6FCC)" : "var(--p2-color, #D69A2D)";
  return (
    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-stone-400">
      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
      {turn === "P1" ? "Tour du Joueur 1" : "Tour du Joueur 2"}
    </div>
  );
}