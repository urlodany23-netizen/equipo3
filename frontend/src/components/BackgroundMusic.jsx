import { useEffect, useRef, useState } from "react";
import { BoltIcon } from "./RockIcons";
import "./BackgroundMusic.css";

const AUDIO_URL = `${import.meta.env.BASE_URL}audio/for-whom-the-bell-tolls-remastered.mp3`;

export default function BackgroundMusic() {
  const [error, setError] = useState("");
  const [autoplayBloqueado, setAutoplayBloqueado] = useState(false);
  const audioRef = useRef(null);

  async function reproducir() {
    const audio = audioRef.current;

    if (!audio) return;

    audio.volume = 0.25;

    try {
      await audio.play();
      setAutoplayBloqueado(false);
      setError("");
    } catch (err) {
      if (err?.name === "NotAllowedError") {
        setAutoplayBloqueado(true);
        return;
      }

      setError("No se pudo iniciar la música. Recarga la página para intentarlo de nuevo.");
    }
  }

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) return;

    audio.volume = 0.25;
    audio.play()
      .then(() => {
        setAutoplayBloqueado(false);
        setError("");
      })
      .catch((err) => {
        if (err?.name === "NotAllowedError") {
          setAutoplayBloqueado(true);
          return;
        }

        setError("No se pudo iniciar la música. Recarga la página para intentarlo de nuevo.");
      });
  }, []);

  return (
    <section className="music-deck" aria-label="Música de fondo">
      <div className="music-bar">
        <span className="music-emblem"><BoltIcon /></span>
        <div className="music-info">
          <span className="music-eyebrow">SONIDO METALVERSE</span>
          <strong>For Whom The Bell Tolls — Remastered</strong>
          <span>Metallica · Repetición activada</span>
        </div>
        <div className="music-controls">
          <audio
            ref={audioRef}
            src={AUDIO_URL}
            controls
            autoPlay
            loop
            preload="auto"
            aria-label="Reproducir For Whom The Bell Tolls — Remastered de Metallica"
            onLoadedMetadata={(event) => { event.currentTarget.volume = 0.25; }}
            onCanPlay={() => {
              setError("");

              if (audioRef.current?.paused) reproducir();
            }}
            onPlay={() => setAutoplayBloqueado(false)}
            onError={() => setError("No se pudo cargar la música. Recarga la página para intentarlo de nuevo.")}
          />
        </div>
      </div>
      {autoplayBloqueado && (
        <div className="music-autoplay-notice" role="status">
          <span>Tu navegador bloqueó el sonido automático.</span>
          <button type="button" onClick={reproducir}>Activar música</button>
        </div>
      )}
      {error && <p className="music-error" role="alert">{error}</p>}
    </section>
  );
}
