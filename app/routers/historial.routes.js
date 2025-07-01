import { Router } from "express";

const rutaHistorial = Router();

rutaHistorial.get("/historial");
rutaHistorial.get("/logistica"); // Assuming you want to show sent products as well

export default rutaHistorial;