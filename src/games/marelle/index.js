import * as engine from "./engine";
import Board from "./Board";
import StatusBar from "./StatusBar";

export const marelleGame = {
  id: "marelle",
  label: "Carreau chinois",
  aka: "Tapatan · Achi · jeu du char",
  shortDescription: "Aligne tes 3 pions — pose puis déplacement, sans hasard.",
  instructions:
    "Placez vos 3 pions à tour de rôle, puis glissez-les vers une case adjacente libre pour aligner 3 pions.",
  minPlayers: 2,
  maxPlayers: 2,
  createInitialState: engine.createInitialState,
  applyMove: engine.playCell,
  getPlayableCells: engine.getPlayableCells,
  BoardComponent: Board,
  StatusBarComponent: StatusBar,
};
