import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const w = window.innerWidth;
    const h = window.innerHeight;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
    camera.position.z = 20;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(w, h);
    mountRef.current.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00ffff, 2);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    const dirLight2 = new THREE.DirectionalLight(0xff00ff, 2);
    dirLight2.position.set(-5, -5, 5);
    scene.add(dirLight2);

    const group = new THREE.Group();
    scene.add(group);

// Creates thousands of moving stars
    const starCount = 3000;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starVels = new Float32Array(starCount);

    for(let i=0; i<starCount; i++) {
      starPos[i*3] = (Math.random() - 0.5) * 200;
      starPos[i*3+1] = (Math.random() - 0.5) * 200;
      starPos[i*3+2] = (Math.random() - 0.5) * 200;
      starVels[i] = Math.random() * 0.1 + 0.02;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    
    const starMat = new THREE.PointsMaterial({
      color: 0x88ccff,
      size: 0.2,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    
    const stars = new THREE.Points(starGeo, starMat);
    group.add(stars);

    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX - window.innerWidth / 2) * 0.0005;
      mouseY = (e.clientY - window.innerHeight / 2) * 0.0005;
    };
    window.addEventListener('mousemove', handleMouseMove);

    let reqId: number;
    const animate = () => {
      reqId = requestAnimationFrame(animate);

      const positions = starGeo.attributes.position.array as Float32Array;
      for(let i=0; i<starCount; i++) {
        // Move stars towards camera
        positions[i*3+2] += starVels[i];
        if (positions[i*3+2] > 50) {
          positions[i*3+2] = -100;
        }
      }
      starGeo.attributes.position.needsUpdate = true;

      group.rotation.x += (mouseY - group.rotation.x) * 0.05;
      group.rotation.y += (mouseX - group.rotation.y) * 0.05;

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if(!mountRef.current) return;
      const nw = window.innerWidth;
      const nh = window.innerHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(reqId);
      if (mountRef.current && renderer.domElement === mountRef.current.firstChild) {
         mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      starGeo.dispose();
      starMat.dispose();
    };
  }, []);

  return <div ref={mountRef} className="fixed inset-0 pointer-events-none z-0" />;
}
