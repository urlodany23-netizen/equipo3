import { useState } from "react";
import Usuarios from "./components/Usuarios";
import Solicitudes from "./components/Solicitudes";
import SolicitudesAdmin from "./components/SolicitudesAdmin";
import SolicitudesPasswordAdmin from "./components/SolicitudesPasswordAdmin";
import CambioPassword from "./components/CambioPassword";
import Publicaciones from "./components/Publicaciones";
import Roles from "./components/Roles";
import ElectricStage from "./components/ElectricStage";
import BackgroundMusic from "./components/BackgroundMusic";
import { ArrowIcon, BoltIcon, Equalizer } from "./components/RockIcons";
import "./App.css";
import "./ElectricTheme.css";

export default function App() {
  const [modoRegistro, setModoRegistro] = useState(false);
  const [modoRecuperacion, setModoRecuperacion] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmacion, setPasswordConfirmacion] = useState("");
  const [sesion, setSesion] = useState(null);
  const [error, setError] = useState("");
  const [mensajeRegistro, setMensajeRegistro] = useState("");
  const [animacionesPausadas, setAnimacionesPausadas] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const [cargando, setCargando] = useState(false);
  const [registros, setRegistros] = useState(null);

  function manejarSesionVencida() {
    setSesion(null);
    setRegistros(null);
    setPassword("");
    setError("Tu sesión venció. Inicia sesión nuevamente.");
  }

  async function iniciarSesion(event) {
    event.preventDefault();
    setError("");
    setMensajeRegistro("");
    setCargando(true);

    try {
      const respuesta = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje || "No se pudo iniciar sesión."
        );
      }

      setSesion(datos);
      setPassword("");
      setRegistros(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo conectar con el servidor."
      );
    } finally {
      setCargando(false);
    }
  }

  async function registrarUsuario(event) {
    event.preventDefault();
    setError("");
    setMensajeRegistro("");
    setCargando(true);

    try {
      const respuesta = await fetch("/api/auth/registro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nombre, email, password }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudo crear la cuenta.");
      }

      setModoRegistro(false);
      setNombre("");
      setPassword("");
      setMensajeRegistro("Cuenta creada correctamente. Ya puedes iniciar sesión.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo conectar con el servidor."
      );
    } finally {
      setCargando(false);
    }
  }

  async function solicitarRecuperacion(event) {
    event.preventDefault();
    setError("");
    setMensajeRegistro("");

    if (password !== passwordConfirmacion) {
      setError("La confirmación no coincide con la contraseña nueva.");
      return;
    }

    setCargando(true);
    try {
      const respuesta = await fetch("/api/auth/recuperar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, passwordNueva: password }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.mensaje || "No se pudo enviar la solicitud.");
      setModoRecuperacion(false);
      setPassword("");
      setPasswordConfirmacion("");
      setMensajeRegistro(datos.mensaje);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }

  function cambiarModoAcceso() {
    setModoRegistro((actual) => !actual);
    setModoRecuperacion(false);
    setNombre("");
    setEmail("");
    setPassword("");
    setPasswordConfirmacion("");
    setError("");
    setMensajeRegistro("");
  }

  function cambiarModoRecuperacion() {
    setModoRecuperacion((actual) => !actual);
    setModoRegistro(false);
    setNombre("");
    setPassword("");
    setPasswordConfirmacion("");
    setError("");
    setMensajeRegistro("");
  }

  async function consultarAuditoria() {
    setError("");
    setCargando(true);

    try {
      const respuesta = await fetch("/api/admin/auditoria", {
        headers: {
          Authorization: `Bearer ${sesion.token}`,
        },
      });

      if (respuesta.status === 401) {
        manejarSesionVencida();
        return;
      }

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje || "No se pudo consultar la auditoría."
        );
      }

      setRegistros(datos.registros);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo conectar con el servidor."
      );
    } finally {
      setCargando(false);
    }
  }

  function salir() {
    setSesion(null);
    setRegistros(null);
    setPassword("");
    setError("");
  }

  const puedeVerAuditoria =
    sesion?.usuario.permisos.includes("auditoria.leer");

  const puedeGestionarUsuarios =
    sesion?.usuario.permisos.includes("usuarios.gestionar");

  const puedeSolicitarRol =
  sesion?.usuario.permisos.includes("solicitudes.crear");

  const puedeResolverSolicitudes =
  sesion?.usuario.permisos.includes("solicitudes.resolver");

  const puedeLeerPublicaciones =
  sesion?.usuario.permisos.includes("publicaciones.leer");

const puedeCrearPublicaciones =
  sesion?.usuario.permisos.includes("publicaciones.crear");

const puedeEditarPublicaciones =
  sesion?.usuario.permisos.includes("publicaciones.editar");

