'use client';

import React, { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import lezza from '../../assets/01.png';
import * as THREE from 'three';
import { Canvas, useLoader, useFrame, useThree } from '@react-three/fiber';
import { OBJLoader } from 'three-stdlib';

function LoadedNugget({ 
  rotationX = 0, 
  rotationY = 0, 
  rotationZ = 0, 
  dragOffset = 0,
}: { 
  rotationX?: number; 
  rotationY?: number;
  rotationZ?: number;
  dragOffset?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const { scene, gl } = useThree();
  
  useEffect(() => {
    scene.background = null;
    gl.setClearColor(0x000000, 0);
    gl.domElement.style.background = 'transparent';
  }, [scene, gl]);
  
  // ✅ Load OBJ tanpa MTL atau texture - MURNI WARNA DARI KODE
  const originalObj = useLoader(OBJLoader, '/Cireng_Full.obj');
  const obj = useMemo(() => originalObj.clone(), [originalObj]);

  useEffect(() => {
    if (obj) {
      console.log('✅ Object loaded - applying procedural nugget material');
      
      obj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          
          // ✅ BUAT MATERIAL NUGGET REALISTIS DARI NOL
          const nuggetMaterial = new THREE.MeshStandardMaterial({
            // 🍗 WARNA DASAR - Kuning keemasan nugget goreng crispy
            color: new THREE.Color(0xFFBF47),  // Kuning nugget segar (#FFBf47)
            
            // ✨ EMISSIVE - Cahaya orange keemasan dari dalam
            emissive: new THREE.Color(0xE89B3C),  // Orange hangat (#E89B3C)
            emissiveIntensity: 0.18,  // Sedikit glow
            
            // 🎨 MATERIAL PROPERTIES
            roughness: 0.75,  // Permukaan kasar (breadcrumb crispy)
            metalness: 0.08,  // Hampir tidak metalik (ini makanan!)
            
            // 💡 REFLEKTIFITAS
            envMapIntensity: 0.3,  // Sedikit refleksi environment
            
            // 🔆 RENDER SETTINGS
            side: THREE.DoubleSide,
            flatShading: false,  // Smooth shading untuk bentuk organik
            
            // ⚡ OPTIMISASI
            transparent: false,
            opacity: 1.0,
          });
          
          mesh.material = nuggetMaterial;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          
          console.log('✅ Nugget material applied with procedural golden color');
        }
      });
    }
  }, [obj]);

  useFrame(() => {
    if (group.current) {
      group.current.rotation.x = rotationX * (Math.PI / 180);
      group.current.rotation.y = (rotationY + dragOffset * 0.3) * (Math.PI / 180);
      group.current.rotation.z = rotationZ * (Math.PI / 180);
    }
  });

  return (
    <group ref={group} scale={0.5}> 
      <primitive object={obj} />
    </group>
  );
}

function MultiNuggetCanvas({ 
  nuggets,
  dragStates,
}: { 
  nuggets: any[];
  dragStates: { [key: number]: number };
}) {
  return (
    <Canvas 
      camera={{ position: [0, 0, 8], fov: 50 }}
      gl={{ 
        alpha: true,
        antialias: true,
        premultipliedAlpha: false,
        preserveDrawingBuffer: true 
      }}
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'transparent',
        pointerEvents: 'none',
        zIndex: 35,
        willChange: 'transform, opacity',  // ✅ Performance optimization
      }}
      frameloop="always"  // ✅ Render terus menerus untuk smooth animation
    >
      {/* ✅ Lighting yang lebih baik untuk nugget kuning */}
      <ambientLight intensity={0.9} />
      <directionalLight position={[5, 5, 5]} intensity={1.0} color="#fffaf0" />
      <directionalLight position={[-5, 5, 5]} intensity={0.5} color="#ffd700" />
      <directionalLight position={[0, -3, 5]} intensity={0.4} color="#ffcc00" />
      <hemisphereLight args={['#fff5e6', '#cc8800', 0.5]} position={[0, 10, 0]} />
      <pointLight position={[0, 0, 5]} intensity={0.3} color="#ffdd88" />
      
      <Suspense fallback={null}>
        {nuggets.map((nugget) => (
          <group 
            key={nugget.id}
            position={[
              (nugget.screenX - window.innerWidth / 2) / 100,
              -(nugget.screenY - window.innerHeight / 2) / 100,
              0
            ]}
            scale={nugget.scale}
          >
            <LoadedNugget 
              rotationX={nugget.rotationX}
              rotationY={nugget.rotationY}
              rotationZ={nugget.rotationZ} 
              dragOffset={dragStates[nugget.id] || 0}
            />
          </group>
        ))}
      </Suspense>
    </Canvas>
  );
}

