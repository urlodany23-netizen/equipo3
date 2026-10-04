const express = require("express");
const pool = require("../db");
const {
  autenticar,
  requerirPermiso,
} = require("../middleware/auth");

const router = express.Router();

router.use(autenticar);

// Consultar las 100 publicaciones más recientes.
router.get(
  "/",
  requerirPermiso("publicaciones.leer"),
  async (req, res) => {
    try {
      const resultado = await pool.query(
        `SELECT
           p.id,
           p.titulo,
           p.contenido,
           p.categoria,
           p.autor_id,
           u.nombre AS autor,
           p.creado_en,
           p.actualizado_en
         FROM publicaciones p
         JOIN usuarios u ON u.id = p.autor_id
         ORDER BY p.creado_en DESC, p.id DESC
         LIMIT 100`
      );

      return res.json({
        publicaciones: resultado.rows,
      });
    } catch (error) {
      console.error(
        "Error al consultar publicaciones:",
        error.code || error.message
      );

      return res.status(500).json({
        mensaje: "No se pudieron consultar las publicaciones.",
      });
    }
  }
);

// Crear una publicación.
router.post(
  "/",
  requerirPermiso("publicaciones.crear"),
  async (req, res) => {
    const { titulo, contenido, categoria } = req.body || {};

    if (
      typeof titulo !== "string" ||
      typeof contenido !== "string" ||
      typeof categoria !== "string"
    ) {
      return res.status(400).json({
        mensaje: "Título, contenido y categoría son obligatorios.",
      });
    }

    const tituloLimpio = titulo.trim();
    const contenidoLimpio = contenido.trim();

    if (
      tituloLimpio.length < 3 ||
      tituloLimpio.length > 150
    ) {
      return res.status(400).json({
        mensaje: "El título debe tener entre 3 y 150 caracteres.",
      });
    }

    if (
      contenidoLimpio.length < 20 ||
      contenidoLimpio.length > 10000
    ) {
      return res.status(400).json({
        mensaje: "El contenido debe tener entre 20 y 10000 caracteres.",
      });
    }

    if (!["bandas", "albumes", "conciertos"].includes(categoria)) {
      return res.status(400).json({
        mensaje: "Selecciona una categoría válida.",
      });
    }

    let client;

    try {
      client = await pool.connect();
      await client.query("BEGIN");

      const resultado = await client.query(
        `INSERT INTO publicaciones
         (titulo, contenido, categoria, autor_id)
         VALUES ($1, $2, $3, $4)
         RETURNING
           id,
           titulo,
           contenido,
           categoria,
           autor_id,
           creado_en,
           actualizado_en`,
        [
          tituloLimpio,
          contenidoLimpio,
          categoria,
          req.usuario.id,
        ]
      );

      const publicacion = resultado.rows[0];

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
          "publicacion.creada",
          "exito",
          "publicaciones",
          String(publicacion.id),
          req.ip,
          JSON.stringify({
            titulo: publicacion.titulo,
            categoria: publicacion.categoria,
          }),
        ]
      );

      await client.query("COMMIT");

      return res.status(201).json({
        mensaje: "Publicación creada correctamente.",
        publicacion: {
          ...publicacion,
          autor: req.usuario.nombre,
        },
      });
    } catch (error) {
      if (client) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          console.error(
            "Error al cancelar publicación:",
            rollbackError.code
          );
        }
      }

      console.error(
        "Error al crear publicación:",
        error.code || error.message
      );

      return res.status(500).json({
        mensaje: "No se pudo crear la publicación.",
      });
    } finally {
      if (client) {
        client.release();
      }
    }
  }
);

