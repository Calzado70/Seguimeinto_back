"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.msjConsole = exports.mensa = void 0;
var _colors = _interopRequireDefault(require("colors"));
/**
 * Este es menajes de la consola
 * @module crt-mensajes-consola
 */

/**
 * Imprime mensajes en la consola con formato específico según el tipo.
 * @param {string} tipo - Tipo de mensaje ("puertoSuccess" o "puertoError").
 * @param {string} mensaje - Mensaje a imprimir en la consola.
 */
var msjConsole = exports.msjConsole = function msjConsole(tipo, mensaje) {
  switch (tipo) {
    case "puertoSuccess":
      console.log(mensaje.bgGreen);
      break;
    case "puertoError":
      console.log(mensaje.bgRed);
    default:
      break;
  }
};

/**
 * Mensajes estáticos utilizados en el módulo de mensajes de consola.
 * @constant
 * @type {Object}
 * @property {string} puerto - Mensaje de puerto utilizado en la consola.
 */
var mensa = exports.mensa = {
  puerto: "Ejecutamdose en el puerto:"
};