import { marelleGame } from "./marelle";
import { awaleGame } from "./awale";
import { ludoGame } from "./ludo";

export const GAMES = [marelleGame, awaleGame, ludoGame];

export const GAMES_BY_ID = Object.fromEntries(GAMES.map((g) => [g.id, g]));

// Crée l'état initial d'une partie, en tenant compte des jeux à nombre de
// joueurs variable (ex. Ludo, 2 à 4) vs fixe (ex. Marelle, Awalé, toujours 2 :
// leur `createInitialState` ne prend que `firstPlayer`, sans `numPlayers`).
export function createGameState(game, numPlayers, firstPlayer = "P1") {
  return game.minPlayers !== game.maxPlayers
    ? game.createInitialState(numPlayers, firstPlayer)
    : game.createInitialState(firstPlayer);
}
