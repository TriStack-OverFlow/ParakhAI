import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import './GlobalBackground.css';

const GlobalBackground: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<SVGSVGElement>(null);
  const radarPingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMobile = window.innerWidth < 768;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Mouse state
    const mouse = new THREE.Vector2();
    const rawMouseCoords = { x: -1000, y: -1000 };
    let scrollY = 0;

    // --- THREE.JS SETUP ---
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05070F, 0.04);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    const baseCameraZ = 12;
    const baseCameraY = 3;
    camera.position.set(0, baseCameraY, baseCameraZ);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // --- 1. WIREFRAME GRID ---
    const gridHelper = new THREE.GridHelper(60, 60, 0x1A2035, 0x1A2035);
    gridHelper.position.y = -2;
    scene.add(gridHelper);

    // --- 2. PARTICLE FIELD ---
    const baseParticleCount = 1200;
    const particleCount = isMobile ? 300 : baseParticleCount;
    const particlesGeom = new THREE.BufferGeometry();

    const pPositions = new Float32Array(particleCount * 3);
    const pOriginalPositions = new Float32Array(particleCount * 3);
    const pVelocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const x = (Math.random() - 0.5) * 40;
      const y = (Math.random() - 0.5) * 20 + 2;
      const z = (Math.random() - 0.5) * 40;

      pPositions[i * 3] = x;
      pPositions[i * 3 + 1] = y;
      pPositions[i * 3 + 2] = z;

      pOriginalPositions[i * 3] = x;
      pOriginalPositions[i * 3 + 1] = y;
      pOriginalPositions[i * 3 + 2] = z;

      pVelocities[i * 3] = (Math.random() - 0.5) * 0.02;
      pVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
      pVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    }

    particlesGeom.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    particlesGeom.setAttribute('originalPos', new THREE.BufferAttribute(pOriginalPositions, 3));

    const particleMaterial = new THREE.PointsMaterial({
      color: 0x00E5FF,
      size: 0.15,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const particleSystem = new THREE.Points(particlesGeom, particleMaterial);
    scene.add(particleSystem);

    // --- 3. 3D INSPECTION TARGET (TORUS KNOT) ---
    const meshGroup = new THREE.Group();

    const geometry = new THREE.TorusKnotGeometry(2, 0.6, 100, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0x1A2035,
      wireframe: true,
      transparent: true,
      opacity: 0.8
    });

    const targetMesh = new THREE.Mesh(geometry, material);
    meshGroup.add(targetMesh);

    meshGroup.position.set(6, 1, -2);

    if (!isMobile) {
      scene.add(meshGroup);
    }

    // --- RAYCASTER FOR MOUSE PROXIMITY ---
    const raycaster = new THREE.Raycaster();

    // --- EVENT LISTENERS ---
    const handleResize = () => {
      isMobile = window.innerWidth < 768;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);

      if (isMobile) {
        scene.remove(meshGroup);
      } else {
        scene.add(meshGroup);
      }
    };
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      if (isTouch) return;
      rawMouseCoords.x = e.clientX;
      rawMouseCoords.y = e.clientY;

      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      if (cursorRef.current && !isMobile) {
        cursorRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
        createSpark(e.clientX, e.clientY);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);

    const handleScroll = () => {
      scrollY = window.scrollY;
      parallaxUpdate();
    };
    window.addEventListener('scroll', handleScroll);

    function createSpark(x: number, y: number) {
      if (Math.random() > 0.4) return;
      const spark = document.createElement('div');
      spark.className = 'spark';
      const offsetX = (Math.random() - 0.5) * 10;
      const offsetY = (Math.random() - 0.5) * 10;
      spark.style.left = (x + offsetX) + 'px';
      spark.style.top = (y + offsetY) + 'px';
      document.body.appendChild(spark);
      setTimeout(() => {
        spark.style.opacity = '0';
        setTimeout(() => spark.remove(), 600);
      }, 200);
    }

    function parallaxUpdate() {
      const scrollFactor = scrollY * 0.01;
      camera.position.z = baseCameraZ - scrollFactor * 2.5;
      camera.position.y = baseCameraY - scrollFactor * 0.5;
      meshGroup.position.y = 1 + scrollFactor * 2.0;
      particleSystem.position.y = scrollFactor * 0.8;
    }

    // --- ANIMATION LOOP ---
    const clock = new THREE.Clock();
    let baseMeshRotSpeed = 0.002;
    let currentMeshRotSpeed = 0.002;
    let targetMeshColor = new THREE.Color(0x1A2035);
    let currentMeshColor = new THREE.Color(0x1A2035);
    const colorAmber = new THREE.Color(0xFF8C00);

    let pingActive = false;
    let animationFrameId: number;

    function animate() {
      animationFrameId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Parallax handled on scroll, animate grid slowly
      gridHelper.position.z = (time * 0.5) % 2;

      if (!isMobile) {
        meshGroup.rotation.y += currentMeshRotSpeed;
        meshGroup.rotation.x += currentMeshRotSpeed * 0.5;

        raycaster.setFromCamera(mouse, camera);
        
        const meshScreenPos = meshGroup.position.clone();
        meshScreenPos.project(camera);
        const meshScreenX = (meshScreenPos.x * 0.5 + 0.5) * window.innerWidth;
        const meshScreenY = (meshScreenPos.y * -0.5 + 0.5) * window.innerHeight;

        const distToMesh = Math.hypot(rawMouseCoords.x - meshScreenX, rawMouseCoords.y - meshScreenY);

        if (distToMesh < 150) {
          currentMeshRotSpeed = THREE.MathUtils.lerp(currentMeshRotSpeed, 0.03, 0.1);
          currentMeshColor.lerp(colorAmber, 0.1);

          if (!pingActive && radarPingRef.current) {
            pingActive = true;
            radarPingRef.current.style.left = meshScreenX + 'px';
            radarPingRef.current.style.top = meshScreenY + 'px';
            radarPingRef.current.classList.add('pinging');
          }
        } else {
          currentMeshRotSpeed = THREE.MathUtils.lerp(currentMeshRotSpeed, baseMeshRotSpeed, 0.05);
          currentMeshColor.lerp(targetMeshColor, 0.05);

          if (pingActive && radarPingRef.current) {
            pingActive = false;
            radarPingRef.current.classList.remove('pinging');
          }
        }
        material.color.copy(currentMeshColor);
      }

      // Particles logic
      const positions = particlesGeom.attributes.position.array;
      const originalPos = particlesGeom.attributes.originalPos.array;

      for (let i = 0; i < particleCount; i++) {
        let nx = positions[i * 3];
        let ny = positions[i * 3 + 1];
        let nz = positions[i * 3 + 2];

        nx += pVelocities[i * 3];
        ny += pVelocities[i * 3 + 1] * 0.5;
        nz += pVelocities[i * 3 + 2];

        if (nx > 20 || nx < -20) pVelocities[i * 3] *= -1;
        if (ny > 22 || ny < 0) pVelocities[i * 3 + 1] *= -1;
        if (nz > 20 || nz < -20) pVelocities[i * 3 + 2] *= -1;

        if (!isMobile) {
          const pVec = new THREE.Vector3(nx, ny, nz);
          const pScreen = pVec.clone().project(camera);
          const pScreenX = (pScreen.x * 0.5 + 0.5) * window.innerWidth;
          const pScreenY = (pScreen.y * -0.5 + 0.5) * window.innerHeight;

          const dist = Math.hypot(rawMouseCoords.x - pScreenX, rawMouseCoords.y - pScreenY);

          if (dist < 120 && pScreen.z < 1) {
            let repelForce = (120 - dist) / 120;
            nx += (pScreenX > rawMouseCoords.x ? 0.05 : -0.05) * repelForce;
            ny -= (pScreenY > rawMouseCoords.y ? 0.05 : -0.05) * repelForce;
          } else {
            const ox = originalPos[i * 3];
            const oy = originalPos[i * 3 + 1] + particleSystem.position.y;
            const oz = originalPos[i * 3 + 2];
            nx += (ox - nx) * 0.001;
            ny += (oy - ny) * 0.001;
            nz += (oz - nz) * 0.001;
          }
        }

        positions[i * 3] = nx;
        positions[i * 3 + 1] = ny;
        positions[i * 3 + 2] = nz;
      }
      particlesGeom.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    }

    parallaxUpdate();
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(animationFrameId);
      
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      
      geometry.dispose();
      material.dispose();
      particlesGeom.dispose();
      particleMaterial.dispose();
    };
  }, []);

  return (
    <div className="global-bg-container">
      {/* Custom Cursor SVG */}
      <svg ref={cursorRef} id="cursor-crosshair" viewBox="0 0 24 24" fill="none">
        <path d="M12 2V22M2 12H22" stroke="var(--accent-cyan)" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="12" cy="12" r="6" stroke="var(--accent-cyan)" strokeWidth="1.5" strokeDasharray="2 2" />
      </svg>
      
      {/* Radar Ping Target */}
      <div ref={radarPingRef} id="radar-ping"></div>
      
      {/* CRT Scan Line */}
      <div className="scan-line"></div>
      
      {/* Three.js Container */}
      <div id="webgl-container" ref={containerRef}></div>
    </div>
  );
};

export default GlobalBackground;
