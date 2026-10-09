import { useState } from "react";

export default function CambioPassword({ token, onSesionVencida }) {
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function cambiarPassword(event) {
    event.preventDefault();
    setError("");
    setMensaje("");

    if (passwordNueva !== confirmacion) {
      setError("La confirmación no coincide con la contraseña nueva.");
      return;
    }

    setCargando(true);
    try {
      const respuesta = await fetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ passwordActual, passwordNueva }),
      });
      if (respuesta.status === 401) {
        onSesionVencida();
        return;
      }
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.mensaje || "No se pudo cambiar la contraseña.");
      setMensaje(datos.mensaje);
      setPasswordActual("");
      setPasswordNueva("");
      setConfirmacion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <section className="tarjeta formulario formulario-usuario">
      <h2>Cambiar contraseña</h2>
      <p>Solo necesitas tu contraseña actual para actualizarla.</p>
      <form onSubmit={cambiarPassword}>
        <label htmlFor="password-actual">Contraseña actual</label>
        <input id="password-actual" type="password" value={passwordActual} onChange={(e) => setPasswordActual(e.target.value)} required autoComplete="current-password" />
        <label htmlFor="password-nueva">Contraseña nueva</label>
        <input id="password-nueva" type="password" value={passwordNueva} onChange={(e) => setPasswordNueva(e.target.value)} required minLength={12} autoComplete="new-password" />
        <label htmlFor="password-confirmacion">Confirmar contraseña nueva</label>
        <input id="password-confirmacion" type="password" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} required minLength={12} autoComplete="new-password" />
        <p className="password-hint">Usa al menos 12 caracteres.</p>
        {mensaje && <p className="mensaje-exito" role="status">{mensaje}</p>}
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" disabled={cargando}>{cargando ? "Guardando..." : "Cambiar contraseña"}</button>
      </form>
    </section>
  );
}
