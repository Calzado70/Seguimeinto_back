import { Router } from "express";
import { actualizarCaracteristica, 
    agregar_producto_sesion, 
    ajustarInventario, 
    cancelar_sesion_escaneo, 
    consultar_inventario, 
    consultar_movimientos, 
    consultar_stock, 
    consultarCodigo, 
    consultarConsumoLogistica,
    consultarConsumoTerminadaProceso,
    crear_producto, 
    ejecutarConsumoLogistica,
    ejecutarConsumoTerminadaProceso,
    finalizarProductoTerminada, 
    finalizarSesionEscaneo, 
    iniciar_sesion_escaneo, 
    obtener_detalle_sesion, 
    transferirProducto } from "../controllers/controller.producto";
import { verifyToken } from "../middleware/oauth";


const rutaProducto = Router();


// METODO GET -- CONSULTAS
rutaProducto.get("/inventario", verifyToken, consultar_inventario);
rutaProducto.get("/stock", verifyToken, consultar_stock);
rutaProducto.get("/movi", verifyToken, consultar_movimientos);
rutaProducto.get("/detalle", verifyToken, obtener_detalle_sesion);
rutaProducto.get("/consumo-logistica", verifyToken, consultarConsumoLogistica);
rutaProducto.get("/consumo-terminada-proceso", verifyToken, consultarConsumoTerminadaProceso);


// METODO POST -- CREAR
rutaProducto.post("/inicio", verifyToken, iniciar_sesion_escaneo);
rutaProducto.post("/agregar", verifyToken, agregar_producto_sesion);
rutaProducto.post("/crear", verifyToken, crear_producto);
rutaProducto.post("/consultar", consultarCodigo);


// METODO PUT -- ACTUALIZAR
rutaProducto.put("/finalizar", verifyToken, finalizarSesionEscaneo);
rutaProducto.put("/transferencia", verifyToken, transferirProducto);
rutaProducto.put("/finalizar-terminada", verifyToken, finalizarProductoTerminada);
rutaProducto.put('/ajustar', verifyToken, ajustarInventario);
rutaProducto.put('/actualizar', verifyToken, actualizarCaracteristica);
rutaProducto.put("/consumo-logistica", verifyToken, ejecutarConsumoLogistica);
rutaProducto.put("/consumo-terminada-proceso", verifyToken, ejecutarConsumoTerminadaProceso);


// METODO DELETE -- ELIMINAR
rutaProducto.delete("/cancelar", verifyToken, cancelar_sesion_escaneo);


export default rutaProducto;