import * as THREE from 'three';
import React, { useRef, useEffect } from 'react';
import { Canvas, useLoader, useFrame, useThree } from '@react-three/fiber';
import { OBJLoader, MTLLoader } from 'three-stdlib';

type Props = { 
  rotationX?: number; 
  rotationY?: number;
  rotationZ?: number;
  autoRotate?: boolean;
  scale?: number; // ✅ TAMBAH PROP SCALE
};

function NuggetModel({ 
  rotationX = 0, 
  rotationY = 0, 
  rotationZ = 0, 
  autoRotate = false,
  scale = 1.2 
}: Props) {
  const group = useRef<THREE.Group>(null);
  const { scene, gl } = useThree();
  
  useEffect(() => {
    scene.background = null;
    gl.setClearColor(0x000000, 0);
    gl.domElement.style.background = 'transparent';
  }, [scene, gl]);
  
  const materials = useLoader(
    MTLLoader, 
    '/tripo_convert_67357acf-d1f6-4854-a596-5f973061cae9.mtl'
  );
  
  const obj = useLoader(
    OBJLoader, 
    '/tripo_convert_67357acf-d1f6-4854-a596-5f973061cae9.obj',
    (loader) => {
      materials.preload();
      loader.setMaterials(materials);
    }
  );

  // ✅ PERBAIKAN: Force material properties + fallback color
  useEffect(() => {
    if (obj) {
      obj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (mesh.material) {
            const material = mesh.material as THREE.MeshStandardMaterial;
            
            // ✅ KUNCI: Set material properties
            material.transparent = true;
            material.side = THREE.DoubleSide; // Render both sides
            
            // ✅ FALLBACK COLOR - jika texture tidak load
            if (!material.map) {
              // Warna nugget coklat keemasan
              material.color = new THREE.Color(0xD4A574);
              material.emissive = new THREE.Color(0x3D2817); // Sedikit glow coklat
              material.emissiveIntensity = 0.2;
            }
            
            // ✅ Material properties untuk realistic nugget
            material.roughness = 0.8; // Agak kasar (breading texture)
            material.metalness = 0.05; // Tidak metallic
            material.needsUpdate = true;
            
            console.log('Material loaded:', {
              hasTexture: !!material.map,
              color: material.color.getHexString(),
            });
          }
        }
      });
    }
  }, [obj]);

  useFrame(() => {
    if (group.current) {
      if (autoRotate) {
        group.current.rotation.y += 0.01;
      } else {
        group.current.rotation.x = rotationX * (Math.PI / 180);
        group.current.rotation.y = rotationY * (Math.PI / 180);
        group.current.rotation.z = rotationZ * (Math.PI / 180);
      }
    }
  });

  return (
    <group ref={group} scale={scale}> 
      <primitive object={obj} />
    </group>
  );
}

export default function Nugget3DScene(props: Props) {
  return (
    <Canvas 
      camera={{ position: [0, 0, 5] }}
      gl={{ 
        alpha: true,
        antialias: true,
        premultipliedAlpha: false,
        preserveDrawingBuffer: true 
      }}
      style={{ 
        width: '100%', 
        height: '100%',
        background: 'transparent',
        pointerEvents: 'none'
      }}
    >
      {/* ✅ PERBAIKAN: Kurangi intensity lighting */}
      {/* Ambient light - lebih soft */}
      <ambientLight intensity={0.8} />
      
      {/* Main directional light */}
      <directionalLight position={[5, 5, 5]} intensity={0.8} color="#ffffff" />
      
      {/* Fill lights - lebih lembut */}
      <directionalLight position={[-5, 5, 5]} intensity={0.4} color="#fff5e6" />
      <directionalLight position={[0, -3, 5]} intensity={0.3} color="#ffeedd" />
      
      {/* Rim light untuk depth */}
      <directionalLight position={[0, 0, -5]} intensity={0.2} color="#ffcc99" />
      
      {/* ✅ HAPUS atau KURANGI intensity ini - terlalu terang */}
      {/* <pointLight position={[0, 0, 10]} intensity={1.0} /> */}
      {/* <hemisphereLight args={['#ffffff', '#444444', 0.8]} /> */}
      
      {/* ✅ GANTI dengan hemisphere lebih soft */}
      <hemisphereLight 
        args={['#fff5e6', '#8B6F47', 0.4]} 
        position={[0, 10, 0]}
      />
      
      <NuggetModel {...props} />
    </Canvas>
  );
}