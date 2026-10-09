-- Corrige el nombre de columna utilizado por las rutas administrativas.
-- Es seguro ejecutarlo en bases nuevas o ya creadas con el esquema anterior.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'solicitudes_rol'
      AND column_name = 'administrador_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'solicitudes_rol'
      AND column_name = 'resuelto_por'
  ) THEN
    ALTER TABLE solicitudes_rol
      RENAME COLUMN administrador_id TO resuelto_por;
  END IF;
END $$;
