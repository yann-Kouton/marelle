import { marelleGame } from "./marelle";
import { awaleGame } from "./awale";
import { ludoGame } from "./ludo";

export const GAMES = [marelleGame, awaleGame, ludoGame];

export const GAMES_BY_ID = Object.fromEntries(GAMES.map((g) => [g.id, g]));
