const express = require("express");
const pool = require("../db");
const bcrypt = require("bcrypt");
const {
  autenticar,
  requerirPermiso,
} = require("../middleware/auth");

const router = express.Router();

router.get(
  "/solicitudes-password",
  autenticar,
  requerirPermiso("contrasenas.gestionar"),
  async (req, res) => {
    try {
      const resultado = await pool.query(
        `SELECT s.id, s.usuario_id, u.nombre AS usuario, u.email,
                s.estado, s.respuesta, s.creado_en, s.resuelto_en,
                r.nombre AS resuelto_por
         FROM solicitudes_password s
         JOIN usuarios u ON u.id = s.usuario_id
         LEFT JOIN usuarios r ON r.id = s.resuelto_por
         ORDER BY s.creado_en DESC, s.id DESC
         LIMIT 100`
      );

      return res.json({ solicitudes: resultado.rows });
    } catch (error) {
      console.error("Error al consultar recuperaciones:", error.code || error.message);
      return res.status(500).json({ mensaje: "No se pudieron consultar las recuperaciones." });
    }
  }
);

router.put(
  "/solicitudes-password/:id",
  autenticar,
  requerirPermiso("contrasenas.gestionar"),
  async (req, res) => {
    const solicitudId = Number(req.params.id);
    const { decision, respuesta } = req.body || {};

    if (!Number.isInteger(solicitudId) || solicitudId <= 0 || (decision !== "aprobada" && decision !== "rechazada")) {
      return res.status(400).json({ mensaje: "La decisión indicada no es válida." });
    }

    if (respuesta !== undefined && (typeof respuesta !== "string" || respuesta.length > 1000)) {
      return res.status(400).json({ mensaje: "La respuesta no es válida." });
    }

    let client;
    try {
      client = await pool.connect();
      await client.query("BEGIN");

      const solicitud = await client.query(
        `SELECT id, usuario_id, password_hash, estado
         FROM solicitudes_password WHERE id = $1 FOR UPDATE`,
        [solicitudId]
      );

      if (solicitud.rowCount !== 1) {
        await client.query("ROLLBACK");
        return res.status(404).json({ mensaje: "La solicitud no existe." });
      }

      const datos = solicitud.rows[0];
      if (datos.estado !== "pendiente") {
        await client.query("ROLLBACK");
        return res.status(409).json({ mensaje: "La solicitud ya fue resuelta." });
      }

      if (datos.usuario_id === req.usuario.id) {
        await client.query("ROLLBACK");
        return res.status(403).json({ mensaje: "Otra cuenta administrativa debe resolver esta solicitud." });
      }

      if (decision === "aprobada") {
        await client.query(
          "UPDATE usuarios SET password_hash = $1 WHERE id = $2 AND activo = TRUE",
          [datos.password_hash, datos.usuario_id]
        );
      }

      await client.query(
        `UPDATE solicitudes_password
         SET estado = $1, respuesta = $2, resuelto_por = $3, resuelto_en = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [decision, typeof respuesta === "string" ? respuesta.trim() : null, req.usuario.id, solicitudId]
      );

      await client.query(
        `INSERT INTO auditoria (usuario_id, accion, resultado, recurso, recurso_id, ip, detalles)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
        [req.usuario.id, `usuario.password.recuperacion.${decision}`, "exito", "solicitudes_password", String(solicitudId), req.ip, JSON.stringify({ usuario_id: datos.usuario_id })]
      );

      await client.query("COMMIT");
      return res.json({ mensaje: decision === "aprobada" ? "Cambio de contraseña aprobado." : "Solicitud rechazada." });
    } catch (error) {
      if (client) {
        try { await client.query("ROLLBACK"); } catch (rollbackError) { console.error("Error al cancelar recuperación:", rollbackError.code); }
      }
      console.error("Error al resolver recuperación:", error.code || error.message);
      return res.status(500).json({ mensaje: "No se pudo resolver la solicitud." });
    } finally {
      if (client) client.release();
    }
  }
);

