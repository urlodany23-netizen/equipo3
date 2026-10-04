import { useState } from "react";

export default function Roles({ token, onSesionVencida }) {
  const [roles, setRoles] = useState(null);
  const [permisosDisponibles, setPermisosDisponibles] = useState([]);
  const [permisosSeleccionados, setPermisosSeleccionados] = useState([]);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [rolEditando, setRolEditando] = useState(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function pedirDatos(ruta, opciones = {}) {
    const respuesta = await fetch(ruta, {
      ...opciones,
      headers: {
        ...opciones.headers,
        Authorization: `Bearer ${token}`,
      },
    });

    if (respuesta.status === 401) {
      onSesionVencida();
      return null;
    }

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(
        datos.mensaje || "No se pudo completar la operación."
      );
    }

    return datos;
  }

  function mostrarError(err) {
    setError(
      err instanceof Error
        ? err.message
        : "No se pudo conectar con el servidor."
    );
  }

  function limpiarFormulario() {
    setNombre("");
    setDescripcion("");
    setPermisosSeleccionados([]);
    setRolEditando(null);
  }

  async function consultarRoles() {
    setCargando(true);
    setError("");
    setMensaje("");

    try {
      const datos = await pedirDatos("/api/admin/gestion-roles");

      if (datos) {
        setRoles(datos.roles);
      }
    } catch (err) {
      mostrarError(err);
    } finally {
      setCargando(false);
    }
  }

  async function abrirCreacion() {
    setCargando(true);
    setError("");
    setMensaje("");

    try {
      const datos = await pedirDatos(
        "/api/admin/gestion-roles/permisos"
      );

      if (!datos) {
        return;
      }

      limpiarFormulario();
      setPermisosDisponibles(datos.permisos);
      setMostrarFormulario(true);
    } catch (err) {
      mostrarError(err);
    } finally {
      setCargando(false);
    }
  }

  async function abrirEdicion(rol) {
    setCargando(true);
    setError("");
    setMensaje("");

    try {
      const datos = await pedirDatos(
        "/api/admin/gestion-roles/permisos"
      );

      if (!datos) {
        return;
      }

      setPermisosDisponibles(datos.permisos);
      setPermisosSeleccionados(
        rol.permisos.map((permiso) => permiso.id)
      );

      setNombre(rol.nombre);
      setDescripcion(rol.descripcion || "");
      setRolEditando(rol);
      setMostrarFormulario(true);
    } catch (err) {
      mostrarError(err);
    } finally {
      setCargando(false);
    }
  }

  function cambiarPermiso(id) {
    setPermisosSeleccionados((actuales) =>
      actuales.includes(id)
        ? actuales.filter((permisoId) => permisoId !== id)
        : [...actuales, id]
    );
  }

  function cancelar() {
    setMostrarFormulario(false);
    limpiarFormulario();
    setError("");
  }

  async function guardarRol(event) {
    event.preventDefault();
    setError("");
    setMensaje("");

    const editando = rolEditando !== null;
    const nombreLimpio = nombre.trim();

    if (
      !editando &&
      (nombreLimpio.length < 3 || nombreLimpio.length > 50)
    ) {
      setError("El nombre debe tener entre 3 y 50 caracteres.");
      return;
    }

    setCargando(true);

    try {
      const ruta = editando
        ? `/api/admin/gestion-roles/${rolEditando.id}/permisos`
        : "/api/admin/gestion-roles";

      const cuerpo = editando
        ? { permisos: permisosSeleccionados }
        : {
            nombre: nombreLimpio,
            descripcion: descripcion.trim(),
            permisos: permisosSeleccionados,
          };

      const datos = await pedirDatos(ruta, {
        method: editando ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cuerpo),
      });

      if (!datos) {
        return;
      }

      if (editando) {
        setRoles((actuales) =>
          actuales === null
            ? null
            : actuales.map((rol) =>
                rol.id === datos.rol_id
                  ? { ...rol, permisos: datos.permisos }
                  : rol
              )
        );
      }

      setMensaje(datos.mensaje);
      setMostrarFormulario(false);
      limpiarFormulario();

      try {
        const listado = await pedirDatos("/api/admin/gestion-roles");

        if (listado) {
          setRoles(listado.roles);
        }
      } catch {
        setError(
          "Los cambios se guardaron, pero no se pudo actualizar la lista. Pulsa Consultar roles."
        );
      }
    } catch (err) {
      mostrarError(err);
    } finally {
      setCargando(false);
    }
  }

  return (
    <section className="tarjeta">
      <h2>Roles y permisos</h2>
      <p>Define las acciones que puede realizar cada rol.</p>

      <div className="acciones-usuarios">
        <button
          type="button"
          onClick={consultarRoles}
          disabled={cargando}
        >
          {cargando ? "Procesando..." : "Consultar roles"}
        </button>

        <button
          type="button"
          className="secundario"
          onClick={abrirCreacion}
          disabled={cargando || mostrarFormulario}
        >
          Crear rol
        </button>
      </div>

      {mensaje && (
        <p className="mensaje-exito" role="status">
          {mensaje}
        </p>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {mostrarFormulario && (
        <form
          className="formulario formulario-usuario"
          onSubmit={guardarRol}
        >
          <h3>
            {rolEditando
              ? `Editar permisos de ${rolEditando.nombre}`
              : "Nuevo rol"}
          </h3>

          {!rolEditando && (
            <>
              <label htmlFor="rol-nombre">Nombre</label>
              <input
                id="rol-nombre"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                minLength={3}
                maxLength={50}
                disabled={cargando}
                required
              />

              <label htmlFor="rol-descripcion">Descripción</label>
              <textarea
                id="rol-descripcion"
                value={descripcion}
                onChange={(event) =>
                  setDescripcion(event.target.value)
                }
                maxLength={500}
                rows={3}
                disabled={cargando}
              />
            </>
          )}

          {rolEditando && (
            <p>
              Los cambios afectarán a todas las cuentas que tengan
              este rol.
            </p>
          )}

          <fieldset
            className="seleccion-roles"
            disabled={cargando}
          >
            <legend>Permisos del rol</legend>

            {permisosDisponibles.map((permiso) => (
              <label className="opcion-rol" key={permiso.id}>
                <input
                  type="checkbox"
                  checked={permisosSeleccionados.includes(permiso.id)}
                  onChange={() => cambiarPermiso(permiso.id)}
                />

                <span>
                  <strong>{permiso.codigo}</strong>
                  <small>{permiso.descripcion}</small>
                </span>
              </label>
            ))}
          </fieldset>

          <p className="ayuda">
            Selecciona únicamente las acciones necesarias.
            Sin permisos seleccionados, este rol no concederá acceso.
          </p>

          <div className="acciones-usuarios">
            <button type="submit" disabled={cargando}>
              {cargando
                ? "Guardando..."
                : rolEditando
                  ? "Guardar permisos"
                  : "Guardar rol"}
            </button>

            <button
              type="button"
              className="secundario"
              onClick={cancelar}
              disabled={cargando}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {roles !== null && (
        <div className="tabla-contenedor">
          <table>
            <caption>Roles disponibles</caption>

            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Tipo</th>
                <th>Permisos</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {roles.map((rol) => (
                <tr key={rol.id}>
                  <td>{rol.nombre}</td>
                  <td>{rol.descripcion || "Sin descripción"}</td>
                  <td>
                    {rol.es_sistema
                      ? "Predeterminado"
                      : "Personalizado"}
                  </td>

                  <td>
                    {rol.permisos.length > 0 ? (
                      <ul>
                        {rol.permisos.map((permiso) => (
                          <li key={permiso.id}>
                            {permiso.codigo}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      "Sin permisos"
                    )}
                  </td>

                  <td>
                    {rol.nombre === "Administrador" ? (
                      <span>Permisos protegidos</span>
                    ) : (
                      <button
                        type="button"
                        className="secundario"
                        onClick={() => abrirEdicion(rol)}
                        disabled={cargando}
                      >
                        Editar permisos
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {roles.length === 0 && (
                <tr>
                  <td colSpan={5}>No hay roles registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}