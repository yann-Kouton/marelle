// Moteur du jeu du Ludo (Petits Chevaux), 2 à 4 joueurs.
//
// Position d'un pion, un entier :
//   -1        : dans le nid (pas encore sorti)
//   0..50     : sur l'anneau commun de 52 cases, en distance *relative* au
//               départ du joueur (case globale = (START[joueur] + pos) % 52)
//   51..56    : dans le couloir final (6 cases), propre à chaque couleur
//   56        : arrivée (le pion est rentré)
// Un pion termine son parcours en atteignant exactement 56 — un dépassement
// est un coup interdit (il faut le chiffre exact, comme au vrai Ludo).
//
// Simplification assumée (annoncée dans les règles affichées en jeu) : les
// pions d'un même joueur peuvent partager une case (pas de blocage par
// embouteillage), et il n'y a pas de règle des "trois 6 d'affilée" — un 6
// rejoue toujours. Le reste (cases sûres, capture qui fait aussi rejouer,
// sortie sur 6, entrée exacte dans le couloir) suit les règles classiques.
// La partie s'arrête dès qu'un joueur a rentré ses 4 pions (pas de classement
// pour les places suivantes).

export const RING_LENGTH = 52;
export const HOME_STRETCH_START = 51; // 1re case du couloir final (relatif)
export const FINISH = 56; // position relative d'arrivée
export const PAWNS_PER_PLAYER = 4;

// Les 4 sièges possibles, dans l'ordre de jeu par défaut. À 2 ou 3 joueurs,
// on utilise un sous-ensemble (les 2/3 premiers), toujours dans cet ordre.
export const ALL_PLAYERS = ["P1", "P2", "P3", "P4"];

// Cases de départ de chaque couleur sur l'anneau commun (0, 13, 26, 39 :
// espacées régulièrement sur les 52 cases, un quart de tour à chaque fois).
export const START = { P1: 0, P2: 26, P3: 13, P4: 39 };

// Cases sûres classiques (départs + étoiles), aucune capture n'y a lieu.
export const SAFE_CELLS = [0, 8, 13, 21, 26, 34, 39, 47];

export function createInitialState(numPlayers = 2, firstPlayer = "P1") {
  const players = ALL_PLAYERS.slice(0, Math.max(2, Math.min(4, numPlayers)));
  const positions = {};
  players.forEach((p) => {
    positions[p] = [-1, -1, -1, -1];
  });
  return {
    players,
    positions,
    turn: players.includes(firstPlayer) ? firstPlayer : players[0],
    winner: null,
    dice: null,
    mustRoll: true,
    lastMove: null, // { type: "roll"|"move", dice, pawn, from, to, capturedIndices } pour l'UI
  };
}

// Prochain joueur dans l'ordre du tour (cycle sur state.players).
function nextPlayer(state, from = state.turn) {
  const players = state.players || ALL_PLAYERS.slice(0, 2);
  const idx = players.indexOf(from);
  return players[(idx + 1) % players.length];
}

// Une case de l'anneau (0..50, PAS 51..56) exprimée en position globale
// (0..51), pour savoir si elle est sûre / occupée par un adversaire.
function globalCell(player, relPos) {
  if (relPos < 0 || relPos > 50) return null;
  return (START[player] + relPos) % RING_LENGTH;
}

// Le pion `pawn` (position relative) peut-il avancer de `dice` cases ?
function canMove(pawn, dice) {
  if (pawn === FINISH) return false;
  if (pawn === -1) return dice === 6;
  return pawn + dice <= FINISH;
}

function movablePawns(state, player, dice) {
  return state.positions[player]
    .map((pawn, i) => i)
    .filter((i) => canMove(state.positions[player][i], dice));
}

// Envoie au nid tout pion adverse (toutes couleurs confondues) présent sur
// la case globale visée (sauf case sûre). Retourne les pions capturés (pour
// l'UI) sous la forme [{ player, index }, ...].
function applyCapture(state, positions, player, landedGlobalCell) {
  if (landedGlobalCell === null || SAFE_CELLS.includes(landedGlobalCell)) {
    return { positions, capturedIndices: [] };
  }
  let nextPositions = positions;
  const capturedIndices = [];
  state.players.forEach((opponent) => {
    if (opponent === player) return;
    let changed = false;
    const newPawns = nextPositions[opponent].map((pawn, i) => {
      if (pawn >= 0 && pawn <= 50 && globalCell(opponent, pawn) === landedGlobalCell) {
        changed = true;
        capturedIndices.push({ player: opponent, index: i });
        return -1;
      }
      return pawn;
    });
    if (changed) nextPositions = { ...nextPositions, [opponent]: newPawns };
  });
  return { positions: nextPositions, capturedIndices };
}

function hasWon(positions, player) {
  return positions[player].every((pawn) => pawn === FINISH);
}

// Coups valides pour l'état courant : `"roll"` s'il faut lancer le dé,
// sinon la liste des index de pions déplaçables avec le dé déjà obtenu.
export function getPlayableCells(state) {
  if (state.winner) return [];
  if (state.mustRoll) return ["roll"];
  return movablePawns(state, state.turn, state.dice);
}

// payload : `"roll"` pour lancer le dé, ou l'index (0..3) du pion à jouer.
export function applyMove(state, payload) {
  if (state.winner) return state;
  const player = state.turn;

  if (payload === "roll") {
    if (!state.mustRoll) return state;
    const dice = 1 + Math.floor(Math.random() * 6);
    const playable = movablePawns(state, player, dice);

    if (playable.length === 0) {
      // Aucun coup possible : la main passe, sauf sur un 6 qui rejoue.
      return {
        ...state,
        dice,
        mustRoll: true,
        turn: dice === 6 ? player : nextPlayer(state),
        lastMove: { type: "roll", dice, player, noMove: true },
      };
    }
    return {
      ...state,
      dice,
      mustRoll: false,
      lastMove: { type: "roll", dice, player },
    };
  }

  // Déplacement d'un pion (payload = index 0..3).
  if (state.mustRoll) return state;
  const dice = state.dice;
  if (!movablePawns(state, player, dice).includes(payload)) return state;

  const from = state.positions[player][payload];
  const to = from === -1 ? 0 : from + dice;
  const landedGlobal = to <= 50 ? globalCell(player, to) : null;

  const withPawnMoved = {
    ...state.positions,
    [player]: state.positions[player].map((p, i) => (i === payload ? to : p)),
  };
  const { positions, capturedIndices } = applyCapture(state, withPawnMoved, player, landedGlobal);

  const won = hasWon(positions, player);
  const playsAgain = dice === 6 || capturedIndices.length > 0;

  return {
    ...state,
    positions,
    winner: won ? player : null,
    dice: null,
    mustRoll: true,
    turn: won || playsAgain ? player : nextPlayer(state),
    lastMove: { type: "move", dice, player, pawn: payload, from, to, capturedIndices },
  };
}
