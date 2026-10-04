const express = require("express");
const pool = require("../db");
const {
  autenticar,
  requerirPermiso,
} = require("../middleware/auth");

const router = express.Router();

// Todas las rutas de este archivo requieren una sesión válida.
router.use(autenticar);

// Consultar los roles que se pueden solicitar.
router.get(
  "/roles-disponibles",
  requerirPermiso("solicitudes.crear"),
  async (req, res) => {
    try {
      const resultado = await pool.query(
        `SELECT r.id, r.nombre, r.descripcion
         FROM roles r
         WHERE r.nombre = $1
           AND NOT EXISTS (
             SELECT 1
             FROM usuario_roles ur
             WHERE ur.usuario_id = $2
               AND ur.rol_id = r.id
           )
           AND NOT EXISTS (
             SELECT 1
             FROM solicitudes_rol s
             WHERE s.usuario_id = $2
               AND s.rol_id = r.id
               AND s.estado = 'pendiente'
           )`,
        ["Editor", req.usuario.id]
      );

      return res.json({
        roles: resultado.rows,
      });
    } catch (error) {
      console.error(
        "Error al consultar roles solicitables:",
        error.code || error.message
      );

      return res.status(500).json({
        mensaje: "No se pudieron consultar los roles disponibles.",
      });
    }
  }
);

// Consultar únicamente las solicitudes del usuario autenticado.
router.get("/mis-solicitudes", async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT
         s.id,
         r.nombre AS rol,
         s.motivo,
         s.estado,
         s.respuesta,
         s.creado_en,
         s.resuelto_en
       FROM solicitudes_rol s
       JOIN roles r ON r.id = s.rol_id
       WHERE s.usuario_id = $1
       ORDER BY s.creado_en DESC, s.id DESC
       LIMIT 100`,
      [req.usuario.id]
    );

    return res.json({
      solicitudes: resultado.rows,
    });
  } catch (error) {
    console.error(
      "Error al consultar solicitudes:",
      error.code || error.message
    );

    return res.status(500).json({
      mensaje: "No se pudieron consultar tus solicitudes.",
    });
  }
});

// Crear una solicitud.
router.post(
  "/",
  requerirPermiso("solicitudes.crear"),
  async (req, res) => {
    const { rol_id, motivo } = req.body || {};

    if (
      !Number.isInteger(rol_id) ||
      rol_id <= 0 ||
      rol_id > 2147483647 ||
      typeof motivo !== "string"
    ) {
      return res.status(400).json({
        mensaje: "Selecciona un rol válido y escribe el motivo.",
      });
    }

    const motivoLimpio = motivo.trim();

    if (
      motivoLimpio.length < 10 ||
      motivoLimpio.length > 1000
    ) {
      return res.status(400).json({
        mensaje: "El motivo debe tener entre 10 y 1000 caracteres.",
      });
    }

    let client;

    try {
      client = await pool.connect();
      await client.query("BEGIN");

      // Coordina esta operación con los cambios de roles del usuario.
      const usuario = await client.query(
        `SELECT id
         FROM usuarios
         WHERE id = $1 AND activo = TRUE
         FOR UPDATE`,
        [req.usuario.id]
      );

      if (usuario.rowCount !== 1) {
        await client.query("ROLLBACK");

        return res.status(401).json({
          mensaje: "Sesión inválida o cuenta desactivada.",
        });
      }

      // La API solo permite solicitar Editor.
      const rol = await client.query(
        `SELECT id, nombre
         FROM roles
         WHERE id = $1 AND nombre = $2
         FOR SHARE`,
        [rol_id, "Editor"]
      );

      if (rol.rowCount !== 1) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          mensaje: "Ese rol no está disponible para solicitudes.",
        });
      }

      const rolActual = await client.query(
        `SELECT 1
         FROM usuario_roles
         WHERE usuario_id = $1 AND rol_id = $2`,
        [req.usuario.id, rol_id]
      );

      if (rolActual.rowCount > 0) {
        await client.query("ROLLBACK");

        return res.status(409).json({
          mensaje: "Ya tienes ese rol asignado.",
        });
      }

      const resultado = await client.query(
        `INSERT INTO solicitudes_rol (usuario_id, rol_id, motivo)
         VALUES ($1, $2, $3)
         RETURNING id, motivo, estado, creado_en`,
        [req.usuario.id, rol_id, motivoLimpio]
      );

      const solicitud = resultado.rows[0];

      await client.query(
        `INSERT INTO auditoria
         (
           usuario_id,
           accion,
           resultado,
           recurso,
           recurso_id,
           ip,
           detalles
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
        [
          req.usuario.id,
          "solicitud.creada",
          "exito",
          "solicitudes_rol",
          String(solicitud.id),
          req.ip,
          JSON.stringify({ rol_solicitado: rol.rows[0].nombre }),
        ]
      );

      await client.query("COMMIT");

      return res.status(201).json({
        mensaje: "Solicitud enviada correctamente.",
        solicitud: {
          ...solicitud,
          rol: rol.rows[0].nombre,
        },
      });
    } catch (error) {
      if (client) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          console.error(
            "Error al cancelar solicitud:",
            rollbackError.code
          );
        }
      }

      if (error.code === "23505") {
        return res.status(409).json({
          mensaje: "Ya tienes una solicitud pendiente para ese rol.",
        });
      }

      console.error(
        "Error al crear solicitud:",
        error.code || error.message
      );

      return res.status(500).json({
        mensaje: "No se pudo enviar la solicitud.",
      });
    } finally {
      if (client) {
        client.release();
      }
    }
  }
);

module.exports = router;