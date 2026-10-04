const jwt = require("jsonwebtoken");
const pool = require("../db");

async function autenticar(req, res, next) {
  const authorization = req.get("Authorization") || "";
  const partes = authorization.trim().split(/\s+/);

  if (
    partes.length !== 2 ||
    partes[0].toLowerCase() !== "bearer"
  ) {
    return res.status(401).json({
      mensaje: "Debes iniciar sesión.",
    });
  }

  let datos;

  try {
    datos = jwt.verify(partes[1], process.env.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: "metalverse-api",
      audience: "metalverse-web",
    });

    if (
      typeof datos.sub !== "string" ||
      !/^[1-9]\d*$/.test(datos.sub) ||
      !Number.isSafeInteger(Number(datos.sub)) ||
      Number(datos.sub) > 2147483647 ||
      !Number.isInteger(datos.exp) ||
      !Array.isArray(datos.roles) ||
      !datos.roles.every((rol) => typeof rol === "string") ||
      !Array.isArray(datos.permisos) ||
      !datos.permisos.every((permiso) => typeof permiso === "string")
    ) {
      throw new Error("Datos de token inválidos");
    }
  } catch {
    return res.status(401).json({
      mensaje: "Sesión inválida o vencida. Inicia sesión nuevamente.",
    });
  }

  try {
    const resultado = await pool.query(
      `SELECT id, nombre, email
       FROM usuarios
       WHERE id = $1 AND activo = TRUE`,
      [Number(datos.sub)]
    );

    if (resultado.rowCount !== 1) {
      return res.status(401).json({
        mensaje: "Sesión inválida o cuenta desactivada.",
      });
    }

    const usuario = resultado.rows[0];

    const roles = await pool.query(
      `SELECT r.nombre
       FROM roles r
       JOIN usuario_roles ur ON ur.rol_id = r.id
       WHERE ur.usuario_id = $1
       ORDER BY r.nombre`,
      [usuario.id]
    );

    const permisos = await pool.query(
      `SELECT DISTINCT p.codigo
       FROM permisos p
       JOIN rol_permisos rp ON rp.permiso_id = p.id
       JOIN usuario_roles ur ON ur.rol_id = rp.rol_id
       WHERE ur.usuario_id = $1
       ORDER BY p.codigo`,
      [usuario.id]
    );

    req.usuario = {
      ...usuario,
      roles: roles.rows.map((fila) => fila.nombre),
      permisos: permisos.rows.map((fila) => fila.codigo),
    };

    res.set("Cache-Control", "no-store");
    return next();
  } catch (error) {
    console.error(
      "Error de autenticación:",
      error.code || error.message
    );

    return res.status(500).json({
      mensaje: "No se pudo comprobar la sesión.",
    });
  }
}

function requerirPermiso(permiso) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        mensaje: "Debes iniciar sesión.",
      });
    }

    if (!req.usuario.permisos.includes(permiso)) {
      return res.status(403).json({
        mensaje: "No tienes permiso para realizar esta acción.",
      });
    }

    return next();
  };
}

module.exports = {
  autenticar,
  requerirPermiso,
};