import { Router } from 'express';
import { asignarBodegaUsuario, bodegasPorUsuario, crear, eliminar, eliminarPermisoBodega, modificar,mostrar } from '../controllers/controller.bodega';
import { verifyToken, verifyAdministrador } from '../middleware/oauth';

const rutaBodega = Router();


// rutas de la base de datos betrost
rutaBodega.get("/mostrar", verifyToken, mostrar);
rutaBodega.get("/bodegas-usuario/:id_usuario", verifyToken, bodegasPorUsuario);
rutaBodega.post("/crear", verifyToken, verifyAdministrador, crear);
rutaBodega.put("/modificar", verifyToken, verifyAdministrador, modificar);
rutaBodega.delete("/eliminar", verifyToken, verifyAdministrador, eliminar);
rutaBodega.post("/asignar", verifyToken, verifyAdministrador, asignarBodegaUsuario);
rutaBodega.delete("/eliminar-permiso", verifyToken, verifyAdministrador, eliminarPermisoBodega);


export default rutaBodega;