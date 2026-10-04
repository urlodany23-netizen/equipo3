require("dotenv").config();

const { Pool } = require("pg");

// Lee los datos de conexión del archivo .env.
const pool = new Pool({
  connectionTimeoutMillis: 5000,
});

pool.on("error", (error) => {
  console.error("Error de conexión con PostgreSQL:", error.message);
});

module.exports = pool;