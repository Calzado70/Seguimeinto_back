import { Router } from 'express';
import { crearUsuario, eliminarUsuario, loginusuario, modificarUsuario, mostarUsuarios } from '../controllers/controller.usuario';
import { verifyToken } from '../middleware/oauth';



const rutausaurio = Router();


rutausaurio.get("/usuario" ,mostarUsuarios);
rutausaurio.post("/usuario", crearUsuario);
rutausaurio.put("/usuario" ,modificarUsuario);
rutausaurio.delete("/usuario" ,eliminarUsuario);
rutausaurio.post("/login", loginusuario);


export default rutausaurio;