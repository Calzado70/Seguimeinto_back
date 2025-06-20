import { Router } from "express";
import { mostrarHistorial, mostrarHistorialEnviado } from "../controllers/controller.historial";

const rutaHistorial = Router();

rutaHistorial.get("/historial", mostrarHistorial);
rutaHistorial.get("/logistica", mostrarHistorialEnviado); // Assuming you want to show sent products as well

export default rutaHistorial;