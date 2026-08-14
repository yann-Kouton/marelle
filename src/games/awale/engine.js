// Moteur du jeu de l'Awalé (Awari / Awélé / Mancala à 2x6 trous).
//
// Plateau à 12 trous numérotés 0..11 :
//   - P1 possède les trous 0 à 5 (rangée du bas)
//   - P2 possède les trous 6 à 11 (rangée du haut)
// Le semis se fait en incrémentant l'index modulo 12 (sens antihoraire),
// en sautant le trou de départ s'il est recroisé lors d'un tour complet
// (règle standard de l'Awalé/Oware, pour éviter qu'un trou ne se resème
// indéfiniment lui-même).

export const PITS_P1 = [0, 1, 2, 3, 4, 5];
export const PITS_P2 = [6, 7, 8, 9, 10, 11];
export const SEEDS_TO_WIN = 25; // majorité sur 48 graines

// Calcule la séquence ordonnée des trous dans lesquels les graines de
// `pitIndex` vont être semées (sans modifier le plateau). Utilisé par
// l'UI pour animer le semis graine par graine.
export function computeSowPath(board, pitIndex) {
  let seeds = board[pitIndex];
  let idx = pitIndex;
  const path = [];
  while (seeds > 0) {
    idx = (idx + 1) % 12;
    if (idx === pitIndex) continue;
    path.push(idx);
    seeds -= 1;
  }
  return path;
}

function pitsOf(player) {
  return player === "P1" ? PITS_P1 : PITS_P2;
}

function otherPlayer(player) {
  return player === "P1" ? "P2" : "P1";
}

function rowTotal(board, player) {
  return pitsOf(player).reduce((sum, i) => sum + board[i], 0);
}

export function createInitialState(firstPlayer = "P1") {
  return {
    board: Array(12).fill(4),
    captured: { P1: 0, P2: 0 },
    turn: firstPlayer,
    winner: null, // null | "P1" | "P2" | "draw"
    lastMove: null, // { pit, capturedIndices } pour l'affichage
  };
}

// Distribue les graines du trou `pitIndex` et applique les captures.
// Fonction pure : ne modifie pas `board`/`captured` reçus en entrée.
function distributeAndCapture(board, captured, player, pitIndex) {
  const newBoard = [...board];
  let seeds = newBoard[pitIndex];
  newBoard[pitIndex] = 0;

  let idx = pitIndex;
  while (seeds > 0) {
    idx = (idx + 1) % 12;
    if (idx === pitIndex) continue; // on ne resème jamais son propre trou de départ
    newBoard[idx] += 1;
    seeds -= 1;
  }

  const lastIdx = idx;
  const opponent = otherPlayer(player);
  const newCaptured = { ...captured };
  const capturedIndices = [];

  if (pitsOf(opponent).includes(lastIdx)) {
    let cur = lastIdx;
    while (pitsOf(opponent).includes(cur) && (newBoard[cur] === 2 || newBoard[cur] === 3)) {
      newCaptured[player] += newBoard[cur];
      capturedIndices.push(cur);
      newBoard[cur] = 0;
      cur -= 1;
    }
  }

  return { board: newBoard, captured: newCaptured, capturedIndices };
}

// Les trous jouables par le joueur courant : les siens non vides, restreints
// par la règle "il est interdit d'affamer l'adversaire" si celui-ci est à sec.
export function getPlayableCells(state) {
  if (state.winner) return [];
  const player = state.turn;
  const own = pitsOf(player).filter((i) => state.board[i] > 0);
  const opponent = otherPlayer(player);

  if (rowTotal(state.board, opponent) > 0) return own;

  // L'adversaire est à sec : seuls les coups qui lui donnent au moins une
  // graine (après captures éventuelles) sont autorisés.
  return own.filter((i) => {
    const { board } = distributeAndCapture(state.board, state.captured, player, i);
    return rowTotal(board, opponent) > 0;
  });
}

// Ramasse toutes les graines restantes sur le plateau (chacun récupère
// celles de sa propre rangée) et détermine le vainqueur.
function sweepAndFinish(state) {
  const board = [...state.board];
  const captured = { ...state.captured };
  for (const i of PITS_P1) {
    captured.P1 += board[i];
    board[i] = 0;
  }
  for (const i of PITS_P2) {
    captured.P2 += board[i];
    board[i] = 0;
  }
  let winner;
  if (captured.P1 > captured.P2) winner = "P1";
  else if (captured.P2 > captured.P1) winner = "P2";
  else winner = "draw";
  return { ...state, board, captured, winner };
}

export function sow(state, pitIndex) {
  if (state.winner) return state;
  if (getPlayableCells(state).length === 0) return sweepAndFinish(state);
  const player = state.turn;
  if (!getPlayableCells(state).includes(pitIndex)) return state;

  const { board, captured, capturedIndices } = distributeAndCapture(
    state.board,
    state.captured,
    player,
    pitIndex
  );

  const nextState = {
    ...state,
    board,
    captured,
    turn: otherPlayer(player),
    lastMove: { pit: pitIndex, capturedIndices },
  };

  if (captured[player] >= SEEDS_TO_WIN) {
    return sweepAndFinish(nextState);
  }
  if (getPlayableCells(nextState).length === 0) {
    return sweepAndFinish(nextState);
  }
  return nextState;
}
