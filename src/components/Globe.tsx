'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useStore } from '@/store';
import { useDayNight } from '@/hooks/useDayNight';
import type { GlobeMethods } from 'react-globe.gl';
import { GlobeCamera } from '@/lib/types';
import * as THREE from 'three';

const GlobeGL = dynamic(() => import('react-globe.gl'), { ssr: false, loading: () => null });

const GLOBE_RADIUS = 100;

function latLngToVector3(lat: number, lng: number, altitude: number = 0): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const radius = GLOBE_RADIUS * (1 + altitude);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

export default function Globe() {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const autoRotate = useStore((s) => s.autoRotate);
  const editBattles = useStore((s) => s.editBattles);
  const editRipples = useStore((s) => s.editRipples);
  const setGlobeCamera = useStore((s) => s.setGlobeCamera);
  const setFocusBurst = useStore((s) => s.setFocusBurst);
  const dayNightEnabled = useStore((s) => s.dayNightEnabled);
  const globeBrightness = useStore((s) => s.globeBrightness);
  const sunPosition = useDayNight();
  const defaultLightsRef = useRef<{ type: string; intensity: number; position?: THREE.Vector3 }[]>([]);

  // Edit battle rings + edit ripples
  const ringsData = useMemo(() => {
    const battleRings = editBattles.map((b) => ({
      lat: b.lat,
      lng: b.lng,
      maxR: 3 + b.editCount * 0.5,
      propagationSpeed: 2,
      repeatPeriod: 1000,
      color: () => 'rgba(255, 100, 50, 0.6)',
    }));

    const hexToRgba = (hex: string, alpha: number) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const rippleRings = editRipples.map((r) => ({
      lat: r.lat,
      lng: r.lng,
      maxR: 4,
      propagationSpeed: 3,
      repeatPeriod: 3000,
      color: () => hexToRgba(r.color, 0.5),
    }));

    return [...battleRings, ...rippleRings];
  }, [editBattles, editRipples]);

  const lastClickRef = useRef<{ time: number; lat: number; lng: number }>({ time: 0, lat: 0, lng: 0 });

  const handleGlobeClick = useCallback(({ lat, lng }: { lat: number; lng: number }, event: MouseEvent) => {
    const now = Date.now();
    const last = lastClickRef.current;
    if (now - last.time < 400 && Math.abs(lat - last.lat) < 5 && Math.abs(lng - last.lng) < 5) {
      setFocusBurst({ lat, lng, screenX: event.clientX, screenY: event.clientY, timestamp: now });
      lastClickRef.current = { time: 0, lat: 0, lng: 0 };
    } else {
      lastClickRef.current = { time: now, lat, lng };
    }
  }, [setFocusBurst]);

  const handleGlobeReady = useCallback(() => setIsReady(true), []);

  // Setup globe controls and camera
  useEffect(() => {
    if (isReady && globeRef.current && containerRef.current) {
      const controls = globeRef.current.controls();
      controls.autoRotate = autoRotate;
      controls.autoRotateSpeed = 0.3;

      const globe = globeRef.current;
      const container = containerRef.current;

      const cam: GlobeCamera = {
        getScreenPosition: (lat, lng, altitude) => {
          const coords = globe.getScreenCoords(lat, lng, altitude);
          if (!coords) return null;
          // Visibility check: is the point facing the camera?
          const camera = globe.camera();
          if (!camera) return null;
          const position = latLngToVector3(lat, lng, altitude);
          const cameraPos = camera.position.clone();
          const pointToCamera = cameraPos.sub(position).normalize();
          const surfaceNormal = position.clone().normalize();
          const visible = pointToCamera.dot(surfaceNormal) > -0.1;
          return {
            x: coords.x,
            y: coords.y,
            visible,
          };
        },
      };
      setGlobeCamera(cam);
    }
    return () => setGlobeCamera(null);
  }, [isReady, setGlobeCamera, autoRotate]);

  // Update auto-rotate dynamically
  useEffect(() => {
    if (globeRef.current) {
      const controls = globeRef.current.controls();
      controls.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  // Capture default lights on globe ready
  useEffect(() => {
    if (!isReady || !globeRef.current) return;
    if (defaultLightsRef.current.length > 0) return;
    const scene = globeRef.current.scene();
    scene.children.forEach((c: THREE.Object3D) => {
      if (c instanceof THREE.AmbientLight) {
        defaultLightsRef.current.push({ type: 'ambient', intensity: c.intensity });
      }
      if (c instanceof THREE.DirectionalLight) {
        defaultLightsRef.current.push({ type: 'directional', intensity: c.intensity, position: c.position.clone() });
      }
    });
  }, [isReady]);

  // Day/night lighting - toggle-aware
  useEffect(() => {
    if (!isReady || !globeRef.current) return;
    const scene = globeRef.current.scene();

    const ourSun = scene.children.filter((c: THREE.Object3D) => c.name === 'wp-sun-light');
    ourSun.forEach((l: THREE.Object3D) => scene.remove(l));

    const b = globeBrightness;

    if (dayNightEnabled) {
      scene.children.forEach((c: THREE.Object3D) => {
        if (c instanceof THREE.AmbientLight) c.intensity = 0.2 * b;
        if (c instanceof THREE.DirectionalLight && c.name !== 'wp-sun-light') c.intensity = 0.1 * b;
      });

      const sunLight = new THREE.DirectionalLight(0xffeedd, 2.0 * b);
      sunLight.name = 'wp-sun-light';

      const phi = (90 - sunPosition.lat) * (Math.PI / 180);
      const theta = (sunPosition.lng + 180) * (Math.PI / 180);
      const r = GLOBE_RADIUS * 3;
      sunLight.position.set(
        -r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
      scene.add(sunLight);
    } else {
      scene.children.forEach((c: THREE.Object3D) => {
        if (c instanceof THREE.AmbientLight) c.intensity = 0.8 * b;
        if (c instanceof THREE.DirectionalLight && c.name !== 'wp-sun-light') c.intensity = 0.6 * b;
      });
    }
  }, [isReady, sunPosition, dayNightEnabled, globeBrightness]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black">
      <GlobeGL
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="/textures/starmap_nasa.jpg"
        onGlobeReady={handleGlobeReady}
        onGlobeClick={handleGlobeClick}
        ringsData={ringsData}
        ringLat="lat"
        ringLng="lng"
        ringMaxRadius="maxR"
        ringPropagationSpeed="propagationSpeed"
        ringRepeatPeriod="repeatPeriod"
        ringColor="color"
        atmosphereColor="lightskyblue"
        atmosphereAltitude={0.15}
        animateIn={false}
        waitForGlobeReady={true}
      />
    </div>
  );
}
