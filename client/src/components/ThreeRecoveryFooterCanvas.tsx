import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export function ThreeRecoveryFooterCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activeSpeed, setActiveSpeed] = useState<"normal" | "hyper" | "pulse">("normal");
  const speedRef = useRef(1);
  const pulseRef = useRef(0);

  useEffect(() => {
    if (activeSpeed === "normal") speedRef.current = 1;
    else if (activeSpeed === "hyper") speedRef.current = 2.4;
    else if (activeSpeed === "pulse") {
      speedRef.current = 1.6;
      pulseRef.current = 1.0;
    }
  }, [activeSpeed]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. SCENE & CAMERA
    const scene = new THREE.Scene();
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 340;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 7;

    // 2. RENDERER
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    // 3. 3D CORE OBJECTS: Autonomous Quantum Recovery Polyhedron
    // Inner Core: Neon Pink Wireframe Icosahedron
    const coreGeo = new THREE.IcosahedronGeometry(1.3, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xff409f,
      wireframe: true,
      emissive: 0xff2080,
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.9,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);

    // Inner Glowing Solid Gem Core
    const gemGeo = new THREE.OctahedronGeometry(0.7, 0);
    const gemMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: false,
      transparent: true,
      opacity: 0.35,
    });
    const gemMesh = new THREE.Mesh(gemGeo, gemMat);
    scene.add(gemMesh);

    // Orbiting Cyan Torus Ring (Recovery Gateway Track)
    const ringGeo = new THREE.TorusGeometry(2.1, 0.035, 16, 100);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x00f2fe,
      emissive: 0x00d2ee,
      emissiveIntensity: 1.2,
      roughness: 0.1,
      metalness: 0.8,
    });
    const ringMesh1 = new THREE.Mesh(ringGeo, ringMat);
    ringMesh1.rotation.x = Math.PI / 3;
    scene.add(ringMesh1);

    // Second Cross Ring
    const ringGeo2 = new THREE.TorusGeometry(2.35, 0.025, 16, 100);
    const ringMat2 = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0x9333ea,
      emissiveIntensity: 0.9,
      roughness: 0.1,
    });
    const ringMesh2 = new THREE.Mesh(ringGeo2, ringMat2);
    ringMesh2.rotation.y = Math.PI / 4;
    ringMesh2.rotation.x = -Math.PI / 6;
    scene.add(ringMesh2);

    // 4. FLOATING TRANSACTION NODES & PARTICLES
    const particleCount = 450;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const pinkColor = new THREE.Color(0xff409f);
    const cyanColor = new THREE.Color(0x00f2fe);
    const purpleColor = new THREE.Color(0xa855f7);

    for (let i = 0; i < particleCount; i++) {
      const radius = 2.4 + Math.random() * 3.6;
      const theta = THREE.MathUtils.randFloatSpread(360);
      const phi = THREE.MathUtils.randFloatSpread(360);

      positions[i * 3] = radius * Math.sin(theta) * Math.cos(phi);
      positions[i * 3 + 1] = radius * Math.sin(theta) * Math.sin(phi);
      positions[i * 3 + 2] = radius * Math.cos(theta);

      const chosenColor = i % 3 === 0 ? pinkColor : i % 3 === 1 ? cyanColor : purpleColor;
      colors[i * 3] = chosenColor.r;
      colors[i * 3 + 1] = chosenColor.g;
      colors[i * 3 + 2] = chosenColor.b;
    }

    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.055,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // 5. LIGHTING
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const pinkLight = new THREE.PointLight(0xff409f, 3, 15);
    pinkLight.position.set(3, 3, 3);
    scene.add(pinkLight);

    const cyanLight = new THREE.PointLight(0x00f2fe, 3, 15);
    cyanLight.position.set(-3, -3, 3);
    scene.add(cyanLight);

    // 6. MOUSE INTERACTION & DAMPING
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      mouseX = (x / rect.width - 0.5) * 2;
      mouseY = (y / rect.height - 0.5) * 2;
    };

    container.addEventListener("mousemove", handleMouseMove);

    // 7. CLICK PULSE TRIGGER
    const handleClick = () => {
      pulseRef.current = 1.2;
    };
    container.addEventListener("click", handleClick);

    // 8. RESIZE OBSERVER
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 9. ANIMATION LOOP
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();
      const speed = speedRef.current;

      // Mouse Parallax Smooth Interpolation
      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;

      // Pulse decay
      if (pulseRef.current > 0.01) {
        pulseRef.current *= 0.94;
      } else {
        pulseRef.current = 0;
      }

      const pulseScale = 1 + Math.sin(elapsedTime * 8) * 0.05 + pulseRef.current * 0.25;

      // Rotate Polyhedron
      coreMesh.rotation.x = elapsedTime * 0.35 * speed + targetY * 0.8;
      coreMesh.rotation.y = elapsedTime * 0.45 * speed + targetX * 0.8;
      coreMesh.scale.set(pulseScale, pulseScale, pulseScale);

      gemMesh.rotation.x = -elapsedTime * 0.5 * speed;
      gemMesh.rotation.y = -elapsedTime * 0.6 * speed;
      const gemScale = 1 + pulseRef.current * 0.4;
      gemMesh.scale.set(gemScale, gemScale, gemScale);

      // Rotate Rings
      ringMesh1.rotation.z = elapsedTime * 0.4 * speed;
      ringMesh1.rotation.y = elapsedTime * 0.2 * speed;

      ringMesh2.rotation.x = -elapsedTime * 0.35 * speed;
      ringMesh2.rotation.z = -elapsedTime * 0.25 * speed;

      // Undulate Particle Field
      particleSystem.rotation.y = elapsedTime * 0.08 * speed + targetX * 0.2;
      particleSystem.rotation.x = elapsedTime * 0.05 * speed + targetY * 0.2;

      renderer.render(scene, camera);
    };

    animate();

    // CLEANUP
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("click", handleClick);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      coreGeo.dispose();
      coreMat.dispose();
      gemGeo.dispose();
      gemMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      ringGeo2.dispose();
      ringMat2.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center select-none overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-black/80 backdrop-blur-2xl p-4 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
      {/* 3D Canvas Mount */}
      <div
        ref={mountRef}
        className="w-full h-[280px] sm:h-[340px] cursor-grab active:cursor-grabbing transition-transform duration-300"
        title="Interactive 3D Quantum Recovery Core — Hover & Click to pulse"
      />

      {/* Floating 3D Core HUD Controls */}
      <div className="absolute bottom-4 sm:bottom-6 left-4 right-4 sm:left-6 sm:right-6 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-xs font-semibold text-white/90">
          <span className="w-2 h-2 rounded-full bg-[#ff409f] animate-ping" />
          <span>Autonomous Quantum Core</span>
          <span className="hidden sm:inline text-white/40">• Click to Pulse</span>
        </div>

        <div className="flex items-center gap-1.5 bg-white/[0.06] p-1 rounded-xl border border-white/10 text-[11px]">
          <button
            type="button"
            onClick={() => setActiveSpeed("normal")}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              activeSpeed === "normal"
                ? "bg-[#ff409f] text-white shadow-[0_0_12px_rgba(255,64,159,0.5)] font-bold"
                : "text-white/60 hover:text-white"
            }`}
          >
            1x Realtime
          </button>
          <button
            type="button"
            onClick={() => setActiveSpeed("hyper")}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              activeSpeed === "hyper"
                ? "bg-[#00f2fe] text-black shadow-[0_0_12px_rgba(0,242,254,0.5)] font-bold"
                : "text-white/60 hover:text-white"
            }`}
          >
            2.5x Hyper
          </button>
          <button
            type="button"
            onClick={() => setActiveSpeed("pulse")}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              activeSpeed === "pulse"
                ? "bg-purple-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.5)] font-bold"
                : "text-white/60 hover:text-white"
            }`}
          >
            ⚡ Pulse
          </button>
        </div>
      </div>
    </div>
  );
}