export default function LezzaInteractive() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [dragStates, setDragStates] = useState<{ [key: number]: number }>({});
  const [isDragging, setIsDragging] = useState<{ [key: number]: boolean }>({});
  const dragStartX = useRef<{ [key: number]: number }>({});

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ✅ SCROLL TRACKING
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min(Math.max(scrollTop / docHeight, 0), 1);
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, nuggetId: number) => {
    e.stopPropagation();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    dragStartX.current[nuggetId] = clientX;
    setIsDragging(prev => ({ ...prev, [nuggetId]: true }));
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent, nuggetId: number) => {
    if (!isDragging[nuggetId]) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const deltaX = clientX - (dragStartX.current[nuggetId] || clientX);
    
    setDragStates(prev => ({
      ...prev,
      [nuggetId]: deltaX * 0.2,
    }));
  };

  const handleDragEnd = (nuggetId: number) => {
    setIsDragging(prev => ({ ...prev, [nuggetId]: false }));
    delete dragStartX.current[nuggetId];
    
    setTimeout(() => {
      setDragStates(prev => {
        const newState = { ...prev };
        delete newState[nuggetId];
        return newState;
      });
    }, 400);
  };

  // ✅ PACKAGE ANIMATION - MENJAUH KE BELAKANG (3D DEPTH)
  const packageState = useMemo(() => {
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
    
    // ✅ SELALU DI TENGAH VIEWPORT
    const centerX = typeof window !== 'undefined' ? window.innerWidth / 2 : 600;
    const centerY = typeof window !== 'undefined' ? window.innerHeight / 2 : 400;
    
    let phase: 'start' | 'tilting' | 'pouring' | 'sinking' | 'falling' = 'start';
    let rotation = 0;
    let opacity = 1;
    let translateZ = 0; // ✅ MENJAUH KE BELAKANG (Z-axis)
    let blur = 0;
    
    // ===== TIMING - SUPER LAMBAT =====
    const TILT_START = 0.02;
    const TILT_END = 0.20;
    const POUR_START = 0.20;
    const POUR_END = 0.28;
    const FADE_START = 0.35;
    const FADE_END = 0.70;
    // =================================
    
    if (scrollProgress < TILT_START) {
      phase = 'start';
      rotation = 0;
      translateZ = 0;
      blur = 0;
      
    } else if (scrollProgress < TILT_END) {
      // ✅ SUPER SMOOTH TILTING
      phase = 'tilting';
      const p = (scrollProgress - TILT_START) / (TILT_END - TILT_START);
      const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      
      
      translateZ = 0;
      blur = 0;
      
    } else if (scrollProgress < POUR_START) {
      phase = 'pouring';
  
      translateZ = 0;
      blur = 0;
      
    } else if (scrollProgress < POUR_END) {
      // ✅ POURING PHASE
      phase = 'pouring';
      const p = (scrollProgress - POUR_START) / (POUR_END - POUR_START);
      
      translateZ = 0;
      blur = 0;
      
    } else if (scrollProgress < FADE_START) {
      phase = 'pouring';
    
      translateZ = 0;
      blur = 0;
      
    } else if (scrollProgress < FADE_END) {
      // ✅ MENJAUH KE BELAKANG - SMOOTH & LAMBAT
      phase = 'sinking';
      const p = (scrollProgress - FADE_START) / (FADE_END - FADE_START);
      const eased = 1 - Math.pow(1 - p, 3);
      

      opacity = 1;
      
    } else {
      // ✅ TERUS MENJAUH (JATUH KE DALAM)
      phase = 'falling';
      const fallProgress = Math.min((scrollProgress - FADE_END) / 0.30, 1);
      const eased = fallProgress < 0.5 
        ? 2 * fallProgress * fallProgress 
        : 1 - Math.pow(-2 * fallProgress + 2, 2) / 2;
      

      opacity = 1;
    }
    
    return {
      phase,
      centerX,
      centerY,
      rotation,
      opacity,
      translateZ, // ✅ Z-axis movement
      blur,
      spillY: window.innerHeight / 2,
    };
  }, [scrollProgress, isMobile]);

  // ✅ NUGGET SPILL - DENGAN FASE DRIFTING (SERONG KANAN + PAUSE)
  const nuggetsData = useMemo(() => {
    // ✅ Mulai keluar nugget PAS saat package mulai pouring (20%)
    if (scrollProgress < 0.20) return [];
    
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    
    // ✅ Spawn point - TEPAT DI ATAS package yang miring (LEBIH KE KIRI)
    const spillX = packageState.centerX + 50; // Lebih ke kiri, tepat di atas package
    const spillY = packageState.centerY - 150; // Lebih ke atas (ujung package)
    
    const baseNuggets = [
      {
        id: 1,
        delay: 0,
        offsetX: 0,  // ✅ LURUS (tidak ke kanan/kiri)
        offsetY: 50,
        driftX: 180,  // ✅ BARU: Berapa jauh drift ke kanan
        rotationX: 45,
        rotationY: 25,
        rotationZ: -15,
        size: isMobile ? 600 : 850,
        zIndex: 3,
      },
      {
        id: 2,
        delay: 0.03,
        offsetX: 0,  // ✅ LURUS
        offsetY: 150,
        driftX: 200,  // ✅ BARU: Drift lebih jauh
        rotationX: 60,
        rotationY: -30,
        rotationZ: 20,
        size: isMobile ? 590 : 830,
        zIndex: 5,
      },
      {
        id: 3,
        delay: 0.06,
        offsetX: 0,  // ✅ LURUS
        offsetY: 250,
        driftX: 160,  // ✅ BARU
        rotationX: -45,
        rotationY: 45,
        rotationZ: 10,
        size: isMobile ? 620 : 880,
        zIndex: 4,
      },
      {
        id: 4,
        delay: 0.09,
        offsetX: 0,  // ✅ LURUS
        offsetY: 350,
        driftX: 220,  // ✅ BARU
        rotationX: 30,
        rotationY: -60,
        rotationZ: -25,
        size: isMobile ? 605 : 860,
        zIndex: 2,
      },
      {
        id: 5,
        delay: 0.12,
        offsetX: 0,  // ✅ LURUS
        offsetY: 450,
        driftX: 170,  // ✅ BARU
        rotationX: -30,
        rotationY: 70,
        rotationZ: 15,
        size: isMobile ? 615 : 870,
        zIndex: 1,
      },
      {
        id: 6,
        delay: 0.15,
        offsetX: 0,  // ✅ LURUS
        offsetY: 550,
        driftX: 190,  // ✅ BARU
        rotationX: 50,
        rotationY: -45,
        rotationZ: -10,
        size: isMobile ? 610 : 865,
        zIndex: 1,
      },
    ];
    
    return baseNuggets.map(n => {
      // ✅ DURASI DIPERPANJANG - SUPER SMOOTH & LAMBAT
      const startScroll = 0.15 + (n.delay * 2.5);  // Mulai lebih awal + delay lebih panjang
      const emergeEnd = startScroll + 0.50;        // ✅ EMERGE: 50% scroll (dulu 30%)
      const driftEnd = emergeEnd + 0.25;           // ✅ DRIFT: 25% scroll (dulu 15%)
      const settleEnd = driftEnd + 0.12;           // ✅ SETTLE: 12% scroll (dulu 8%)
      const hoverEnd = 0.90;                       // Hover lebih lama
      const fallEnd = 1.0;                         // Fall sampai akhir
      
      let phase: 'hidden' | 'emerging' | 'drifting' | 'settling' | 'hovering' | 'falling' = 'hidden';
      let progress = 0;
      
      if (scrollProgress < startScroll) {
        phase = 'hidden';
      } else if (scrollProgress < emergeEnd) {
        phase = 'emerging';
        progress = (scrollProgress - startScroll) / (emergeEnd - startScroll);
      } else if (scrollProgress < driftEnd) {
        // ✅ BARU: Fase drift serong kanan + pause
        phase = 'drifting';
        progress = (scrollProgress - emergeEnd) / (driftEnd - emergeEnd);
      } else if (scrollProgress < settleEnd) {
        phase = 'settling';
        progress = (scrollProgress - driftEnd) / (settleEnd - driftEnd);
      } else if (scrollProgress < hoverEnd) {
        phase = 'hovering';
        progress = 1;
      } else if (scrollProgress < fallEnd) {
        phase = 'falling';
        progress = (scrollProgress - hoverEnd) / (fallEnd - hoverEnd);
      }
      
      if (phase === 'hidden') return null;
      
      let translateX = 0;
      let translateY = 0;
      let opacity = 1;
      let scale = 0.7;
      let currentRotation = 0;

      if (phase === 'emerging') {
        // ✅ ULTRA SMOOTH easing - cubic easing (lebih halus dari quartic)
        const eased = progress < 0.5
          ? 4 * progress * progress * progress  // Cubic ease-in (smooth start)
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;  // Cubic ease-out (smooth end)
        
        // ✅ Mulai dari spawn point (TEPAT DI ATAS package)
        const startX = spillX;
        const startY = spillY;
        
        // ✅ Target akhir - LURUS KE BAWAH (X tetap sama)
        const targetX = spillX + n.offsetX; // offsetX = 0, jadi LURUS
        const targetY = spillY + n.offsetY; // Jatuh ke bawah
        
        // ✅ Interpolasi dari spawn ke target dengan easing smooth
        translateX = startX + (targetX - startX) * eased;
        translateY = startY + (targetY - startY) * eased;
        
        // ✅ Opacity dan scale dengan easing berbeda untuk efek lebih natural
        const opacityEased = Math.pow(progress, 0.5); // Square root - naik lebih cepat
        const scaleEased = Math.pow(progress, 2);      // Quadratic - naik lebih lambat
        
        opacity = opacityEased;
        scale = 0.01 + (scaleEased * 0.69);  // ✅ Mulai SUPER KECIL (0.01) grow SANGAT PELAN
        currentRotation = progress * 100; // Rotasi lebih sedikit dan smooth
        
      } else if (phase === 'drifting') {
        // ✅ DRIFT SUPER SMOOTH dengan pause lebih lama
        // Progress 0.0 - 0.6: bergerak serong kanan (lebih cepat dari sebelumnya)
        // Progress 0.6 - 1.0: PAUSE LEBIH LAMA (40% dari fase drift)
        
        const moveProgress = Math.min(progress / 0.6, 1); // Normalisasi gerakan ke 0-1
        
        // ✅ Smooth ease-in-out cubic
        const eased = moveProgress < 0.5 
          ? 4 * moveProgress * moveProgress * moveProgress  // Cubic ease-in
          : 1 - Math.pow(-2 * moveProgress + 2, 3) / 2;     // Cubic ease-out
        
        // Posisi awal = posisi akhir fase emerging
        const startX = spillX + n.offsetX;
        const startY = spillY + n.offsetY;
        
        // ✅ Drift serong: ke kanan + sedikit ke bawah
        const driftTargetX = startX + n.driftX;  // Geser ke kanan
        const driftTargetY = startY + 80;         // Sedikit turun (serong)
        
        if (progress < 0.6) {
          // ✅ FASE BERGERAK (0-60% dari drifting phase)
          translateX = startX + (driftTargetX - startX) * eased;
          translateY = startY + (driftTargetY - startY) * eased;
        } else {
          // ✅ FASE PAUSE (60-100% dari drifting phase) - FREEZE LEBIH LAMA!
          translateX = driftTargetX;
          translateY = driftTargetY;
        }
        
        opacity = 1;
        scale = 0.7;
        currentRotation = 100 + (moveProgress * 50); // Rotasi smooth dan pelan
        
      } else if (phase === 'settling') {
        // ✅ Bounce lebih smooth dengan sine easing
        const bounceEased = Math.sin(progress * Math.PI);
        const bounce = bounceEased * 15; // Bounce lebih tinggi tapi smooth
        
        // ✅ Posisi awal settling = posisi akhir drifting
        const driftedX = spillX + n.offsetX + n.driftX;
        const driftedY = spillY + n.offsetY + 80;
        
        translateX = driftedX;
        translateY = driftedY + bounce;
        opacity = 1;
        scale = 0.7;
        currentRotation = 150 + (progress * 30); // Total 180 derajat smooth
        
      } else if (phase === 'hovering') {
        const floatTime = Date.now() / 2000;
        const floatOffset = Math.sin(floatTime + n.id) * 5;
        
        // ✅ Hover di posisi akhir drifting
        const finalX = spillX + n.offsetX + n.driftX;
        const finalY = spillY + n.offsetY + 80;
        
        translateX = finalX;
        translateY = finalY + floatOffset;
        opacity = 1;
        scale = 0.7;
        currentRotation = 180; // Rotasi penuh
        
      } else if (phase === 'falling') {
        // ✅ Falling dengan cubic easing untuk smooth
        const eased = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        
        // ✅ Jatuh dari posisi hover
        const finalX = spillX + n.offsetX + n.driftX;
        const finalY = spillY + n.offsetY + 80;
        
        translateX = finalX;
        translateY = finalY + (eased * 800); // Jatuh lebih jauh tapi smooth
        opacity = Math.max(0, 1 - eased * 1.2); // Fade out smooth
        scale = 0.7 - (eased * 0.4);
        currentRotation = 180 + (progress * 180); // Total 360 derajat smooth
      }

      const dragOffset = dragStates[n.id] || 0;
      
      return {
        ...n,
        phase,
        screenX: translateX + dragOffset,  // ✅ Sudah absolute position dari emerging
        screenY: translateY,
        opacity,
        scale,
        rotationX: n.rotationX + currentRotation,
        rotationY: n.rotationY + (dragOffset * 0.2),
        rotationZ: n.rotationZ,
        visible: true,
      };
    }).filter(n => n !== null);
  }, [scrollProgress, isMobile, dragStates, packageState.spillY]);

  return (
    <div className="min-h-screen relative">
      {/* Hero Section - ORANGE */}
      <div className="relative bg-gradient-to-b from-red-600 via-orange-500 to-orange-600" 
           style={{ minHeight: '110vh' }}>
        
        <header className="relative z-10 flex items-center justify-between px-4 md:px-8 lg:px-12 py-4 md:py-6 text-white">
          <div className="flex gap-2 md:gap-4">
            <button className="px-3 py-1.5 md:px-6 md:py-2 bg-white bg-opacity-10 rounded-full hover:bg-opacity-20 transition text-xs md:text-sm">
              Our Story
            </button>
            <button className="px-3 py-1.5 md:px-6 md:py-2 bg-white bg-opacity-10 rounded-full hover:bg-opacity-20 transition text-xs md:text-sm">
              Produk
            </button>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-wide">Lezza</h1>

          <div className="hidden md:flex gap-4 lg:gap-6 items-center">
            <button className="hover:opacity-80 transition text-sm">Blog</button>
            <button className="hover:opacity-80 transition text-sm">Hubungi Kami</button>
            <button className="px-4 py-2 lg:px-6 lg:py-2 border-2 border-white rounded-full hover:bg-white hover:text-red-500 transition text-sm flex items-center gap-2">
              Temukan Kami 🔍
            </button>
          </div>

          <button className="md:hidden text-2xl">☰</button>
        </header>

        <div className="relative z-10 text-center pt-20 md:pt-32 pb-20 px-4">
          <div className="inline-block px-4 py-1.5 md:px-6 md:py-2 bg-white bg-opacity-15 rounded-full text-white text-xs md:text-sm mb-8">
            Ciptakan Keluarga sehat
          </div>

          <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Satu Langkah Sederhana<br />
            Wujudkan Keluarga Sehat
          </h2>

          <p className="text-base md:text-lg lg:text-xl text-white max-w-3xl mx-auto leading-relaxed">
            Solusi praktis untuk hidangan lezat keluarga Indonesia<br />
            dari bahan pilihan, diproses dengan teknologi modern.
          </p>
        </div>
      </div>

      {/* ✅ PACKAGE - MENJAUH KE BELAKANG (3D PERSPECTIVE) */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          perspective: '1000px',
          perspectiveOrigin: 'center center',
          pointerEvents: 'none',
          zIndex: 30,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: packageState.centerX,
            top: packageState.centerY,
            transform: `
              translate(-50%, -50%) 
              rotate(${packageState.rotation}deg) 
              translateZ(${packageState.translateZ}px)
            `,
            transformStyle: 'preserve-3d',
            opacity: packageState.opacity,
            filter: `blur(${packageState.blur}px)`,
            transition: 'transform 0.05s linear, opacity 0.1s linear, filter 0.1s linear',
            width: isMobile ? '450px' : '650px',
            willChange: 'transform, opacity, filter',
          }}
        >
          <img
            src={lezza.src}
            alt="Lezza Package"
            style={{ 
              width: "140%",
              maxWidth: "2000px",
              height: "auto",
              filter: packageState.phase === 'pouring'
                ? 'brightness(1.05) contrast(1.02)'
                : 'none',
              transition: 'filter 0.3s ease',
              marginLeft: isMobile ? '-20%' : '-20%',
            }}
          />
        </div>
      </div>

      {/* Red Section - MERAH GELAP (langsung dari orange) */}
      <div className="relative min-h-screen bg-gradient-to-b from-red-900 via-red-950 to-black" style={{ zIndex: 50 }}>
        
        {nuggetsData.length > 0 && (
          <MultiNuggetCanvas 
            nuggets={nuggetsData}
            dragStates={dragStates}
          />
        )}

        {/* Drag overlays */}
        {nuggetsData.map((nugget: any) => (
          nugget && nugget.phase === 'hovering' && (
            <div
              key={`overlay-${nugget.id}`}
              className="fixed transition-all duration-200"
              style={{
                zIndex: 10000,
                left: nugget.screenX - nugget.size / 2,
                top: nugget.screenY - nugget.size / 2,
                width: nugget.size,
                height: nugget.size,
                cursor: isDragging[nugget.id] ? 'grabbing' : 'grab',
                pointerEvents: 'auto',
              }}
              onMouseDown={(e) => handleDragStart(e, nugget.id)}
              onMouseMove={(e) => handleDragMove(e, nugget.id)}
              onMouseUp={() => handleDragEnd(nugget.id)}
              onMouseLeave={() => handleDragEnd(nugget.id)}
              onTouchStart={(e) => handleDragStart(e, nugget.id)}
              onTouchMove={(e) => handleDragMove(e, nugget.id)}
              onTouchEnd={() => handleDragEnd(nugget.id)}
            />
          )
        ))}

        <div className="relative z-[100] text-center pt-40 pb-20 px-4">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
            🍗 Wilayah Baru
          </h2>
          <p className="text-lg md:text-xl text-white opacity-70 mb-8">
            Nugget telah masuk ke dimensi baru!
          </p>
          
          {scrollProgress >= 0.65 && scrollProgress < 0.85 && (
            <div className="inline-block bg-black bg-opacity-70 px-8 py-6 rounded-3xl">
              <div className="text-2xl md:text-3xl font-bold text-white animate-pulse mb-2">
                👆 Drag nugget kanan-kiri!
              </div>
              <div className="text-base text-white opacity-80">
                {nuggetsData.length} nugget besar di tengah layar
              </div>
            </div>
          )}
        </div>

        <div className="relative z-[100] max-w-7xl mx-auto px-4 md:px-8 lg:px-12 pb-20">
          <div className="bg-gradient-to-b from-red-900 to-red-950 bg-opacity-80 rounded-3xl p-12 text-white">
            <h3 className="text-4xl font-bold mb-6">Kenali kami</h3>
            <p className="text-base leading-relaxed mb-10 max-w-3xl">
              PT Rama Putra adalah perusahaan pengolahan produksi makanan beku (frozen food) yang berlokasi di Surabaya, Indonesia.
            </p>
            <button className="px-10 py-4 bg-red-500 hover:bg-red-600 rounded-full font-semibold transition flex items-center gap-3">
              Selengkapnya →
            </button>
          </div>
        </div>
      </div>

      {/* Scroll Progress Indicator */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 bg-black bg-opacity-50 px-6 py-3 rounded-full text-white text-sm">
        {scrollProgress < 0.02 && '⬇️ Scroll pelan-pelan untuk mulai (smooth & lambat)'}
        {scrollProgress >= 0.02 && scrollProgress < 0.15 && '📦 Kemasan miring pelan... (tetap di tengah)'}
        {scrollProgress >= 0.15 && scrollProgress < 0.40 && '🍗 Nugget muncul & membesar pelan...'}
        {scrollProgress >= 0.40 && scrollProgress < 0.65 && '✨ Package menjauh... nugget tumbuh smooth'}
        {scrollProgress >= 0.65 && scrollProgress < 0.75 && '➡️ Nugget drift serong kanan pelan...'}
        {scrollProgress >= 0.75 && scrollProgress < 0.82 && '⏸️ PAUSE - nugget berhenti sejenak!'}
        {scrollProgress >= 0.82 && scrollProgress < 0.90 && `🍗 Drag nugget kanan-kiri! (${nuggetsData.length} nugget)`}
        {scrollProgress >= 0.90 && '⬇️ Terus scroll untuk melihat nugget jatuh'}
      </div>

      <button className="fixed bottom-8 right-8 z-50 px-8 py-4 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-2xl transition">
        💬 Chat Agen
      </button>
    </div>
  );
}