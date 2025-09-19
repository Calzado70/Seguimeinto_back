import { createPool } from "mysql2/promise";
import { config } from "dotenv";
config();


// const pool = createPool({
//     host: process.env.MYSQL_HOST,
//     user: process.env.MYSQL_USER,
//     password: process.env.MYSQL_PASSWORD,
//     port: process.env.MYSQL_PORT,
//     database: process.env.MYSQL_DATABASE,
// });


// Pool para la base de datos "betrost"
const poolBetrost = createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    port: process.env.MYSQL_PORT,
    database: process.env.MYSQL_DATABASE_BETROST,
    multipleStatements: true,
    charset: 'utf8mb4_general_ci' // Soporte para emojis y caracteres especiales
});


export default poolBetrost;