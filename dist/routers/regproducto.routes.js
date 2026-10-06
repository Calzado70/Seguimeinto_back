"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _express = require("express");
var _controller = require("../controllers/controller.producto");
var _oauth = require("../middleware/oauth");
var rutaProducto = (0, _express.Router)();

// METODO GET -- CONSULTAS
rutaProducto.get("/inventario", _oauth.verifyToken, _controller.consultar_inventario);
rutaProducto.get("/stock", _oauth.verifyToken, _controller.consultar_stock);
rutaProducto.get("/movi", _oauth.verifyToken, _controller.consultar_movimientos);
rutaProducto.get("/detalle", _oauth.verifyToken, _controller.obtener_detalle_sesion);
rutaProducto.get("/consumo-logistica", _oauth.verifyToken, _controller.consultarConsumoLogistica);
rutaProducto.get("/consumo-terminada-proceso", _oauth.verifyToken, _controller.consultarConsumoTerminadaProceso);

// METODO POST -- CREAR
rutaProducto.post("/inicio", _oauth.verifyToken, _controller.iniciar_sesion_escaneo);
rutaProducto.post("/agregar", _oauth.verifyToken, _controller.agregar_producto_sesion);
rutaProducto.post("/crear", _oauth.verifyToken, _controller.crear_producto);
rutaProducto.post("/consultar", _oauth.verifyToken, _controller.consultarCodigo);

// METODO PUT -- ACTUALIZAR
rutaProducto.put("/finalizar", _oauth.verifyToken, _controller.finalizarSesionEscaneo);
rutaProducto.put("/transferencia", _oauth.verifyToken, _controller.transferirProducto);
rutaProducto.put("/finalizar-terminada", _oauth.verifyToken, _controller.finalizarProductoTerminada);
rutaProducto.put('/ajustar', _oauth.verifyToken, _controller.ajustarInventario);
rutaProducto.put('/actualizar', _oauth.verifyToken, _controller.actualizarCaracteristica);
rutaProducto.put("/consumo-logistica", _oauth.verifyToken, _controller.ejecutarConsumoLogistica);
rutaProducto.put("/consumo-terminada-proceso", _oauth.verifyToken, _controller.ejecutarConsumoTerminadaProceso);

// METODO DELETE -- ELIMINAR
rutaProducto["delete"]("/cancelar", _oauth.verifyToken, _controller.cancelar_sesion_escaneo);
var _default = exports["default"] = rutaProducto;