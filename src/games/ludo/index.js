import * as engine from "./engine";
import Board from "./Board";
import StatusBar from "./StatusBar";

export const ludoGame = {
  id: "ludo",
  label: "Ludo",
  aka: "Petits Chevaux",
  shortDescription: "Fais sortir tes 4 pions du nid et ramène-les à la maison — au dé.",
  instructions:
    "Lance le dé : un 6 fait sortir un pion du nid et permet de relancer. Avance tes pions " +
    "d'autant de cases que le dé l'indique, capture un pion adverse en te posant sur sa case " +
    "(sauf case sûre), et ramène tes 4 pions à la maison avec un chiffre exact pour gagner.",
  minPlayers: 2,
  maxPlayers: 2,
  createInitialState: engine.createInitialState,
  applyMove: engine.applyMove,
  getPlayableCells: engine.getPlayableCells,
  BoardComponent: Board,
  StatusBarComponent: StatusBar,
};