router.get(
  "/auditoria",
  autenticar,
  requerirPermiso("auditoria.leer"),
  async (req, res) => {
    try {
      const resultado = await pool.query(
        `SELECT
           a.id,
           a.usuario_id,
           u.nombre AS usuario,
           a.accion,
           a.resultado,
           a.recurso,
           a.recurso_id,
           a.ip,
           a.detalles,
           a.creado_en
         FROM auditoria a
         LEFT JOIN usuarios u ON u.id = a.usuario_id
         ORDER BY a.creado_en DESC, a.id DESC
         LIMIT 100`
      );

      return res.json({
        registros: resultado.rows,
      });
    } catch (error) {
      console.error(
        "Error al consultar auditoría:",
        error.code || error.message
      );

      return res.status(500).json({
        mensaje: "No se pudo consultar la auditoría.",
      });
    }
  }
);

router.get(
  "/usuarios",
  autenticar,
  requerirPermiso("usuarios.gestionar"),
  async (req, res) => {
    try {
      const resultado = await pool.query(
        `SELECT
           u.id,
           u.nombre,
           u.email,
           u.activo,
           u.creado_en,
           COALESCE(
             ARRAY_AGG(r.nombre ORDER BY r.nombre)
               FILTER (WHERE r.id IS NOT NULL),
             ARRAY[]::varchar[]
           ) AS roles
         FROM usuarios u
         LEFT JOIN usuario_roles ur ON ur.usuario_id = u.id
         LEFT JOIN roles r ON r.id = ur.rol_id
         GROUP BY u.id
         ORDER BY u.id DESC
         LIMIT 100`
      );

      return res.json({
        usuarios: resultado.rows,
      });
    } catch (error) {
      console.error(
        "Error al consultar usuarios:",
        error.code || error.message
      );

      return res.status(500).json({
        mensaje: "No se pudieron consultar los usuarios.",
      });
    }
  }
);

router.get(
  "/roles",
  autenticar,
  requerirPermiso("usuarios.gestionar"),
  async (req, res) => {
    try {
      const resultado = await pool.query(
        `SELECT id, nombre, descripcion
         FROM roles
         ORDER BY nombre`
      );

      return res.json({
        roles: resultado.rows,
      });
    } catch (error) {
      console.error(
        "Error al consultar roles:",
        error.code || error.message
      );

      return res.status(500).json({
        mensaje: "No se pudieron consultar los roles.",
      });
    }
  }
);

router.post(
  "/usuarios",
  autenticar,
  requerirPermiso("usuarios.gestionar"),
  async (req, res) => {
    const { nombre, email, password, roles } = req.body || {};

    if (
      typeof nombre !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        mensaje: "Nombre, correo y contraseña son obligatorios.",
      });
    }

    const nombreLimpio = nombre.trim();
    const emailLimpio = email.trim().toLowerCase();

    if (nombreLimpio.length < 2 || nombreLimpio.length > 100) {
      return res.status(400).json({
        mensaje: "El nombre debe tener entre 2 y 100 caracteres.",
      });
    }

    if (
      emailLimpio.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpio)
    ) {
      return res.status(400).json({
        mensaje: "Escribe un correo válido.",
      });
    }

    if (
      password.length < 12 ||
      Buffer.byteLength(password, "utf8") > 72 ||
      password.includes("\0")
    ) {
      return res.status(400).json({
        mensaje:
          "La contraseña debe tener al menos 12 caracteres y máximo 72 bytes.",
      });
    }

    if (
      !Array.isArray(roles) ||
      roles.length === 0 ||
      roles.length > 20 ||
      !roles.every(
        (id) =>
          Number.isInteger(id) &&
          id > 0 &&
          id <= 2147483647
      )
    ) {
      return res.status(400).json({
        mensaje: "Selecciona entre 1 y 20 roles válidos.",
      });
    }

    const rolesUnicos = [...new Set(roles)];
    let client;

    try {
      const passwordHash = await bcrypt.hash(password, 12);

      client = await pool.connect();
      await client.query("BEGIN");

      const rolesEncontrados = await client.query(
        `SELECT id, nombre
         FROM roles
         WHERE id = ANY($1::integer[])
         ORDER BY nombre
         FOR SHARE`,
        [rolesUnicos]
      );

      if (rolesEncontrados.rowCount !== rolesUnicos.length) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          mensaje: "Uno o más roles seleccionados no existen.",
        });
      }

      const resultado = await client.query(
        `INSERT INTO usuarios (nombre, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, nombre, email, activo, creado_en`,
        [nombreLimpio, emailLimpio, passwordHash]
      );

      const usuario = resultado.rows[0];

      await client.query(
        `INSERT INTO usuario_roles (usuario_id, rol_id)
         SELECT $1, UNNEST($2::integer[])`,
        [usuario.id, rolesUnicos]
      );

      const nombresRoles = rolesEncontrados.rows.map(
        (rol) => rol.nombre
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
          "usuario.creado",
          "exito",
          "usuarios",
          String(usuario.id),
          req.ip,
          JSON.stringify({
            roles_asignados: nombresRoles,
          }),
        ]
      );

      await client.query("COMMIT");

      return res.status(201).json({
        mensaje: "Usuario creado correctamente.",
        usuario: {
          ...usuario,
          roles: nombresRoles,
        },
      });
    } catch (error) {
      if (client) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          console.error(
            "Error al cancelar creación:",
            rollbackError.code
          );
        }
      }

      if (error.code === "23505") {
        return res.status(409).json({
          mensaje: "No se pudo crear la cuenta con ese correo.",
        });
      }

      console.error(
        "Error al crear usuario:",
        error.code || error.message
      );

      return res.status(500).json({
        mensaje: "No se pudo crear el usuario.",
      });
    } finally {
      if (client) {
        client.release();
      }
    }
  }
);

