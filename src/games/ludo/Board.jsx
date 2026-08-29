import { useEffect, useRef, useState } from "react";
import { HOME_STRETCH_START, FINISH, SAFE_CELLS, START } from "./engine";

// Le vrai plateau de Ludo : croix classique sur une grille 15x15 (une unité
// SVG = une case), avec les 4 zones colorées aux coins, l'anneau de 52
// cases, les couloirs finaux et le pinwheel central. Rendu en SVG plutôt
// qu'en divs positionnés en % : c'est ce format qui donne des cases nettes
// et alignées comme sur un vrai plateau, plutôt qu'un quadrillage approximatif.
//
// Ce tracé (PATH) est purement visuel — il n'est utilisé que pour placer
// les pions à l'écran. La logique du jeu (capture, cases sûres, victoire)
// reste entièrement dans engine.js, qui ne connaît que des positions
// abstraites (relatives 0..56, globales 0..51) sans notion de grille.
//
// Animation : un pion qui avance se déplace case par case le long du
// parcours réel — jamais un glissé direct vers la case d'arrivée — via de
// petits sauts espacés dans le temps (voir `stepPawn` dans Board), chaque
// saut restant animé en douceur par une transition CSS sur cx/cy. Le dé,
// lui, "tourne" quelques centaines de ms avant d'afficher la vraie valeur
// reçue de l'état du jeu.
const PATH = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7],
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14],
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7],
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0],
  [6, 0],
];

const RED = "#dc2626";
const GREEN = "#16a34a";
const YELLOW = "#eab308";
const BLUE = "#2563eb";

// P1 = vert (haut-gauche), P2 = bleu (bas-droite) — diagonalement opposés,
// comme leurs cases de départ (0 et 26) sur l'anneau. Rouge et jaune ne sont
// pas joués à 2 joueurs, mais restent dessinés : un vrai plateau garde ses
// 4 quartiers quel que soit le nombre de joueurs.
const COLORS = { P1: GREEN, P2: BLUE };
const DECOR = { yellow: YELLOW, red: RED };

// Couloirs finaux (5 cases avant le centre), dérivés géométriquement de la
// case de départ de chaque couleur — voir engine.js pour la correspondance
// des positions relatives 51..55.
const HOME_LANES = {
  P1: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  P2: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
};
const DECOR_LANES = {
  yellow: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  red: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
};

const YARD_ORIGIN = { P1: [0, 0], P2: [9, 9] };

function yardSlot(originRow, originCol, slot) {
  const dr = slot < 2 ? 1.8 : 4.2;
  const dc = slot % 2 === 0 ? 1.8 : 4.2;
  return [originRow + dr, originCol + dc];
}

function cellCenter([row, col]) {
  return { cx: col + 0.5, cy: row + 0.5 };
}

function pawnCell(player, pawn, slot) {
  if (pawn === -1) {
    const [row, col] = YARD_ORIGIN[player];
    return cellCenter(yardSlot(row, col, slot));
  }
  if (pawn === FINISH) {
    // Léger décalage pour ne pas empiler exactement les pions arrivés.
    const offset = (slot - 1.5) * 0.35;
    return { cx: 7.5 + offset, cy: 7.5 + offset * (player === "P1" ? 1 : -1) };
  }
  if (pawn >= HOME_STRETCH_START) {
    return cellCenter(HOME_LANES[player][pawn - HOME_STRETCH_START]);
  }
  return cellCenter(PATH[(START[player] + pawn) % 52]);
}

function Yard({ originRow, originCol, color }) {
  return (
    <g>
      <rect x={originCol} y={originRow} width={6} height={6} rx={0.5} fill={color} />
      <rect x={originCol + 1} y={originRow + 1} width={4} height={4} rx={0.4} fill="#f1e9d8" />
      {[0, 1, 2, 3].map((slot) => {
        const [row, col] = yardSlot(originRow, originCol, slot);
        return <circle key={slot} cx={col} cy={row} r={0.55} fill="none" stroke={color} strokeWidth={0.08} opacity={0.5} />;
      })}
    </g>
  );
}

const DIE_PIPS = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [25, 75], [75, 25], [75, 75]],
  5: [[25, 25], [25, 75], [50, 50], [75, 25], [75, 75]],
  6: [[25, 25], [25, 50], [25, 75], [75, 25], [75, 50], [75, 75]],
};

