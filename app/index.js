import app from "./app.js";
import { msjConsole, mensa } from "./messages/consola.js";


app.listen(app.get("port"), () => {
    msjConsole("puertoSuccess",
         `${mensa.puerto} ${app.get("port")} http://localhost:${app.get("port")}`);
});

