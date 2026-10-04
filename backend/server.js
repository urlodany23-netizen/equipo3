require("dotenv").config();

const express = require("express");
const pool = require("./db");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const solicitudesRoutes = require("./routes/solicitudes");
const solicitudesAdminRoutes = require("./routes/solicitudesAdmin");
const publicacionesRoutes = require("./routes/publicaciones");
const rolesAdminRoutes = require("./routes/rolesAdmin");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use("/api/solicitudes", solicitudesRoutes);
app.use("/api/admin/solicitudes", solicitudesAdminRoutes);

// Conecta las rutas de registro e inicio de sesión.
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/publicaciones", publicacionesRoutes);
app.use("/api/admin/gestion-roles", rolesAdminRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    mensaje: "La API de MetalVerse funciona",
  });
});

async function iniciarServidor() {
  try {
    await pool.query("SELECT 1");

    console.log("Conexión con PostgreSQL exitosa");

    app.listen(PORT, () => {
      console.log(`API disponible en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error(
      "No se pudo conectar con PostgreSQL:",
      error.message
    );

    await pool.end();
    process.exitCode = 1;
  }
}

iniciarServidor();