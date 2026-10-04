const express = require("express");
const pool = require("../db");
const {
  autenticar,
  requerirPermiso,
} = require("../middleware/auth");

const router = express.Router();

router.use(
  autenticar,
  requerirPermiso("roles.gestionar")
);

// Consultar el catálogo de permisos.
router.get("/permisos", async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT id, codigo, descripcion
       FROM permisos
       ORDER BY codigo`
    );

    return res.json({
      permisos: resultado.rows,
    });
  } catch (error) {
    console.error(
      "Error al consultar permisos:",
      error.code || error.message
    );

    return res.status(500).json({
      mensaje: "No se pudieron consultar los permisos.",
    });
  }
});

// Consultar los roles con sus permisos.
router.get("/", async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT
         r.id,
         r.nombre,
         r.descripcion,
         r.es_sistema,
         COALESCE(
           JSONB_AGG(
             JSONB_BUILD_OBJECT(
               'id', p.id,
               'codigo', p.codigo,
               'descripcion', p.descripcion
             )
             ORDER BY p.codigo
           ) FILTER (WHERE p.id IS NOT NULL),
           '[]'::jsonb
         ) AS permisos
       FROM roles r
       LEFT JOIN rol_permisos rp ON rp.rol_id = r.id
       LEFT JOIN permisos p ON p.id = rp.permiso_id
       GROUP BY r.id
       ORDER BY r.nombre`
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
});

// Crear un rol con los permisos seleccionados.
router.post("/", async (req, res) => {
  const { nombre, descripcion, permisos } = req.body || {};

  if (
    typeof nombre !== "string" ||
    (descripcion !== undefined && typeof descripcion !== "string")
  ) {
    return res.status(400).json({
      mensaje: "Escribe un nombre y una descripción válidos.",
    });
  }

  const nombreLimpio = nombre.trim();
  const descripcionLimpia = (descripcion || "").trim();

  if (
    nombreLimpio.length < 3 ||
    nombreLimpio.length > 50 ||
    descripcionLimpia.length > 500
  ) {
    return res.status(400).json({
      mensaje:
        "El nombre debe tener entre 3 y 50 caracteres y la descripción máximo 500.",
    });
  }

  if (
    !Array.isArray(permisos) ||
    permisos.length > 100 ||
    !permisos.every(
      (id) =>
        Number.isInteger(id) &&
        id > 0 &&
        id <= 2147483647
    )
  ) {
    return res.status(400).json({
      mensaje: "La selección de permisos no es válida.",
    });
  }

  const permisosUnicos = [...new Set(permisos)];
  let client;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const permisosValidos = await client.query(
      `SELECT id, codigo
       FROM permisos
       WHERE id = ANY($1::integer[])
       ORDER BY codigo
       FOR SHARE`,
      [permisosUnicos]
    );

    if (permisosValidos.rowCount !== permisosUnicos.length) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        mensaje: "Uno o más permisos no existen.",
      });
    }

    const resultado = await client.query(
      `INSERT INTO roles (nombre, descripcion, es_sistema)
       VALUES ($1, $2, FALSE)
       RETURNING id, nombre, descripcion, es_sistema`,
      [nombreLimpio, descripcionLimpia || null]
    );

    const rol = resultado.rows[0];

    await client.query(
      `INSERT INTO rol_permisos (rol_id, permiso_id)
       SELECT $1, UNNEST($2::integer[])`,
      [rol.id, permisosUnicos]
    );

    await client.query(
      `INSERT INTO auditoria
       (
         usuario_id, accion, resultado,
         recurso, recurso_id, ip, detalles
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        req.usuario.id,
        "rol.creado",
        "exito",
        "roles",
        String(rol.id),
        req.ip,
        JSON.stringify({
          nombre: rol.nombre,
          permisos: permisosValidos.rows.map(
            (permiso) => permiso.codigo
          ),
        }),
      ]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      mensaje: "Rol creado correctamente.",
      rol: {
        ...rol,
        permisos: permisosValidos.rows,
      },
    });
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error(
          "Error al cancelar creación de rol:",
          rollbackError.code
        );
      }
    }

    if (error.code === "23505") {
      return res.status(409).json({
        mensaje: "Ya existe un rol con ese nombre.",
      });
    }

    console.error(
      "Error al crear rol:",
      error.code || error.message
    );

    return res.status(500).json({
      mensaje: "No se pudo crear el rol.",
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Actualizar los permisos de un rol.
router.put("/:id/permisos", async (req, res) => {
  const rolId = Number(req.params.id);
  const { permisos } = req.body || {};

  if (
    !Number.isInteger(rolId) ||
    rolId <= 0 ||
    rolId > 2147483647
  ) {
    return res.status(400).json({
      mensaje: "El rol indicado no es válido.",
    });
  }

  if (
    !Array.isArray(permisos) ||
    permisos.length > 100 ||
    !permisos.every(
      (id) =>
        Number.isInteger(id) &&
        id > 0 &&
        id <= 2147483647
    )
  ) {
    return res.status(400).json({
      mensaje: "La selección de permisos no es válida.",
    });
  }

  const permisosUnicos = [...new Set(permisos)];
  let client;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const resultadoRol = await client.query(
      `SELECT id, nombre
       FROM roles
       WHERE id = $1
       FOR UPDATE`,
      [rolId]
    );

    if (resultadoRol.rowCount !== 1) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        mensaje: "El rol no existe.",
      });
    }

    const rol = resultadoRol.rows[0];

    // Conserva el acceso completo del Administrador.
    if (rol.nombre === "Administrador") {
      await client.query("ROLLBACK");

      return res.status(403).json({
        mensaje: "Los permisos del Administrador no se pueden modificar.",
      });
    }

    const permisosValidos = await client.query(
      `SELECT id, codigo
       FROM permisos
       WHERE id = ANY($1::integer[])
       ORDER BY codigo
       FOR SHARE`,
      [permisosUnicos]
    );

    if (permisosValidos.rowCount !== permisosUnicos.length) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        mensaje: "Uno o más permisos no existen.",
      });
    }

    const anteriores = await client.query(
      `SELECT p.codigo
       FROM permisos p
       JOIN rol_permisos rp ON rp.permiso_id = p.id
       WHERE rp.rol_id = $1
       ORDER BY p.codigo`,
      [rolId]
    );

    await client.query(
      "DELETE FROM rol_permisos WHERE rol_id = $1",
      [rolId]
    );

    await client.query(
      `INSERT INTO rol_permisos (rol_id, permiso_id)
       SELECT $1, UNNEST($2::integer[])`,
      [rolId, permisosUnicos]
    );

    await client.query(
      `INSERT INTO auditoria
       (
         usuario_id, accion, resultado,
         recurso, recurso_id, ip, detalles
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        req.usuario.id,
        "rol.permisos.actualizados",
        "exito",
        "roles",
        String(rolId),
        req.ip,
        JSON.stringify({
          rol: rol.nombre,
          permisos_anteriores: anteriores.rows.map(
            (permiso) => permiso.codigo
          ),
          permisos_nuevos: permisosValidos.rows.map(
            (permiso) => permiso.codigo
          ),
        }),
      ]
    );

    await client.query("COMMIT");

    return res.json({
      mensaje: "Permisos actualizados correctamente.",
      rol_id: rolId,
      permisos: permisosValidos.rows,
    });
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error(
          "Error al cancelar actualización de permisos:",
          rollbackError.code
        );
      }
    }

    console.error(
      "Error al actualizar permisos:",
      error.code || error.message
    );

    return res.status(500).json({
      mensaje: "No se pudieron actualizar los permisos.",
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

module.exports = router;