'use client';

import React, { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import lezza from '../../assets/01.png';
import * as THREE from 'three';
import { Canvas, useLoader, useFrame, useThree } from '@react-three/fiber';
import { TextureLoader } from 'three';
import { useGLTF } from '@react-three/drei';
import { OBJLoader } from 'three-stdlib';

// ============================================
// PRELOAD NUGGET ASSETS (GLB + TEXTURES) - NO DELAY ON FIRST APPEAR
// ============================================
async function preloadNuggetAssets() {
  // Full GLB preload (drei handles caching)
  useGLTF.preload('/Cireng_Full_opt.glb');

  // Cut OBJ preload (keep as-is)
  const manager = new THREE.LoadingManager();
  const objLoader = new OBJLoader(manager);
  await objLoader.loadAsync('/Cireng_Cut.obj');
}
// ============================================
// LOADED NUGGET COMPONENT (GLB)
// ============================================
function LoadedNugget({
  modelPath = '/Cireng_Full_opt.glb',
  rotationX = 0,
  rotationY = 0,
  rotationZ = 0,
  dragOffset = 0,
  renderOrder = 0,
}: {
  modelPath?: string;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  dragOffset?: number;
  renderOrder?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const { scene, gl } = useThree();

  useEffect(() => {
    scene.background = null;
    gl.setClearColor(0x000000, 0);
    gl.domElement.style.background = 'transparent';
  }, [scene, gl]);

  const isCutModel = modelPath.toLowerCase().includes('cut');

  // ✅ FULL uses GLB
  const gltf = useGLTF('/Cireng_Full_opt.glb');
  const glbObj = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  // ✅ CUT stays OBJ
  const cutObjOriginal = useLoader(OBJLoader, '/Cireng_Cut.obj');
  const cutObj = useMemo(() => cutObjOriginal.clone(), [cutObjOriginal]);

  // choose which object to render
  const obj = isCutModel ? cutObj : glbObj;

  useEffect(() => {
    if (!obj) return;

    // render order & shadow config (no material override)
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.renderOrder = renderOrder;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // keep existing material, just ensure updates if needed
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m: any) => {
          if (!m) return;
          m.needsUpdate = true;
        });
      }
    });
  }, [obj, renderOrder]);

  useFrame(() => {
    if (!group.current) return;
    group.current.rotation.x = rotationX * (Math.PI / 180);
    group.current.rotation.y = (rotationY + dragOffset * 0.3) * (Math.PI / 180);
    group.current.rotation.z = rotationZ * (Math.PI / 180);
  });

  return (
    <group ref={group} scale={0.5}>
      <primitive object={obj} />
    </group>
  );
}

