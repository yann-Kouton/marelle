import { marelleGame } from "./marelle";
import { awaleGame } from "./awale";

export const GAMES = [marelleGame, awaleGame];

export const GAMES_BY_ID = Object.fromEntries(GAMES.map((g) => [g.id, g]));
