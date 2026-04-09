import { Router } from 'express';
import { asignarBodegaUsuario, bodegasPorUsuario, crear, eliminar, eliminarPermisoBodega, modificar,mostrar } from '../controllers/controller.bodega';

const rutaBodega = Router();


// rutas de la base de datos betrost
rutaBodega.get("/mostrar", mostrar);
rutaBodega.post("/crear", crear);
rutaBodega.put("/modificar", modificar);
rutaBodega.delete("/eliminar", eliminar);
rutaBodega.get("/bodegas-usuario/:id_usuario", bodegasPorUsuario);
rutaBodega.post("/asignar", asignarBodegaUsuario);
rutaBodega.delete("/eliminar-permiso", eliminarPermisoBodega);


export default rutaBodega;