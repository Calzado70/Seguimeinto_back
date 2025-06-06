import { Router } from "express";
import { mostrarHistorial } from "../controllers/controller.historial";

const rutaHistorial = Router();

rutaHistorial.get("/historial", mostrarHistorial);

export default rutaHistorial;