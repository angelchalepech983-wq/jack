import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import './App.css';

interface Universe3DProps {
  onSunClick: () => void;
  onPlanetClick: (photoIndex: number) => void;
  planetPhotos: string[];
}

// 1. Memoizamos el componente 3D para que React no lo re-procese innecesariamente
const Universe3D: React.FC<Universe3DProps> = React.memo(({ onSunClick, onPlanetClick, planetPhotos }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Almacén de recursos para limpieza de GPU
    const disposables: { dispose: () => void }[] = [];

    // Configuraciones de alto rendimiento
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 1, 30000);
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: "high-performance",
      precision: "highp"
    });
    
    // Aumentamos el pixel ratio para aprovechar pantallas de alta densidad (Retina/4K)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 3));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mountRef.current.appendChild(renderer.domElement);

    const clock = new THREE.Clock();
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const createHeartTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 256; // Doblamos resolución
      const ctx = canvas.getContext('2d', { alpha: true })!;
      ctx.fillStyle = 'white';
      ctx.beginPath();
      const x = 128, y = 160;
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x - 90, y - 90, x - 110, y + 50, x, y + 100);
      ctx.bezierCurveTo(x + 110, y + 25, x + 90, y - 90, x, y);
      ctx.fill();
      const tex = new THREE.CanvasTexture(canvas);
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;
      disposables.push(tex);
      return tex;
    };
    const heartTexture = createHeartTexture();

    // Fondo de estrellas HD optimizado
    const starFieldGeom = new THREE.BufferGeometry();
    const starFieldPos = new Float32Array(1500 * 3);
    for (let i = 0; i < 1500; i++) {
      const r = 5000 + Math.random() * 10000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starFieldPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starFieldPos[i * 3 + 1] = (Math.random() - 0.5) * 4000;
      starFieldPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starFieldGeom.setAttribute('position', new THREE.BufferAttribute(starFieldPos, 3));
    const starFieldMat = new THREE.PointsMaterial({ 
      size: 180, // Ligeramente más grande para más detalle
      color: 0xaa44ff, 
      map: heartTexture, 
      transparent: true, 
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    scene.add(new THREE.Points(starFieldGeom, starFieldMat));
    disposables.push(starFieldGeom, starFieldMat);

    // Objetos interactivos definidos explícitamente para el Raycaster
    const interactiveObjects: THREE.Object3D[] = [];

    const sunGeom = new THREE.SphereGeometry(540, 128, 128); // Más segmentos para suavidad
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd00 });
    const sun = new THREE.Mesh(sunGeom, sunMat);
    sun.name = "sun";
    scene.add(sun);
    interactiveObjects.push(sun);
    disposables.push(sunGeom, sunMat);

    const sunHaloGeom = new THREE.BufferGeometry();
    const haloPos = new Float32Array(500 * 3);
    for (let i = 0; i < 500; i++) {
      const u = Math.random(), v = Math.random();
      const theta = 2 * Math.PI * u, phi = Math.acos(2 * v - 1);
      const r = 550 + Math.random() * 200;
      haloPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      haloPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      haloPos[i * 3 + 2] = r * Math.cos(phi);
    }
    sunHaloGeom.setAttribute('position', new THREE.BufferAttribute(haloPos, 3));
    const sunHaloMat = new THREE.PointsMaterial({ size: 80, color: 0xffaa00, map: heartTexture, transparent: true, opacity: 0.5, depthWrite: false });
    const sunHalo = new THREE.Points(sunHaloGeom, sunHaloMat);
    scene.add(sunHalo);
    disposables.push(sunHaloGeom, sunHaloMat);

    const phrases = [
      "Eres el fuego que enciende mi universo y la razón por la que mi corazón late en rojo pasión.",
      "Te elegí a ti para ser mi universo, y cada día confirmo que tomé la mejor decisión.",
      "En medio de tanto caos cósmico, encontrarte fue mi mayor golpe de suerte.",
      "No importa cuántas galaxias existan, yo siempre buscaría la forma de llegar a la tuya."
    ];

    const createHDPlanet = (index: number, radius: number, colorStr: string, dist: number, speed: number, phrase: string) => {
      const group = new THREE.Group();
      
      const coreGeom = new THREE.SphereGeometry(radius * 0.85, 64, 64); // Más resolución
      const coreMat = new THREE.MeshBasicMaterial({ color: colorStr, transparent: true, opacity: 0.4 });
      const core = new THREE.Mesh(coreGeom, coreMat);
      core.name = `planet_${index}`;
      
      const orbitGroup = new THREE.Group();
      core.position.x = dist;
      orbitGroup.add(core);
      group.add(orbitGroup);
      interactiveObjects.push(core);
      disposables.push(coreGeom, coreMat);

      // 1. Aumentamos MASIVAMENTE la resolución del canvas para nitidez 4K
      const resolutionScale = 4; // Multiplicador de súper-muestreo
      const baseFontSize = 60;
      const canvasHeight = 120 * resolutionScale;
      
      const canvas = document.createElement('canvas');
      const tempCtx = canvas.getContext('2d')!;
      tempCtx.font = `bold ${baseFontSize * resolutionScale}px Montserrat`;
      const textMetrics = tempCtx.measureText(phrase);
      const textWidth = Math.ceil(textMetrics.width) + (200 * resolutionScale);
      
      canvas.width = textWidth; 
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d', { alpha: true })!;
      
      // 2. Dibujamos con la resolución escalada
      ctx.font = `bold ${baseFontSize * resolutionScale}px Montserrat`;
      ctx.fillStyle = 'white';
      ctx.textBaseline = 'middle';
      
      // Sombra más nítida para contraste
      ctx.shadowColor = 'rgba(0, 0, 0, 1)';
      ctx.shadowBlur = 15;
      ctx.lineWidth = 4 * resolutionScale;
      ctx.strokeStyle = 'rgba(0,0,0,0.9)';
      
      ctx.strokeText(phrase, 100 * resolutionScale, canvasHeight / 2);
      ctx.fillText(phrase, 100 * resolutionScale, canvasHeight / 2);
      
      const ringTex = new THREE.CanvasTexture(canvas);
      ringTex.wrapS = THREE.RepeatWrapping;
      ringTex.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 16);
      ringTex.minFilter = THREE.LinearMipmapLinearFilter;
      ringTex.magFilter = THREE.LinearFilter;
      disposables.push(ringTex);
      
      const ringHeight = 140; 
      const ringGeom = new THREE.CylinderGeometry(dist, dist, ringHeight, 128, 1, true);
      const ringMat = new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, side: THREE.DoubleSide, depthWrite: false });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      group.add(ringMesh);
      disposables.push(ringGeom, ringMat);

      return { group, orbitGroup, ringMesh, speed };
    };

    const planets = [
      createHDPlanet(0, 180, "#ff0000", 1200, 0.0035, phrases[0]), // 0.005 * 0.7
      createHDPlanet(1, 250, "#00ff00", 1800, 0.0021, phrases[1]), // 0.003 * 0.7
      createHDPlanet(2, 220, "#0000ff", 2500, 0.0014, phrases[2]), // 0.002 * 0.7
      createHDPlanet(3, 300, "#ff88cc", 3300, 0.0007, phrases[3]), // 0.001 * 0.7
    ];
    planets.forEach(p => scene.add(p.group));

    const clusterMaterials = [0xaa00ff, 0x8800ff, 0xcc44ff, 0x6600cc].map(color => {
      const mat = new THREE.PointsMaterial({ 
        size: 100, 
        color, 
        map: heartTexture, 
        transparent: true, 
        opacity: 1.0, 
        blending: THREE.AdditiveBlending, 
        depthWrite: false 
      });
      disposables.push(mat);
      return mat;
    });

    const createHeartCluster = (count: number, spread: number, basePos: THREE.Vector3, colorIndex: number) => {
      const geom = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const t = Math.random() * Math.PI * 2;
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        const scale = 5 + Math.random() * 8;
        pos[i*3] = basePos.x + x * scale + (Math.random() - 0.5) * spread;
        pos[i*3+1] = basePos.y + y * scale + (Math.random() - 0.5) * spread;
        pos[i*3+2] = basePos.z + (Math.random() - 0.5) * spread;
      }
      geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const points = new THREE.Points(geom, clusterMaterials[colorIndex]);
      disposables.push(geom);
      return points;
    };

    // Reducido al 20% (30 cúmulos en lugar de 150)
    for (let i = 0; i < 30; i++) {
      const distance = 1000 + Math.random() * 6000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const randomPos = new THREE.Vector3(distance * Math.sin(phi) * Math.cos(theta), (Math.random() - 0.5) * 4000, distance * Math.sin(phi) * Math.sin(theta));
      scene.add(createHeartCluster(12, 250, randomPos, Math.floor(Math.random() * clusterMaterials.length)));
    }

    const updateCamera = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const aspect = width / height;
      camera.aspect = aspect;
      
      // Cálculo dinámico para que el sistema solar siempre quepa bien
      // En móviles (aspect < 1) necesitamos un FOV mayor o alejar la cámara
      if (aspect < 1) {
        camera.fov = 45 + (1 - aspect) * 20; // Aumenta el FOV conforme se hace más estrecho
        camera.position.set(8000, 4000, 8000);
      } else {
        camera.fov = 30;
        camera.position.set(6500, 3000, 6500);
      }
      
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    updateCamera(); // Llamada inicial
    camera.lookAt(0, 0, 0);

    const onPointerDown = (event: PointerEvent) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveObjects);
      if (intersects.length > 0) {
        const obj = intersects[0].object;
        if (obj.name === "sun") onSunClick();
        else if (obj.name.startsWith("planet_")) onPlanetClick(parseInt(obj.name.split("_")[1]));
      }
    };

    let lastRaycastTime = 0;
    const onPointerMove = (event: PointerEvent) => {
      const now = performance.now();
      if (now - lastRaycastTime < 33) return;
      lastRaycastTime = now;

      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveObjects);
      if (mountRef.current) mountRef.current.style.cursor = intersects.length > 0 ? 'pointer' : 'default';
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1); 
      const timescale = delta * 60; 
      
      for (let i = 0; i < planets.length; i++) {
        const p = planets[i];
        p.orbitGroup.rotation.y += p.speed * timescale;
        if (p.ringMesh.material.map) p.ringMesh.material.map.offset.x += 0.0004 * timescale;
      }
      sunHalo.rotation.y += 0.002 * timescale;
      renderer.render(scene, camera);
    };
    animate();

    window.addEventListener('resize', updateCamera);

    return () => { 
      window.removeEventListener('resize', updateCamera);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      cancelAnimationFrame(animationId);
      disposables.forEach(d => d.dispose());
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement); 
    };
  }, [onSunClick, onPlanetClick, planetPhotos]);

  return <div ref={mountRef} className="webgl-container" />;
});

