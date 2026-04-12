import { useMemo, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF, PolylineF, OverlayViewF, OVERLAY_MOUSE_TARGET } from '@react-google-maps/api';

export const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const GOOGLE_LIBRARIES = ['marker'];

/**
 * Wrapper around `@react-google-maps/api` that:
 * - loads the JS SDK once with English language (client is British, default Arabic labels were unreadable)
 * - exposes the underlying `google.maps.Map` instance via `onMapReady`
 * - re-exports the marker / infowindow / polyline primitives so the rest of
 *   the app does not need to import google directly.
 */
export default function GoogleMapView({
  center,
  zoom = 12,
  children,
  onMapReady,
  className = 'h-full w-full',
  options,
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'cobot-google-maps',
    googleMapsApiKey: GOOGLE_MAPS_KEY,
    language: 'en',
    region: 'QA',
    libraries: GOOGLE_LIBRARIES,
  });

  const mapRef = useRef(null);

  const handleLoad = useCallback((map) => {
    mapRef.current = map;
    if (onMapReady) onMapReady(map);
  }, [onMapReady]);

  const mergedOptions = useMemo(() => ({
    disableDefaultUI: false,
    streetViewControl: false,
    mapTypeControl: true,
    fullscreenControl: false,
    clickableIcons: false,
    gestureHandling: 'greedy',
    ...options,
  }), [options]);

  if (loadError) {
    return (
      <div className={`${className} flex items-center justify-center bg-red-50 text-red-600 text-sm`}>
        Failed to load Google Maps
      </div>
    );
  }
  if (!isLoaded) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100 text-gray-500 text-sm`}>
        Loading map…
      </div>
    );
  }
  return (
    <GoogleMap
      mapContainerClassName={className}
      center={center}
      zoom={zoom}
      onLoad={handleLoad}
      options={mergedOptions}
    >
      {children}
    </GoogleMap>
  );
}

export { MarkerF, InfoWindowF, PolylineF, OverlayViewF, OVERLAY_MOUSE_TARGET };

/**
 * Build a colored "pin" marker icon as an inline SVG data URL.
 * Returns a `google.maps.Icon` shaped object suitable for `<MarkerF icon={…}>`.
 */
export function pinIcon(color = '#3b82f6') {
  if (typeof window === 'undefined' || !window.google) return undefined;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
    <path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.3 21.7 0 14 0z" fill="${color}" stroke="#fff" stroke-width="2"/>
    <circle cx="14" cy="14" r="6" fill="#fff"/>
  </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new window.google.maps.Size(28, 36),
    anchor: new window.google.maps.Point(14, 36),
  };
}

/** Pan/zoom helper usable from outside the component. */
export function flyTo(map, lat, lng, zoom = 15) {
  if (!map || !lat || !lng) return;
  map.panTo({ lat, lng });
  if (zoom) map.setZoom(zoom);
}
