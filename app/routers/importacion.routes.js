import { Router } from "express";
import { catalogos, importar } from "../controllers/controller.importacion";
import { verifyToken, verifyAdministrador } from "../middleware/oauth";

const rutaImportacion = Router();

rutaImportacion.get("/catalogos", verifyToken, verifyAdministrador, catalogos);
rutaImportacion.post("/importar", verifyToken, verifyAdministrador, importar);

export default rutaImportacion;
