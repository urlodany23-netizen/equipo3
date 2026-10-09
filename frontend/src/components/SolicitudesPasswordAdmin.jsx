import { useState } from "react";

export default function SolicitudesPasswordAdmin({ token, onSesionVencida }) {
  const [solicitudes, setSolicitudes] = useState(null);
  const [seleccionada, setSeleccionada] = useState(null);
  const [respuesta, setRespuesta] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function pedir(ruta, opciones = {}) {
    const resultado = await fetch(ruta, { ...opciones, headers: { ...opciones.headers, Authorization: `Bearer ${token}` } });
    if (resultado.status === 401) { onSesionVencida(); return null; }
    const datos = await resultado.json();
    if (!resultado.ok) throw new Error(datos.mensaje || "No se pudo completar la operación.");
    return datos;
  }

  async function consultar() {
    setCargando(true); setError(""); setMensaje("");
    try { const datos = await pedir("/api/admin/solicitudes-password"); if (datos) setSolicitudes(datos.solicitudes); }
    catch (err) { setError(err instanceof Error ? err.message : "No se pudo conectar con el servidor."); }
    finally { setCargando(false); }
  }

  async function resolver(decision) {
    if (!seleccionada) return;
    setCargando(true); setError(""); setMensaje("");
    try {
      const datos = await pedir(`/api/admin/solicitudes-password/${seleccionada.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, respuesta }),
      });
      if (datos) { setMensaje(datos.mensaje); setSeleccionada(null); setRespuesta(""); await consultar(); }
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo conectar con el servidor."); }
    finally { setCargando(false); }
  }

  return (
    <section className="tarjeta">
      <h2>Recuperación de contraseñas</h2>
      <p>Aprueba o rechaza las solicitudes enviadas desde el acceso.</p>
      <button type="button" onClick={consultar} disabled={cargando}>{cargando ? "Procesando..." : "Consultar recuperaciones"}</button>
      {mensaje && <p className="mensaje-exito" role="status">{mensaje}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {seleccionada && (
        <div className="formulario formulario-usuario">
          <h3>Revisar solicitud de {seleccionada.usuario}</h3>
          <p>{seleccionada.email}</p>
          <label htmlFor="respuesta-password">Respuesta al usuario — opcional</label>
          <textarea id="respuesta-password" value={respuesta} onChange={(e) => setRespuesta(e.target.value)} maxLength={1000} rows={3} disabled={cargando} />
          <div className="acciones-usuarios">
            <button type="button" onClick={() => resolver("aprobada")} disabled={cargando}>Aprobar cambio</button>
            <button type="button" className="secundario" onClick={() => resolver("rechazada")} disabled={cargando}>Rechazar</button>
            <button type="button" className="secundario" onClick={() => setSeleccionada(null)} disabled={cargando}>Cancelar</button>
          </div>
        </div>
      )}
      {solicitudes !== null && <div className="tabla-contenedor"><table><caption>Solicitudes recientes</caption><thead><tr><th>Usuario</th><th>Estado</th><th>Fecha</th><th>Acciones</th></tr></thead><tbody>
        {solicitudes.map((solicitud) => <tr key={solicitud.id}><td>{solicitud.usuario}<br /><small>{solicitud.email}</small></td><td>{solicitud.estado}</td><td>{new Date(solicitud.creado_en).toLocaleString("es-MX")}</td><td>{solicitud.estado === "pendiente" ? <button type="button" className="secundario" onClick={() => { setSeleccionada(solicitud); setRespuesta(""); }} disabled={cargando}>Revisar</button> : <span>{solicitud.resuelto_por || "Resuelta"}</span>}</td></tr>)}
        {solicitudes.length === 0 && <tr><td colSpan={4}>No hay solicitudes registradas.</td></tr>}
      </tbody></table></div>}
    </section>
  );
}