function Die({ value, active, onClick, disabled, rolling, rollFace, settling }) {
  const shown = rolling ? rollFace : value;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative w-14 h-14 rounded-xl border ${
        active && !rolling ? "border-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.35)] hover:-translate-y-0.5" : "border-stone-700"
      } ${disabled ? "cursor-default" : "cursor-pointer active:translate-y-0"} ${rolling ? "dice-rolling" : ""} ${
        settling ? "dice-settle" : ""
      }`}
      style={{ background: "linear-gradient(155deg, #292420, #17130f)" }}
      aria-label={rolling ? "Le dé roule…" : value ? `Dé : ${value}` : "Lancer le dé"}
    >
      {rolling || value ? (
        DIE_PIPS[shown].map(([x, y], i) => (
          <span
            key={i}
            className="absolute rounded-full bg-stone-100"
            style={{ left: `${x}%`, top: `${y}%`, width: "16%", aspectRatio: "1/1", transform: "translate(-50%, -50%)" }}
          />
        ))
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] uppercase tracking-wide text-stone-400">
          {active ? "Lancer" : "—"}
        </span>
      )}
    </button>
  );
}

// Durée alignée sur l'intervalle entre deux sauts (230ms) pour un pas net,
// case par case, plutôt qu'un survol continu.
const PAWN_TRANSITION = { transition: "cx 0.22s cubic-bezier(0.4, 0, 0.2, 1), cy 0.22s cubic-bezier(0.4, 0, 0.2, 1)" };

export default function Board({ state, playable = [], onCellClick, disabled = false }) {
  const { positions, turn, dice, mustRoll, winner, lastMove } = state;

  // --- Animation du dé : on "roule" localement quelques centaines de ms
  // avant de révéler la vraie valeur reçue via l'état (autoritaire, vient
  // du moteur / de Firestore en ligne — on ne fait qu'habiller son arrivée).
  const [rolling, setRolling] = useState(false);
  const [rollFace, setRollFace] = useState(1);
  const [settling, setSettling] = useState(false);
  const rollTimeouts = useRef([]);

  useEffect(() => {
    if (lastMove?.type !== "roll") return;
    rollTimeouts.current.forEach(clearTimeout);
    rollTimeouts.current = [];
    setRolling(true);
    setSettling(false);
    const faceInterval = setInterval(() => setRollFace(1 + Math.floor(Math.random() * 6)), 80);
    rollTimeouts.current.push(faceInterval);
    rollTimeouts.current.push(
      setTimeout(() => {
        clearInterval(faceInterval);
        setRolling(false);
        setSettling(true);
        rollTimeouts.current.push(setTimeout(() => setSettling(false), 300));
      }, 480)
    );
    return () => rollTimeouts.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMove]);

  // --- Animation du déplacement : le pion saute case par case le long du
  // parcours réel (une case à la fois, avec une petite pause entre chaque)
  // au lieu de glisser directement vers la case d'arrivée. `stepPawn`
  // mémorise la position *relative* affichée pendant le saut, pour le seul
  // pion en train de bouger — le reste du plateau suit `state.positions`
  // normalement. Rebond à l'arrivée et flash de capture ne se déclenchent
  // qu'une fois la dernière case atteinte.
  const [stepping, setStepping] = useState(false);
  const [stepPawn, setStepPawn] = useState(null); // { key, pos }
  const [landedKey, setLandedKey] = useState(null);
  const [captureFlash, setCaptureFlash] = useState(null);
  const stepTimeouts = useRef([]);
  const landTimeout = useRef(null);
  const flashTimeout = useRef(null);

  useEffect(() => {
    if (lastMove?.type !== "move") return;
    stepTimeouts.current.forEach(clearTimeout);
    stepTimeouts.current = [];
    clearTimeout(landTimeout.current);
    clearTimeout(flashTimeout.current);

    const { player, pawn: pawnIndex, from, to } = lastMove;
    const key = `${player}-${pawnIndex}`;

    const land = () => {
      setLandedKey(key);
      landTimeout.current = setTimeout(() => setLandedKey(null), 320);
      if (lastMove.capturedIndices?.length) {
        const { cx, cy } = pawnCell(player, to, pawnIndex);
        setCaptureFlash({ key: `${player}-${to}-${Date.now()}`, cx, cy });
        flashTimeout.current = setTimeout(() => setCaptureFlash(null), 550);
      }
    };

    // Sortie du nid : un seul saut direct sur la case de départ, rien à
    // égrainer case par case (il n'y a pas de case intermédiaire).
    if (from === -1 || to <= from) {
      setStepping(false);
      setStepPawn(null);
      land();
      return;
    }

    setStepping(true);
    let current = from;
    setStepPawn({ key, pos: current });

    const hop = () => {
      current += 1;
      setStepPawn({ key, pos: current });
      if (current < to) {
        stepTimeouts.current.push(setTimeout(hop, 230));
      } else {
        stepTimeouts.current.push(
          setTimeout(() => {
            setStepping(false);
            setStepPawn(null);
            land();
          }, 230)
        );
      }
    };
    stepTimeouts.current.push(setTimeout(hop, 230));

    return () => stepTimeouts.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMove]);

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto">
      <svg viewBox="0 0 15 15" className="w-full rounded-2xl" style={{ background: "#f1e9d8", boxShadow: "0 20px 45px -16px rgba(0,0,0,0.55)" }}>
        {/* Zones (nids) des 4 couleurs — rouge/jaune décoratifs (non joués à 2). */}
        <Yard originRow={0} originCol={0} color={GREEN} />
        <Yard originRow={0} originCol={9} color={DECOR.yellow} />
        <Yard originRow={9} originCol={0} color={DECOR.red} />
        <Yard originRow={9} originCol={9} color={BLUE} />

        {/* Couloirs finaux colorés */}
        {Object.entries(HOME_LANES).map(([player, cells]) =>
          cells.map(([row, col], i) => (
            <rect
              key={`${player}-lane-${i}`}
              x={col + 0.06}
              y={row + 0.06}
              width={0.88}
              height={0.88}
              fill={COLORS[player]}
              opacity={0.28}
            />
          ))
        )}
        {Object.entries(DECOR_LANES).map(([name, cells]) =>
          cells.map(([row, col], i) => (
            <rect
              key={`${name}-lane-${i}`}
              x={col + 0.06}
              y={row + 0.06}
              width={0.88}
              height={0.88}
              fill={DECOR[name]}
              opacity={0.28}
            />
          ))
        )}

        {/* Anneau des 52 cases */}
        {PATH.map(([row, col], i) => {
          const startColor =
            i === START.P1 ? GREEN : i === START.P2 ? BLUE : i === 13 ? DECOR.yellow : i === 39 ? DECOR.red : null;
          const isSafe = SAFE_CELLS.includes(i);
          return (
            <g key={i}>
              <rect
                x={col + 0.05}
                y={row + 0.05}
                width={0.9}
                height={0.9}
                rx={0.12}
                fill={startColor ? `${startColor}55` : isSafe ? "#fbbf2440" : "#ffffff"}
                stroke="#00000022"
                strokeWidth={0.03}
              />
              {isSafe && (
                <text x={col + 0.5} y={row + 0.72} fontSize={0.55} textAnchor="middle" fill="#b45309" opacity={0.75}>
                  ★
                </text>
              )}
            </g>
          );
        })}

        {/* Centre : pinwheel des 4 couleurs */}
        <polygon points="6,6 6,9 7.5,7.5" fill={GREEN} />
        <polygon points="6,6 9,6 7.5,7.5" fill={DECOR.yellow} />
        <polygon points="9,6 9,9 7.5,7.5" fill={BLUE} />
        <polygon points="6,9 9,9 7.5,7.5" fill={DECOR.red} />

        {/* Flash de capture */}
        {captureFlash && (
          <circle
            key={captureFlash.key}
            cx={captureFlash.cx}
            cy={captureFlash.cy}
            r={0.4}
            fill="none"
            stroke="#f87171"
            strokeWidth={0.12}
            className="capture-flash"
          />
        )}

        {/* Pions */}
        {["P1", "P2"].map((player) =>
          positions[player].map((pawn, i) => {
            const key = `${player}-${i}`;
            const shownPos = stepPawn?.key === key ? stepPawn.pos : pawn;
            const { cx, cy } = pawnCell(player, shownPos, i);
            const isMovable =
              turn === player && !mustRoll && playable.includes(i) && !disabled && !rolling && !stepping;
            const justLanded = landedKey === key;
            return (
              <g key={`${player}-${i}`}>
                {isMovable && (
                  <circle cx={cx} cy={cy} r={0.52} fill="none" stroke="#10b981" strokeWidth={0.1} style={PAWN_TRANSITION} />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={0.38}
                  fill={COLORS[player]}
                  stroke="#fff"
                  strokeWidth={0.08}
                  onClick={() => isMovable && onCellClick?.(i)}
                  className={justLanded ? "pawn-land" : ""}
                  style={{ ...PAWN_TRANSITION, cursor: isMovable ? "pointer" : "default" }}
                />
              </g>
            );
          })
        )}
      </svg>

      {!winner && (
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full" style={{ background: COLORS[turn] }} />
          <Die
            value={dice}
            active={playable.includes("roll")}
            disabled={disabled || !playable.includes("roll") || rolling || stepping}
            onClick={() => onCellClick?.("roll")}
            rolling={rolling}
            rollFace={rollFace}
            settling={settling}
          />
        </div>
      )}
    </div>
  );
}
