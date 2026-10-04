import { useState } from "react";

export default function SolicitudesAdmin({
  token,
  onSesionVencida,
}) {
  const [solicitudes, setSolicitudes] = useState(null);
  const [seleccionada, setSeleccionada] = useState(null);
  const [respuesta, setRespuesta] = useState("");

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function pedirDatos(ruta, opciones = {}) {
    const resultado = await fetch(ruta, {
      ...opciones,
      headers: {
        ...opciones.headers,
        Authorization: `Bearer ${token}`,
      },
    });

    if (resultado.status === 401) {
      onSesionVencida();
      return null;
    }

    const datos = await resultado.json();

    if (!resultado.ok) {
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
      const datos = await pedirDatos("/api/admin/solicitudes");

      if (datos) {
        setSolicitudes(datos.solicitudes);
        setSeleccionada(null);
        setRespuesta("");
      }
    } catch (err) {
      mostrarError(err);
    } finally {
      setCargando(false);
    }
  }

  function abrirRevision(solicitud) {
    setSeleccionada(solicitud);
    setRespuesta("");
    setError("");
    setMensaje("");
  }

  function cancelarRevision() {
    setSeleccionada(null);
    setRespuesta("");
    setError("");
  }

  async function resolverSolicitud(decision) {
    if (!seleccionada) {
      return;
    }

    setCargando(true);
    setError("");
    setMensaje("");

    try {
      const datos = await pedirDatos(
        `/api/admin/solicitudes/${seleccionada.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            decision,
            respuesta,
          }),
        }
      );

      if (!datos) {
        return;
      }

      setMensaje(datos.mensaje);
      setSeleccionada(null);
      setRespuesta("");

      // La decisión ya se guardó, aunque falle esta actualización.
      try {
        const listado = await pedirDatos(
          "/api/admin/solicitudes"
        );

        if (listado) {
          setSolicitudes(listado.solicitudes);
        }
      } catch {
        setSolicitudes(null);
        setError(
          "La decisión se guardó, pero no se pudo actualizar la lista. Pulsa Consultar solicitudes."
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
      <h2>Solicitudes de usuarios</h2>
      <p>
        Revisa las solicitudes y decide quién puede recibir
        el rol Editor.
      </p>

      <button
        type="button"
        onClick={consultarSolicitudes}
        disabled={cargando}
      >
        {cargando ? "Procesando..." : "Consultar solicitudes"}
      </button>

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

      {seleccionada && (
        <div className="formulario formulario-usuario">
          <h3>Revisar solicitud de {seleccionada.usuario}</h3>
          <p>{seleccionada.email}</p>

          <p>
            <strong>Rol solicitado:</strong> {seleccionada.rol}
          </p>

          <p>
            <strong>Motivo:</strong> {seleccionada.motivo}
          </p>

          <label htmlFor="respuesta-solicitud">
            Respuesta al usuario — opcional
          </label>

          <textarea
            id="respuesta-solicitud"
            value={respuesta}
            onChange={(event) => setRespuesta(event.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Escribe una respuesta para el usuario."
            disabled={cargando}
          />

          <div className="acciones-usuarios">
            <button
              type="button"
              onClick={() => resolverSolicitud("aprobada")}
              disabled={cargando}
            >
              Aprobar y asignar rol
            </button>

            <button
              type="button"
              className="secundario"
              onClick={() => resolverSolicitud("rechazada")}
              disabled={cargando}
            >
              Rechazar
            </button>

            <button
              type="button"
              className="secundario"
              onClick={cancelarRevision}
              disabled={cargando}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {solicitudes !== null && (
        <div className="tabla-contenedor">
          <table>
            <caption>Solicitudes recientes</caption>

            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Motivo</th>
                <th>Estado</th>
                <th>Respuesta</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {solicitudes.map((solicitud) => (
                <tr key={solicitud.id}>
                  <td>
                    {solicitud.usuario}
                    <br />
                    <small>{solicitud.email}</small>
                  </td>

                  <td>{solicitud.rol}</td>
                  <td>{solicitud.motivo}</td>
                  <td>{solicitud.estado}</td>
                  <td>{solicitud.respuesta || "Sin respuesta"}</td>

                  <td>
                    {solicitud.estado === "pendiente" ? (
                      <button
                        type="button"
                        className="secundario"
                        onClick={() => abrirRevision(solicitud)}
                        disabled={cargando}
                      >
                        Revisar
                      </button>
                    ) : (
                      <span>Resuelta</span>
                    )}
                  </td>
                </tr>
              ))}

              {solicitudes.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    No hay solicitudes registradas.
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