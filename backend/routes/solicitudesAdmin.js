const express = require("express");
const pool = require("../db");
const {
  autenticar,
  requerirPermiso,
} = require("../middleware/auth");

const router = express.Router();

router.use(
  autenticar,
  requerirPermiso("solicitudes.resolver")
);

// Consultar las solicitudes de todos los usuarios.
router.get("/", async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT
         s.id,
         s.usuario_id,
         u.nombre AS usuario,
         u.email,
         r.nombre AS rol,
         s.motivo,
         s.estado,
         s.respuesta,
         s.creado_en,
         s.resuelto_en,
         administrador.nombre AS resuelto_por
       FROM solicitudes_rol s
       JOIN usuarios u ON u.id = s.usuario_id
       JOIN roles r ON r.id = s.rol_id
       LEFT JOIN usuarios administrador
         ON administrador.id = s.resuelto_por
       ORDER BY
         (s.estado = 'pendiente') DESC,
         s.creado_en DESC,
         s.id DESC
       LIMIT 100`
    );

    return res.json({
      solicitudes: resultado.rows,
    });
  } catch (error) {
    console.error(
      "Error al consultar solicitudes administrativas:",
      error.code || error.message
    );

    return res.status(500).json({
      mensaje: "No se pudieron consultar las solicitudes.",
    });
  }
});

// Aprobar o rechazar una solicitud.
router.put("/:id", async (req, res) => {
  const solicitudId = Number(req.params.id);
  const { decision, respuesta } = req.body || {};

  if (
    !Number.isInteger(solicitudId) ||
    solicitudId <= 0 ||
    solicitudId > 2147483647
  ) {
    return res.status(400).json({
      mensaje: "La solicitud indicada no es válida.",
    });
  }

  if (!["aprobada", "rechazada"].includes(decision)) {
    return res.status(400).json({
      mensaje: "Selecciona aprobar o rechazar.",
    });
  }

  if (
    respuesta !== undefined &&
    typeof respuesta !== "string"
  ) {
    return res.status(400).json({
      mensaje: "La respuesta debe ser un texto.",
    });
  }

  const respuestaLimpia = (respuesta || "").trim();

  if (respuestaLimpia.length > 1000) {
    return res.status(400).json({
      mensaje: "La respuesta debe tener máximo 1000 caracteres.",
    });
  }

  let client;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const busqueda = await client.query(
      `SELECT usuario_id
       FROM solicitudes_rol
       WHERE id = $1`,
      [solicitudId]
    );

    if (busqueda.rowCount !== 1) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        mensaje: "La solicitud no existe.",
      });
    }

    const usuarioId = busqueda.rows[0].usuario_id;

    if (usuarioId === req.usuario.id) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        mensaje: "Otro administrador debe resolver tu solicitud.",
      });
    }

    // Mantiene el mismo orden de bloqueo que los cambios de roles.
    const usuario = await client.query(
      `SELECT id, activo
       FROM usuarios
       WHERE id = $1
       FOR UPDATE`,
      [usuarioId]
    );

    const resultado = await client.query(
      `SELECT id, usuario_id, rol_id, estado
       FROM solicitudes_rol
       WHERE id = $1
       FOR UPDATE`,
      [solicitudId]
    );

    const solicitud = resultado.rows[0];

    if (!solicitud) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        mensaje: "La solicitud no existe.",
      });
    }

    if (solicitud.estado !== "pendiente") {
      await client.query("ROLLBACK");

      return res.status(409).json({
        mensaje: "Esta solicitud ya fue resuelta.",
      });
    }

    if (
      decision === "aprobada" &&
      !usuario.rows[0]?.activo
    ) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        mensaje: "No puedes aprobar solicitudes de cuentas desactivadas.",
      });
    }

    const rol = await client.query(
      `SELECT nombre
       FROM roles
       WHERE id = $1
       FOR SHARE`,
      [solicitud.rol_id]
    );

    if (
      decision === "aprobada" &&
      rol.rows[0]?.nombre !== "Editor"
    ) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        mensaje: "Este rol no puede concederse mediante solicitudes.",
      });
    }

    if (decision === "aprobada") {
      // Agrega el rol sin eliminar los que ya tiene el usuario.
      await client.query(
        `INSERT INTO usuario_roles (usuario_id, rol_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [solicitud.usuario_id, solicitud.rol_id]
      );
    }

    await client.query(
      `UPDATE solicitudes_rol
       SET estado = $1,
           resuelto_por = $2,
           respuesta = $3,
           resuelto_en = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [
        decision,
        req.usuario.id,
        respuestaLimpia || null,
        solicitudId,
      ]
    );

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
        `solicitud.${decision}`,
        "exito",
        "solicitudes_rol",
        String(solicitudId),
        req.ip,
        JSON.stringify({
          usuario_destino: solicitud.usuario_id,
          rol: rol.rows[0]?.nombre,
          decision,
        }),
      ]
    );

    await client.query("COMMIT");

    return res.json({
      mensaje:
        decision === "aprobada"
          ? "Solicitud aprobada y rol asignado."
          : "Solicitud rechazada.",
      solicitud_id: solicitudId,
      estado: decision,
    });
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error(
          "Error al cancelar resolución:",
          rollbackError.code
        );
      }
    }

    console.error(
      "Error al resolver solicitud:",
      error.code || error.message
    );

    return res.status(500).json({
      mensaje: "No se pudo resolver la solicitud.",
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

module.exports = router;