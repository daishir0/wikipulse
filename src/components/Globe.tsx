'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useStore, extractLanguage, getEditSizeCategory } from '@/store';
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

function calculateOpacity(createdAt: number, now: number): number {
  const age = now - createdAt;
  if (age >= 5000) return 0;
  return 1 - age / 5000;
}

export default function Globe() {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(Date.now());
  const [isReady, setIsReady] = useState(false);
  const editEvents = useStore((s) => s.editEvents);
  const filter = useStore((s) => s.filter);
  const autoRotate = useStore((s) => s.autoRotate);
  const editBattles = useStore((s) => s.editBattles);
  const setSelectedEvent = useStore((s) => s.setSelectedEvent);
  const setGlobeCamera = useStore((s) => s.setGlobeCamera);
  const dayNightEnabled = useStore((s) => s.dayNightEnabled);
  const sunPosition = useDayNight();
  const defaultLightsRef = useRef<{ type: string; intensity: number; position?: THREE.Vector3 }[]>([]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(interval);
  }, []);

  const eventMap = useMemo(() => {
    const map = new Map<string, (typeof editEvents)[0]>();
    editEvents.forEach((e) => map.set(e.id, e));
    return map;
  }, [editEvents]);

  const pointsData = useMemo(() => {
    return editEvents
      .filter((event) => {
        if (filter.languages.length > 0) {
          const lang = extractLanguage(event.wiki);
          if (!filter.languages.includes(lang)) return false;
        }
        return true;
      })
      .map((event) => {
        const opacity = calculateOpacity(event.createdAt, now);
        const cat = getEditSizeCategory(event);
        const isNew = cat === 'new';
        const isMajor = (event.lengthNew - event.lengthOld) >= 500;
        const botMult = event.bot ? 0.6 : 1;

        return {
          id: event.id,
          lat: event.position.lat,
          lng: event.position.lng,
          altitude: 0.01,
          color: event.color,
          radius: event.size * 0.8 * botMult * (isNew ? 1.3 : isMajor ? 1.15 : 1),
          opacity: opacity * botMult,
          isNew,
          isMajor,
          title: event.title,
        };
      })
      .filter((p) => p.opacity > 0);
  }, [editEvents, now, filter.languages]);

  // Edit battle rings
  const ringsData = useMemo(() => {
    return editBattles.map((b) => ({
      lat: b.lat,
      lng: b.lng,
      maxR: 3 + b.editCount * 0.5,
      propagationSpeed: 2,
      repeatPeriod: 1000,
      color: () => 'rgba(255, 100, 50, 0.6)',
    }));
  }, [editBattles]);

  const labelsData = useMemo(() => {
    return pointsData
      .filter((p) => p.isNew || p.isMajor)
      .map((p) => ({
        id: `label-${p.id}`,
        lat: p.lat,
        lng: p.lng,
        text: p.isNew ? '✨ NEW' : '📈',
        color: p.color,
        size: p.isNew ? 1.5 : 1.2,
        altitude: 0.02,
      }));
  }, [pointsData]);

  const handlePointClick = useCallback((point: { id: string }) => {
    const event = eventMap.get(point.id);
    if (event) setSelectedEvent(event);
  }, [eventMap, setSelectedEvent]);

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
          const camera = globe.camera();
          if (!camera) return null;
          const position = latLngToVector3(lat, lng, altitude);
          const cameraPos = camera.position.clone();
          const pointToCamera = cameraPos.sub(position).normalize();
          const surfaceNormal = position.clone().normalize();
          const visible = pointToCamera.dot(surfaceNormal) > -0.1;
          const projected = position.clone().project(camera);
          const rect = container.getBoundingClientRect();
          return {
            x: ((projected.x + 1) / 2) * rect.width,
            y: ((-projected.y + 1) / 2) * rect.height,
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
    if (defaultLightsRef.current.length > 0) return; // already captured
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

    // Remove any sun light we previously added (tagged with name)
    const ourSun = scene.children.filter((c: THREE.Object3D) => c.name === 'wp-sun-light');
    ourSun.forEach((l: THREE.Object3D) => scene.remove(l));

    if (dayNightEnabled) {
      // Dim existing ambient lights for night-side contrast
      scene.children.forEach((c: THREE.Object3D) => {
        if (c instanceof THREE.AmbientLight) c.intensity = 0.2;
        if (c instanceof THREE.DirectionalLight && c.name !== 'wp-sun-light') c.intensity = 0.1;
      });

      // Add sun directional light at correct position
      // Must match latLngToVector3 coordinate system exactly
      const sunLight = new THREE.DirectionalLight(0xffeedd, 2.0);
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
      // Restore default lighting
      scene.children.forEach((c: THREE.Object3D) => {
        if (c instanceof THREE.AmbientLight) c.intensity = 0.8;
        if (c instanceof THREE.DirectionalLight && c.name !== 'wp-sun-light') c.intensity = 0.6;
      });
    }
  }, [isReady, sunPosition, dayNightEnabled]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black">
      <GlobeGL
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        onGlobeReady={handleGlobeReady}
        pointsData={pointsData}
        pointLat="lat"
        pointLng="lng"
        pointAltitude="altitude"
        pointColor={(d) => {
          const p = d as { color: string; opacity: number };
          const op = Math.floor(p.opacity * 255).toString(16).padStart(2, '0');
          return `${p.color}${op}`;
        }}
        pointRadius="radius"
        pointsMerge={false}
        onPointClick={(p) => handlePointClick(p as { id: string })}
        labelsData={labelsData}
        labelLat="lat"
        labelLng="lng"
        labelText="text"
        labelSize="size"
        labelDotRadius={0}
        labelColor={(d) => (d as { color: string }).color}
        labelAltitude="altitude"
        labelResolution={2}
        ringsData={ringsData}
        ringLat="lat"
        ringLng="lng"
        ringMaxRadius="maxR"
        ringPropagationSpeed="propagationSpeed"
        ringRepeatPeriod="repeatPeriod"
        ringColor="color"
        pointsTransitionDuration={0}
        labelsTransitionDuration={0}
        atmosphereColor="lightskyblue"
        atmosphereAltitude={0.15}
        animateIn={false}
        waitForGlobeReady={true}
      />
    </div>
  );
}
