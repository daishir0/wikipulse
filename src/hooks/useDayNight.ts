'use client';

import { useEffect, useState } from 'react';
import { getSunPosition } from '@/utils/geo';
import { GeoPosition } from '@/lib/types';

export function useDayNight() {
  const [sunPosition, setSunPosition] = useState<GeoPosition>(() => getSunPosition());

  useEffect(() => {
    const interval = setInterval(() => {
      setSunPosition(getSunPosition());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  return sunPosition;
}
