import { useState } from "react";

const categorias = {
  bandas: "Bandas",
  albumes: "Álbumes",
  conciertos: "Conciertos",
};

export default function Publicaciones({
  token,
  puedeCrear,
  puedeEditar,
  puedeEliminar,
  onSesionVencida,
}) {
  const [publicaciones, setPublicaciones] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [publicacionEditando, setPublicacionEditando] = useState(null);
  const [publicacionEliminar, setPublicacionEliminar] = useState(null);

  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [categoria, setCategoria] = useState("bandas");
  const [filtro, setFiltro] = useState("todas");

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
    setTitulo("");
    setContenido("");
    setCategoria("bandas");
    setPublicacionEditando(null);
  }

  async function consultarPublicaciones() {
    setCargando(true);
    setError("");
    setMensaje("");

    try {
      const datos = await pedirDatos("/api/publicaciones");

      if (datos) {
        setPublicaciones(datos.publicaciones);
      }
    } catch (err) {
      mostrarError(err);
    } finally {
      setCargando(false);
    }
  }

  function abrirCreacion() {
    limpiarFormulario();
    setPublicacionEliminar(null);
    setError("");
    setMensaje("");
    setMostrarFormulario(true);
  }

  function abrirEdicion(publicacion) {
    setTitulo(publicacion.titulo);
    setContenido(publicacion.contenido);
    setCategoria(publicacion.categoria);
    setPublicacionEditando(publicacion);
    setPublicacionEliminar(null);
    setError("");
    setMensaje("");
    setMostrarFormulario(true);
  }

  function cancelarFormulario() {
    setMostrarFormulario(false);
    limpiarFormulario();
    setError("");
  }

  async function guardarPublicacion(event) {
    event.preventDefault();
    setError("");
    setMensaje("");

    const tituloLimpio = titulo.trim();
    const contenidoLimpio = contenido.trim();

    if (
      tituloLimpio.length < 3 ||
      tituloLimpio.length > 150 ||
      contenidoLimpio.length < 20 ||
      contenidoLimpio.length > 10000
    ) {
      setError(
        "El título debe tener entre 3 y 150 caracteres y el contenido entre 20 y 10000."
      );
      return;
    }

    setCargando(true);

    try {
      const editando = publicacionEditando !== null;

      const ruta = editando
        ? `/api/publicaciones/${publicacionEditando.id}`
        : "/api/publicaciones";

      const datos = await pedirDatos(ruta, {
        method: editando ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          titulo: tituloLimpio,
          contenido: contenidoLimpio,
          categoria,
        }),
      });

      if (!datos) {
        return;
      }

      // Actualiza las tarjetas con lo confirmado por el backend.
      if (editando) {
        setPublicaciones((actuales) =>
          actuales === null
            ? null
            : actuales.map((publicacion) =>
                publicacion.id === datos.publicacion.id
                  ? {
                      ...publicacion,
                      ...datos.publicacion,
                      autor: publicacion.autor,
                    }
                  : publicacion
              )
        );
      }

      setMensaje(datos.mensaje);
      setMostrarFormulario(false);
      limpiarFormulario();
      setFiltro("todas");

      try {
        const listado = await pedirDatos("/api/publicaciones");

        if (listado) {
          setPublicaciones(listado.publicaciones);
        }
      } catch {
        setError(
          "Los cambios se guardaron, pero no se pudo actualizar la lista. Pulsa Ver publicaciones."
        );
      }
    } catch (err) {
      mostrarError(err);
    } finally {
      setCargando(false);
    }
  }

  function abrirEliminacion(publicacion) {
    setMostrarFormulario(false);
    limpiarFormulario();
    setPublicacionEliminar(publicacion);
    setError("");
    setMensaje("");
  }

  function cancelarEliminacion() {
    setPublicacionEliminar(null);
    setError("");
  }

  async function eliminarPublicacion() {
    if (!publicacionEliminar) {
      return;
    }

    setCargando(true);
    setError("");
    setMensaje("");

    try {
      const datos = await pedirDatos(
        `/api/publicaciones/${publicacionEliminar.id}`,
        { method: "DELETE" }
      );

      if (!datos) {
        return;
      }

      setPublicaciones((actuales) =>
        actuales === null
          ? null
          : actuales.filter(
              (publicacion) =>
                publicacion.id !== datos.publicacion_id
            )
      );

      setPublicacionEliminar(null);
      setMensaje(datos.mensaje);
    } catch (err) {
      mostrarError(err);
    } finally {
      setCargando(false);
    }
  }

  const publicacionesVisibles = (publicaciones || []).filter(
    (publicacion) =>
      filtro === "todas" || publicacion.categoria === filtro
  );

  return (
    <section className="tarjeta">
      <h2>La comunidad</h2>
      <p>Bandas, álbumes y conciertos para compartir.</p>

      <div className="acciones-usuarios">
        <button
          type="button"
          onClick={consultarPublicaciones}
          disabled={cargando}
        >
          {cargando ? "Procesando..." : "Ver publicaciones"}
        </button>

        {puedeCrear && (
          <button
            type="button"
            className="secundario"
            onClick={abrirCreacion}
            disabled={cargando || mostrarFormulario}
          >
            Crear publicación
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
          onSubmit={guardarPublicacion}
        >
          <h3>
            {publicacionEditando
              ? "Editar publicación"
              : "Nueva publicación"}
          </h3>

          <label htmlFor="publicacion-titulo">Título</label>
          <input
            id="publicacion-titulo"
            value={titulo}
            onChange={(event) => setTitulo(event.target.value)}
            minLength={3}
            maxLength={150}
            disabled={cargando}
            required
          />

          <label htmlFor="publicacion-categoria">Categoría</label>
          <select
            id="publicacion-categoria"
            value={categoria}
            onChange={(event) => setCategoria(event.target.value)}
            disabled={cargando}
          >
            {Object.entries(categorias).map(([valor, texto]) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </select>

          <label htmlFor="publicacion-contenido">Contenido</label>
          <textarea
            id="publicacion-contenido"
            value={contenido}
            onChange={(event) => setContenido(event.target.value)}
            minLength={20}
            maxLength={10000}
            rows={6}
            disabled={cargando}
            required
          />

          <div className="acciones-usuarios">
            <button type="submit" disabled={cargando}>
              {cargando
                ? "Guardando..."
                : publicacionEditando
                  ? "Guardar cambios"
                  : "Publicar"}
            </button>

            <button
              type="button"
              className="secundario"
              onClick={cancelarFormulario}
              disabled={cargando}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {publicacionEliminar && (
        <div className="formulario formulario-usuario">
          <h3>Eliminar publicación</h3>

          <p>
            ¿Quieres eliminar “{publicacionEliminar.titulo}”?
            Esta acción no se puede deshacer.
          </p>

          <div className="acciones-usuarios">
            <button
              type="button"
              onClick={eliminarPublicacion}
              disabled={cargando}
            >
              {cargando ? "Eliminando..." : "Confirmar eliminación"}
            </button>

            <button
              type="button"
              className="secundario"
              onClick={cancelarEliminacion}
              disabled={cargando}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {publicaciones !== null && (
        <>
          <div className="filtros-publicaciones">
            <label htmlFor="filtro-categoria">
              Filtrar por categoría
            </label>

            <select
              id="filtro-categoria"
              value={filtro}
              onChange={(event) => setFiltro(event.target.value)}
            >
              <option value="todas">Todas</option>

              {Object.entries(categorias).map(([valor, texto]) => (
                <option key={valor} value={valor}>
                  {texto}
                </option>
              ))}
            </select>
          </div>

          <div className="publicaciones-grid">
            {publicacionesVisibles.map((publicacion) => (
              <article
                className="publicacion"
                key={publicacion.id}
              >
                <span className="categoria-publicacion">
                  {categorias[publicacion.categoria]}
                </span>

                <h3>{publicacion.titulo}</h3>

                <p className="contenido-publicacion">
                  {publicacion.contenido}
                </p>

                <footer className="pie-publicacion">
                  <span>Por {publicacion.autor}</span>

                  <time dateTime={publicacion.creado_en}>
                    {new Date(
                      publicacion.creado_en
                    ).toLocaleDateString("es-MX")}
                  </time>
                </footer>

                <div className="acciones-usuarios">
                  {puedeEditar && (
                    <button
                      type="button"
                      className="secundario"
                      onClick={() => abrirEdicion(publicacion)}
                      disabled={cargando}
                    >
                      Editar
                    </button>
                  )}

                  {puedeEliminar && (
                    <button
                      type="button"
                      onClick={() => abrirEliminacion(publicacion)}
                      disabled={cargando}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>

          {publicacionesVisibles.length === 0 && (
            <p>No hay publicaciones en esta categoría.</p>
          )}
        </>
      )}
    </section>
  );
}