// 2. Componente de Galería optimizado
const PhotoGallery: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  photos: string[];
  title: string;
  phrase: string;
}> = React.memo(({ isOpen, onClose, photos, title, phrase }) => {
  if (!isOpen) return null;

  return (
    <div className="photo-gallery-overlay" onClick={onClose}>
      <div className="photo-gallery-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-gallery" onClick={onClose}>&times;</button>
        <div className="photo-grid single-view">
          {photos.map((src, index) => {
            const isHorizontal = src.includes('j.jpeg');
            return (
              <div 
                key={`${src}-${index}`} 
                className={`photo-item ${isHorizontal ? 'horizontal' : ''}`} 
                style={{ animationDelay: `${index * 0.1}s` } as React.CSSProperties}
              >
                <img 
                  src={src} 
                  alt={`Moment ${index + 1}`} 
                  loading="eager" 
                  decoding="async"
                />
              </div>
            );
          })}
        </div>
        <div className="gallery-footer">
          <h3 className="gallery-title">{title}</h3>
          <p className="romantic-phrase">"{phrase}"</p>
        </div>
      </div>
    </div>
  );
});

function App() {
  const [showMessage, setShowMessage] = React.useState(false);
  const [showGallery, setShowGallery] = React.useState(false);
  const [galleryData, setGalleryData] = React.useState({ photos: [] as string[], title: "", phrase: "" });
  const [starActive, setStarActive] = React.useState(false);
  const [starStyle, setStarStyle] = React.useState<React.CSSProperties>({});

  const romanticPhrases = useMemo(() => [
    "Eres el universo donde siempre quiero perderme.",
    "Cada segundo a tu lado es un regalo del destino.",
    "Tu amor es la luz que guía mi camino en la oscuridad.",
    "Eres el sueño del que nunca quiero despertar.",
    "En tus ojos encontré mi lugar favorito en el mundo.",
    "Contigo, cualquier lugar es el paraíso.",
    "Eres la melodía más dulce que mi corazón ha escuchado.",
    "Tu sonrisa es el motor que impulsa mi felicidad.",
    "Te amo más allá de lo que las palabras pueden expresar.",
    "Estar contigo es como vivir en una eterna primavera."
  ], []);

  const getRandomPhrase = useCallback(() => {
    return romanticPhrases[Math.floor(Math.random() * romanticPhrases.length)];
  }, [romanticPhrases]);

  const sunPhoto = `${import.meta.env.BASE_URL}fotos/j.jpeg`;
  const planetPhotos = useMemo(() => [
    `${import.meta.env.BASE_URL}fotos/a.jpeg`,
    `${import.meta.env.BASE_URL}fotos/c.jpeg`,
    `${import.meta.env.BASE_URL}fotos/i.jpeg`,
    `${import.meta.env.BASE_URL}fotos/k.jpeg`
  ], []);

  // Pre-carga de imágenes para que salgan instantáneas
  useEffect(() => {
    const allPhotos = [sunPhoto, ...planetPhotos];
    allPhotos.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }, [sunPhoto, planetPhotos]);

  const handleSunClick = useCallback(() => {
    setGalleryData({
      photos: [sunPhoto],
      title: "NUESTRO MOMENTO RADIANTE",
      phrase: "Sin importar lo que pase, yo siempre estaré contigo"
    });
    setShowGallery(true);
  }, [sunPhoto]);

  const handlePlanetClick = useCallback((index: number) => {
    setGalleryData({
      photos: [planetPhotos[index]],
      title: "UN RECUERDO ESPECIAL",
      phrase: getRandomPhrase()
    });
    setShowGallery(true);
  }, [planetPhotos, getRandomPhrase]);

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
    const interval = setInterval(() => { if (Math.random() > 0.3) triggerStar(); }, 5000);
    return () => clearInterval(interval);
  }, [triggerStar]);

  return (
    <div className="universe">
      <div className="nebula"></div>
      <Universe3D 
        onSunClick={handleSunClick} 
        onPlanetClick={handlePlanetClick}
        planetPhotos={planetPhotos}
      />
      {starActive && (
        <div className="shooting-star active" style={starStyle} onClick={() => setShowMessage(true)} />
      )}
      {showMessage && (
        <div className="special-message-overlay" onClick={() => setShowMessage(false)}>
          <div className="special-message-content">
            <h2>"No necesitas pedir un deseo, yo ya lo cumplí al encontrarte"</h2>
          </div>
        </div>
      )}
      
      <PhotoGallery 
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
        photos={galleryData.photos}
        title={galleryData.title}
        phrase={galleryData.phrase}
      />

      <div className="title-container top-aligned">
        <h2 className="sub-title">EL AMOR DE MI VIDA</h2>
        <h1 className="main-title">JACQUELINE</h1>
      </div>
      <div className="ui-overlay">Toca el sol o los planetas para ver nuestra luz</div>
    </div>
  );
}

export default App;
