import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import Universe3D from './components/Universe3D';
import { ROMANTIC_PHRASES, PATHS } from './constants/data';
import './App.css';

const App: React.FC = () => {
  // --- UI State ---
  const [showMessage, setShowMessage] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
  const [galleryTitle, setGalleryTitle] = useState("");
  const [currentPhrase, setCurrentPhrase] = useState("");
  
  // --- Shooting Star State ---
  const [starActive, setStarActive] = useState(false);
  const [starStyle, setStarStyle] = useState<React.CSSProperties>({});
  
  // --- Audio State ---
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- Derived Data ---
  const sunPhoto = useMemo(() => `${import.meta.env.BASE_URL}${PATHS.PHOTOS.SUN}`, []);
  const planetPhotos = useMemo(() => 
    PATHS.PHOTOS.PLANETS.map(path => `${import.meta.env.BASE_URL}${path}`), 
  []);

  const getRandomPhrase = useCallback(() => {
    return ROMANTIC_PHRASES[Math.floor(Math.random() * ROMANTIC_PHRASES.length)];
  }, []);

  // --- Audio Logic ---
  useEffect(() => {
    const audio = new Audio(`${import.meta.env.BASE_URL}${PATHS.MUSIC}`);
    audio.loop = true;
    audioRef.current = audio;

    const playAudio = () => {
      audio.play().catch(() => {
        // Autoplay blocked, will wait for user interaction
      });
    };

    const timeoutId = setTimeout(() => {
      playAudio();
      window.addEventListener('click', playAudio, { once: true });
    }, 3000);

    return () => {
      clearTimeout(timeoutId);
      audio.pause();
      window.removeEventListener('click', playAudio);
    };
  }, []);

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted(audioRef.current.muted);
    }
  }, []);

  // --- Interaction Handlers ---
  const handleSunClick = useCallback(() => {
    setGalleryPhotos([sunPhoto]);
    setGalleryTitle("NUESTRO MOMENTO RADIANTE");
    setCurrentPhrase("Sin importar lo que pase, yo siempre estaré contigo");
    setShowGallery(true);
  }, [sunPhoto]);

  const handlePlanetClick = useCallback((index: number) => {
    setGalleryPhotos([planetPhotos[index]]);
    setGalleryTitle("UN RECUERDO ESPECIAL");
    setCurrentPhrase(getRandomPhrase());
    setShowGallery(true);
  }, [planetPhotos, getRandomPhrase]);

  // --- Shooting Star Logic ---
  const triggerStar = useCallback(() => {
    if (starActive) return;
    const startX = Math.random() * window.innerWidth;
    const startY = Math.random() * (window.innerHeight * 0.4);
    const rotation = 30 + Math.random() * 60;
    const travelX = 300 + Math.random() * 500;
    const travelY = travelX * Math.tan((rotation * Math.PI) / 180);

    setStarStyle({
      left: `${startX}px`,
      top: `${startY}px`,
      '--rotation': `${rotation}deg`,
      '--travel-x': `${travelX}px`,
      '--travel-y': `${travelY}px`,
    } as React.CSSProperties);

    setStarActive(true);
    setTimeout(() => setStarActive(false), 8000);
  }, [starActive]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.3) triggerStar();
    }, 5000);
    return () => clearInterval(interval);
  }, [triggerStar]);

  return (
    <div className="universe">
      <div className="nebula" />
      
      <Universe3D 
        onSunClick={handleSunClick} 
        onPlanetClick={handlePlanetClick}
        planetPhotos={planetPhotos}
      />
      
      <button 
        className={`music-toggle ${isMuted ? 'muted' : ''}`} 
        onClick={toggleMute}
        aria-label={isMuted ? "Unmute music" : "Mute music"}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>

      {starActive && (
        <div 
          className="shooting-star active" 
          style={starStyle} 
          onClick={() => setShowMessage(true)} 
        />
      )}

      {showMessage && (
        <div className="special-message-overlay" onClick={() => setShowMessage(false)}>
          <div className="special-message-content">
            <h2>"No necesitas pedir un deseo, yo ya lo cumplí al encontrarte"</h2>
          </div>
        </div>
      )}
      
      {showGallery && (
        <div className="photo-gallery-overlay" onClick={() => setShowGallery(false)}>
          <div className="photo-gallery-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-gallery" onClick={() => setShowGallery(false)} aria-label="Close gallery">
              &times;
            </button>
            <div className="photo-grid single-view">
              {galleryPhotos.map((src, index) => (
                <div 
                  key={index} 
                  className={`photo-item ${src.includes('j.jpeg') ? 'horizontal' : ''}`} 
                  style={{ animationDelay: `${index * 0.1}s` } as React.CSSProperties}
                >
                  <img src={src} alt={`Moment ${index + 1}`} loading="lazy" />
                </div>
              ))}
            </div>
            <div className="gallery-footer">
              <h3 className="gallery-title">{galleryTitle}</h3>
              <p className="romantic-phrase">"{currentPhrase}"</p>
            </div>
          </div>
        </div>
      )}

      <div className="title-container top-aligned">
        <h2 className="sub-title">EL AMOR DE MI VIDA</h2>
        <h1 className="main-title">JACQUELINE</h1>
      </div>

      <div className="ui-overlay">Toca el sol o los planetas para ver nuestra luz</div>
    </div>
  );
};

export default App;
