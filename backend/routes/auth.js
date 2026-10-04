const express = require("express");
const bcrypt = require("bcrypt");
const { rateLimit } = require("express-rate-limit");
const pool = require("../db");
const jwt = require("jsonwebtoken");
const { autenticar } = require("../middleware/auth");

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 64) {
  throw new Error("Configura JWT_SECRET en el archivo .env");
}

const router = express.Router();

const limiteRegistro = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    mensaje: "Demasiados intentos. Intenta nuevamente más tarde.",
  },
});

const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    mensaje: "Demasiados intentos. Intenta nuevamente más tarde.",
  },
});

// Permite comprobar una contraseña aunque el usuario no exista.
const hashDePrueba = bcrypt.hash("clave-interna-no-utilizable", 12);

// REGISTRO
router.post("/registro", limiteRegistro, async (req, res) => {
  const { nombre, email, password } = req.body || {};

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

  let client;

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    client = await pool.connect();
    await client.query("BEGIN");

    const rol = await client.query(
      "SELECT id FROM roles WHERE nombre = $1",
      ["Usuario Regular"]
    );

    if (rol.rowCount !== 1) {
      throw new Error("No se encontró el rol predeterminado");
    }

    const resultado = await client.query(
      `INSERT INTO usuarios (nombre, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, nombre, email, creado_en`,
      [nombreLimpio, emailLimpio, passwordHash]
    );

    const usuario = resultado.rows[0];

    await client.query(
      `INSERT INTO usuario_roles (usuario_id, rol_id)
       VALUES ($1, $2)`,
      [usuario.id, rol.rows[0].id]
    );

    await client.query(
      `INSERT INTO auditoria
       (usuario_id, accion, resultado, recurso, recurso_id, ip)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        usuario.id,
        "usuario.registro",
        "exito",
        "usuarios",
        String(usuario.id),
        req.ip,
      ]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      mensaje: "Cuenta creada correctamente.",
      usuario,
    });
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error(
          "Error al cancelar registro:",
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
      "Error de registro:",
      error.code || error.message
    );

    return res.status(500).json({
      mensaje: "No se pudo completar el registro.",
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// INICIO DE SESIÓN
router.post("/login", limiteLogin, async (req, res) => {
  const { email, password } = req.body || {};

  if (
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    return res.status(400).json({
      mensaje: "Correo y contraseña son obligatorios.",
    });
  }

  const emailLimpio = email.trim().toLowerCase();

  if (
    emailLimpio.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpio) ||
    password.length === 0 ||
    Buffer.byteLength(password, "utf8") > 72 ||
    password.includes("\0")
  ) {
    return res.status(400).json({
      mensaje: "Revisa el correo y la contraseña.",
    });
  }

  try {
    const resultado = await pool.query(
      `SELECT id, nombre, email, password_hash, activo
       FROM usuarios
       WHERE LOWER(email) = $1`,
      [emailLimpio]
    );

    const usuario = resultado.rows[0];

    const hash = usuario
      ? usuario.password_hash
      : await hashDePrueba;

    const passwordCorrecto = await bcrypt.compare(password, hash);

    if (!usuario || !usuario.activo || !passwordCorrecto) {
      await pool.query(
        `INSERT INTO auditoria
         (usuario_id, accion, resultado, recurso, ip)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          usuario?.id || null,
          "sesion.inicio",
          "fallo",
          "autenticacion",
          req.ip,
        ]
      );

      return res.status(401).json({
        mensaje: "Correo o contraseña incorrectos.",
      });
    }

    const resultadoRoles = await pool.query(
      `SELECT r.nombre
       FROM roles r
       JOIN usuario_roles ur ON ur.rol_id = r.id
       WHERE ur.usuario_id = $1
       ORDER BY r.nombre`,
      [usuario.id]
    );

    const resultadoPermisos = await pool.query(
      `SELECT DISTINCT p.codigo
       FROM permisos p
       JOIN rol_permisos rp ON rp.permiso_id = p.id
       JOIN usuario_roles ur ON ur.rol_id = rp.rol_id
       WHERE ur.usuario_id = $1
       ORDER BY p.codigo`,
      [usuario.id]
    );

    const roles = resultadoRoles.rows.map((fila) => fila.nombre);
    const permisos = resultadoPermisos.rows.map((fila) => fila.codigo);

    const token = jwt.sign(
      { roles, permisos },
      process.env.JWT_SECRET,
      {
        algorithm: "HS256",
        expiresIn: "15m",
        subject: String(usuario.id),
        issuer: "metalverse-api",
        audience: "metalverse-web",
      }
    );

    await pool.query(
      `INSERT INTO auditoria
       (usuario_id, accion, resultado, recurso, ip)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        usuario.id,
        "sesion.inicio",
        "exito",
        "autenticacion",
        req.ip,
      ]
    );

    res.set("Cache-Control", "no-store");

    return res.json({
      mensaje: "Inicio de sesión correcto.",
      token,
      expiresIn: 900,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        roles,
        permisos,
      },
    });
  } catch (error) {
    console.error(
      "Error de login:",
      error.code || error.message
    );

    return res.status(500).json({
      mensaje: "No se pudo iniciar sesión.",
    });
  }
});

router.get("/me", autenticar, (req, res) => {
  return res.json({
    usuario: req.usuario,
  });
});

module.exports = router;