import { useState } from "react";
import Usuarios from "./components/Usuarios";
import Solicitudes from "./components/Solicitudes";
import SolicitudesAdmin from "./components/SolicitudesAdmin";
import Publicaciones from "./components/Publicaciones";
import Roles from "./components/Roles";
import "./App.css";

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sesion, setSesion] = useState(null);
  const [error, setError] = useState("");
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

  return (
    <main className="pagina">
      <header className="cabecera">
        <a className="marca" href="/">
          METAL<span>VERSE</span>
        </a>

        <span className="etiqueta">
          Rock · Metal · Comunidad
        </span>
      </header>

      {!sesion ? (
        <section className="entrada">
          <div className="presentacion">
            <p className="subtitulo">
              EL VOLUMEN LO PONES TÚ
            </p>

            <h1>Tu espacio para vivir el metal.</h1>

            <p>
              Descubre bandas, álbumes y publicaciones de una
              comunidad que comparte tu pasión por la música.
            </p>
          </div>

          <form
            className="tarjeta formulario"
            onSubmit={iniciarSesion}
          >
            <h2>Inicia sesión</h2>
            <p>Entra a tu cuenta de MetalVerse.</p>

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
              autoComplete="current-password"
              placeholder="Tu contraseña"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" disabled={cargando}>
              {cargando ? "Entrando..." : "Entrar"}
            </button>
          </form>
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
    </main>
  );
}