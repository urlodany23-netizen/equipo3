-- Esquema inicial de MetalVerse.
-- Este archivo es idempotente: se puede ejecutar más de una vez.

BEGIN;

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  descripcion VARCHAR(500),
  es_sistema BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS permisos (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(100) NOT NULL UNIQUE,
  descripcion VARCHAR(500) NOT NULL
);

CREATE TABLE IF NOT EXISTS usuario_roles (
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  rol_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (usuario_id, rol_id)
);

CREATE TABLE IF NOT EXISTS rol_permisos (
  rol_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permiso_id INTEGER NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
  PRIMARY KEY (rol_id, permiso_id)
);

CREATE TABLE IF NOT EXISTS publicaciones (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(150) NOT NULL,
  contenido TEXT NOT NULL,
  categoria VARCHAR(20) NOT NULL CHECK (categoria IN ('bandas', 'albumes', 'conciertos')),
  autor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS solicitudes_rol (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  rol_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  motivo TEXT NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  respuesta TEXT,
  resuelto_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resuelto_en TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS solicitudes_password (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  respuesta TEXT,
  resuelto_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resuelto_en TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS solicitudes_password_pendiente_unica
  ON solicitudes_password(usuario_id)
  WHERE estado = 'pendiente';

CREATE TABLE IF NOT EXISTS auditoria (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  accion VARCHAR(100) NOT NULL,
  resultado VARCHAR(30) NOT NULL,
  recurso VARCHAR(100),
  recurso_id VARCHAR(100),
  ip INET,
  detalles JSONB,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO permisos (codigo, descripcion) VALUES
  ('auditoria.leer', 'Consultar el registro de auditoría'),
  ('usuarios.gestionar', 'Crear usuarios y administrar sus roles'),
  ('solicitudes.crear', 'Solicitar el rol Editor'),
  ('solicitudes.resolver', 'Resolver solicitudes de rol'),
  ('publicaciones.leer', 'Consultar publicaciones'),
  ('publicaciones.crear', 'Crear publicaciones'),
  ('publicaciones.editar', 'Editar publicaciones'),
  ('publicaciones.eliminar', 'Eliminar publicaciones'),
  ('roles.gestionar', 'Crear roles y administrar permisos')
  ,('contrasenas.gestionar', 'Aprobar solicitudes de cambio de contraseÃ±a')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO roles (nombre, descripcion, es_sistema) VALUES
  ('Administrador', 'Acceso completo al sistema', TRUE),
  ('Usuario Regular', 'Acceso básico de la comunidad', TRUE),
  ('Editor', 'Puede crear y editar publicaciones', TRUE)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permisos p
WHERE r.nombre = 'Administrador'
ON CONFLICT DO NOTHING;

INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r JOIN permisos p ON p.codigo IN ('publicaciones.leer', 'solicitudes.crear')
WHERE r.nombre = 'Usuario Regular'
ON CONFLICT DO NOTHING;

INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r JOIN permisos p ON p.codigo IN ('publicaciones.leer', 'publicaciones.crear', 'publicaciones.editar', 'solicitudes.crear')
WHERE r.nombre = 'Editor'
ON CONFLICT DO NOTHING;

COMMIT;
