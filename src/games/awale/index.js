import * as engine from "./engine";
import Board from "./Board";
import StatusBar from "./StatusBar";

export const awaleGame = {
  id: "awale",
  label: "Awalé",
  aka: "Awari · Awélé · Mancala",
  shortDescription: "Sème et capture les graines — calcul pur, sans hasard.",
  instructions:
    "Choisis un de tes trous : ses graines sont semées une à une dans les trous suivants. Si la dernière graine posée termine dans un trou adverse contenant alors 2 ou 3 graines, tu les captures.",
  minPlayers: 2,
  maxPlayers: 2,
  createInitialState: engine.createInitialState,
  applyMove: engine.sow,
  getPlayableCells: engine.getPlayableCells,
  BoardComponent: Board,
  StatusBarComponent: StatusBar,
};
