/**
 * Este es menajes de la consola
 * @module crt-mensajes-consola
 */
import colors from "colors";

/**
 * Imprime mensajes en la consola con formato específico según el tipo.
 * @param {string} tipo - Tipo de mensaje ("puertoSuccess" o "puertoError").
 * @param {string} mensaje - Mensaje a imprimir en la consola.
 */
export const msjConsole = (tipo, mensaje) =>{
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
export const mensa = {
    puerto: "Ejecutamdose en el puerto:"
};