const puedeEliminarPublicaciones =
  sesion?.usuario.permisos.includes("publicaciones.eliminar"); 

const puedeGestionarRoles =
  sesion?.usuario.permisos.includes("roles.gestionar");

  const puedeGestionarContrasenas =
    sesion?.usuario.permisos.includes("contrasenas.gestionar");

  return (
    <main className={`pagina${animacionesPausadas ? " animaciones-pausadas" : ""}`}>
      <div className="ambient-lights" aria-hidden="true" />
      <header className="cabecera">
        <a className="marca" href="/">
          <span className="marca-emblema"><BoltIcon /></span>
          <span className="marca-nombre">METAL<span>VERSE</span></span>
        </a>

        <span className="etiqueta">PARA QUIENES SIENTEN LA MÚSICA.</span>
        <button
          type="button"
          className="motion-toggle"
          onClick={() => setAnimacionesPausadas((actual) => !actual)}
          aria-pressed={!animacionesPausadas}
          aria-label={animacionesPausadas ? "Activar animaciones" : "Pausar animaciones"}
        >
          <Equalizer />
          <span>{animacionesPausadas ? "Efectos: pausa" : "Efectos: activos"}</span>
        </button>
      </header>

      <BackgroundMusic />

      {!sesion ? (
        <section className="entrada">
          <div className="presentacion">
            <p className="subtitulo hero-eyebrow">
              <span /> ROCK. METAL. SIN LÍMITES.
            </p>

            <h1>SUBE EL<br /><span>VOLUMEN.</span></h1>

            <p className="hero-description">
              Hay música que se escucha. Y música que se siente.
              Encuentra tu comunidad, comparte tus bandas y vive el metal.
            </p>
            <ElectricStage />
            <div className="hero-genres" aria-label="Géneros de la comunidad">
              <span>HEAVY METAL</span><span>HARD ROCK</span><span>THRASH</span><span>Y MUCHO MÁS</span>
            </div>
          </div>

          {modoRecuperacion && (
            <form className="tarjeta formulario acceso-formulario recovery-panel" onSubmit={solicitarRecuperacion} aria-labelledby="recuperacion-titulo" aria-busy={cargando}>
              <h2 id="recuperacion-titulo">Recupera tu acceso.</h2>
              <p className="access-intro">Envía una solicitud y un administrador aprobará el cambio.</p>
              <label htmlFor="recovery-email">Correo electrónico</label>
              <input id="recovery-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} placeholder="tu@correo.com" />
              <label htmlFor="recovery-password">Contraseña nueva</label>
              <input id="recovery-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={12} autoComplete="new-password" />
              <label htmlFor="recovery-confirm">Confirmar contraseña nueva</label>
              <input id="recovery-confirm" type="password" value={passwordConfirmacion} onChange={(event) => setPasswordConfirmacion(event.target.value)} required minLength={12} autoComplete="new-password" />
              {mensajeRegistro && <p className="mensaje-exito" role="status">{mensajeRegistro}</p>}
              {error && <p className="error" role="alert">{error}</p>}
              <button type="submit" className="access-submit" disabled={cargando}>{cargando ? "Enviando solicitud..." : "Solicitar cambio"}<ArrowIcon /></button>
              <button type="button" className="enlace-formulario" onClick={cambiarModoRecuperacion} disabled={cargando}>Volver a iniciar sesión</button>
            </form>
          )}

          {!modoRecuperacion && <form
            className="tarjeta formulario acceso-formulario"
            onSubmit={modoRegistro ? registrarUsuario : iniciarSesion}
            aria-labelledby="acceso-titulo"
            aria-busy={cargando}
          >
            <div className="access-ticket">
              <span><BoltIcon /> BACKSTAGE PASS</span>
              <span className="ticket-number">MV / 001</span>
            </div>
            <div className="access-mode">
              <span>{modoRegistro ? "NUEVO INTEGRANTE" : "TU LUGAR ESTÁ AQUÍ"}</span>
              <span className="amplifier-led" aria-hidden="true" />
            </div>
            <h2 id="acceso-titulo">{modoRegistro ? "Únete al ruido." : "Vuelve al ruido."}</h2>
            <p className="access-intro">
              {modoRegistro
                ? "Crea tu cuenta y encuentra tu próximo gran riff."
                : "Inicia sesión. Tu comunidad te está esperando."}
            </p>

            {modoRegistro && (
              <>
                <label htmlFor="nombre">Nombre</label>

                <input
                  id="nombre"
                  type="text"
                  autoComplete="name"
                  placeholder="Tu nombre"
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  required
                  minLength={2}
                  maxLength={100}
                />
              </>
            )}

            <label htmlFor="email">
              Correo electrónico
            </label>

            <input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="tu@correo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              maxLength={254}
            />

            <label htmlFor="password">
              Contraseña
            </label>

            <input
              id="password"
              type="password"
              autoComplete={modoRegistro ? "new-password" : "current-password"}
              placeholder="Tu contraseña"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={modoRegistro ? 12 : undefined}
              aria-describedby={modoRegistro ? "password-ayuda" : undefined}
            />

            {modoRegistro && <p className="password-hint" id="password-ayuda">Usa al menos 12 caracteres para tu contraseña.</p>}

            {mensajeRegistro && (
              <p className="mensaje-exito" role="status">{mensajeRegistro}</p>
            )}

            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="access-submit" disabled={cargando}>
              <span>{cargando
                ? modoRegistro ? "Creando cuenta..." : "Entrando..."
                : modoRegistro ? "Crear mi cuenta" : "Entrar a MetalVerse"}</span>
              <ArrowIcon />
            </button>

            <div className="access-divider"><span />{modoRegistro ? "¿YA ERES PARTE?" : "¿PRIMERA VEZ POR AQUÍ?"}<span /></div>
            <button
              type="button"
              className="enlace-formulario"
              onClick={cambiarModoAcceso}
              disabled={cargando}
            >
              {modoRegistro
                ? "Ya tengo una cuenta"
                : "Crear una cuenta nueva"}
            </button>
            {!modoRegistro && (
              <button
                type="button"
                className="enlace-formulario recovery-link"
                onClick={cambiarModoRecuperacion}
                disabled={cargando}
              >
                Olvidé mi contraseña
              </button>
            )}
            <p className="access-footnote"><BoltIcon /> La misma pasión. Tu propio sonido.</p>
          </form>}
        </section>
      ) : (
        <section className="panel">
          <div className="tarjeta bienvenida">
            <div>
              <p className="subtitulo">
                BIENVENIDO A METALVERSE
              </p>

              <h1>Hola, {sesion.usuario.nombre}</h1>
              <p>{sesion.usuario.email}</p>

              <div className="roles">
                {sesion.usuario.roles.map((rol) => (
                  <span key={rol}>{rol}</span>
                ))}
              </div>
            </div>

            <button
              className="secundario"
              onClick={salir}
              disabled={cargando}
            >
              Salir
            </button>
          </div>

          <CambioPassword token={sesion.token} onSesionVencida={manejarSesionVencida} />

          {puedeLeerPublicaciones && (
            <Publicaciones
              token={sesion.token}
              puedeCrear={puedeCrearPublicaciones}
              puedeEditar={puedeEditarPublicaciones}
              puedeEliminar={puedeEliminarPublicaciones}
              onSesionVencida={manejarSesionVencida}
            />
        )}

           <Solicitudes
            token={sesion.token}
            puedeSolicitar={puedeSolicitarRol}
            onSesionVencida={manejarSesionVencida}
          />

          {puedeResolverSolicitudes && (
            <SolicitudesAdmin
            token={sesion.token}
            onSesionVencida={manejarSesionVencida}
            />
          )}

          {puedeGestionarContrasenas && (
            <SolicitudesPasswordAdmin token={sesion.token} onSesionVencida={manejarSesionVencida} />
          )}

          {puedeGestionarUsuarios && (
            <Usuarios
              token={sesion.token}
              onSesionVencida={manejarSesionVencida}
            />
          )}

          {puedeGestionarRoles && (
            <Roles
              token={sesion.token}
              onSesionVencida={manejarSesionVencida}
            />
          )}

          {puedeVerAuditoria && (
            <div className="tarjeta">
              <h2>Registro de auditoría</h2>

              <p>
                Consulta los eventos más recientes del sistema.
              </p>

              <button
                onClick={consultarAuditoria}
                disabled={cargando}
              >
                {cargando
                  ? "Consultando..."
                  : "Consultar registros"}
              </button>
            </div>
          )}

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          {registros !== null && (
            <div className="tarjeta tabla-contenedor">
              <table>
                <caption>Actividad reciente</caption>

                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Acción</th>
                    <th>Resultado</th>
                    <th>Fecha</th>
                  </tr>
                </thead>

                <tbody>
                  {registros.map((registro) => (
                    <tr key={registro.id}>
                      <td>
                        {registro.usuario || "Sin identificar"}
                      </td>

                      <td>{registro.accion}</td>
                      <td>{registro.resultado}</td>

                      <td>
                        {new Date(
                          registro.creado_en
                        ).toLocaleString("es-MX")}
                      </td>
                    </tr>
                  ))}

                  {registros.length === 0 && (
                    <tr>
                      <td colSpan={4}>
                        No hay registros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
      <footer className="site-footer">
        <span>HECHO PARA ESCUCHARSE FUERTE.</span>
        <span><Equalizer /> ROCK · METAL · COMUNIDAD</span>
        <span>METALVERSE <BoltIcon /></span>
      </footer>
    </main>
  );
}
