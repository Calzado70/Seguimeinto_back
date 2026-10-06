"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.success = exports.messageBrowse = exports.error = void 0;
var messageBrowse = exports.messageBrowse = {
  principal: "Bienvenido",
  home: "Hola home",
  gallery: "Hola gallery",
  about: "Hola about",
  contact: "Hola contact"
};
var success = exports.success = function success(req, res) {
  var status = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 200;
  var body = arguments.length > 3 ? arguments[3] : undefined;
  var message = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : null;
  var response = {
    error: false,
    status: status,
    body: body
  };
  if (message) response.message = message;
  res.status(status).json(response);
};
var error = exports.error = function error(req, res) {
  var status = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 500;
  var err = arguments.length > 3 ? arguments[3] : undefined;
  var message = err && err.message ? err.message : err;
  res.status(status).json({
    error: message,
    status: status,
    message: message
  });
};

// export const success = (req, res, status=200, mensaje = null) => {
//     res.status(status).json({
//         error: false,
//         status:status,
//         body:mensaje
//     })
// };

// export const error = (req, res, status=500, mensaje="")  => {
//     res.status(status).json({
//         error: true,
//         status:status,
//         body:mensaje
//     })
// };