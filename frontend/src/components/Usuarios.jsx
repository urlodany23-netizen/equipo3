import { useState } from "react";

export default function Usuarios({ token, onSesionVencida }) {
  const [usuarios, setUsuarios] = useState(null);
  const [rolesDisponibles, setRolesDisponibles] = useState([]);
  const [rolesSeleccionados, setRolesSeleccionados] = useState([]);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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

  function limpiarCampos() {
    setNombre("");
    setEmail("");
    setPassword("");
    setRolesSeleccionados([]);
  }

  async function consultarUsuarios() {
    setCargando(true);
    setError("");
    setMensaje("");

    try {
      const datos = await pedirDatos("/api/admin/usuarios");

      if (datos) {
        setUsuarios(datos.usuarios);
      }
    } catch (err) {
      mostrarError(err);
    } finally {
      setCargando(false);
    }
  }

  async function abrirFormulario() {
    setCargando(true);
    setError("");
    setMensaje("");

    try {
      const datos = await pedirDatos("/api/admin/roles");

      if (!datos) {
        return;
      }

      limpiarCampos();
      setRolesDisponibles(datos.roles);

      const rolRegular = datos.roles.find(
        (rol) => rol.nombre === "Usuario Regular"
      );

      setRolesSeleccionados(
        rolRegular ? [rolRegular.id] : []
      );

      setUsuarioEditando(null);
      setMostrarFormulario(true);
    } catch (err) {
      mostrarError(err);
    } finally {
      setCargando(false);
    }
  }

  function cambiarRol(id) {
    setRolesSeleccionados((actuales) =>
      actuales.includes(id)
        ? actuales.filter((rolId) => rolId !== id)
        : [...actuales, id]
    );
  }

  function cancelarCreacion() {
    setMostrarFormulario(false);
    limpiarCampos();
    setError("");
  }

  async function crearUsuario(event) {
    event.preventDefault();
    setError("");
    setMensaje("");

    if (rolesSeleccionados.length === 0) {
      setError("Selecciona al menos un rol.");
      return;
    }

    setCargando(true);

    try {
      const datos = await pedirDatos("/api/admin/usuarios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre,
          email,
          password,
          roles: rolesSeleccionados,
        }),
      });

      if (!datos) {
        return;
      }

      setMensaje(datos.mensaje);
      setMostrarFormulario(false);
      limpiarCampos();

      try {
        const listado = await pedirDatos("/api/admin/usuarios");

        if (listado) {
          setUsuarios(listado.usuarios);
        }
      } catch {
        setError(
          "La cuenta se creó, pero no se pudo actualizar la lista. Pulsa Consultar usuarios."
        );
      }
    } catch (err) {
      mostrarError(err);
    } finally {
      setCargando(false);
    }
  }

  async function abrirEdicionRoles(usuario) {
    setCargando(true);
    setError("");
    setMensaje("");

    try {
      const datos = await pedirDatos("/api/admin/roles");

      if (!datos) {
        return;
      }

      limpiarCampos();
      setRolesDisponibles(datos.roles);

      setRolesSeleccionados(
        datos.roles
          .filter((rol) => usuario.roles.includes(rol.nombre))
          .map((rol) => rol.id)
      );

      setMostrarFormulario(false);
      setUsuarioEditando(usuario);
    } catch (err) {
      mostrarError(err);
    } finally {
      setCargando(false);
    }
  }

  function cancelarEdicionRoles() {
    setUsuarioEditando(null);
    setRolesSeleccionados([]);
    setError("");
  }

  async function guardarRoles(event) {
    event.preventDefault();
    setError("");
    setMensaje("");

    if (!usuarioEditando) {
      return;
    }

    if (rolesSeleccionados.length === 0) {
      setError("Selecciona al menos un rol.");
      return;
    }

    setCargando(true);

    try {
      const datos = await pedirDatos(
        `/api/admin/usuarios/${usuarioEditando.id}/roles`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roles: rolesSeleccionados,
          }),
        }
      );

      if (!datos) {
        return;
      }

      setUsuarios((actuales) => {
        if (!actuales) {
          return actuales;
        }

        return actuales.map((usuario) =>
          usuario.id === datos.usuario_id
            ? { ...usuario, roles: datos.roles }
            : usuario
        );
      });

      setMensaje(datos.mensaje);
      setUsuarioEditando(null);
      setRolesSeleccionados([]);
    } catch (err) {
      mostrarError(err);
    } finally {
      setCargando(false);
    }
  }

  return (
    <section className="tarjeta">
      <h2>Gestión de usuarios</h2>
      <p>Administra las cuentas de la comunidad y sus roles.</p>

      <div className="acciones-usuarios">
        <button
          type="button"
          onClick={consultarUsuarios}
          disabled={cargando}
        >
          {cargando ? "Procesando..." : "Consultar usuarios"}
        </button>

        <button
          type="button"
          className="secundario"
          onClick={abrirFormulario}
          disabled={cargando || mostrarFormulario}
        >
          Crear usuario
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
          onSubmit={crearUsuario}
        >
          <h3>Nueva cuenta</h3>

          <label htmlFor="nuevo-nombre">Nombre</label>
          <input
            id="nuevo-nombre"
            type="text"
            autoComplete="off"
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            minLength={2}
            maxLength={100}
            disabled={cargando}
            required
          />

          <label htmlFor="nuevo-email">Correo electrónico</label>
          <input
            id="nuevo-email"
            type="email"
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            maxLength={254}
            disabled={cargando}
            required
          />

          <label htmlFor="nuevo-password">Contraseña inicial</label>
          <input
            id="nuevo-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={12}
            disabled={cargando}
            required
          />

          <p className="ayuda">
            Usa al menos 12 caracteres. El servidor comprobará
            el límite de 72 bytes.
          </p>

          <fieldset
            className="seleccion-roles"
            disabled={cargando}
          >
            <legend>Roles de la cuenta</legend>

            {rolesDisponibles.map((rol) => (
              <label className="opcion-rol" key={rol.id}>
                <input
                  type="checkbox"
                  checked={rolesSeleccionados.includes(rol.id)}
                  onChange={() => cambiarRol(rol.id)}
                />

                <span>
                  <strong>{rol.nombre}</strong>
                  <small>{rol.descripcion}</small>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="acciones-usuarios">
            <button type="submit" disabled={cargando}>
              {cargando ? "Creando..." : "Guardar usuario"}
            </button>

            <button
              type="button"
              className="secundario"
              onClick={cancelarCreacion}
              disabled={cargando}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {usuarioEditando && (
        <form
          className="formulario formulario-usuario"
          onSubmit={guardarRoles}
        >
          <h3>Editar roles de {usuarioEditando.nombre}</h3>
          <p>{usuarioEditando.email}</p>

          <fieldset
            className="seleccion-roles"
            disabled={cargando}
          >
            <legend>Roles de la cuenta</legend>

            {rolesDisponibles.map((rol) => (
              <label className="opcion-rol" key={rol.id}>
                <input
                  type="checkbox"
                  checked={rolesSeleccionados.includes(rol.id)}
                  onChange={() => cambiarRol(rol.id)}
                />

                <span>
                  <strong>{rol.nombre}</strong>
                  <small>{rol.descripcion}</small>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="acciones-usuarios">
            <button type="submit" disabled={cargando}>
              {cargando ? "Guardando..." : "Guardar roles"}
            </button>

            <button
              type="button"
              className="secundario"
              onClick={cancelarEdicionRoles}
              disabled={cargando}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {usuarios !== null && (
        <div className="tabla-contenedor">
          <table>
            <caption>Usuarios registrados</caption>

            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Roles</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id}>
                  <td>{usuario.id}</td>
                  <td>{usuario.nombre}</td>
                  <td>{usuario.email}</td>

                  <td>
                    {usuario.roles.join(", ") || "Sin roles"}
                  </td>

                  <td>
                    {usuario.activo ? "Activo" : "Desactivado"}
                  </td>

                  <td>
                    <button
                      type="button"
                      className="secundario"
                      onClick={() => abrirEdicionRoles(usuario)}
                      disabled={cargando}
                    >
                      Editar roles
                    </button>
                  </td>
                </tr>
              ))}

              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    No hay usuarios registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}