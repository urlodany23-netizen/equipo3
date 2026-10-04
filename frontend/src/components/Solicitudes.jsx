import { useState } from "react";

export default function Solicitudes({
  token,
  puedeSolicitar,
  onSesionVencida,
}) {
  const [solicitudes, setSolicitudes] = useState(null);
  const [roles, setRoles] = useState([]);
  const [rolId, setRolId] = useState("");
  const [motivo, setMotivo] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

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

  async function consultarSolicitudes() {
    setCargando(true);
    setError("");
    setMensaje("");

    try {
      const datos = await pedirDatos(
        "/api/solicitudes/mis-solicitudes"
      );

      if (datos) {
        setSolicitudes(datos.solicitudes);
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
      const datos = await pedirDatos(
        "/api/solicitudes/roles-disponibles"
      );

      if (!datos) {
        return;
      }

      setRoles(datos.roles);
      setMotivo("");

      if (datos.roles.length === 0) {
        setMostrarFormulario(false);
        setMensaje(
          "No hay roles disponibles: puede que ya tengas Editor o una solicitud pendiente."
        );
        return;
      }

      setRolId(String(datos.roles[0].id));
      setMostrarFormulario(true);
    } catch (err) {
      mostrarError(err);
    } finally {
      setCargando(false);
    }
  }

  function cancelar() {
    setMostrarFormulario(false);
    setMotivo("");
    setRolId("");
    setError("");
  }

  async function enviarSolicitud(event) {
    event.preventDefault();
    setError("");
    setMensaje("");

    const motivoLimpio = motivo.trim();

    if (!rolId || motivoLimpio.length < 10) {
      setError(
        "Selecciona un rol y escribe un motivo de al menos 10 caracteres."
      );
      return;
    }

    setCargando(true);

    try {
      const datos = await pedirDatos("/api/solicitudes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rol_id: Number(rolId),
          motivo: motivoLimpio,
        }),
      });

      if (!datos) {
        return;
      }

      setMensaje(datos.mensaje);
      setMostrarFormulario(false);
      setMotivo("");
      setRolId("");

      try {
        const historial = await pedirDatos(
          "/api/solicitudes/mis-solicitudes"
        );

        if (historial) {
          setSolicitudes(historial.solicitudes);
        }
      } catch {
        setError(
          "La solicitud se envió, pero no se pudo actualizar el historial. Pulsa Ver mis solicitudes."
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
      <h2>Mis solicitudes</h2>
      <p>
        Consulta tus solicitudes y pide acceso para publicar
        contenido como Editor.
      </p>

      <div className="acciones-usuarios">
        <button
          type="button"
          onClick={consultarSolicitudes}
          disabled={cargando}
        >
          {cargando ? "Procesando..." : "Ver mis solicitudes"}
        </button>

        {puedeSolicitar && (
          <button
            type="button"
            className="secundario"
            onClick={abrirFormulario}
            disabled={cargando || mostrarFormulario}
          >
            Solicitar rol
          </button>
        )}
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
          onSubmit={enviarSolicitud}
        >
          <h3>Nueva solicitud</h3>

          <label htmlFor="solicitud-rol">Rol solicitado</label>
          <select
            id="solicitud-rol"
            value={rolId}
            onChange={(event) => setRolId(event.target.value)}
            disabled={cargando}
            required
          >
            {roles.map((rol) => (
              <option key={rol.id} value={rol.id}>
                {rol.nombre}
              </option>
            ))}
          </select>

          <label htmlFor="solicitud-motivo">Motivo</label>
          <textarea
            id="solicitud-motivo"
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
            placeholder="Explica por qué deseas tener este rol."
            minLength={10}
            maxLength={1000}
            rows={4}
            disabled={cargando}
            required
          />

          <p className="ayuda">
            Enviar la solicitud no concede permisos. Un
            administrador debe aprobarla.
          </p>

          <div className="acciones-usuarios">
            <button type="submit" disabled={cargando}>
              {cargando ? "Enviando..." : "Enviar solicitud"}
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

      {solicitudes !== null && (
        <div className="tabla-contenedor">
          <table>
            <caption>Historial de solicitudes</caption>

            <thead>
              <tr>
                <th>Rol</th>
                <th>Motivo</th>
                <th>Estado</th>
                <th>Respuesta</th>
                <th>Fecha</th>
              </tr>
            </thead>

            <tbody>
              {solicitudes.map((solicitud) => (
                <tr key={solicitud.id}>
                  <td>{solicitud.rol}</td>
                  <td>{solicitud.motivo}</td>
                  <td>{solicitud.estado}</td>
                  <td>{solicitud.respuesta || "Sin respuesta"}</td>
                  <td>
                    {new Date(
                      solicitud.creado_en
                    ).toLocaleString("es-MX")}
                  </td>
                </tr>
              ))}

              {solicitudes.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    Todavía no tienes solicitudes.
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