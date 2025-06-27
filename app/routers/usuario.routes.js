import { Router } from 'express';
import { crearUsuario, eliminar, eliminarUsuario, insertarusuario, login, loginusuario, modificar, modificarUsuario, mostar, mostarUsuarios } from '../controllers/controller.usuario';
import { verifyToken } from '../middleware/oauth';



const rutausaurio = Router();


rutausaurio.get("/usuario" ,mostarUsuarios);
rutausaurio.post("/usuario", crearUsuario);
rutausaurio.put("/usuario" ,modificarUsuario);
rutausaurio.delete("/usuario" ,eliminarUsuario);
rutausaurio.post("/login", loginusuario);


// rutas de la base de datos betrost
rutausaurio.post("/insertarusuario", insertarusuario);
rutausaurio.post("/loginusuario", login); 
rutausaurio.put("/modificar", modificar); 
rutausaurio.delete("/eliminar", eliminar);
rutausaurio.get("/mostrar", mostar);


export default rutausaurio;