router.put(
  "/usuarios/:id/roles",
  autenticar,
  requerirPermiso("usuarios.gestionar"),
  async (req, res) => {
    const usuarioId = Number(req.params.id);
    const { roles } = req.body || {};

    if (
      !Number.isInteger(usuarioId) ||
      usuarioId <= 0 ||
      usuarioId > 2147483647
    ) {
      return res.status(400).json({
        mensaje: "El usuario indicado no es válido.",
      });
    }

    // Evita que el administrador pierda su propio acceso.
    if (usuarioId === req.usuario.id) {
      return res.status(403).json({
        mensaje: "Modifica tus roles desde otra cuenta administrativa.",
      });
    }

    if (
      !Array.isArray(roles) ||
      roles.length === 0 ||
      roles.length > 20 ||
      !roles.every(
        (id) =>
          Number.isInteger(id) &&
          id > 0 &&
          id <= 2147483647
      )
    ) {
      return res.status(400).json({
        mensaje: "Selecciona entre 1 y 20 roles válidos.",
      });
    }

    const rolesUnicos = [...new Set(roles)];
    let client;

    try {
      client = await pool.connect();
      await client.query("BEGIN");

      const usuario = await client.query(
        "SELECT id FROM usuarios WHERE id = $1 FOR UPDATE",
        [usuarioId]
      );

      if (usuario.rowCount !== 1) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          mensaje: "El usuario no existe.",
        });
      }

      const rolesValidos = await client.query(
        `SELECT id, nombre
         FROM roles
         WHERE id = ANY($1::integer[])
         ORDER BY nombre
         FOR SHARE`,
        [rolesUnicos]
      );

      if (rolesValidos.rowCount !== rolesUnicos.length) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          mensaje: "Uno o más roles no existen.",
        });
      }

      const anteriores = await client.query(
        `SELECT r.nombre
         FROM roles r
         JOIN usuario_roles ur ON ur.rol_id = r.id
         WHERE ur.usuario_id = $1
         ORDER BY r.nombre`,
        [usuarioId]
      );

      await client.query(
        "DELETE FROM usuario_roles WHERE usuario_id = $1",
        [usuarioId]
      );

      await client.query(
        `INSERT INTO usuario_roles (usuario_id, rol_id)
         SELECT $1, UNNEST($2::integer[])`,
        [usuarioId, rolesUnicos]
      );

      const nuevosRoles = rolesValidos.rows.map(
        (rol) => rol.nombre
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
          "usuario.roles.actualizados",
          "exito",
          "usuarios",
          String(usuarioId),
          req.ip,
          JSON.stringify({
            roles_anteriores: anteriores.rows.map(
              (rol) => rol.nombre
            ),
            roles_nuevos: nuevosRoles,
          }),
        ]
      );

      await client.query("COMMIT");

      return res.json({
        mensaje: "Roles actualizados correctamente.",
        usuario_id: usuarioId,
        roles: nuevosRoles,
      });
    } catch (error) {
      if (client) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          console.error(
            "Error al cancelar cambio de roles:",
            rollbackError.code
          );
        }
      }

      console.error(
        "Error al actualizar roles:",
        error.code || error.message
      );

      return res.status(500).json({
        mensaje: "No se pudieron actualizar los roles.",
      });
    } finally {
      if (client) {
        client.release();
      }
    }
  }
);

module.exports = router;
