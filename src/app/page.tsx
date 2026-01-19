'use client';

import React, { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import lezza from '../assets/01.png';
import * as THREE from 'three';
import { Canvas, useLoader, useFrame, useThree } from '@react-three/fiber';
import { TextureLoader } from 'three';
import { useGLTF } from '@react-three/drei';
import { OBJLoader } from 'three-stdlib';
import TanganKananAtas from '@/assets/tangankanan.png'
import TanganKiriBawah from '@/assets/tangankiri.png'

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
              modelPath={nugget.modelPath}
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
      if (!cancelled) setNuggetAssetsReady(true);
      console.error('preloadNuggetAssets failed:', e);
    }
  })();

  return () => {
    cancelled = true;
  };
}, []);


  useEffect(() => {
  let rafId: number | null = null;
  const target = { v: 0 };

  const onScroll = () => {
    const scrollTop = window.scrollY;
    if (scrollTop > 0) setHasUserScrolled(true);

    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const p = docHeight > 0 ? scrollTop / docHeight : 0;
    target.v = Math.min(Math.max(p, 0), 1);
  };

  const tick = () => {
    setScrollProgress((prev) => {
      const next = prev + (target.v - prev) * 0.15;
      return Math.abs(next - prev) < 0.0005 ? target.v : next;
    });
    rafId = requestAnimationFrame(tick);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  rafId = requestAnimationFrame(tick);

  return () => {
    window.removeEventListener("scroll", onScroll);
    if (rafId) cancelAnimationFrame(rafId);
  };
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

useEffect(() => {
  if (typeof window === "undefined") return;

  const updateSpill = () => {
    const el = packageImgWrapRef.current;
    if (!el) return;

    const r = el.getBoundingClientRect();

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
// 2) PACKAGE STATE (opacity + center)
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

  if (!isInitialReady) opacity = 1;
  else if (isInitialReady && !hasUserScrolled) opacity = 0;

  return { centerX, centerY, opacity };
}, [scrollProgress, isInitialReady, hasUserScrolled]);

// =======================================================
// 3) CONSTANTS
// =======================================================
const ANIMATION_START = 0.02;
const canRenderNuggets = nuggetAssetsReady;
const revealNuggets = true;

// =======================================================
// 4) NUGGETS DATA - ENHANCED FALL-DOWN ROTATION
// =======================================================
const nuggetsData = useMemo(() => {
  if (typeof window === "undefined") return [];
  if (!canRenderNuggets) return [];
  if (!revealNuggets) return [];

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  const clampLocal = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  const smoothStepLocal = (t: number) => {
    const x = clamp01(t);
    return x * x * (3 - 2 * x);
  };

  const baseScale = isMobile ? 0.14 : 0.30;

  const fallbackX = packageState.centerX + (isMobile ? 60 : 100);
  const fallbackY = packageState.centerY - (isMobile ? 30 : 50);

  const spillOriginX = spillPoint.x > 0 ? spillPoint.x : fallbackX;
  const spillOriginY = spillPoint.y > 0 ? spillPoint.y : fallbackY;

  const baseNuggets = [
    { id: 1, type: "full", delay: 0.00, depthLayer: -1, layer: "far-back", sizeMultiplier: 0.80 },
    { id: 2, type: "full", delay: 0.01, depthLayer: -1, layer: "far-back", sizeMultiplier: 0.80 },
    { id: 3, type: "full", delay: 0.012, depthLayer: -1, layer: "far-back", sizeMultiplier: 0.80 },
    { id: 4, type: "full", delay: 0.013, depthLayer: 0, layer: "mid", sizeMultiplier: 0.80 },
    { id: 5, type: "full", delay: 0.014, depthLayer: 0, layer: "mid", sizeMultiplier: 0.80 },
    { id: 6, type: "full", delay: 0.015, depthLayer: 0, layer: "mid", sizeMultiplier: 0.80 },
    { id: 7, type: "full", delay: 0.016, depthLayer: 1, layer: "front", sizeMultiplier: 0.80 },
    { id: 8, type: "full", delay: 0.017, depthLayer: 1, layer: "front", sizeMultiplier: 0.80 },
    { id: 9, type: "full", delay: 0.018, depthLayer: 1, layer: "front", sizeMultiplier: 0.80 },
  ] as const;

  // ✅ SATU DURASI UNTUK SEMUA GERAKAN
  const TOTAL_ANIMATION_DURATION = 1.05;
  const CENTER_LOCK_SPEED = 0.1;

  return baseNuggets.map((n) => {
    const nuggetStart = ANIMATION_START + n.delay;
    const nuggetEnd = nuggetStart + TOTAL_ANIMATION_DURATION;

    let phase: "hidden" | "animating" = "hidden";
    let t = 0; // Progress 0-1 untuk seluruh animasi

    if (scrollProgress < nuggetStart) {
      phase = "hidden";
      t = 0;
    } else if (scrollProgress < nuggetEnd) {
      phase = "animating";
      t = (scrollProgress - nuggetStart) / TOTAL_ANIMATION_DURATION;
    } else {
      phase = "animating";
      t = 1;
    }

    const layerSpread = n.layer === "far-back" ? 1.4 : n.layer === "mid" ? 1.0 : 0.7;

    // ========================================
    // POSISI KANAN (waypoint)
    // ========================================
    let rightX: number, rightY: number;

    if (n.id === 1) {
      rightX = vw * 0.50; rightY = vh * 0.38;
    } else if (n.id === 2) {
      rightX = vw * 0.57; rightY = vh * 0.65;
    } else if (n.id === 3) {
      rightX = vw * 0.50; rightY = vh * 0.66;
    } else if (n.id === 4) {
      rightX = vw * 0.67; rightY = vh * 0.29;
    } else if (n.id === 5) {
      rightX = vw * 0.72; rightY = vh * 0.48;
    } else if (n.id === 6) {
      rightX = vw * 0.86; rightY = vh * 0.60;
    } else if (n.id === 7) {
      rightX = vw * 0.50; rightY = vh * 0.65;
    } else if (n.id === 8) {
      rightX = vw * 0.82; rightY = vh * 0.40;
    } else if (n.id === 9) {
      rightX = vw * 0.68; rightY = vh * 0.72;
    } else {
      rightX = vw * 0.72; rightY = vh * 0.50;
    }

    // ========================================
    // POSISI SCATTER & FINAL
    // ========================================
    const scatterCenterX = vw * 0.5;
const scatterCenterY = vh * 0.45; // ✅ Atur tinggi scatter di sini (0.45 = 45% dari tinggi layar)
const scatterRangeX = vw * 0.4;   // ✅ Seberapa lebar area scatter (0.4 = 40% lebar layar)
const scatterRangeY = vh * 0.2;   

    const randomOffsetX = (rand(n.id, 910) - 0.5) * 2 * scatterRangeX;
    const randomOffsetY = (rand(n.id, 911) - 0.5) * 2 * scatterRangeY;

    const scatterX = scatterCenterX + randomOffsetX;
    const scatterY = scatterCenterY + randomOffsetY;

    const finalCenterX = vw * 0.5;
    const finalCenterY = vh * 0.5;

    const initialAngVel = {
      x: (rand(n.id, 300) - 0.5) * 2.5,
      y: (rand(n.id, 301) - 0.5) * 3.0,
      z: (rand(n.id, 302) - 0.5) * 1.8,
    };

    let x = spillOriginX;
    let y = spillOriginY;
    let opacity = 0;
    let scale = 0;
    let rotationX = 0;
    let rotationY = 0;
    let rotationZ = 0;
    let depth = 0;
    let blurPx = 0;

    const targetScale = baseScale;

    // ========================================
    // ✅ SATU ANIMASI MULUS - MULTI WAYPOINT
    // ========================================
    if (phase === "hidden") {
      x = spillOriginX;
      y = spillOriginY;
      opacity = 0;
      scale = 0;
      depth = n.depthLayer * 0.5;
      blurPx = 0;
    } else if (phase === "animating") {
      // ========================================
      // TIMELINE BREAKDOWN (tanpa patah-patah)
      // ========================================
      const toRightEnd = 0.05;      // 0% - 5%: Spill → Kanan
      const hangEnd = 0.40;          // 5% - 40%: Hang di kanan
      const scatterEnd = 0.70;       // 40% - 70%: Scatter
      const gatherEnd = 1.0;         // 70% - 100%: Gather ke tengah

      let targetX: number, targetY: number;
      let currentDepth: number;
      let currentOpacity: number;
      let currentBlur: number;

      // ========================================
      // POSISI X & Y (Continuous path)
      // ========================================
      if (t <= toRightEnd) {
        // Fase 1: Spill → Kanan (dengan arc)
        const progress = t / toRightEnd;
        const eased = smoothStepLocal(progress);
        
        targetX = spillOriginX + (rightX - spillOriginX) * eased;
        const arcHeight = -vh * 0.12;
        targetY = spillOriginY + (rightY - spillOriginY) * eased + arcHeight * Math.sin(eased * Math.PI);
        
        currentDepth = n.depthLayer * 0.6;
        
        // Opacity fade in
        const appear = smoothStepLocal(clampLocal(progress / 0.1, 0, 1));
        currentOpacity = appear;
        currentBlur = n.layer === "far-back" ? (isMobile ? 3.5 : 2) : n.layer === "mid" ? (isMobile ? 1.2 : 1) : 0;
        currentBlur *= appear;
        
        scale = targetScale * (0.25 + 0.75 * appear);

      } else if (t <= hangEnd) {
        // Fase 2: Hang di kanan (tetap di posisi)
        targetX = rightX;
        targetY = rightY;
        
        currentDepth = n.depthLayer * 0.6;
        currentOpacity = n.layer === "front" ? 1.0 : n.layer === "mid" ? 0.95 : 0.85;
        currentBlur = n.layer === "far-back" ? (isMobile ? 3.5 : 2) : n.layer === "mid" ? (isMobile ? 1.2 : 1) : 0;
        scale = targetScale;

      } else if (t <= scatterEnd) {
        // Fase 3: Scatter (kanan → scatter position)
        const progress = (t - hangEnd) / (scatterEnd - hangEnd);
        const eased = easeInOutCubic(progress);
        
        targetX = rightX + (scatterX - rightX) * eased;
        targetY = rightY + (scatterY - rightY) * eased;
        
        // Gradual blur & opacity change
        const originalOpacity = n.layer === "front" ? 1.0 : n.layer === "mid" ? 0.95 : 0.85;
        currentOpacity = originalOpacity + (0.85 - originalOpacity) * eased;
        
        const originalBlur = n.layer === "far-back" ? (isMobile ? 3.5 : 2) : n.layer === "mid" ? (isMobile ? 1.2 : 1) : 0;
        const targetBlur = isMobile ? 3.5 : 2;
        currentBlur = originalBlur + (targetBlur - originalBlur) * eased;
        
        currentDepth = n.depthLayer * (0.6 + 0.3 * progress);
        scale = targetScale;

      } else {
        // Fase 4: Gather ke tengah
        const progress = (t - scatterEnd) / (gatherEnd - scatterEnd);
        const eased = easeInOutCubic(progress);
        
        targetX = scatterX + (finalCenterX - scatterX) * eased;
        targetY = scatterY + (finalCenterY - scatterY) * eased;
        
        currentDepth = n.depthLayer * 0.9;
        currentOpacity = 0.85;
        currentBlur = isMobile ? 3.5 : 2;
        scale = targetScale;
      }

      x = targetX;
      y = targetY;

      // ========================================
      // WIND EFFECT (aktif saat scatter & gather)
      // ========================================
      if (t >= hangEnd) {
        const windProgress = Math.min((t - hangEnd) / (scatterEnd - hangEnd), 1);
        const windStrength = 0.3 + 0.7 * Math.sin(windProgress * Math.PI);
        const windAmp = vw * 0.015;
        const windFreq = 1.5 + rand(n.id, 914);
        const windX = Math.sin(t * Math.PI * windFreq + n.id * 1.7) * windAmp;
        
        x += windX * windStrength;
      }

      // ========================================
      // ROTATION (continuous throughout)
      // ========================================
      const fallAngVel = {
        x: initialAngVel.x,
        y: initialAngVel.y,
        z: initialAngVel.z,
      };

      const turbulenceStrength = t < scatterEnd ? 1.0 : (1 - ((t - scatterEnd) / (1 - scatterEnd)));
      
      const turbulence = {
        x: Math.sin(t * Math.PI * 4 + n.id) * 25 * turbulenceStrength,
        y: Math.cos(t * Math.PI * 3.5 + n.id * 0.7) * 30 * turbulenceStrength,
        z: Math.sin(t * Math.PI * 2.8 + n.id * 1.3) * 20 * turbulenceStrength,
      };

      const physRot = calculatePhysicsRotation(t, n.id, fallAngVel, 0.18);

      rotationX = physRot.x + turbulence.x;
      rotationY = physRot.y + turbulence.y;
      rotationZ = physRot.z + turbulence.z;

      opacity = currentOpacity;
      depth = currentDepth;
      blurPx = currentBlur;
    }

    // ========================================
    // RENDER SETTINGS
    // ========================================
    const modelPath = "/Cireng_Full_opt.glb";

    const isScattering = phase === "animating" && t >= 0.40;
    let baseRenderOrder = isScattering ? 40 : (n.layer === "far-back" ? 40 : n.layer === "mid" ? 200 : 300);
    const renderOrder = baseRenderOrder + n.id;

    // Center lock
    const centerLock = Math.max(0, scrollProgress - ANIMATION_START) * vh * CENTER_LOCK_SPEED;
    if (phase !== "hidden") {
      y = y - centerLock;
    }

    return {
      id: n.id,
      phase,
      screenX: x,
      screenY: y,
      opacity: clampLocal(opacity, 0, 1),
      scale: clampLocal(scale, 0, baseScale * 2),
      rotationX: rotationX % 360,
      rotationY: rotationY % 360,
      rotationZ: rotationZ % 360,
      visible: phase !== "hidden",
      modelPath,
      renderOrder,
      depth: depth * 0.22,
      size: Math.round(((isMobile ? 500 : 750) * scale) / baseScale),
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


const [currentPhase, setCurrentPhase] = useState<string>('');
const [showPhaseModal, setShowPhaseModal] = useState(false);
const phaseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
const prevPhaseRef = useRef<string>('hidden');

const showPhase = (phaseName: string) => {
  setCurrentPhase(phaseName);
  setShowPhaseModal(true);
  
  if (phaseTimeoutRef.current) {
    clearTimeout(phaseTimeoutRef.current);
  }
  phaseTimeoutRef.current = setTimeout(() => {
    setShowPhaseModal(false);
  }, 3000);
};

useEffect(() => {
  if (nuggetsData.length === 0) return;
  
  const firstNugget = nuggetsData[0];
  if (!firstNugget) return;
  
  const currentPhaseValue = firstNugget.phase;
  
  if (currentPhaseValue !== prevPhaseRef.current) {
    prevPhaseRef.current = currentPhaseValue;
    
    switch (currentPhaseValue) {
      case 'hidden':
        showPhase('👻 Phase 0: HIDDEN (scroll < 6%)');
        break;
    }
  }
}, [nuggetsData]);

const pkgImgWidth = isMobile ? "110%" : isTablet ? "100%" : "140%";
const pkgWrapWidth = isMobile ? 450 : isTablet ? 760 : 1250;
const pkgScale = isMobile ? 1.15 : isTablet ? 1.28 : 1.4;

const pkgXOffset = isMobile ? 0 : isTablet ? 0 : 0;

const phaseOrder: Record<string, number> = {
  hidden: 0,
  "fall-right": 1,
  "fall-down": 2,
  spread: 3,
};

const globalPhase =
  nuggetsData.length === 0
    ? "none"
    : nuggetsData.reduce((best, n) =>
        (phaseOrder[n.phase] ?? -1) > (phaseOrder[best.phase] ?? -1) ? n : best
      ).phase;


  return (
    <div className="min-h-screen relative">
      {/* Hero Section */}
    <div className="relative" style={{ minHeight: '110vh' }}>
  <div className="absolute inset-0 bg-gradient-to-b from-[#DD2C0D] via-[#FF9061] to-[#DD2C0D]" />
  
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
  
  <header className="relative z-10 flex items-center justify-between px-4 md:px-8 lg:px-12 py-4 md:py-6 text-white"style={{ zIndex: 10 }}>
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
          zIndex: 20,
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

      {/* 3D Nuggets */}
{canRenderNuggets &&
  nuggetsData
    .filter((n) => n.visible)
    .map((nugget) => (
      <SingleNuggetCanvas
        key={nugget.id}
        nugget={{
          ...nugget,
          opacity: revealNuggets ? nugget.opacity : 0,
          blurPx: revealNuggets ? nugget.blurPx : 0,
        }}
        dragOffset={dragStates[nugget.id] || 0}
        dimensions={dimensions}
      />
    ))}

      {/* Sections */}
     


<div className="relative min-h-screen">
  <div className="absolute inset-0 bg-[#450A00]"style={{ zIndex: 35 }}>
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

  <div className="relative z-20 mx-auto max-w-7xl px-8 py-20 md:py-28" style={{ zIndex: 70 }}>
    <div className="max-w-xl ml-20">
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
  </div>
</div>

<div className="relative min-h-screen" >
  <div className="absolute inset-0 bg-gradient-to-b from-[#450A00] to-[#F7401F]"style={{ zIndex: 35 }}>
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

  <div className="relative z-10 mx-auto max-w-7xl px-8 py-20 md:py-24" style={{ zIndex: 70 }}>
    <div className="max-w-xl ml-20">
      <h2 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-8">
        Hadir untuk<br />
        setiap keluarga
      </h2>

      <p className="text-white/80 text-lg md:text-xl leading-relaxed mb-10">
        Kami menghadirkan frozen food penuh cinta dari bahan terbaik dan proses yang teliti,
        agar setiap keluarga di Indonesia bisa menikmati kelezatan dan kehangatan di setiap sajian.
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

<div className="relative min-h-screen overflow-hidden">
  <div className="absolute inset-0 bg-gradient-to-b from-[#f63f1f] via-[#ff6b52] via-[#ff9680] to-[#ffd9d4]"style={{ zIndex: 35 }}>
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

  <div className="relative z-10 mx-auto max-w-7xl px-8 py-20 md:py-24"style={{ zIndex: 70 }}>
    <div className="max-w-xl ml-20" >
      <h2 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-8" style={{ zIndex: 70 }}>
        Lezza
      </h2>

      <p className="text-white/90 text-lg md:text-xl leading-relaxed mb-10"style={{ zIndex: 70 }}>
        Lezza dibuat dari daging ayam pilihan dan bumbu berkualitas, diolah dengan teknologi mutakhir dan kemasan higienis.
        Kini hadir di berbagai ritel di Jawa, Bali, Lombok, dan mancanegara.
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

    <div
      className="mt-12 relative h-[500px] md:h-[600px] w-full max-w-5xl"
      style={{ perspective: "1200px", pointerEvents: "none" }}
    >
      <div className="relative h-full">
        <div
          className="absolute left-[-50px] bottom-4 z-10"
          style={{
            width: "clamp(260px, 55vw, 600px)",
            transform: "rotateZ(-15deg)",
          }}
        >
          {/* <img
            src={lezza.src}
            style={{
              width: "190%",
              height: "auto",
              maxWidth: "2000px",
              display: "block",
            }}
          />
        </div>

        <div
          className="absolute top-[-30px] z-20"
          style={{
            left: "clamp(90px, 18vw, 260px)",
            width: "clamp(260px, 55vw, 600px)",
            transform: "rotateZ(-12deg)",
          }}
        >
          <img
            src={lezza.src}
            style={{
              width: "180%",
              height: "auto",
              display: "block",
            }}
          />
        </div>

        <div
          className="absolute bottom-[-20px] z-30"
          style={{
            left: "clamp(150px, 26vw, 380px)",
            width: "clamp(260px, 55vw, 600px)",
            transform: "rotateZ(12deg)",
          }}
        >
          <img
            src={lezza.src}
            style={{
              width: "180%",
              height: "auto",
              display: "block",
            }}
          /> */}
        </div>
      </div>
    </div>
  </div>
</div>

<div className="relative min-h-screen">
  <div className="absolute inset-0 bg-[#ffdcd8]"style={{ zIndex: 35 }}>
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

  <div className="relative z-10 mx-auto max-w-7xl px-8 py-20 md:py-24" style={{ zIndex: 70 }}>
    <div className="max-w-xl">
      <h2 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight mb-8">
        Hadir untuk<br />
        Keluarga
      </h2>

      <p className="text-gray-700 text-lg md:text-xl leading-relaxed mb-10">
        Kami menyajikan Frozen food yang penuh cinta dari bahan baku terbaik dan proses yang teliti,
        agar setiap keluarga di Indonesia bisa menikmati kelezatan dan kehangatan di setiap sajian.
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

{/* ✅ SECTION 6 BARU - Warm Sunset Gradient */}
<div className="relative min-h-screen">
  <div className="absolute inset-0 bg-gradient-to-b from-[#ffe4e1] via-[#ffc1b3] to-[#ff9b85]"style={{ zIndex: 35 }}>
    <div
      className="pointer-events-none absolute inset-0 opacity-25"
      style={{
        backgroundImage: `
          radial-gradient(circle at 15% 20%, rgba(255,140,100,0.3) 0%, transparent 45%),
          radial-gradient(circle at 85% 75%, rgba(255,180,150,0.25) 0%, transparent 50%)
        `,
      }}
    />
  </div>

  <div className="relative z-10 mx-auto max-w-7xl px-8 py-20 md:py-28" style={{ zIndex: 70 }}>
    <div className="max-w-2xl mx-auto text-center">
      <h2 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight mb-8">
        Resep Keluarga<br />
        Indonesia
      </h2>

      <p className="text-gray-800 text-lg md:text-xl leading-relaxed mb-12">
        Dari dapur kami ke meja makan Anda. Setiap produk Lezza dibuat dengan standar kualitas tinggi
        dan cita rasa autentik yang disukai seluruh anggota keluarga.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
          <div className="text-4xl mb-4">🍗</div>
          <h3 className="font-bold text-xl mb-2 text-gray-900">100% Ayam Pilihan</h3>
          <p className="text-gray-700 text-sm">Daging ayam berkualitas premium tanpa bahan pengawet berbahaya</p>
        </div>
        
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
          <div className="text-4xl mb-4">⚡</div>
          <h3 className="font-bold text-xl mb-2 text-gray-900">Siap Saji Cepat</h3>
          <p className="text-gray-700 text-sm">Hemat waktu tanpa mengurangi kelezatan dan nutrisi</p>
        </div>
        
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
          <div className="text-4xl mb-4">✨</div>
          <h3 className="font-bold text-xl mb-2 text-gray-900">Higienis & Aman</h3>
          <p className="text-gray-700 text-sm">Diproses dengan teknologi modern dan sertifikasi halal</p>
        </div>
      </div>

      <button className="group inline-flex items-center gap-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold px-10 py-5 rounded-full transition-all shadow-2xl hover:shadow-3xl hover:scale-105">
        Lihat Semua Produk
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/25 group-hover:bg-white/35 transition">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M9 18l6-6-6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>
    </div>
  </div>
</div>

{/* ✅ SECTION 7 BARU - Soft Peach to Cream */}
<div className="relative min-h-screen">
  <div className="absolute inset-0 bg-gradient-to-b from-[#ff9b85] via-[#ffb399] to-[#ffe8d6]"style={{ zIndex: 35 }}>
    <div
      className="pointer-events-none absolute inset-0 opacity-20"
      style={{
        backgroundImage: `
          radial-gradient(circle at 25% 35%, rgba(255,200,180,0.4) 0%, transparent 50%),
          radial-gradient(circle at 75% 65%, rgba(255,220,200,0.3) 0%, transparent 45%)
        `,
      }}
    />
  </div>

  <div className="relative z-10 mx-auto max-w-7xl px-8 py-20 md:py-28"style={{ zIndex: 70 }}>
    <div className="grid md:grid-cols-2 gap-12 items-center">
      <div>
        <div className="inline-block px-4 py-2 bg-white/40 backdrop-blur-sm rounded-full text-orange-800 text-sm font-semibold mb-6">
          🏆 Dipercaya Keluarga Indonesia
        </div>
        
        <h2 className="font-serif text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
          Tersedia di<br />
          Seluruh Indonesia
        </h2>

        <p className="text-gray-800 text-lg leading-relaxed mb-8">
          Produk Lezza kini hadir di berbagai supermarket, minimarket, dan toko frozen food
          di Jawa, Bali, Lombok, hingga mancanegara. Kemudahan akses untuk keluarga Indonesia.
        </p>

        <ul className="space-y-4 mb-10">
          <li className="flex items-start gap-3">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-white flex-shrink-0 mt-0.5">✓</span>
            <span className="text-gray-800 text-base">Tersedia di 500+ outlet retail modern</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-white flex-shrink-0 mt-0.5">✓</span>
            <span className="text-gray-800 text-base">Ekspor ke negara Asia Tenggara</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-white flex-shrink-0 mt-0.5">✓</span>
            <span className="text-gray-800 text-base">Pengiriman cepat & sistem cold chain terjaga</span>
          </li>
        </ul>

        <button className="group inline-flex items-center gap-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold px-8 py-4 rounded-full transition-all shadow-xl hover:shadow-2xl">
          Cari Toko Terdekat
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20 group-hover:bg-white/30 transition">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </button>
      </div>

      <div className="relative h-[500px] md:h-[600px] flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-300/30 to-red-300/30 rounded-3xl blur-3xl"></div>
        <div className="relative text-center p-12 bg-white/50 backdrop-blur-sm rounded-3xl shadow-2xl">
          <div className="text-7xl mb-6">📍</div>
          <h3 className="text-3xl font-bold text-gray-900 mb-4">Temukan Lezza</h3>
          <p className="text-gray-700 text-lg mb-6">Di toko favorit Anda</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <span className="px-4 py-2 bg-white rounded-full text-sm font-semibold text-gray-800 shadow">Indomaret</span>
            <span className="px-4 py-2 bg-white rounded-full text-sm font-semibold text-gray-800 shadow">Alfamart</span>
            <span className="px-4 py-2 bg-white rounded-full text-sm font-semibold text-gray-800 shadow">Superindo</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<div className="relative min-h-screen">
  <div className="absolute inset-0 bg-gradient-to-b from-[#ffe8d6] via-[#ffd4c1] to-[#ffc4b0]"style={{ zIndex: 35 }}>
    <div
      className="pointer-events-none absolute inset-0 opacity-15"
      style={{
        backgroundImage: `
          radial-gradient(circle at 20% 20%, rgba(255,180,140,0.5) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(255,160,120,0.4) 0%, transparent 50%)
        `,
      }}
    />
  </div>

  <div className="relative z-10 mx-auto max-w-7xl px-8 py-20 md:py-28"style={{ zIndex: 70 }}>
    <div className="text-center mb-16">
      <div className="inline-block px-4 py-2 bg-white/40 backdrop-blur-sm rounded-full text-orange-800 text-sm font-semibold mb-6">
        💬 Kata Mereka
      </div>
      <h2 className="font-serif text-5xl md:text-6xl font-bold text-gray-900 mb-6">
        Cerita dari<br />Keluarga Indonesia
      </h2>
      <p className="text-gray-800 text-lg max-w-2xl mx-auto">
        Ribuan keluarga telah mempercayai Lezza sebagai pilihan makanan berkualitas untuk orang-orang tercinta
      </p>
    </div>

    <div className="grid md:grid-cols-3 gap-8">
      {[
        {
          name: "Ibu Sarah",
          role: "Ibu Rumah Tangga",
          photo: "👩‍🦰",
          text: "Anak-anak saya sangat suka nugget Lezza! Rasanya enak dan saya merasa tenang karena terbuat dari bahan berkualitas. Praktis untuk bekal sekolah.",
          rating: 5
        },
        {
          name: "Bapak Andi",
          role: "Pengusaha Kuliner",
          photo: "👨‍💼",
          text: "Saya pakai produk Lezza untuk usaha frozen food saya. Kualitas konsisten, harga bersaing, dan pelanggan selalu puas. Recommended!",
          rating: 5
        },
        {
          name: "Ibu Dina",
          role: "Working Mom",
          photo: "👩‍💻",
          text: "Sebagai working mom, Lezza jadi solusi terbaik. Cepat dimasak tapi tetap bergizi. Suami dan anak-anak happy, saya juga happy!",
          rating: 5
        }
      ].map((testimonial, index) => (
        <div key={index} className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
          <div className="flex items-center gap-4 mb-6">
            <div className="text-5xl">{testimonial.photo}</div>
            <div>
              <h4 className="font-bold text-gray-900 text-lg">{testimonial.name}</h4>
              <p className="text-gray-600 text-sm">{testimonial.role}</p>
            </div>
          </div>
          
          <div className="flex gap-1 mb-4">
            {[...Array(testimonial.rating)].map((_, i) => (
              <span key={i} className="text-yellow-500 text-xl">★</span>
            ))}
          </div>
          
          <p className="text-gray-700 leading-relaxed italic">
            "{testimonial.text}"
          </p>
        </div>
      ))}
    </div>

    <div className="mt-16 text-center">
      <div className="inline-flex items-center gap-8 bg-white/50 backdrop-blur-sm rounded-2xl px-12 py-6 shadow-lg">
        <div className="text-center">
          <div className="text-4xl font-bold text-orange-600 mb-1">10,000+</div>
          <div className="text-gray-700 text-sm">Pelanggan Setia</div>
        </div>
        <div className="h-12 w-px bg-gray-300"></div>
        <div className="text-center">
          <div className="text-4xl font-bold text-orange-600 mb-1">4.8/5</div>
          <div className="text-gray-700 text-sm">Rating Produk</div>
        </div>
        <div className="h-12 w-px bg-gray-300"></div>
        <div className="text-center">
          <div className="text-4xl font-bold text-orange-600 mb-1">98%</div>
          <div className="text-gray-700 text-sm">Repeat Order</div>
        </div>
      </div>
    </div>
  </div>
</div>

{/* Section 9 - CTA & Footer */}
<div className="relative min-h-screen overflow-hidden">
  <div className="absolute inset-0 bg-gradient-to-b from-[#ffc4b0] via-[#ffb09a] to-[#ff9b85]" style={{ zIndex: 35 }}>
    <div
      className="pointer-events-none absolute inset-0 opacity-20"
      style={{
        backgroundImage: `
          radial-gradient(circle at 30% 40%, rgba(255,140,100,0.6) 0%, transparent 50%),
          radial-gradient(circle at 70% 60%, rgba(255,120,80,0.4) 0%, transparent 50%)
        `,
      }}
    />
  </div>

  {/* ✅ Tangan Kanan Atas - LEBIH GEDE, pas genggam nugget */}
  <img 
    src={TanganKananAtas.src} 
    alt="Tangan Kanan"
    className="absolute -right-10 md:-right-16 top-0 md:top-8 pointer-events-none"
    style={{ 
      zIndex: 40,
      width: '1500px',
      height: 'auto',
      objectFit: 'contain',
      mixBlendMode: 'normal'
    }}
  />

  {/* ✅ Tangan Kiri Bawah - LEBIH GEDE, pas genggam nugget */}
  <img 
    src={TanganKiriBawah.src} 
    alt="Tangan Kiri"
    className="absolute -left-10 md:-left-16 bottom-16 md:bottom-28 pointer-events-none"
    style={{ 
      zIndex: 40,
      width: '1500px',
      height: 'auto',
      objectFit: 'contain',
      mixBlendMode: 'normal'
    }}
  />

  {/* Responsive size untuk desktop */}
  <style jsx>{`
    @media (min-width: 768px) {
      img[alt="Tangan Kanan"] {
        width: 650px !important;
      }
      img[alt="Tangan Kiri"] {
        width: 600px !important;
      }
    }
    @media (min-width: 1024px) {
      img[alt="Tangan Kanan"] {
        width: 900px !important;
      }
      img[alt="Tangan Kiri"] {
        width: 900px !important;
      }
    }
  `}</style>

  <div className="relative z-10 mx-auto max-w-7xl px-8 py-20 md:py-32" style={{ zIndex: 70 }}>
    {/* CTA Section */}
    <div className="text-center mb-20">
      {/* <div className="inline-block px-4 py-2 bg-white/40 backdrop-blur-sm rounded-full text-orange-800 text-sm font-semibold mb-6">
        🎉 Mulai Sekarang
      </div>
      <h2 className="font-serif text-5xl md:text-7xl font-bold text-gray-900 leading-tight mb-6">
        Siap Mencoba<br />Kelezatan Lezza?
      </h2>
      <p className="text-gray-800 text-xl max-w-2xl mx-auto mb-12">
        Bergabunglah dengan ribuan keluarga Indonesia yang telah merasakan kualitas dan kelezatan produk Lezza
      </p> */}
{/*       
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <button className="group inline-flex items-center gap-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold px-10 py-5 rounded-full transition-all shadow-2xl hover:shadow-3xl text-lg">
          Pesan Sekarang
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/20 group-hover:bg-white/30 transition">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </button>
        
        <button className="inline-flex items-center gap-3 bg-white/60 backdrop-blur-sm hover:bg-white/80 text-gray-900 font-semibold px-10 py-5 rounded-full transition-all shadow-xl hover:shadow-2xl text-lg">
          Hubungi Kami
        </button>
      </div> */}
    </div>

    {/* Footer */}
    <div className="border-t border-white/30 pt-16">
      <div className="grid md:grid-cols-4 gap-12 mb-12">
        {/* <div>
          <h3 className="font-bold text-2xl text-gray-900 mb-4">LEZZA</h3>
          <p className="text-gray-800 text-sm leading-relaxed">
            Menghadirkan produk frozen food berkualitas premium untuk keluarga Indonesia sejak 2010.
          </p>
        </div> */}
{/*         
        <div>
          <h4 className="font-semibold text-gray-900 mb-4">Produk</h4>
          <ul className="space-y-2 text-gray-800 text-sm">
            <li><a href="#" className="hover:text-orange-600 transition">Nugget</a></li>
            <li><a href="#" className="hover:text-orange-600 transition">Sosis</a></li>
            <li><a href="#" className="hover:text-orange-600 transition">Bakso</a></li>
            <li><a href="#" className="hover:text-orange-600 transition">Siomay</a></li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-semibold text-gray-900 mb-4">Perusahaan</h4>
          <ul className="space-y-2 text-gray-800 text-sm">
            <li><a href="#" className="hover:text-orange-600 transition">Tentang Kami</a></li>
            <li><a href="#" className="hover:text-orange-600 transition">Lokasi Toko</a></li>
            <li><a href="#" className="hover:text-orange-600 transition">Karir</a></li>
            <li><a href="#" className="hover:text-orange-600 transition">Blog</a></li>
          </ul>
        </div> */}
{/*         
        <div>
          <h4 className="font-semibold text-gray-900 mb-4">Ikuti Kami</h4>
          <div className="flex gap-3 mb-4">
            <a href="#" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/60 hover:bg-white transition text-gray-900">
              <span className="text-lg">f</span>
            </a>
            <a href="#" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/60 hover:bg-white transition text-gray-900">
              <span className="text-lg">in</span>
            </a>
            <a href="#" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/60 hover:bg-white transition text-gray-900">
              <span className="text-lg">📷</span>
            </a>
          </div>
          <p className="text-gray-800 text-sm">
            <span className="font-semibold">Email:</span><br />
            info@lezza.co.id
          </p>
        </div> */}
      </div>
      
      {/* <div className="border-t border-white/30 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-gray-800 text-sm">
          © 2025 Lezza Indonesia. All rights reserved.
        </p>
        <div className="flex gap-6 text-sm text-gray-800">
          <a href="#" className="hover:text-orange-600 transition">Kebijakan Privasi</a>
          <a href="#" className="hover:text-orange-600 transition">Syarat & Ketentuan</a>
        </div>
      </div> */}
    </div>
  </div>
</div>

        {/* Drag overlays */}
        {nuggetsData.map(
          (nugget: any) =>
            nugget &&
            nugget.phase === "spread" && (
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


      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 bg-black bg-opacity-70 px-6 py-3 rounded-full text-white text-sm font-mono">
        <div className="flex flex-col items-center gap-1">
          <div>Progress: {Math.round(scrollProgress * 100)}%</div>
          <div className="text-xs text-gray-300">
            Phase: {globalPhase} 
          </div>
        </div>
      </div>

      <button className="fixed bottom-8 right-8 z-50 px-8 py-4 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-2xl transition">
        💬 Chat Agen
      </button>
    </div>
  );
}