// Editar una publicación.
router.put(
  "/:id",
  requerirPermiso("publicaciones.editar"),
  async (req, res) => {
    const id = Number(req.params.id);
    const { titulo, contenido, categoria } = req.body || {};

    if (
      !Number.isInteger(id) ||
      id <= 0 ||
      id > 2147483647
    ) {
      return res.status(400).json({
        mensaje: "La publicación indicada no es válida.",
      });
    }

    if (
      typeof titulo !== "string" ||
      typeof contenido !== "string" ||
      typeof categoria !== "string"
    ) {
      return res.status(400).json({
        mensaje: "Título, contenido y categoría son obligatorios.",
      });
    }

    const tituloLimpio = titulo.trim();
    const contenidoLimpio = contenido.trim();

    if (
      tituloLimpio.length < 3 ||
      tituloLimpio.length > 150
    ) {
      return res.status(400).json({
        mensaje: "El título debe tener entre 3 y 150 caracteres.",
      });
    }

    if (
      contenidoLimpio.length < 20 ||
      contenidoLimpio.length > 10000
    ) {
      return res.status(400).json({
        mensaje: "El contenido debe tener entre 20 y 10000 caracteres.",
      });
    }

    if (!["bandas", "albumes", "conciertos"].includes(categoria)) {
      return res.status(400).json({
        mensaje: "Selecciona una categoría válida.",
      });
    }

    let client;

    try {
      client = await pool.connect();
      await client.query("BEGIN");

      const resultado = await client.query(
        `UPDATE publicaciones
         SET titulo = $1,
             contenido = $2,
             categoria = $3,
             actualizado_en = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [tituloLimpio, contenidoLimpio, categoria, id]
      );

      if (resultado.rowCount !== 1) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          mensaje: "La publicación no existe.",
        });
      }

      const publicacion = resultado.rows[0];

      await client.query(
        `INSERT INTO auditoria
         (
           usuario_id, accion, resultado,
           recurso, recurso_id, ip, detalles
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
        [
          req.usuario.id,
          "publicacion.editada",
          "exito",
          "publicaciones",
          String(id),
          req.ip,
          JSON.stringify({
            titulo: publicacion.titulo,
            categoria: publicacion.categoria,
          }),
        ]
      );

      await client.query("COMMIT");

      return res.json({
        mensaje: "Publicación actualizada correctamente.",
        publicacion,
      });
    } catch (error) {
      if (client) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          console.error(
            "Error al cancelar edición:",
            rollbackError.code
          );
        }
      }

      console.error(
        "Error al editar publicación:",
        error.code || error.message
      );

      return res.status(500).json({
        mensaje: "No se pudo editar la publicación.",
      });
    } finally {
      if (client) {
        client.release();
      }
    }
  }
);

// Eliminar una publicación.
router.delete(
  "/:id",
  requerirPermiso("publicaciones.eliminar"),
  async (req, res) => {
    const id = Number(req.params.id);

    if (
      !Number.isInteger(id) ||
      id <= 0 ||
      id > 2147483647
    ) {
      return res.status(400).json({
        mensaje: "La publicación indicada no es válida.",
      });
    }

    let client;

    try {
      client = await pool.connect();
      await client.query("BEGIN");

      const resultado = await client.query(
        `DELETE FROM publicaciones
         WHERE id = $1
         RETURNING id, titulo, categoria`,
        [id]
      );

      if (resultado.rowCount !== 1) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          mensaje: "La publicación no existe.",
        });
      }

      const publicacion = resultado.rows[0];

      await client.query(
        `INSERT INTO auditoria
         (
           usuario_id, accion, resultado,
           recurso, recurso_id, ip, detalles
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
        [
          req.usuario.id,
          "publicacion.eliminada",
          "exito",
          "publicaciones",
          String(id),
          req.ip,
          JSON.stringify({
            titulo: publicacion.titulo,
            categoria: publicacion.categoria,
          }),
        ]
      );

      await client.query("COMMIT");

      return res.json({
        mensaje: "Publicación eliminada correctamente.",
        publicacion_id: id,
      });
    } catch (error) {
      if (client) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          console.error(
            "Error al cancelar eliminación:",
            rollbackError.code
          );
        }
      }

      console.error(
        "Error al eliminar publicación:",
        error.code || error.message
      );

      return res.status(500).json({
        mensaje: "No se pudo eliminar la publicación.",
      });
    } finally {
      if (client) {
        client.release();
      }
    }
  }
);

module.exports = router;