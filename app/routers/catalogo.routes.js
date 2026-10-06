import { Router } from "express";
import { activar_catalogo, 
    listar_catalogo, 
    crear_catalogo, 
    actualizar_catalogo, 
    inhabilitar_catalogo} from "../controllers/controller.producto";
import { verifyToken, verifyAdministrador } from "../middleware/oauth";



const rutaCatalogo = Router();


rutaCatalogo.get("/listar", verifyToken, verifyAdministrador, listar_catalogo);

rutaCatalogo.post("/crear", verifyToken, verifyAdministrador, crear_catalogo);

rutaCatalogo.put("/actualizar", verifyToken, verifyAdministrador, actualizar_catalogo);

rutaCatalogo.put("/inhabilitar", verifyToken, verifyAdministrador, inhabilitar_catalogo);

rutaCatalogo.put("/activar", verifyToken, verifyAdministrador, activar_catalogo);


export default rutaCatalogo;