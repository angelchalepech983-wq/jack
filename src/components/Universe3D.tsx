import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { UNIVERSE_PHRASES, COLORS } from '../constants/data';

interface Universe3DProps {
  onSunClick: () => void;
  onPlanetClick: (photoIndex: number) => void;
  planetPhotos: string[];
}

const Universe3D: React.FC<Universe3DProps> = React.memo(({ onSunClick, onPlanetClick, planetPhotos }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const disposables: { dispose: () => void }[] = [];
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 1, 30000);
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: "high-performance",
      precision: "highp"
    });
    
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mountRef.current.appendChild(renderer.domElement);

    const clock = new THREE.Clock();
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const updateCamera = () => {
      if (!mountRef.current) return;
      const aspect = window.innerWidth / window.innerHeight;
      camera.aspect = aspect;
      camera.fov = aspect < 1 ? 40 + (1 - aspect) * 20 : 30;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    updateCamera();

    const createHeartTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'white';
      ctx.beginPath();
      const x = 64, y = 80;
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x - 45, y - 45, x - 55, y + 25, x, y + 50);
      ctx.bezierCurveTo(x + 55, y + 25, x + 45, y - 45, x, y);
      ctx.fill();
      const tex = new THREE.CanvasTexture(canvas);
      tex.minFilter = THREE.LinearFilter;
      disposables.push(tex);
      return tex;
    };
    const heartTexture = createHeartTexture();

    const createStarField = () => {
      const geom = new THREE.BufferGeometry();
      const pos = new Float32Array(1500 * 3);
      for (let i = 0; i < 1500; i++) {
        const r = 5000 + Math.random() * 10000;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = (Math.random() - 0.5) * 4000;
        pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      }
      geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({ 
        size: 150, 
        color: COLORS.STARS, 
        map: heartTexture, 
        transparent: true, 
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      disposables.push(geom, mat);
      return new THREE.Points(geom, mat);
    };
    scene.add(createStarField());

    const interactiveObjects: THREE.Object3D[] = [];

    const createSun = () => {
      const geom = new THREE.SphereGeometry(540, 64, 64);
      const mat = new THREE.MeshBasicMaterial({ color: COLORS.SUN });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.name = "sun";
      interactiveObjects.push(mesh);
      disposables.push(geom, mat);
      return mesh;
    };
    scene.add(createSun());

    const createSunHalo = () => {
      const geom = new THREE.BufferGeometry();
      const pos = new Float32Array(500 * 3);
      for (let i = 0; i < 500; i++) {
        const u = Math.random(), v = Math.random();
        const theta = 2 * Math.PI * u, phi = Math.acos(2 * v - 1);
        const r = 550 + Math.random() * 200;
        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pos[i * 3 + 2] = r * Math.cos(phi);
      }
      geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({ size: 60, color: COLORS.SUN_HALO, map: heartTexture, transparent: true, opacity: 0.5, depthWrite: false });
      disposables.push(geom, mat);
      return new THREE.Points(geom, mat);
    };
    const sunHalo = createSunHalo();
    scene.add(sunHalo);

    const createHDPlanet = (index: number, radius: number, colorStr: string, dist: number, speed: number, phrase: string) => {
      const group = new THREE.Group();
      const coreGeom = new THREE.SphereGeometry(radius * 0.85, 32, 32);
      const coreMat = new THREE.MeshBasicMaterial({ color: colorStr, transparent: true, opacity: 0.4 });
      const core = new THREE.Mesh(coreGeom, coreMat);
      core.name = `planet_${index}`;
      
      const orbitGroup = new THREE.Group();
      core.position.x = dist;
      orbitGroup.add(core);
      group.add(orbitGroup);
      interactiveObjects.push(core);
      disposables.push(coreGeom, coreMat);

      const fontSize = 64;
      const padding = 120;
      const canvasHeight = 80;
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.font = `bold ${fontSize}px Montserrat`;
      const singleTextWidth = tempCtx.measureText(phrase).width + padding;
      const repeats = Math.max(1, Math.floor((2 * Math.PI * dist) / singleTextWidth));
      const finalPhrase = (phrase + "      •      ").repeat(repeats);
      
      const canvas = document.createElement('canvas');
      canvas.width = tempCtx.measureText(finalPhrase).width; 
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.font = `bold ${fontSize}px Montserrat`;
      ctx.fillStyle = 'white';
      ctx.textBaseline = 'middle';
      ctx.fillText(finalPhrase, 0, canvasHeight / 2);
      
      const ringTex = new THREE.CanvasTexture(canvas);
      ringTex.wrapS = THREE.RepeatWrapping;
      ringTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      disposables.push(ringTex);
      
      const ringGeom = new THREE.CylinderGeometry(dist, dist, 65, 128, 1, true);
      const ringMat = new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, side: THREE.DoubleSide, depthWrite: false });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      group.add(ringMesh);
      disposables.push(ringGeom, ringMat);

      return { group, orbitGroup, ringMesh, speed };
    };

    const planets = COLORS.PLANETS.map((color, i) => 
      createHDPlanet(i, 180 + i * 40, color, 1200 + i * 700, 0.0015 / (i + 1), UNIVERSE_PHRASES[i])
    );
    planets.forEach(p => scene.add(p.group));

    const createHeartCluster = (count: number, spread: number, basePos: THREE.Vector3, color: number) => {
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
      const mat = new THREE.PointsMaterial({ size: 100, color, map: heartTexture, transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending, depthWrite: false });
      disposables.push(geom, mat);
      return new THREE.Points(geom, mat);
    };

    for (let i = 0; i < 30; i++) {
      const distance = 1000 + Math.random() * 6000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const randomPos = new THREE.Vector3(distance * Math.sin(phi) * Math.cos(theta), (Math.random() - 0.5) * 4000, distance * Math.sin(phi) * Math.sin(theta));
      scene.add(createHeartCluster(12, 250, randomPos, COLORS.HEART_CLUSTERS[Math.floor(Math.random() * COLORS.HEART_CLUSTERS.length)]));
    }

    camera.position.set(6500, 3000, 6500);
    camera.lookAt(0, 0, 0);

    const onMouseDown = (event: PointerEvent) => {
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

    const onMouseMove = (event: PointerEvent) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveObjects);
      if (mountRef.current) mountRef.current.style.cursor = intersects.length > 0 ? 'pointer' : 'default';
    };

    window.addEventListener('pointerdown', onMouseDown);
    window.addEventListener('pointermove', onMouseMove, { passive: true });

    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const timescale = clock.getDelta() * 60;
      planets.forEach(p => {
        p.orbitGroup.rotation.y += p.speed * timescale;
        if (p.ringMesh.material.map) p.ringMesh.material.map.offset.x += 0.00015 * timescale;
      });
      sunHalo.rotation.y += 0.0005 * timescale;
      renderer.render(scene, camera);
    };
    animate();

    window.addEventListener('resize', updateCamera);

    return () => { 
      window.removeEventListener('resize', updateCamera);
      window.removeEventListener('pointerdown', onMouseDown);
      window.removeEventListener('pointermove', onMouseMove);
      cancelAnimationFrame(animationId);
      disposables.forEach(d => d.dispose());
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement); 
    };
  }, [onSunClick, onPlanetClick, planetPhotos]);

  return <div ref={mountRef} className="webgl-container" />;
});

export default Universe3D;
