// Moteur du jeu "Carreau chinois" (Three Men's Morris / Tapatan / Achi)
//
// Plateau à 9 intersections numérotées 0..8 :
//   0 - 1 - 2
//   |   |   |
//   3 - 4 - 5
//   |   |   |
//   6 - 7 - 8
// (le centre est relié en plus aux 4 coins par les diagonales)

export const ADJACENCY = {
  0: [1, 3, 4],
  1: [0, 2, 4],
  2: [1, 4, 5],
  3: [0, 4, 6],
  4: [0, 1, 2, 3, 5, 6, 7, 8],
  5: [2, 4, 8],
  6: [3, 4, 7],
  7: [4, 6, 8],
  8: [4, 5, 7],
};

export const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export const PIECES_PER_PLAYER = 3;

export function createInitialState(firstPlayer = "P1") {
  return {
    board: Array(9).fill(null), // null | "P1" | "P2"
    turn: firstPlayer, // "P1" | "P2"
    phase: "placement", // "placement" | "movement" | "over"
    placed: { P1: 0, P2: 0 },
    selected: null, // case sélectionnée en phase de déplacement
    winner: null, // null | "P1" | "P2"
    winningLine: null,
  };
}

export function checkWinner(board) {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[b] === board[c]) {
      return { winner: board[a], line };
    }
  }
  return null;
}

function otherPlayer(p) {
  return p === "P1" ? "P2" : "P1";
}

// Renvoie les cases jouables :
// - en phase de pose : toutes les cases vides
// - en phase de déplacement, sans case sélectionnée : les cases du joueur courant qui ont un voisin libre
// - en phase de déplacement, avec case sélectionnée : les voisins libres de cette case
export function getPlayableCells(state) {
  const { board, phase, turn, selected } = state;
  if (phase === "placement") {
    return board.map((v, i) => (v === null ? i : null)).filter((i) => i !== null);
  }
  if (phase === "movement") {
    if (selected === null) {
      return board
        .map((v, i) => (v === turn ? i : null))
        .filter((i) => i !== null)
        .filter((i) => ADJACENCY[i].some((n) => board[n] === null));
    }
    return ADJACENCY[selected].filter((n) => board[n] === null);
  }
  return [];
}

// Place un pion en phase de pose. Retourne un nouvel état.
export function placePiece(state, index) {
  if (state.phase !== "placement" || state.winner) return state;
  if (state.board[index] !== null) return state;

  const board = [...state.board];
  board[index] = state.turn;
  const placed = { ...state.placed, [state.turn]: state.placed[state.turn] + 1 };

  const win = checkWinner(board);
  if (win) {
    return { ...state, board, placed, winner: win.winner, winningLine: win.line, phase: "over" };
  }

  const allPlaced = placed.P1 === PIECES_PER_PLAYER && placed.P2 === PIECES_PER_PLAYER;
  const nextState = {
    ...state,
    board,
    placed,
    turn: otherPlayer(state.turn),
    phase: allPlaced ? "movement" : "placement",
  };
  return resolveBlockage(nextState);
}

// Sélectionne un pion à déplacer (phase de déplacement).
export function selectPiece(state, index) {
  if (state.phase !== "movement" || state.winner) return state;
  if (state.board[index] !== state.turn) return state;
  if (!ADJACENCY[index].some((n) => state.board[n] === null)) return state; // pion bloqué
  return { ...state, selected: index };
}

export function deselectPiece(state) {
  return { ...state, selected: null };
}

// Déplace le pion sélectionné vers `to`.
export function movePiece(state, to) {
  if (state.phase !== "movement" || state.winner) return state;
  if (state.selected === null) return state;
  if (state.board[to] !== null) return state;
  if (!ADJACENCY[state.selected].includes(to)) return state;

  const board = [...state.board];
  board[to] = state.turn;
  board[state.selected] = null;

  const win = checkWinner(board);
  if (win) {
    return { ...state, board, selected: null, winner: win.winner, winningLine: win.line, phase: "over" };
  }

  const nextState = { ...state, board, selected: null, turn: otherPlayer(state.turn) };
  return resolveBlockage(nextState);
}

// Si le joueur dont c'est le tour ne peut plus bouger aucun pion (phase de
// déplacement), il perd immédiatement — c'est la seule façon de "faire nul"
// dans ce jeu, donc on la transforme en victoire pour l'adversaire.
function resolveBlockage(state) {
  if (state.phase !== "movement" || state.winner) return state;
  if (getPlayableCells(state).length > 0) return state;
  return { ...state, winner: otherPlayer(state.turn), phase: "over", winningLine: null };
}

// Point d'entrée unique pratique pour l'UI : clique sur la case `index`.
export function playCell(state, index) {
  if (state.winner) return state;
  if (state.phase === "placement") return placePiece(state, index);

  // phase === "movement"
  if (state.selected === null) {
    return selectPiece(state, index);
  }
  if (index === state.selected) {
    return deselectPiece(state);
  }
  if (state.board[index] === state.turn) {
    return selectPiece(state, index);
  }
  return movePiece(state, index);
}

