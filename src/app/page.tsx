'use client';

import React, {
  useState, useEffect, useRef, useMemo,
  useCallback, Suspense,
} from 'react';
import lezza from '../assets/01.png';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';

// ─────────────────────────────────────────────
// PRELOAD
// ─────────────────────────────────────────────
useGLTF.preload('/Cireng_Full_opt.glb');

// ─────────────────────────────────────────────
// MATH
// ─────────────────────────────────────────────
const clamp          = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp           = (a: number, b: number, t: number)   => a + (b - a) * t;
const easeOutExpo    = (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
const easeOutBack    = (t: number) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOutElastic = (t: number) => {
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
};

const prng = (s: number) => {
  let t = s + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const rand = (id: number, salt: number) => prng(id * 1000 + salt);

// ─────────────────────────────────────────────
// SECTION DATA
// ─────────────────────────────────────────────
const SECTIONS = [
  {
    tag: 'Produk Unggulan',
    h1: 'Dibuat dari', h2: 'Ayam Pilihan',
    sub: 'Setiap gigitan Lezza menghadirkan cita rasa autentik dari bahan premium tanpa kompromi.',
    cta: 'Temukan Produk',
    bg: 'linear-gradient(135deg,#0d0200 0%,#2a0600 100%)',
    accent: '#FF4713',
    mobileBg1: '#1a0400', mobileBg2: '#3d0800',
    lightColor: '#ff6633',
  },
  {
    tag: 'Teknologi Modern',
    h1: 'Diproses dengan', h2: 'Standar Tertinggi',
    sub: 'Teknologi pembekuan mutakhir menjaga nutrisi, rasa, dan kesegaran terkunci sempurna.',
    cta: 'Pelajari Proses',
    bg: 'linear-gradient(135deg,#3d0000 0%,#800000 100%)',
    accent: '#FFD700',
    mobileBg1: '#2a0000', mobileBg2: '#600000',
    lightColor: '#ffcc44',
  },
  {
    tag: 'Distribusi Nasional',
    h1: 'Hadir di', h2: 'Seluruh Indonesia',
    sub: 'Ribuan titik distribusi dari Sabang sampai Merauke — Lezza selalu ada di dekat Anda.',
    cta: 'Cari Toko',
    bg: 'linear-gradient(135deg,#060010 0%,#150025 100%)',
    accent: '#FF6633',
    mobileBg1: '#08001a', mobileBg2: '#1a003a',
    lightColor: '#ff4499',
  },
  {
    tag: 'Keluarga Indonesia',
    h1: 'Lezza untuk', h2: 'Semua Keluarga',
    sub: 'Lebih dari 10.000 keluarga mempercayakan sajian sehari-hari mereka kepada Lezza.',
    cta: 'Bergabung',
    bg: 'linear-gradient(135deg,#CC3300 0%,#FF6600 100%)',
    accent: '#ffffff',
    mobileBg1: '#8a2200', mobileBg2: '#cc4400',
    lightColor: '#ffaa44',
  },
];

// ─────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────
function useSmoothScroll() {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf: number;
    const target = { v: 0 };
    const onScroll = () => {
      const doc = document.documentElement.scrollHeight - window.innerHeight;
      target.v = doc > 0 ? clamp(window.scrollY / doc, 0, 1) : 0;
    };
    const tick = () => {
      setP(prev => {
        const next = prev + (target.v - prev) * 0.09;
        return Math.abs(next - prev) < 0.0002 ? target.v : next;
      });
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    raf = requestAnimationFrame(tick);
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);
  return p;
}

function useIdleMs(scroll: number) {
  const [ms, setMs] = useState(0);
  const lastT  = useRef(Date.now());
  const lastV  = useRef(scroll);
  useEffect(() => {
    if (Math.abs(scroll - lastV.current) > 0.0005) {
      lastT.current = Date.now(); lastV.current = scroll; setMs(0);
    }
  }, [scroll]);
  useEffect(() => {
    let raf: number;
    const tick = () => { setMs(Date.now() - lastT.current); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return ms;
}

// ═══════════════════════════════════════════════════════════════
//   ██████  MOBILE 3D  ██████
//   "Stage Spotlight" — single Canvas, swipe to navigate,
//    touch-drag to spin nugget, device-tilt parallax
// ═══════════════════════════════════════════════════════════════

// ── Mobile nugget mesh (shared single scene) ─────────────────
interface MobileNuggetSceneProps {
  swipeOffset: number;
  swipePhase: 'idle' | 'exit' | 'enter';
  touchRotX: number;
  touchRotY: number;
  tiltX: number;
  tiltY: number;
  accent: string;
  lightColor: string;
}

const MobileNuggetScene = React.memo(({
  swipeOffset, swipePhase,
  touchRotX, touchRotY,
  tiltX, tiltY,
  accent, lightColor,
}: MobileNuggetSceneProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const wrapRef  = useRef<THREE.Group>(null);
  const t        = useRef(0);
  const sm       = useRef({ posX: 0, posY: 0, rotX: 0, rotY: 0, scale: 1, opacity: 1 });
  const { scene, gl, invalidate } = useThree();

  useEffect(() => {
    scene.background = null;
    gl.setClearColor(0, 0);
    gl.domElement.style.background = 'transparent';
  }, []);

  const gltf = useGLTF('/Cireng_Full_opt.glb');
  const obj  = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  useEffect(() => {
    obj.traverse(c => {
      if ((c as THREE.Mesh).isMesh) {
        const m = c as THREE.Mesh;
        m.castShadow = m.receiveShadow = true;
        (Array.isArray(m.material) ? m.material : [m.material])
          .forEach((mat: any) => { if (mat) { mat.needsUpdate = true; } });
      }
    });
  }, [obj]);

  useFrame((_, delta) => {
    if (!groupRef.current || !wrapRef.current) return;
    t.current += delta;

    const s   = sm.current;
    const spd = 1 - Math.pow(0.04, delta);

    // idle breathe
    const breathe = Math.sin(t.current * 1.1) * 0.055;
    const bobY    = Math.sin(t.current * 0.88) * 0.13;

    // swipe motion
    let targetX = 0, targetSc = 1 + breathe, targetOp = 1;
    const absOff = Math.abs(swipeOffset);
    if (swipePhase === 'exit') {
      targetX  = swipeOffset < 0 ? -8.5 : 8.5;
      targetSc = lerp(1, 0.38, absOff) + breathe;
      targetOp = lerp(1, 0, absOff);
    } else if (swipePhase === 'enter') {
      targetX  = swipeOffset < 0 ? -8.5 : 8.5;
      targetSc = lerp(0.5, 1, easeOutBack(clamp(1 - absOff, 0, 1))) + breathe;
      targetOp = clamp(1 - absOff, 0, 1);
    }

    s.posX  = lerp(s.posX, targetX, spd);
    s.posY  = lerp(s.posY, bobY, spd * 0.35);
    s.scale = lerp(s.scale, targetSc, spd * 0.75);
    s.opacity = lerp(s.opacity, targetOp, spd);

    // rotation: auto spin + touch + tilt
    const autoY = t.current * 0.52;
    s.rotX = lerp(s.rotX, touchRotX + tiltX * 0.38, spd * 0.55);
    s.rotY = lerp(s.rotY, autoY + touchRotY + tiltY * 0.18, 0.055);

    wrapRef.current.position.x = s.posX;
    wrapRef.current.position.y = s.posY;
    wrapRef.current.scale.setScalar(s.scale);
    groupRef.current.rotation.x = s.rotX;
    groupRef.current.rotation.y = s.rotY;

    // opacity via material
    obj.traverse(c => {
      if ((c as THREE.Mesh).isMesh) {
        const mats = Array.isArray((c as THREE.Mesh).material)
          ? (c as THREE.Mesh).material as THREE.Material[]
          : [(c as THREE.Mesh).material as THREE.Material];
        mats.forEach((mat: any) => {
          if (mat) { mat.opacity = s.opacity; mat.transparent = s.opacity < 0.99; }
        });
      }
    });

    invalidate();
  });

  const accentInt = parseInt(accent.replace('#', ''), 16);
  const lightInt  = parseInt(lightColor.replace('#', ''), 16);

  return (
    <>
      <spotLight position={[0, 7, 4]} angle={0.46} penumbra={0.72}
        intensity={4.8} color="#fff8f0" castShadow />
      <pointLight position={[-4, 2, 3]} intensity={3.0} color={isNaN(lightInt) ? 0xffcc44 : lightInt} />
      <pointLight position={[4, -2, 3]} intensity={1.8} color={isNaN(accentInt) ? 0xff4713 : accentInt} />
      <directionalLight position={[0, -3, 6]} intensity={1.1} color="#ff8844" />
      <ambientLight intensity={0.85} />

      <group ref={wrapRef} scale={0.9}>
        <group ref={groupRef}>
          <Suspense fallback={null}>
            <group scale={0.5}>
              <primitive object={obj} />
            </group>
          </Suspense>
        </group>
      </group>
    </>
  );
});
MobileNuggetScene.displayName = 'MobileNuggetScene';

// ── Glow ring behind nugget ───────────────────────────────────
const GlowRing = ({ accent }: { accent: string }) => (
  <div style={{
    position: 'absolute', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '78%', height: '78%',
    borderRadius: '50%',
    border: `1px solid ${accent}3a`,
    boxShadow: `0 0 50px ${accent}1a, inset 0 0 30px ${accent}0d`,
    animation: 'ringPulse 3s ease-in-out infinite',
    pointerEvents: 'none',
    transition: 'border-color 0.6s, box-shadow 0.6s',
  }}>
    <div style={{
      position: 'absolute', inset: '14%',
      borderRadius: '50%',
      border: `1px solid ${accent}22`,
      animation: 'ringPulse 3s 0.7s ease-in-out infinite',
    }} />
  </div>
);

// ── Content panel with staggered text reveal ─────────────────
const MobileContentPanel = ({
  sec, show, dir,
}: {
  sec: typeof SECTIONS[0];
  show: boolean;
  dir: 'left' | 'right' | 'none';
}) => {
  const dx = dir === 'left' ? -22 : dir === 'right' ? 22 : 0;
  const base = {
    opacity: show ? 1 : 0,
    transition: `opacity 0.44s cubic-bezier(0.16,1,0.3,1), transform 0.44s cubic-bezier(0.16,1,0.3,1)`,
  };
  const slide = (delay: number) => ({
    ...base,
    transitionDelay: show ? `${delay}s` : '0s',
    transform: show ? 'translateX(0) translateY(0)' : `translateX(${dx}px) translateY(8px)`,
  });

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      padding: '0 28px 60px',
      pointerEvents: show ? 'all' : 'none',
    }}>
      {/* tag */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 11, ...slide(0.04) }}>
        <div style={{ width: 18, height: 2, background: sec.accent, borderRadius: 2, flexShrink: 0 }} />
        <span style={{
          fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase' as const,
          color: sec.accent, fontFamily: 'Georgia, serif',
        }}>{sec.tag}</span>
      </div>

      {/* heading */}
      <h2 style={{
        fontSize: 'clamp(36px, 9.5vw, 52px)',
        fontWeight: 700, lineHeight: 1.05, color: '#fff',
        fontFamily: 'Georgia, serif', letterSpacing: '-0.025em',
        marginBottom: 11,
        textShadow: '0 4px 28px rgba(0,0,0,0.55)',
        ...slide(0.1),
      }}>
        {sec.h1}<br />
        <span style={{ color: sec.accent }}>{sec.h2}</span>
      </h2>

      {/* sub */}
      <p style={{
        fontSize: 13.5, lineHeight: 1.72,
        color: 'rgba(255,255,255,0.58)',
        maxWidth: 320, marginBottom: 22,
        fontFamily: 'Georgia, serif',
        ...slide(0.18),
      }}>{sec.sub}</p>

      {/* buttons */}
      <div style={{ display: 'flex', gap: 10, ...slide(0.25) }}>
        <button style={{
          background: '#fff', color: '#0d0200', border: 'none',
          padding: '13px 24px', borderRadius: 999,
          fontFamily: 'Georgia, serif', fontSize: 13, fontWeight: 700,
          cursor: 'pointer', flex: 1, maxWidth: 168,
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          WebkitTapHighlightColor: 'transparent',
        }}>{sec.cta} →</button>
        <button style={{
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.14)',
          backdropFilter: 'blur(10px)',
          color: 'rgba(255,255,255,0.65)',
          padding: '13px 18px', borderRadius: 999,
          fontFamily: 'Georgia, serif', fontSize: 13,
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}>Pelajari</button>
      </div>
    </div>
  );
};

// ── Nav dots ─────────────────────────────────────────────────
const MobileNavDots = ({ current, total, accent }: { current: number; total: number; accent: string }) => (
  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
    {Array.from({ length: total }, (_, i) => (
      <div key={i} style={{
        width: i === current ? 20 : 6, height: 6, borderRadius: 999,
        background: i === current ? accent : 'rgba(255,255,255,0.2)',
        transition: 'all 0.38s cubic-bezier(0.4,0,0.2,1)',
      }} />
    ))}
  </div>
);

// ── Main mobile layout ────────────────────────────────────────
function MobileLayout() {
  const [idx, setIdx]             = useState(0);
  const [swipeOffset, setSO]      = useState(0);
  const [swipePhase, setSP]       = useState<'idle' | 'exit' | 'enter'>('idle');
  const [swipeDir, setSD]         = useState<'left' | 'right' | 'none'>('none');
  const [transitioning, setTrans] = useState(false);
  const [showContent, setShowContent] = useState(true);

  // touch-drag nugget rotation
  const [touchRotX, setTRX] = useState(0);
  const [touchRotY, setTRY] = useState(0);
  const touchAccum = useRef({ x: 0, y: 0 });
  const touchLast  = useRef<{ x: number; y: number } | null>(null);

  // device tilt
  const [tiltX, setTX] = useState(0);
  const [tiltY, setTY] = useState(0);

  // swipe gesture detection
  const swipeRef   = useRef<{ x: number; y: number; t: number } | null>(null);
  const [dragX, setDX] = useState(0);
  const isDragging = useRef(false);
  const [spinHintVisible, setSpinHint] = useState(true);

  const transitionTo = useCallback((to: number, dir: 'left' | 'right') => {
    if (transitioning || to < 0 || to >= SECTIONS.length) return;
    setTrans(true);
    setSD(dir);
    setShowContent(false);

    // exit phase
    setSP('exit');
    setSO(dir === 'left' ? -1 : 1);

    setTimeout(() => {
      setIdx(to);
      // enter: nugget arrives from opposite side
      setSP('enter');
      setSO(dir === 'left' ? 1 : -1);

      setTimeout(() => {
        setSO(0);
        setSP('idle');
        setTrans(false);
        setShowContent(true);
      }, 440);
    }, 290);
  }, [transitioning]);

  const goNext = useCallback(() => transitionTo(idx + 1, 'left'),  [idx, transitionTo]);
  const goPrev = useCallback(() => transitionTo(idx - 1, 'right'), [idx, transitionTo]);

  // touch handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    swipeRef.current  = { x: t.clientX, y: t.clientY, t: Date.now() };
    touchLast.current = { x: t.clientX, y: t.clientY };
    isDragging.current = false;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swipeRef.current || !touchLast.current) return;
    const t   = e.touches[0];
    const dx  = t.clientX - swipeRef.current.x;
    const dy  = t.clientY - swipeRef.current.y;
    const adx = Math.abs(dx), ady = Math.abs(dy);

    if (!isDragging.current && (adx > 9 || ady > 9)) {
      // if mostly vertical → nugget rotate, else → prepare swipe
      isDragging.current = ady > adx * 0.7;
    }

    if (isDragging.current) {
      // rotate nugget
      const ddx = t.clientX - touchLast.current.x;
      const ddy = t.clientY - touchLast.current.y;
      touchAccum.current.y += ddx * 0.005;
      touchAccum.current.x += ddy * 0.005;
      setTRX(touchAccum.current.x);
      setTRY(touchAccum.current.y);
      touchLast.current = { x: t.clientX, y: t.clientY };
      if (spinHintVisible) setSpinHint(false);
    } else {
      // live drag feedback
      setDX(dx);
    }
  }, [spinHintVisible]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!swipeRef.current) return;
    const t   = e.changedTouches[0];
    const dx  = t.clientX - swipeRef.current.x;
    const dt  = Date.now() - swipeRef.current.t;
    const vel = Math.abs(dx) / dt;

    setDX(0);

    if (!isDragging.current && (vel > 0.38 || Math.abs(dx) > 72)) {
      if (dx < 0) goNext(); else goPrev();
    }

    swipeRef.current = null;
    isDragging.current = false;
  }, [goNext, goPrev]);

  // device orientation tilt
  useEffect(() => {
    const h = (e: DeviceOrientationEvent) => {
      if (e.gamma != null) setTX(clamp(e.gamma / 28, -1, 1));
      if (e.beta  != null) setTY(clamp((e.beta - 40) / 38, -1, 1));
    };
    window.addEventListener('deviceorientation', h);
    return () => window.removeEventListener('deviceorientation', h);
  }, []);

  const sec = SECTIONS[idx];
  const dragHint = clamp(dragX / 2.8, -64, 64);

  return (
    <div
      style={{
        position: 'relative', width: '100%', height: '100svh',
        overflow: 'hidden', userSelect: 'none',
        background: `linear-gradient(160deg, ${sec.mobileBg1} 0%, ${sec.mobileBg2} 55%, ${sec.mobileBg1} 100%)`,
        transition: 'background 0.72s cubic-bezier(0.4,0,0.2,1)',
        touchAction: 'pan-y',
        fontFamily: 'Georgia, serif',
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* background glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 80% 55% at 50% 35%, ${sec.accent}16 0%, transparent 68%)`,
        transition: 'background 0.72s ease',
      }} />

      {/* grain */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.035,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: '180px',
      }} />

      {/* ── header ── */}
      <header style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 90,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 24px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)',
      }}>
        <h1 style={{
          fontSize: 24, fontWeight: 700, color: '#fff',
          letterSpacing: '0.18em', textShadow: '0 2px 16px rgba(0,0,0,0.4)',
        }}>LEZZA</h1>
        <button style={{
          background: sec.accent === '#ffffff' ? '#FF4713' : sec.accent,
          border: 'none',
          color: sec.accent === '#FFD700' ? '#0a0000' : '#fff',
          padding: '9px 18px', borderRadius: 999,
          fontFamily: 'Georgia, serif', fontSize: 12, fontWeight: 700,
          cursor: 'pointer', transition: 'background 0.5s',
          WebkitTapHighlightColor: 'transparent',
        }}>Pesan →</button>
      </header>

      {/* ── section number ── */}
      <div style={{
        position: 'absolute', top: 22, right: 24, zIndex: 91,
        fontSize: 10, letterSpacing: '0.1em',
        color: 'rgba(255,255,255,0.22)',
      }}>0{idx + 1} / 0{SECTIONS.length}</div>

      {/* ── 3D stage ── */}
      <div style={{
        position: 'absolute',
        // center horizontally, sit near top third of screen
        top: '9%', left: '50%',
        transform: `translateX(calc(-50% + ${dragHint}px))`,
        transition: dragX !== 0 ? 'none' : 'transform 0.36s cubic-bezier(0.16,1,0.3,1)',
        width: '72vw', height: '72vw',
        maxWidth: 340, maxHeight: 340,
        zIndex: 30,
      }}>
        <GlowRing accent={sec.accent} />

        <Canvas
          camera={{ position: [0, 0, 4.8], fov: 52 }}
          gl={{
            alpha: true, antialias: true,
            premultipliedAlpha: false,
            powerPreference: 'high-performance',
            stencil: false, depth: true,
          }}
          dpr={[1, 2]}
          frameloop="always"
          shadows
          style={{ width: '100%', height: '100%', background: 'transparent' }}
        >
          <MobileNuggetScene
            swipeOffset={swipeOffset}
            swipePhase={swipePhase}
            touchRotX={touchRotX}
            touchRotY={touchRotY}
            tiltX={tiltX}
            tiltY={tiltY}
            accent={sec.accent}
            lightColor={sec.lightColor}
          />
        </Canvas>

        {/* "drag to spin" hint */}
        {spinHintVisible && (
          <div style={{
            position: 'absolute', bottom: -30, left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.28)', whiteSpace: 'nowrap',
            animation: 'fadeHint 5s 1.5s ease forwards',
          }}>↕ Seret untuk putar</div>
        )}
      </div>

      {/* ── prev / next arrow hints ── */}
      {idx > 0 && (
        <button onClick={goPrev} style={{
          position: 'absolute', left: 10, top: '37%',
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(8px)',
          color: 'rgba(255,255,255,0.45)',
          width: 36, height: 36, borderRadius: '50%',
          fontSize: 18, cursor: 'pointer', zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          WebkitTapHighlightColor: 'transparent',
        }}>‹</button>
      )}
      {idx < SECTIONS.length - 1 && (
        <button onClick={goNext} style={{
          position: 'absolute', right: 10, top: '37%',
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(8px)',
          color: 'rgba(255,255,255,0.45)',
          width: 36, height: 36, borderRadius: '50%',
          fontSize: 18, cursor: 'pointer', zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          WebkitTapHighlightColor: 'transparent',
        }}>›</button>
      )}

      {/* ── content panel ── */}
      <MobileContentPanel sec={sec} show={showContent} dir={swipeDir} />

      {/* ── nav dots ── */}
      <div style={{
        position: 'absolute', bottom: 22, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        zIndex: 50, pointerEvents: 'none',
      }}>
        <MobileNavDots current={idx} total={SECTIONS.length} accent={sec.accent} />
      </div>

      {/* ── WhatsApp ── */}
      <button style={{
        position: 'absolute', bottom: 22, right: 22, zIndex: 80,
        background: '#25D366', border: 'none', color: '#fff',
        width: 48, height: 48, borderRadius: '50%',
        fontSize: 20, cursor: 'pointer',
        boxShadow: '0 6px 20px rgba(37,211,102,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        WebkitTapHighlightColor: 'transparent',
      }}>💬</button>

      <style>{`
        @keyframes ringPulse {
          0%,100% { opacity:0.5; transform:translate(-50%,-50%) scale(1); }
          50%      { opacity:0.9; transform:translate(-50%,-50%) scale(1.045); }
        }
        @keyframes fadeHint {
          0%{opacity:1} 70%{opacity:1} 100%{opacity:0;}
        }
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{display:none;}
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//   ████████  DESKTOP 3D  (unchanged)  ████████
// ═══════════════════════════════════════════════════════════════
const NUGGET_COUNT = 4;
const PYRAMID: { nx: number; ny: number }[] = [
  { nx:  0,   ny: -0.8 },
  { nx: -2.3, ny:  1.1 },
  { nx:  2.3, ny:  1.1 },
  { nx:  0,   ny:  2.1 },
];
const ORBIT_ANGLES = Array.from({ length: NUGGET_COUNT }, (_, i) =>
  (i / NUGGET_COUNT) * Math.PI * 2
);

type Edge = 'top'|'bottom'|'left'|'right'|'topleft'|'topright'|'bottomleft'|'bottomright';
const ENTRY_EDGES: Edge[] = ['top', 'bottomleft', 'bottomright'];

function getEdgeStart(edge: Edge, vw: number, vh: number, sz: number) {
  const p = sz * 1.4;
  switch (edge) {
    case 'top':         return { sx: vw*(0.25+Math.random()*0.5), sy:-p };
    case 'bottom':      return { sx: vw*(0.25+Math.random()*0.5), sy:vh+p };
    case 'left':        return { sx:-p,    sy:vh*(0.2+Math.random()*0.6) };
    case 'right':       return { sx:vw+p,  sy:vh*(0.2+Math.random()*0.6) };
    case 'topleft':     return { sx:-p,    sy:-p };
    case 'topright':    return { sx:vw+p,  sy:-p };
    case 'bottomleft':  return { sx:-p,    sy:vh+p };
    case 'bottomright': return { sx:vw+p,  sy:vh+p };
  }
}

interface NP {
  id:number; x:number; y:number; size:number; scale:number;
  opacity:number; blur:number; rx:number; ry:number; rz:number;
  order:number; visible:boolean; depthScale:number;
}

const DesktopNuggetMesh = React.memo(({ rx, ry, rz, order }: { rx:number; ry:number; rz:number; order:number }) => {
  const ref = useRef<THREE.Group>(null);
  const { scene, gl, invalidate } = useThree();

  useEffect(() => {
    scene.background = null;
    gl.setClearColor(0, 0);
    gl.domElement.style.background = 'transparent';
  }, []);

  const gltf = useGLTF('/Cireng_Full_opt.glb');
  const obj  = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  useEffect(() => {
    obj.traverse(c => {
      if ((c as THREE.Mesh).isMesh) {
        const m = c as THREE.Mesh;
        m.renderOrder = order; m.castShadow = m.receiveShadow = true;
        (Array.isArray(m.material)?m.material:[m.material])
          .forEach((mat:any)=>{ if(mat) mat.needsUpdate=true; });
      }
    });
  }, [obj, order]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.x  = rx*(Math.PI/180);
    ref.current.rotation.y += delta*0.6;
    ref.current.rotation.z  = rz*(Math.PI/680);
    invalidate();
  });

  return <group ref={ref} scale={0.5}><primitive object={obj} /></group>;
});
DesktopNuggetMesh.displayName = 'DesktopNuggetMesh';

const DesktopNuggetCanvas = React.memo(({ n }: { n: NP }) => (
  <div style={{
    position:'fixed', left:n.x-n.size/2, top:n.y-n.size/2,
    width:n.size, height:n.size, zIndex:n.order,
    opacity:n.opacity, visibility:n.visible?'visible':'hidden',
    pointerEvents:'none',
    transform:`translate3d(0,0,0) scale(${n.depthScale})`,
    filter:n.blur>0.05?`blur(${n.blur.toFixed(2)}px)`:'none',
    willChange:'transform,opacity,filter',
  }}>
    <Canvas camera={{position:[0,0,8],fov:50}}
      gl={{alpha:true,antialias:false,premultipliedAlpha:false,
           powerPreference:'high-performance',stencil:false,depth:true}}
      dpr={[1,1.5]} frameloop="demand"
      style={{width:'100%',height:'100%',background:'transparent'}}
    >
      <ambientLight intensity={1.5}/>
      <directionalLight position={[5,8,5]} intensity={2.2} color="#fff8f0" castShadow/>
      <directionalLight position={[-4,3,4]} intensity={1.1} color="#ffcc44"/>
      <directionalLight position={[0,-4,6]} intensity={0.7} color="#ff8800"/>
      <hemisphereLight args={['#fff0d0','#bb6600',0.9]} position={[0,10,0]}/>
      <Suspense fallback={null}>
        <group scale={n.scale*2.5}>
          <DesktopNuggetMesh rx={n.rx} ry={n.ry} rz={n.rz} order={n.order}/>
        </group>
      </Suspense>
    </Canvas>
  </div>
), (p,q) => {
  if (!p.n.visible&&!q.n.visible) return true;
  const a=p.n,b=q.n;
  return a.visible===b.visible
    && Math.round(a.x)===Math.round(b.x)
    && Math.round(a.y)===Math.round(b.y)
    && Math.round(a.rx)===Math.round(b.rx)
    && Math.round(a.ry)===Math.round(b.ry)
    && Math.round(a.rz)===Math.round(b.rz)
    && Math.round(a.opacity*100)===Math.round(b.opacity*100)
    && Math.round(a.depthScale*200)===Math.round(b.depthScale*200)
    && Math.round(a.blur*10)===Math.round(b.blur*10);
});
DesktopNuggetCanvas.displayName = 'DesktopNuggetCanvas';

function DesktopLayout() {
  const scroll = useSmoothScroll();
  const idleMs = useIdleMs(scroll);

  const [vp, setVp]     = useState({w:1280,h:800});
  const [ready, setRdy] = useState(false);
  const [floatY, setFY] = useState(0);
  const [floatR, setFR] = useState(0);
  const [clock, setCk]  = useState(0);
  const clockRef        = useRef(0);
  const entryPos        = useRef<{sx:number;sy:number}[]>([]);

  useEffect(()=>{
    let raf:number;
    const tick=()=>{ clockRef.current+=0.016; setCk(clockRef.current); raf=requestAnimationFrame(tick); };
    raf=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);
  },[]);

  useEffect(()=>{
    const u=()=>{
      const w=window.innerWidth,h=window.innerHeight;
      setVp({w,h});
      entryPos.current=ENTRY_EDGES.map((e,i)=>
        getEdgeStart(e,w,h,600*(i%3===2?1.12:i%3===1?0.90:0.74)));
    };
    u(); window.addEventListener('resize',u);
    return ()=>window.removeEventListener('resize',u);
  },[]);

  useEffect(()=>{
    let c=false;
    (async()=>{ try{useGLTF.preload('/Cireng_Full_opt.glb');}catch{} if(!c)setRdy(true); })();
    return ()=>{c=true;};
  },[]);

  useEffect(()=>{
    let t=0,raf:number;
    const tick=()=>{
      t+=0.009;
      setFY(Math.sin(t)*14+Math.sin(t*0.52)*6);
      setFR(Math.sin(t*0.62)*1.8+Math.sin(t*0.27)*0.7);
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);
  },[]);

  const secIdx=Math.min(Math.floor(scroll*4),3);
  const sec=SECTIONS[secIdx];
  const SLAM_END=0.08, PYRAMID_END=0.22, MORPH_END=0.40;
  const idleRamp=clamp(idleMs/1000,0,1);
  const orbitSpeed=lerp(0.10,0.42,easeInOutCubic(idleRamp));
  const pkgOpacity=scroll<0.01?1:scroll<0.06?1-(scroll-0.01)/0.05:0;
  const pkgH=vp.h*1.7, pkgW=pkgH*0.70;
  const pkgLeft=vp.w*0.38, pkgTop=(vp.h-pkgH)/1.5;

  const nuggets:NP[] = useMemo(()=>{
    if(!ready||entryPos.current.length===0) return [];
    const {w,h}=vp;
    const pkgCx=w*0.74,pkgCy=h*0.50;
    const pyrCx=w*0.70,pyrCy=h*0.50,pyrStep=108;
    const orbitRx=w*0.22,orbitRy=h*0.34;

    return Array.from({length:NUGGET_COUNT},(_,i)=>{
      const id=i+1, layer=i%3;
      const szMult=layer===0?0.74:layer===1?0.90:1.12;
      const size=800*szMult, scale=0.30*szMult;
      const blur=layer===0?1.5:layer===1?0.6:0;
      const order=(layer+1)*100+i;
      const {sx,sy}=entryPos.current[i]??{sx:w/2,sy:-size};
      const slot=PYRAMID[i]??{nx:0,ny:0};
      const pyrX=pyrCx+slot.nx*pyrStep, pyrY=pyrCy+slot.ny*pyrStep;
      const baseAngle=ORBIT_ANGLES[i]??0;
      const curAngle=baseAngle+clock*orbitSpeed;
      const orbitX=pkgCx+Math.cos(curAngle)*orbitRx;
      const orbitY=pkgCy+Math.sin(curAngle)*orbitRy*0.65;
      const depthT=(Math.cos(curAngle)+1)/2;
      const orbitDS=lerp(0.40,1.8,depthT);
      const depthOrder=order+Math.floor(clamp(depthT,0,0.999)*5)*10;
      const slamStagger=i*0.006;
      const slamStart=slamStagger, slamEnd=SLAM_END+slamStagger*0.3;
      const spinVx=(rand(id,20)-0.5)*5;
      const spinVy=(rand(id,21)-0.5)*6;
      const spinVz=(rand(id,22)-0.5)*4;

      let x=sx,y=sy,opacity=0,scaleFinal=0,rx=0,ry=0,rz=0,blur_=blur,depthScale=1;

      if(scroll<slamStart){ opacity=0; scaleFinal=0; }
      else if(scroll<slamEnd){
        const t=clamp((scroll-slamStart)/(slamEnd-slamStart),0,1);
        const posT=t<0.6?easeOutExpo(t/0.6)*0.88:lerp(0.88,1,easeOutElastic((t-0.6)/0.4));
        x=lerp(sx,pyrX,posT); y=lerp(sy,pyrY,posT);
        opacity=clamp(t/0.04,0,1);
        const impactT=clamp((t-0.55)/0.15,0,1);
        const squash=t>0.6?1-Math.sin(easeOutElastic(impactT)*Math.PI)*0.12:1;
        scaleFinal=scale*easeOutBack(clamp(t*1.2,0,1))*squash;
        const sd=Math.exp(-4*t);
        rx=spinVx*t*380*sd; ry=spinVy*t*460*sd; rz=spinVz*t*280*sd;
        blur_=blur+lerp(6,0,easeOutExpo(t));
      } else if(scroll<PYRAMID_END){
        const holdT=(scroll-slamEnd)/(PYRAMID_END-slamEnd);
        const sAmp=lerp(12,0,easeOutExpo(holdT)), sFreq=6+i*0.4;
        x=pyrX+Math.cos(holdT*Math.PI*sFreq+i*1.1)*sAmp*(rand(id,40)-0.5)*2;
        y=pyrY+Math.sin(holdT*Math.PI*sFreq+i*0.9)*sAmp*(rand(id,41)-0.5)*2;
        opacity=1; scaleFinal=scale;
        ry=clock*20*(rand(id,30)>0.5?1:-1);
        rx=Math.sin(clock*0.9+i)*8; rz=Math.cos(clock*0.6+i*1.2)*5;
      } else if(scroll<MORPH_END){
        const t=clamp((scroll-PYRAMID_END)/(MORPH_END-PYRAMID_END),0,1);
        const te=easeInOutCubic(t);
        const ma=baseAngle+(clock-(MORPH_END-PYRAMID_END)*t)*orbitSpeed;
        x=lerp(pyrX,pkgCx+Math.cos(ma)*orbitRx,te);
        y=lerp(pyrY,pkgCy+Math.sin(ma)*orbitRy*0.65,te);
        opacity=1; scaleFinal=scale; depthScale=lerp(1,orbitDS,te);
        const su=easeInOutCubic(t);
        ry=clock*lerp(20,70,su)*(rand(id,30)>0.5?1:-1);
        rx=Math.sin(clock*lerp(0.9,2.0,su)+i)*lerp(8,20,su);
        rz=Math.cos(clock*lerp(0.6,1.5,su)+i*1.2)*lerp(5,15,su);
      } else {
        x=orbitX; y=orbitY; opacity=1; scaleFinal=scale; depthScale=orbitDS;
        const spd=lerp(28,95,easeInOutCubic(idleRamp));
        ry=clock*spd*(rand(id,30)>0.5?1:-1);
        rx=Math.sin(clock*lerp(1.1,2.4,idleRamp)+i*0.9)*lerp(9,24,idleRamp);
        rz=Math.cos(clock*lerp(0.7,1.7,idleRamp)+i*1.3)*lerp(6,18,idleRamp);
        scaleFinal=scale*(1+Math.sin(clock*1.1+i*0.7)*lerp(0,0.07,idleRamp));
      }

      if(scroll>=MORPH_END){
        blur_=lerp(3.5,0,easeOutExpo(depthT));
      } else if(scroll>=PYRAMID_END){
        const mt=clamp((scroll-PYRAMID_END)/(MORPH_END-PYRAMID_END),0,1);
        blur_=lerp(blur,lerp(3.5,0,easeOutExpo(depthT)),easeInOutCubic(mt));
      }

      return {
        id,x,y,size,scale:clamp(scaleFinal,0,scale*2),
        opacity:clamp(opacity,0,1),blur:blur_,rx,ry,rz,
        order:scroll>=MORPH_END?depthOrder:order,
        visible:opacity>0.01, depthScale,
      };
    });
  },[scroll,ready,vp,clock,idleRamp,orbitSpeed]);

  return (
    <div style={{minHeight:'600vh',background:'#0a0000',fontFamily:'Georgia, serif'}}>
      <div style={{position:'fixed',inset:0,zIndex:0,background:sec.bg,transition:'background 1.2s cubic-bezier(0.4,0,0.2,1)'}}/>
      <div style={{position:'fixed',inset:0,zIndex:1,pointerEvents:'none',background:'radial-gradient(ellipse 85% 85% at 28% 50%,transparent 30%,rgba(0,0,0,0.75) 100%)'}}/>
      <div style={{position:'fixed',inset:0,zIndex:2,pointerEvents:'none',opacity:0.03,backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,backgroundSize:'180px'}}/>

      <header style={{position:'fixed',top:0,left:0,right:0,zIndex:700,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'24px 56px',background:'linear-gradient(to bottom,rgba(0,0,0,0.62) 0%,transparent 100%)'}}>
        <nav style={{display:'flex',gap:36}}>
          {['Produk','Tentang','Distribusi','Blog'].map(l=>(
            <button key={l} style={{color:'rgba(255,255,255,0.58)',background:'none',border:'none',fontFamily:'Georgia, serif',fontSize:14,letterSpacing:'0.06em',cursor:'pointer',transition:'color 0.2s'}}
              onMouseEnter={e=>(e.currentTarget.style.color='#fff')}
              onMouseLeave={e=>(e.currentTarget.style.color='rgba(255,255,255,0.58)')}
            >{l}</button>
          ))}
        </nav>
        <h1 style={{position:'absolute',left:'50%',transform:'translateX(-50%)',fontFamily:'Georgia, serif',fontSize:30,fontWeight:700,color:'#fff',letterSpacing:'0.18em',textShadow:'0 2px 20px rgba(0,0,0,0.5)'}}>LEZZA</h1>
        <div style={{display:'flex',gap:10}}>
          <button style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.18)',color:'#fff',padding:'9px 22px',borderRadius:999,fontFamily:'Georgia, serif',fontSize:13,backdropFilter:'blur(8px)',cursor:'pointer'}}>Hubungi Kami</button>
          <button style={{background:sec.accent==='#ffffff'?'#FF4713':sec.accent,border:'none',color:sec.accent==='#FFD700'?'#0a0000':'#fff',padding:'10px 26px',borderRadius:999,fontFamily:'Georgia, serif',fontSize:13,fontWeight:700,cursor:'pointer',boxShadow:'0 4px 24px rgba(255,71,19,0.4)',transition:'background 0.5s'}}>Pesan →</button>
        </div>
      </header>

      <div style={{position:'fixed',top:0,left:0,zIndex:500,width:'50%',height:'100vh',display:'flex',flexDirection:'column',justifyContent:'center',padding:'0 0 0 68px',pointerEvents:'none'}}>
        <div key={`tag-${secIdx}`} style={{display:'inline-flex',alignItems:'center',gap:10,marginBottom:16,animation:'fadeUp 0.5s ease both'}}>
          <span style={{width:28,height:2,background:sec.accent,display:'inline-block',borderRadius:2,transition:'background 0.6s'}}/>
          <span style={{fontSize:11,letterSpacing:'0.22em',textTransform:'uppercase' as const,color:sec.accent,transition:'color 0.6s'}}>{sec.tag}</span>
        </div>
        <h2 key={`h-${secIdx}`} style={{fontSize:'clamp(52px,5.6vw,90px)',fontWeight:700,lineHeight:1.04,color:'#fff',marginBottom:20,letterSpacing:'-0.025em',animation:'fadeUp 0.6s 0.08s ease both',textShadow:'0 4px 40px rgba(0,0,0,0.4)'}}>
          {sec.h1}<br/><span style={{color:sec.accent,transition:'color 0.6s'}}>{sec.h2}</span>
        </h2>
        <p key={`p-${secIdx}`} style={{fontSize:17,lineHeight:1.78,color:'rgba(255,255,255,0.62)',maxWidth:400,marginBottom:36,animation:'fadeUp 0.6s 0.16s ease both'}}>{sec.sub}</p>
        <div key={`cta-${secIdx}`} style={{display:'flex',gap:12,animation:'fadeUp 0.6s 0.24s ease both',pointerEvents:'all'}}>
          <button style={{background:'#fff',color:'#0d0200',border:'none',padding:'16px 32px',borderRadius:999,fontFamily:'Georgia, serif',fontSize:15,fontWeight:700,cursor:'pointer',boxShadow:'0 8px 32px rgba(0,0,0,0.28)',transition:'all 0.2s'}}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';}}
            onMouseLeave={e=>{e.currentTarget.style.transform='';}}
          >{sec.cta} →</button>
          <button style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.18)',backdropFilter:'blur(12px)',color:'rgba(255,255,255,0.72)',padding:'16px 24px',borderRadius:999,fontFamily:'Georgia, serif',fontSize:14,cursor:'pointer'}}>Pelajari</button>
        </div>
        <div style={{display:'flex',gap:8,marginTop:50}}>
          {SECTIONS.map((_,i)=>(
            <div key={i} style={{width:i===secIdx?28:8,height:3,borderRadius:999,background:i===secIdx?sec.accent:'rgba(255,255,255,0.2)',transition:'all 0.4s cubic-bezier(0.4,0,0.2,1)'}}/>
          ))}
        </div>
        <div style={{position:'absolute',bottom:20,fontFamily:'monospace',fontSize:10,color:'rgba(255,255,255,0.22)',letterSpacing:'0.08em'}}>
          {scroll<SLAM_END?'⚡ SLAM':scroll<PYRAMID_END?'△ PYRAMID':scroll<MORPH_END?'◎ MORPH':'○ ORBIT'}
          {' · '}{Math.round(scroll*100)}%
        </div>
      </div>

      {pkgOpacity>0.005&&(
        <div style={{position:'fixed',left:pkgLeft,top:pkgTop+floatY,width:pkgW,height:pkgH,zIndex:50,opacity:pkgOpacity,pointerEvents:'none',transform:`rotate(${floatR}deg)`,transition:'opacity 0.3s ease',filter:'drop-shadow(0 60px 120px rgba(0,0,0,0.7)) drop-shadow(0 0 80px rgba(255,71,19,0.18))'}}>
          <img src={lezza.src} alt="Lezza" style={{width:'100%',height:'100%',objectFit:'contain',display:'block'}}/>
        </div>
      )}

      {nuggets.map(n=><DesktopNuggetCanvas key={n.id} n={n}/>)}

      <div style={{position:'fixed',top:0,left:0,zIndex:999,height:2,width:`${scroll*100}%`,background:`linear-gradient(to right,${sec.accent},#FFB800)`,boxShadow:`0 0 12px ${sec.accent}`,transition:'width 0.08s,background 0.8s'}}/>

      <div style={{position:'fixed',bottom:32,left:'50%',transform:'translateX(-50%)',zIndex:600,pointerEvents:'none',opacity:clamp(1-scroll*18,0,1),display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
        <span style={{fontSize:10,letterSpacing:'0.25em',textTransform:'uppercase' as const,color:'rgba(255,255,255,0.36)'}}>Scroll</span>
        <div style={{width:1,height:40,background:'linear-gradient(to bottom,rgba(255,255,255,0.4),transparent)',animation:'pulse 2s ease-in-out infinite'}}/>
      </div>

      <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:400,padding:'20px 68px',background:'linear-gradient(to top,rgba(0,0,0,0.65) 0%,transparent 100%)',display:'flex',gap:52,opacity:clamp((scroll-0.06)*12,0,0.88),pointerEvents:'none'}}>
        {[{v:'2017',l:'Berdiri'},{v:'10K+',l:'Keluarga'},{v:'500+',l:'Outlet'},{v:'Halal',l:'MUI'}].map(s=>(
          <div key={s.v} style={{display:'flex',flexDirection:'column',gap:3}}>
            <span style={{fontSize:20,fontWeight:700,color:'#fff',letterSpacing:'-0.01em'}}>{s.v}</span>
            <span style={{fontSize:9,letterSpacing:'0.18em',textTransform:'uppercase' as const,color:'rgba(255,255,255,0.32)'}}>{s.l}</span>
          </div>
        ))}
      </div>

      <button style={{position:'fixed',bottom:28,right:28,zIndex:800,background:'#25D366',border:'none',color:'#fff',padding:'13px 22px',borderRadius:999,fontFamily:'Georgia, serif',fontSize:14,fontWeight:600,cursor:'pointer',boxShadow:'0 6px 24px rgba(37,211,102,0.4)',transition:'transform 0.2s'}}
        onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.05)')}
        onMouseLeave={e=>(e.currentTarget.style.transform='')}
      >💬 Chat Agen</button>

      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:0.4}50%{opacity:1}}
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:rgba(255,71,19,0.32);border-radius:2px;}
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  ROOT — splits by viewport
// ═══════════════════════════════════════════════════════════════
export default function LezzaInteractive() {
  const [isMobile, setIsMobile] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    setHydrated(true);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);     
  }, []);

  if (!hydrated) return null;
  return isMobile ? <MobileLayout /> : <DesktopLayout />;
}
