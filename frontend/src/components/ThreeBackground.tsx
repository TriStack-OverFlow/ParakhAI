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

    // Creates multiple floating glassmorphic-like shapes
    const geo1 = new THREE.IcosahedronGeometry(8, 1);
    const mat1 = new THREE.MeshPhysicalMaterial({
      color: 0x111111,
      emissive: 0x00d0ff,
      emissiveIntensity: 0.1,
      roughness: 0.1,
      metalness: 0.9,
      wireframe: true,
      transparent: true,
      opacity: 0.3
    });
    const mesh1 = new THREE.Mesh(geo1, mat1);
    group.add(mesh1);

    const geo2 = new THREE.TorusKnotGeometry(12, 1, 150, 20);
    const mat2 = new THREE.MeshPhysicalMaterial({
      color: 0x000000,
      emissive: 0xffffff,
      emissiveIntensity: 0.05,
      roughness: 0.2,
      metalness: 0.8,
      wireframe: true,
      transparent: true,
      opacity: 0.1
    });
    const mesh2 = new THREE.Mesh(geo2, mat2);
    group.add(mesh2);

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
      
      mesh1.rotation.x += 0.001;
      mesh1.rotation.y += 0.002;
      
      mesh2.rotation.x -= 0.0015;
      mesh2.rotation.y -= 0.001;

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
      geo1.dispose();
      geo2.dispose();
      mat1.dispose();
      mat2.dispose();
    };
  }, []);

  return <div ref={mountRef} className="fixed inset-0 pointer-events-none z-0" />;
}