// ============================================
// SINGLE NUGGET CANVAS (for blur effect per nugget)
// ============================================
function SingleNuggetCanvas({
  nugget,
  dragOffset,
}: {
  nugget: any;
  dragOffset: number;
  dimensions: { width: number; height: number };
}) {
  return (
    <div
      style={{
        position: 'fixed',
        left: nugget.screenX - nugget.size / 2,
        top: nugget.screenY - nugget.size / 2,
        width: nugget.size,
        height: nugget.size,
        pointerEvents: 'none',
        zIndex: nugget.renderOrder,
        filter: nugget.blurPx > 0 ? `blur(${nugget.blurPx}px)` : 'none',
        opacity: nugget.opacity,
        willChange: 'transform, filter, opacity',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        gl={{
          alpha: true,
          antialias: true,
          premultipliedAlpha: false,
          preserveDrawingBuffer: false,
        }}
        style={{
          width: '100%',
          height: '100%',
          background: 'transparent',
        }}
        frameloop="always"
      >
        <ambientLight intensity={1.2} />
        <directionalLight position={[5, 5, 5]} intensity={1.8} color="#fffaf0" castShadow />
        <directionalLight position={[-5, 5, 5]} intensity={1.0} color="#ffd700" />
        <directionalLight position={[0, -3, 5]} intensity={0.7} color="#ffcc00" />
        <hemisphereLight args={['#fff5e6', '#cc8800', 0.8]} position={[0, 10, 0]} />
        <pointLight position={[0, 0, 5]} intensity={0.6} color="#ffdd88" />
        <spotLight position={[0, 10, 0]} angle={0.3} intensity={1.0} color="#ffffff" />

        <Suspense fallback={null}>
          <group scale={nugget.scale * 2.5}>
            <LoadedNugget
              modelPath={nugget.modelPath} // "/Cireng_Full_opt.glb" or "/Cireng_Cut.obj"
              rotationX={nugget.rotationX}
              rotationY={nugget.rotationY}
              rotationZ={nugget.rotationZ}
              dragOffset={dragOffset}
              renderOrder={nugget.renderOrder}
            />
          </group>
        </Suspense>
      </Canvas>
    </div>
  );
}
useGLTF.preload('/Cireng_Full_opt.glb');

export { preloadNuggetAssets, LoadedNugget, SingleNuggetCanvas };

// ============================================
// EASING FUNCTIONS
// ============================================
const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOutBounce = (t: number) => {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
};
const smoothStep = (t: number) => t * t * (3 - 2 * t);

// ============================================
// PSEUDO RANDOM NUMBER GENERATOR
// ============================================
const prng = (seed: number) => {
  let t = seed + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const rand = (id: number, salt: number) => prng(id * 1000 + salt);

// ============================================
// CLAMP UTILITY
// ============================================
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// ============================================
// PHYSICS-BASED ROTATION CALCULATOR
// ============================================
function calculatePhysicsRotation(
  t: number,
  id: number,
  initialAngularVelocity: { x: number; y: number; z: number },
  airResistance: number = 0.3
) {
  const decay = Math.exp(-airResistance * t * 3);

  const turbulenceFreq = 2 + rand(id, 500) * 2;
  const turbulenceAmp = 15 * (1 - t);

  const wobbleX = Math.sin(t * turbulenceFreq * Math.PI) * turbulenceAmp;
  const wobbleY = Math.cos(t * turbulenceFreq * 0.7 * Math.PI) * turbulenceAmp * 1.2;
  const wobbleZ = Math.sin(t * turbulenceFreq * 0.5 * Math.PI + Math.PI / 4) * turbulenceAmp * 0.8;

  return {
    x: initialAngularVelocity.x * t * decay * 360 + wobbleX,
    y: initialAngularVelocity.y * t * decay * 360 + wobbleY,
    z: initialAngularVelocity.z * t * decay * 360 + wobbleZ,
  };
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function LezzaInteractive() {
  
  const [scrollProgress, setScrollProgress] = useState(0);
  const [nuggetAssetsReady, setNuggetAssetsReady] = useState(false);
const [packageImgLoaded, setPackageImgLoaded] = useState(false);
const [hasUserScrolled, setHasUserScrolled] = useState(false);
const [isTablet, setIsTablet] = useState(false);

  const [isMobile, setIsMobile] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [dragStates, setDragStates] = useState<{ [key: number]: number }>({});
  const [isDragging, setIsDragging] = useState<{ [key: number]: boolean }>({});
  const dragStartX = useRef<{ [key: number]: number }>({});

  useEffect(() => {
  const checkViewport = () => {
    const w = window.innerWidth;

    setIsMobile(w < 768);
    setIsTablet(w >= 768 && w < 1024);

    setDimensions({ width: w, height: window.innerHeight });
  };

  checkViewport();
  window.addEventListener('resize', checkViewport);
  return () => window.removeEventListener('resize', checkViewport);
}, []);


  useEffect(() => {
  let cancelled = false;

  (async () => {
    try {
      await preloadNuggetAssets();
      if (!cancelled) setNuggetAssetsReady(true);
    } catch (e) {
      // kalau gagal preload, tetap lanjut biar tidak block UI
      if (!cancelled) setNuggetAssetsReady(true);
      console.error('preloadNuggetAssets failed:', e);
    }
  })();

  return () => {
    cancelled = true;
  };
}, []);


  useEffect(() => {
  const handleScroll = () => {
    const scrollTop = window.scrollY;
    if (scrollTop > 0) setHasUserScrolled(true);

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

  const isInitialReady = packageImgLoaded && nuggetAssetsReady;
  
  

  // Package state calculation
  // =======================================================
// 1) REFS + SPILL POINT (titik mulut bungkus)
// =======================================================
const packageImgWrapRef = useRef<HTMLDivElement>(null);

const [spillPoint, setSpillPoint] = useState<{ x: number; y: number }>({
  x: 0,
  y: 0,
});

// Update spill point agar selalu sesuai posisi visual bungkus di viewport
useEffect(() => {
  if (typeof window === "undefined") return;

  const updateSpill = () => {
    const el = packageImgWrapRef.current;
    if (!el) return;

    const r = el.getBoundingClientRect();

    // ✅ Pilih "mulut bungkus" pakai rasio (tweak angka ini sesuai posisi mulut bungkus di image kamu)
    // xRatio: makin besar -> makin ke kanan
    // yRatio: makin kecil -> makin ke atas
    const xRatio = isMobile ? 0.66 : isTablet ? 0.67 : 0.67;
const yRatio = isMobile ? 0.20 : isTablet ? 0.19 : 0.18;


    const x = r.left + r.width * xRatio;
    const y = r.top + r.height * yRatio;

    setSpillPoint({ x, y });
  };

  updateSpill();
  window.addEventListener("resize", updateSpill);
  window.addEventListener("scroll", updateSpill, { passive: true });

  return () => {
    window.removeEventListener("resize", updateSpill);
    window.removeEventListener("scroll", updateSpill as any);
  };
}, [isMobile]);

// =======================================================
// 2) PACKAGE STATE (opacity + center) - deps dibenerin
// =======================================================
const packageState = useMemo(() => {
  if (typeof window === "undefined") {
    return { centerX: 600, centerY: 400, opacity: 1 };
  }

  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  let opacity = 1;
  const FADE_START = 0.50;
  const FADE_END = 0.65;

  if (scrollProgress >= FADE_START && scrollProgress < FADE_END) {
    const p = (scrollProgress - FADE_START) / (FADE_END - FADE_START);
    opacity = 1 - p;
  } else if (scrollProgress >= FADE_END) {
    opacity = 0;
  }

  // ✅ aturan kamu tetap dipakai, cuma dirapihin
  if (!isInitialReady) opacity = 1;
  else if (isInitialReady && !hasUserScrolled) opacity = 0;

  return { centerX, centerY, opacity };
}, [scrollProgress, isInitialReady, hasUserScrolled]);

// =======================================================
// 3) CONSTANTS (biar 1 sumber, gak dobel2)
// =======================================================
const ANIMATION_START = 0.06; // harus sama dengan nuggetsData
const canRenderNuggets = nuggetAssetsReady; // asset cireng sudah preload
const revealNuggets = true;

// =======================================================
// 4) NUGGETS DATA - ZIGZAG PHYSICS ANIMATION (SPAWN FIX + SMOOTH)
// =======================================================
const nuggetsData = useMemo(() => {
  if (typeof window === "undefined") return [];
  if (!canRenderNuggets) return []; // ✅ tunggu assets dulu biar ga error

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const baseScale = isMobile ? 0.14 : 0.38;

  // ✅ SPAWN ORIGIN (yang “pas di atas bungkus”)
  // Kalau spillPoint belum kebaca (0,0), fallback ke center + offset kecil
  const fallbackX = packageState.centerX + (isMobile ? 60 : 100);
  const fallbackY = packageState.centerY - (isMobile ? 30 : 50);

  const spillOriginX = spillPoint.x > 0 ? spillPoint.x : fallbackX;
  const spillOriginY = spillPoint.y > 0 ? spillPoint.y : fallbackY;

  // =======================================================
  // NUGGET DEFINITIONS
  // =======================================================
const baseNuggets = [
  // FAR BACK (3)
  { id: 1, type: "full", delay: 0.00, depthLayer: -1, layer: "far-back", sizeMultiplier: 0.87 },
  { id: 2, type: "full", delay: 0.06, depthLayer: -1, layer: "far-back", sizeMultiplier: 0.87 },
  { id: 3, type: "full", delay: 0.12, depthLayer: -1, layer: "far-back", sizeMultiplier: 0.87 },

  // MID (3)
  { id: 4, type: "full", delay: 0.03, depthLayer: 0, layer: "mid", sizeMultiplier: 0.87 },
  { id: 5, type: "full", delay: 0.09, depthLayer: 0, layer: "mid", sizeMultiplier: 0.87 },
  { id: 6, type: "full", delay: 0.15, depthLayer: 0, layer: "mid", sizeMultiplier: 0.87 },

  // FRONT (3)
  { id: 7, type: "full", delay: 0.05, depthLayer: 1, layer: "front", sizeMultiplier: 0.84 },
  { id: 8, type: "full", delay: 0.11, depthLayer: 1, layer: "front", sizeMultiplier: 0.84 },
  { id: 9, type: "full", delay: 0.17, depthLayer: 1, layer: "front", sizeMultiplier: 0.84 },
] as const;


  // =======================================================
  // TIMELINE (dibuat sedikit lebih slow biar smooth)
  // =======================================================
  const FALL_DURATION = 0.14;  // dulu 0.12 -> smooth sedikit
  const PAUSE_DURATION = 0.07; // dulu 0.06 -> smooth sedikit

  return baseNuggets.map((n) => {
    const nuggetStart = ANIMATION_START + n.delay;

    const phase1End = nuggetStart + FALL_DURATION;
    const pause1End = phase1End + PAUSE_DURATION;
    const phase2End = pause1End + FALL_DURATION;
    const pause2End = phase2End + PAUSE_DURATION;
    const phase3End = pause2End + FALL_DURATION;
    const pause3End = phase3End + PAUSE_DURATION;
    const phase4End = pause3End + FALL_DURATION;

    let phase:
      | "hidden"
      | "fall-right-1"
      | "pause-1"
      | "fall-left-1"
      | "pause-2"
      | "fall-right-2"
      | "pause-3"
      | "fall-left-2"
      | "landed" = "hidden";

    let phaseProgress = 0;

    if (scrollProgress < nuggetStart) {
      phase = "hidden";
      phaseProgress = 0;
    } else if (scrollProgress < phase1End) {
      phase = "fall-right-1";
      phaseProgress = (scrollProgress - nuggetStart) / FALL_DURATION;
    } else if (scrollProgress < pause1End) {
      phase = "pause-1";
      phaseProgress = (scrollProgress - phase1End) / PAUSE_DURATION;
    } else if (scrollProgress < phase2End) {
      phase = "fall-left-1";
      phaseProgress = (scrollProgress - pause1End) / FALL_DURATION;
    } else if (scrollProgress < pause2End) {
      phase = "pause-2";
      phaseProgress = (scrollProgress - phase2End) / PAUSE_DURATION;
    } else if (scrollProgress < phase3End) {
      phase = "fall-right-2";
      phaseProgress = (scrollProgress - pause2End) / FALL_DURATION;
    } else if (scrollProgress < pause3End) {
      phase = "pause-3";
      phaseProgress = (scrollProgress - phase3End) / PAUSE_DURATION;
    } else if (scrollProgress < phase4End) {
      phase = "fall-left-2";
      phaseProgress = (scrollProgress - pause3End) / FALL_DURATION;
    } else {
      phase = "landed";
      phaseProgress = 1;
    }

    // =======================================================
    // WAYPOINT POSITIONS (zigzag path)
    // =======================================================
    const layerSpread = n.layer === "far-back" ? 1.4 : n.layer === "mid" ? 1.0 : 0.7;
    const idOffset = (n.id - 5) * (isMobile ? 35 : 55) * layerSpread;
    const verticalOffset = (rand(n.id, 150) - 0.5) * vh * 0.15;

    const wp1X = vw * 0.72 + idOffset + (rand(n.id, 100) - 0.5) * vw * 0.08;
    const wp1Y = vh * 0.35 + verticalOffset;

    const wp2X = vw * 0.28 + idOffset * 0.8 + (rand(n.id, 101) - 0.5) * vw * 0.08;
    const wp2Y = vh * 0.50 + verticalOffset * 0.8;

    const wp3X = vw * 0.70 + idOffset * 0.6 + (rand(n.id, 102) - 0.5) * vw * 0.06;
    const wp3Y = vh * 0.65 + verticalOffset * 0.6;

    const landingCenterX = vw * 0.32;
    const landingCenterY = vh * 0.80;

    const clusterRadius = Math.min(vw, vh) * (isMobile ? 0.22 : 0.28) * layerSpread;
    const layerNuggets = baseNuggets.filter((nug) => nug.layer === n.layer);
    const indexInLayer = layerNuggets.findIndex((nug) => nug.id === n.id);
    const angleBase = (indexInLayer / layerNuggets.length) * Math.PI * 2;
    const angleJitter = (rand(n.id, 102) - 0.5) * Math.PI * 0.3;
    const angle = angleBase + angleJitter;
    const distanceRatio = 0.45 + rand(n.id, 103) * 0.45;
    const distance = distanceRatio * clusterRadius;

    const finalX = landingCenterX + Math.cos(angle) * distance;
    const finalY = landingCenterY + Math.sin(angle) * distance * 0.6;

    // =======================================================
    // ROTATION PHYSICS
    // =======================================================
    const initialAngVel = {
      x: (rand(n.id, 300) - 0.5) * 2.5,
      y: (rand(n.id, 301) - 0.5) * 3.0,
      z: (rand(n.id, 302) - 0.5) * 1.8,
    };

    // =======================================================
    // DEFAULTS
    // =======================================================
    let x = spillOriginX;
    let y = spillOriginY;
    let opacity = 0;
    let scale = 0;
    let rotationX = 0;
    let rotationY = 0;
    let rotationZ = 0;
    let depth = 0;

    const targetScale =
      baseScale * n.sizeMultiplier * (0.9 + rand(n.id, 400) * 0.2);

    let targetOpacity = 1.0;
    if (n.layer === "far-back") targetOpacity = 0.85;
    else if (n.layer === "mid") targetOpacity = 0.95;

    let blurPx = 0;
    if (n.layer === "far-back") blurPx = isMobile ? 3.5 : 2;
    else if (n.layer === "mid") blurPx = isMobile ? 1.2 : 1;

    // =======================================================
    // PHASE LOGIC (yang diubah untuk SMOOTH:
    // - opacity/scale naik lebih pelan di awal
    // - tidak mulai dari scale 0 (biar gak “pop”)
    // =======================================================
    if (phase === "hidden") {
      x = spillOriginX;
      y = spillOriginY;
      opacity = 0;
      scale = targetScale * 0.001; // bukan 0, tapi super kecil
      depth = n.depthLayer * 0.5;
      blurPx = 0;
    }

    else if (phase === "fall-right-1") {
      const t = phaseProgress;

      // posisi
      x = spillOriginX + (wp1X - spillOriginX) * easeOutQuad(t);

      const arcHeight = -vh * 0.08;
      y = spillOriginY + (wp1Y - spillOriginY) * t + arcHeight * Math.sin(t * Math.PI);

      // rotasi
      const physRot = calculatePhysicsRotation(t, n.id, initialAngVel, 0.25);
      rotationX = physRot.x;
      rotationY = physRot.y;
      rotationZ = physRot.z;

      // ✅ SMOOTH APPEAR:
      // opacity pelan naik (easeOutCubic)
      // scale mulai dari kecil tapi bukan 0 (0.15x)
      const appear = easeOutCubic(Math.min(t * 1.2, 1));
      opacity = appear * targetOpacity;
      scale = targetScale * (0.15 + 0.85 * appear);

      depth = n.depthLayer * 0.6;
      blurPx = blurPx * appear;
    }

    else if (phase === "pause-1") {
      const t = phaseProgress;

      x = wp1X;
      y = wp1Y;

      const floatTime = t * Math.PI * 2;
      y += Math.sin(floatTime + n.id * 0.5) * 5;
      x += Math.cos(floatTime * 0.7 + n.id * 0.3) * 3;

      const baseRot = calculatePhysicsRotation(1, n.id, initialAngVel, 0.25);
      rotationX = baseRot.x + Math.sin(floatTime * 0.3) * 5;
      rotationY = baseRot.y + t * 10;
      rotationZ = baseRot.z + Math.cos(floatTime * 0.4) * 3;

      opacity = targetOpacity;
      scale = targetScale;
      depth = n.depthLayer * 0.6;
    }

    else if (phase === "fall-left-1") {
      const t = phaseProgress;

      x = wp1X + (wp2X - wp1X) * easeInOutQuad(t);

      const arcHeight = -vh * 0.06;
      y = wp1Y + (wp2Y - wp1Y) * t + arcHeight * Math.sin(t * Math.PI);

      const prevRot = calculatePhysicsRotation(1, n.id, initialAngVel, 0.25);
      const newImpulse = {
        x: initialAngVel.x * 0.7,
        y: -initialAngVel.y * 0.8,
        z: initialAngVel.z * 0.6,
      };
      const physRot = calculatePhysicsRotation(t, n.id + 100, newImpulse, 0.3);

      rotationX = prevRot.x + physRot.x * 0.6;
      rotationY = prevRot.y + physRot.y * 0.6;
      rotationZ = prevRot.z + physRot.z * 0.6;

      opacity = targetOpacity;
      scale = targetScale;
      depth = n.depthLayer * 0.7;
    }

    else if (phase === "pause-2") {
      const t = phaseProgress;

      x = wp2X;
      y = wp2Y;

      const floatTime = t * Math.PI * 2;
      y += Math.sin(floatTime + n.id * 0.6) * 4;
      x += Math.cos(floatTime * 0.8 + n.id * 0.4) * 2.5;

      const prevRot = calculatePhysicsRotation(1, n.id, initialAngVel, 0.25);
      const addRot = calculatePhysicsRotation(
        1,
        n.id + 100,
        { x: initialAngVel.x * 0.7, y: -initialAngVel.y * 0.8, z: initialAngVel.z * 0.6 },
        0.3
      );

      rotationX = prevRot.x + addRot.x * 0.6 + Math.sin(floatTime * 0.35) * 4;
      rotationY = prevRot.y + addRot.y * 0.6 + t * 8;
      rotationZ = prevRot.z + addRot.z * 0.6 + Math.cos(floatTime * 0.45) * 2.5;

      opacity = targetOpacity;
      scale = targetScale;
      depth = n.depthLayer * 0.7;
    }

    else if (phase === "fall-right-2") {
      const t = phaseProgress;

      x = wp2X + (wp3X - wp2X) * easeInOutQuad(t);

      const arcHeight = -vh * 0.05;
      y = wp2Y + (wp3Y - wp2Y) * t + arcHeight * Math.sin(t * Math.PI);

      const prevRot = calculatePhysicsRotation(1, n.id, initialAngVel, 0.25);
      const addRot1 = calculatePhysicsRotation(
        1,
        n.id + 100,
        { x: initialAngVel.x * 0.7, y: -initialAngVel.y * 0.8, z: initialAngVel.z * 0.6 },
        0.3
      );
      const newImpulse = {
        x: initialAngVel.x * 0.5,
        y: initialAngVel.y * 0.6,
        z: -initialAngVel.z * 0.4,
      };
      const physRot = calculatePhysicsRotation(t, n.id + 200, newImpulse, 0.35);

      rotationX = prevRot.x + addRot1.x * 0.6 + physRot.x * 0.4;
      rotationY = prevRot.y + addRot1.y * 0.6 + physRot.y * 0.4;
      rotationZ = prevRot.z + addRot1.z * 0.6 + physRot.z * 0.4;

      opacity = targetOpacity;
      scale = targetScale;
      depth = n.depthLayer * 0.8;
    }

    else if (phase === "pause-3") {
      const t = phaseProgress;

      x = wp3X;
      y = wp3Y;

      const floatTime = t * Math.PI * 2;
      y += Math.sin(floatTime + n.id * 0.7) * 3.5;
      x += Math.cos(floatTime * 0.9 + n.id * 0.5) * 2;

      const baseRotX = (rand(n.id, 600) - 0.5) * 180;
      const baseRotY = (rand(n.id, 601) - 0.5) * 220;
      const baseRotZ = (rand(n.id, 602) - 0.5) * 120;

      rotationX = baseRotX + Math.sin(floatTime * 0.4) * 3;
      rotationY = baseRotY + t * 6;
      rotationZ = baseRotZ + Math.cos(floatTime * 0.5) * 2;

      opacity = targetOpacity;
      scale = targetScale;
      depth = n.depthLayer * 0.8;
    }

    else if (phase === "fall-left-2") {
      const t = phaseProgress;

      x = wp3X + (finalX - wp3X) * easeInOutQuad(t);

      const arcHeight = -vh * 0.03;
      y = wp3Y + (finalY - wp3Y) * easeOutQuad(t) + arcHeight * Math.sin(t * Math.PI);

      const baseRotX = (rand(n.id, 600) - 0.5) * 180;
      const baseRotY = (rand(n.id, 601) - 0.5) * 220;
      const baseRotZ = (rand(n.id, 602) - 0.5) * 120;

      const finalRotX = (rand(n.id, 700) - 0.5) * 30 + 10;
      const finalRotY = (rand(n.id, 701) - 0.5) * 40;
      const finalRotZ = (rand(n.id, 702) - 0.5) * 20;

      const easedT = easeOutCubic(t);
      const settleWobble = Math.sin(t * Math.PI * 3) * (1 - t) * 15;

      rotationX = baseRotX + (finalRotX - baseRotX) * easedT + settleWobble;
      rotationY = baseRotY + (finalRotY - baseRotY) * easedT + settleWobble * 0.8;
      rotationZ = baseRotZ + (finalRotZ - baseRotZ) * easedT + settleWobble * 0.5;

      opacity = targetOpacity;
      scale = targetScale;
      depth = n.depthLayer * 0.9;
    }

    else if (phase === "landed") {
      x = finalX;
      y = finalY;

      const time = Date.now() / 3500;
      const breathePhase = time + n.id * 0.7;

      y += Math.sin(breathePhase) * 2;
      x += Math.cos(breathePhase * 0.6) * 1;

      const finalRotX = (rand(n.id, 700) - 0.5) * 30 + 10;
      const finalRotY = (rand(n.id, 701) - 0.5) * 40;
      const finalRotZ = (rand(n.id, 702) - 0.5) * 20;

      rotationX = finalRotX + Math.sin(breathePhase * 0.4) * 1.5;
      rotationY = finalRotY + Math.cos(breathePhase * 0.3) * 2;
      rotationZ = finalRotZ + Math.sin(breathePhase * 0.5 + 1) * 1;

      opacity = targetOpacity;
      scale = targetScale;
      depth = n.depthLayer;
    }

    const modelPath = "/Cireng_Full_opt.glb";

    let baseRenderOrder;
    if (n.layer === "far-back") baseRenderOrder = 100;
    else if (n.layer === "mid") baseRenderOrder = 200;
    else baseRenderOrder = 300;

    const renderOrder = baseRenderOrder + n.id;

    return {
      id: n.id,
      phase,
      screenX: x,
      screenY: y,
      opacity: clamp(opacity, 0, 1),
      scale: clamp(scale, 0, baseScale * 2),
      rotationX: rotationX % 360,
      rotationY: rotationY % 360,
      rotationZ: rotationZ % 360,
      visible: phase !== "hidden",
      modelPath,
      renderOrder,
      depth: depth * 0.22,
      size: Math.round((isMobile ? 500 : 750) * scale / baseScale),
      type: n.type,
      layer: n.layer,
      blurPx: phase === "hidden" ? 0 : blurPx,
    };
  });
}, [
  scrollProgress,
  isMobile,
  canRenderNuggets,
  revealNuggets,
  spillPoint.x,
  spillPoint.y,
  packageState.centerX,
  packageState.centerY,
]);
const pkgImgWidth = isMobile ? "110%" : isTablet ? "100%" : "140%";
const pkgWrapWidth = isMobile ? 450 : isTablet ? 760 : 1250;
const pkgScale = isMobile ? 1.15 : isTablet ? 1.28 : 1.4;

// Offset kecil dalam PX (aman & konsisten). 0 = center murni.
// Kalau PNG kamu “berat kiri/kanan”, tweak angka ini.
const pkgXOffset = isMobile ? 0 : isTablet ? 0 : 0; // nanti kalau perlu: tablet 8, desktop 12, dst






  return (
    <div className="min-h-screen relative">
      {/* Hero Section */}
    <div className="relative" style={{ minHeight: '110vh' }}>
  {/* Base gradient background */}
  <div className="absolute inset-0 bg-gradient-to-b from-[#DD2C0D] via-[#FF9061] to-[#DD2C0D]" />
  
  {/* Radial gradient overlay untuk efek pekat di atas, bawah, dan pojok-pojok */}
  <div 
    className="absolute inset-0"
    style={{
      background: `
        radial-gradient(ellipse 120% 50% at 50% 0%, rgba(221, 44, 13, 0.6) 0%, transparent 50%),
        radial-gradient(ellipse 120% 50% at 50% 100%, rgba(221, 44, 13, 0.6) 0%, transparent 50%),
        radial-gradient(circle at 0% 0%, rgba(241, 0, 0, 0.5) 0%, transparent 40%),
        radial-gradient(circle at 100% 0%, rgba(241, 0, 0, 0.5) 0%, transparent 40%),
        radial-gradient(circle at 0% 100%, rgba(241, 0, 0, 0.5) 0%, transparent 40%),
        radial-gradient(circle at 100% 100%, rgba(241, 0, 0, 0.5) 0%, transparent 40%)
      `
    }}
  />
  
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
      <button className="px-4 py-2 lg:px-6 lg:py-2 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition text-sm flex items-center gap-2">
        Temukan Kami 🔍
      </button>
    </div>

    <button className="md:hidden text-2xl">☰</button>
  </header>

  <div className="relative z-10 text-center pt-20 md:pt-32 pb-20 px-4">
    <div className="inline-block px-4 py-1.5 md:px-6 md:py-2 border border-white border-opacity-40 rounded-full text-white text-xs md:text-sm mb-8">
      Ciptakan Keluarga sehat
    </div>

    <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
      Satu Langkah Sederhana<br />
      Wujudkan Keluarga Sehat
    </h2>

    <p className="text-base md:text-lg lg:text-xl text-white max-w-3xl mx-auto leading-relaxed mb-16">
      Solusi praktis untuk hidangan lezat keluarga Indonesia<br />
      dari bahan pilihan, diproses dengan teknologi modern.
    </p>

    {/* Tambahan Section Headline */}
    <div className="max-w-2xl mx-auto text-left mt-32">
      <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
        Headline
      </h3>
      <p className="text-base md:text-lg text-white leading-relaxed">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed magna tortor, porttitor a tempor in, maximus vel justo.
      </p>
    </div>
  </div>
</div>

      {/* Package */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 30,
        }}
      >
   <div
  ref={packageImgWrapRef}
  className="packageWrap"
  style={{
    width: pkgWrapWidth,
    position: "fixed",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    opacity: packageState.opacity,
    transition: "opacity 0.3s ease",
    pointerEvents: "none",
    zIndex: 30,
  }}
>
  <img
    src={lezza.src}
    alt="Lezza Package"
    onLoad={() => setPackageImgLoaded(true)}
    className="packageImg"
  />









        </div>
      </div>

      {/* 3D Nuggets - Individual canvases for blur effect */}
      {/* 3D Nuggets - prewarm render (no delay) */}
      
{canRenderNuggets &&
  nuggetsData.map((nugget) => (
    <SingleNuggetCanvas
      key={nugget.id}
      nugget={{
        ...nugget,
        opacity: revealNuggets ? nugget.opacity : 0,
        blurPx: revealNuggets ? nugget.blurPx : 0,
        screenX: revealNuggets ? nugget.screenX : -9999,
        screenY: revealNuggets ? nugget.screenY : -9999,
      }}
      dragOffset={dragStates[nugget.id] || 0}
      dimensions={dimensions}
    />
  ))}

      {/* Sections */}
      <div className="relative overflow-hidden" style={{ zIndex: 50 }}>

       {/* Section 2 - Kenali Kami (RIGHT side nuggets) */}
<div className="relative min-h-screen">
  <div className="absolute inset-0 bg-[#450A00]">
    <div
      className="pointer-events-none absolute inset-0 opacity-35"
      style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)
        `,
        backgroundSize: "140px 140px",
      }}
    />
  </div>

  <div className="relative z-20 mx-auto max-w-7xl px-8 py-20 md:py-28">
    <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
      <div className="max-w-xl">
        <h2 className="font-serif text-5xl md:text-6xl font-bold text-white">
          Kenali kami
        </h2>

        <p className="mt-6 text-base md:text-lg leading-relaxed text-white/80">
          PT Rama Putra adalah perusahaan pengolahan produsen makanan beku (frozen food)
          yang berlokasi di Surabaya, Indonesia. Perusahaan ini didirikan pada tahun 2017
          dan merupakan anak perusahaan dari Unirama Group.
        </p>

        <button className="mt-10 inline-flex items-center gap-3 rounded-full bg-red-500 px-8 py-4 text-white font-semibold shadow-[0_10px_30px_rgba(255,40,40,0.35)] hover:bg-red-400 active:scale-[0.99] transition">
          Selengkapnya
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </button>
      </div>

      <div className="relative h-[420px] md:h-[560px]" />
    </div>
  </div>
</div>

{/* Section 3 - Hadir untuk keluarga (LEFT side nuggets) */}
<div className="relative min-h-screen">
  <div className="absolute inset-0 bg-gradient-to-b from-[#450A00] to-[#F7401F]">
    <div
      className="pointer-events-none absolute inset-0 opacity-10"
      style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: "80px 80px",
      }}
    />
  </div>

  <div className="relative z-10 mx-auto max-w-7xl px-8 py-20 md:py-24">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
      <div className="relative h-[500px] md:h-[600px]" />

      <div className="max-w-xl">
        <h2 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-8">
          Hadir untuk<br />
          setiap keluarga
        </h2>

        <p className="text-white/80 text-lg md:text-xl leading-relaxed mb-10">
          Kami menghadirkan frozen food penuh cinta dari bahan terbaik dan proses yang teliti, agar setiap keluarga di Indonesia bisa menikmati kelezatan dan kehangatan di setiap sajian.
        </p>

        <button className="group inline-flex items-center gap-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-4 rounded-full transition-all shadow-lg hover:shadow-xl">
          Selengkapnya
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20 group-hover:bg-white/30 transition">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </button>
      </div>
    </div>
  </div>
</div>

{/* Section 4 - Kualitas Terjamin (RIGHT side nuggets) */}
{/* Section 4 - Kualitas Terjamin (RIGHT side nuggets) */}
<div className="relative min-h-screen overflow-hidden">
  <div className="absolute inset-0 bg-gradient-to-b from-[#f63f1f] via-[#ff6b52] via-[#ff9680] to-[#ffd9d4]">
    <div
      className="pointer-events-none absolute inset-0 opacity-20"
      style={{
        backgroundImage: `
          radial-gradient(circle at 30% 50%, rgba(205, 80, 60, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 70% 80%, rgba(246, 97, 48, 0.1) 0%, transparent 40%)
        `,
      }}
    />
  </div>

  <div className="relative z-10 mx-auto max-w-7xl px-8 py-20 md:py-24">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
      <div className="max-w-xl">
        <h2 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-8">
          Lezza
        </h2>

        <p className="text-white/90 text-lg md:text-xl leading-relaxed mb-10">
          Lezza dibuat dari daging ayam pilihan dan bumbu berkualitas, diolah dengan teknologi mutakhir dan kemasan higienis. Kini hadir di berbagai ritel di Jawa, Bali, Lombok, dan mancanegara.
        </p>

        <button className="group inline-flex items-center gap-3 bg-white text-red-500 font-semibold px-8 py-4 rounded-full transition-all shadow-lg hover:shadow-xl hover:scale-105">
          Selengkapnya
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-100 group-hover:bg-red-200 transition">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </button>
      </div>

   {/* Gambar Produk - 3 Bungkus */}
<div
  style={{
    position: 'absolute',
    inset: 0,
    perspective: '1200px',
    pointerEvents: 'none',
    zIndex: 30,
  }}
>
  <div className="relative h-[500px] md:h-[600px]">

    {/* BUNGKUS 1 */}
    <div
      className="absolute left-[-50px] bottom-4 z-10"
      style={{
        width: '600px',   // ⬅️ INI PARENT UKURAN
        transform: 'rotateZ(-15deg)',
      }}
    >
      <img
        src={lezza.src}
        style={{
          width: '190%',   // ⬅️ RELATIF KE 600px
          height: 'auto',
          maxWidth: "2000px",
          display: 'block',
        }}
      />
    </div>

    {/* BUNGKUS 2 */}
    <div
      className="absolute right-4 top-[-30px] z-20"
      style={{
        width: '600px',
        transform: 'rotateZ(-12deg)',
      }}
    >
      <img
        src={lezza.src}
        style={{
          width: '180%',   // ⬅️ KELIHATAN JELAS
          height: 'auto',
          display: 'block',
        }}
      />
    </div>

    {/* BUNGKUS 3 */}
    <div
      className="absolute right-[-40px] bottom-[-20px] z-30"
      style={{
        width: '600px',
        transform: 'rotateZ(12deg)',
      }}
    >
      <img
        src={lezza.src}
        style={{
          width: '180%',   // ⬅️ LEBIH KECIL
          height: 'auto',
          display: 'block',
        }}
      />
    </div>

  </div>
</div>


    </div>
  </div>
</div>
{/* Section 5 - Final CTA (LEFT side nuggets landed) */}
<div className="relative min-h-screen">
  <div className="absolute inset-0 bg-[#ffdcd8]">
    <div
      className="pointer-events-none absolute inset-0 opacity-30"
      style={{
        backgroundImage: `
          radial-gradient(circle at 20% 30%, rgba(255,150,50,0.2) 0%, transparent 40%),
          radial-gradient(circle at 80% 70%, rgba(255,200,100,0.15) 0%, transparent 50%)
        `,
      }}
    />
  </div>

  <div className="relative z-10 mx-auto max-w-7xl px-8 py-20 md:py-24">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
      <div className="relative h-[500px] md:h-[600px]" />

      <div className="max-w-xl text-center md:text-left">
        <h2 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight mb-8">
          Hadir untuk<br />
          Keluarga
        </h2>

        <p className="text-gray-700 text-lg md:text-xl leading-relaxed mb-10">
          Kami menyajikan Frozen food yang penuh cinta dari bahan baku terbaik dan proses yang teliti, agar setiap keluarga di Indonesia bisa menikmati kelezatan dan kehangatan di setiap sajian.
        </p>

        <button className="group inline-flex items-center gap-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-4 rounded-full transition-all shadow-lg hover:shadow-xl">
          Selengkapnya
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20 group-hover:bg-white/30 transition">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </button>
      </div>
    </div>
  </div>
</div>

        {/* Drag overlays */}
        {nuggetsData.map(
          (nugget: any) =>
            nugget &&
            nugget.phase === "landed" && (
              <div
                key={`overlay-${nugget.id}`}
                className="fixed transition-all duration-200"
                style={{
                  zIndex: 10000,
                  left: nugget.screenX - nugget.size / 2,
                  top: nugget.screenY - nugget.size / 2,
                  width: nugget.size,
                  height: nugget.size,
                  cursor: isDragging[nugget.id] ? "grabbing" : "grab",
                  pointerEvents: "auto",
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
        )}
      </div>

      {/* Progress indicator */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 bg-black bg-opacity-50 px-6 py-3 rounded-full text-white text-sm">
        {scrollProgress < 0.06 && '⬇️ Scroll to begin...'}
        {scrollProgress >= 0.06 && scrollProgress < 0.20 && '🍗 Nuggets falling RIGHT...'}
        {scrollProgress >= 0.20 && scrollProgress < 0.30 && '✨ Floating...'}
        {scrollProgress >= 0.30 && scrollProgress < 0.42 && '🌊 Flowing LEFT...'}
        {scrollProgress >= 0.42 && scrollProgress < 0.50 && '✨ Floating...'}
        {scrollProgress >= 0.50 && scrollProgress < 0.62 && '🍗 Falling RIGHT...'}
        {scrollProgress >= 0.62 && scrollProgress < 0.70 && '✨ Floating...'}
        {scrollProgress >= 0.70 && scrollProgress < 0.85 && '🌊 Final descent LEFT...'}
        {scrollProgress >= 0.85 && `🎨 Nuggets settled! Drag to interact.`}
      </div>

      <button className="fixed bottom-8 right-8 z-50 px-8 py-4 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-2xl transition">
        💬 Chat Agen
      </button>
    </div>
  );
}