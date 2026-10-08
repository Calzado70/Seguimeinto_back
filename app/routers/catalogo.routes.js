import { Router } from "express";
import { activar_catalogo, 
    listar_catalogo, 
    crear_catalogo, 
    actualizar_catalogo, 
    inhabilitar_catalogo} from "../controllers/controller.producto";
import { verifyToken, verifyAdministrador } from "../middleware/oauth";



const rutaCatalogo = Router();


rutaCatalogo.get("/listar",  listar_catalogo);

rutaCatalogo.post("/crear",  crear_catalogo);

rutaCatalogo.put("/actualizar", actualizar_catalogo);

rutaCatalogo.put("/inhabilitar",  inhabilitar_catalogo);

rutaCatalogo.put("/activar",  activar_catalogo);


export default rutaCatalogo;