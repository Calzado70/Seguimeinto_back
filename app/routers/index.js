import { Router } from "express";
import { messageBrowse } from "../messages/browser.js";
import rutausaurio from "./usuario.routes.js";
import rutaBodega from "./bodega.routes.js";
import rutaProducto from "./regproducto.routes.js";
import rutaHistorial from "./historial.routes.js";
import rutaCatalogo from "./catalogo.routes.js";
import rutaCaracteristica from "./regcaracteristica.routes.js";

const ruta = Router();


ruta.use("/user", rutausaurio);
ruta.use("/bode", rutaBodega);
ruta.use("/product", rutaProducto);
ruta.use("/hist", rutaHistorial);
ruta.use("/catalogo", rutaCatalogo);
ruta.use("/caracter", rutaCaracteristica);


ruta.use("/", (req, res) => {res.json({"respuesta": messageBrowse.principal})});


export default ruta;