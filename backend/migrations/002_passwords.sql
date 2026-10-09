BEGIN;

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

INSERT INTO permisos (codigo, descripcion)
VALUES ('contrasenas.gestionar', 'Aprobar solicitudes de cambio de contraseÃ±a')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre = 'Administrador'
  AND p.codigo = 'contrasenas.gestionar'
ON CONFLICT DO NOTHING;

COMMIT;
