const SIZE = 360;
const MARGIN = 40;
const STEP = (SIZE - MARGIN * 2) / 2;

const COORDS = Array.from({ length: 9 }, (_, i) => {
  const col = i % 3;
  const row = Math.floor(i / 3);
  return { x: MARGIN + col * STEP, y: MARGIN + row * STEP };
});

const EDGES = [
  [0, 1], [1, 2], [3, 4], [4, 5], [6, 7], [7, 8],
  [0, 3], [3, 6], [1, 4], [4, 7], [2, 5], [5, 8],
  [0, 4], [4, 8], [2, 4], [4, 6],
];

const PLAYER_COLOR = {
  P1: "var(--p1-color, #4C6FCC)",
  P2: "var(--p2-color, #D69A2D)",
};

export default function Board({
  board,
  playable = [],
  selected = null,
  winningLine = null,
  onCellClick,
  disabled = false,
}) {
  const isWinningEdge = (a, b) =>
    winningLine && winningLine.includes(a) && winningLine.includes(b);

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="w-full max-w-[360px] mx-auto select-none touch-none"
      role="img"
      aria-label="Plateau de la marelle à trois pions"
    >
      {EDGES.map(([a, b], i) => (
        <line
          key={i}
          x1={COORDS[a].x}
          y1={COORDS[a].y}
          x2={COORDS[b].x}
          y2={COORDS[b].y}
          stroke={isWinningEdge(a, b) ? "#4FA37A" : "#8A8578"}
          strokeWidth={isWinningEdge(a, b) ? 5 : 3}
          strokeLinecap="round"
        />
      ))}

      {COORDS.map((c, i) => {
        const occupant = board[i];
        const isPlayable = playable.includes(i);
        const isSelected = selected === i;
        return (
          <g
            key={i}
            onClick={() => !disabled && onCellClick?.(i)}
            style={{ cursor: disabled ? "default" : isPlayable ? "pointer" : "default" }}
          >
            <circle
              cx={c.x}
              cy={c.y}
              r={22}
              fill="transparent"
            />
            {!occupant && (
              <circle
                cx={c.x}
                cy={c.y}
                r={isPlayable ? 9 : 6}
                fill={isPlayable ? "#4FA37A" : "#B9B4A4"}
                opacity={isPlayable ? 0.9 : 0.6}
              />
            )}
            {occupant && (
              <circle
                cx={c.x}
                cy={c.y}
                r={16}
                fill={PLAYER_COLOR[occupant]}
                stroke={isSelected ? "#4FA37A" : "none"}
                strokeWidth={4}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
