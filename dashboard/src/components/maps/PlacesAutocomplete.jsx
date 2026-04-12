import { useEffect, useRef, useState } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_KEY } from './GoogleMapView';
import { MapPin } from 'lucide-react';

// Must match the libraries declared in GoogleMapView so the SDK loads once.
const GOOGLE_LIBRARIES = ['marker', 'places'];

/**
 * Address field backed by Google Places Autocomplete.
 *
 * Renders a regular text input; as the user types, Google suggests
 * matching places. Picking one fires `onSelect` with the resolved
 * address string + lat/lng + optional country/city components, so the
 * parent form can pre-fill related fields.
 *
 * Props:
 *  - value          — current string value (controlled)
 *  - onChange(str)  — called on every keystroke
 *  - onSelect({ address, latitude, longitude, place }) — called when a
 *                     suggestion is picked
 *  - placeholder, className, required, country
 */
export default function PlacesAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Start typing an address…',
  className = '',
  required = false,
  country = 'qa',
}) {
  const { isLoaded } = useJsApiLoader({
    id: 'cobot-google-maps',
    googleMapsApiKey: GOOGLE_MAPS_KEY,
    language: 'en',
    region: 'QA',
    libraries: GOOGLE_LIBRARIES,
  });

  const inputRef = useRef(null);
  const autoRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoaded || !inputRef.current || autoRef.current) return;
    const g = window.google?.maps?.places;
    if (!g) return;

    const ac = new g.Autocomplete(inputRef.current, {
      fields: ['formatted_address', 'geometry', 'address_components', 'name'],
      componentRestrictions: country ? { country } : undefined,
      types: ['geocode'],
    });
    autoRef.current = ac;
    setReady(true);

    const listener = ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (!place || !place.geometry) return;
      const address = place.formatted_address || place.name || '';
      const latitude = place.geometry.location.lat();
      const longitude = place.geometry.location.lng();
      onChange?.(address);
      onSelect?.({ address, latitude, longitude, place });
    });

    return () => {
      if (listener) window.google?.maps?.event?.removeListener(listener);
      autoRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, country]);

  return (
    <div className="relative">
      <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        ref={inputRef}
        type="text"
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={isLoaded ? placeholder : 'Loading address search…'}
        required={required}
        className={className || 'w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400'}
        disabled={!isLoaded}
      />
      {isLoaded && ready && (
        <p className="text-[11px] text-gray-400 mt-1">
          Start typing — pick a result to auto-fill the address, latitude and longitude.
        </p>
      )}
    </div>
  );
}
