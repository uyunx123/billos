import { useCallback, useState } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Crosshair, Loader2, MapPin } from "lucide-react";

export interface PickResult {
  lat: number;
  lng: number;
  label?: string;
  province?: string;
  city?: string;
  postalCode?: string;
}

const pinIcon = L.divIcon({
  className: "",
  html: '<span class="isak-pin"></span>',
  iconSize: [34, 34],
  iconAnchor: [17, 34],
});

async function reverseGeocode(lat: number, lng: number, onPick: (r: PickResult) => void) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=id`
    );
    const data = (await res.json()) as { address?: Record<string, string> };
    const a = data.address ?? {};
    const road = a.road ?? a.pedestrian ?? a.suburb ?? a.neighbourhood ?? "";
    const place = a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? "";
    onPick({
      lat,
      lng,
      label: [road, place].filter(Boolean).join(", ") || undefined,
      city: place || undefined,
      province: a.state || undefined,
      postalCode: a.postcode || undefined,
    });
  } catch {
    onPick({ lat, lng });
  }
}

function MapClickLayer({ onPick }: { onPick: (r: PickResult) => void }) {
  useMapEvents({
    click(e) {
      void reverseGeocode(e.latlng.lat, e.latlng.lng, onPick);
    },
  });
  return null;
}

/**
 * Leaflet map with click-to-pin + reverse geocoding. Lazy-loaded by the
 * checkout page so the map bundle doesn't ship to every visitor.
 */
export default function AddressMapPicker({
  value,
  onPick,
}: {
  value: PickResult | null;
  onPick: (r: PickResult) => void;
}) {
  const [locating, setLocating] = useState(false);

  const handleLocate = useCallback(() => {
    if (!("geolocation" in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        void reverseGeocode(pos.coords.latitude, pos.coords.longitude, onPick);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 12_000 }
    );
  }, [onPick]);

  const center: [number, number] = value ? [value.lat, value.lng] : [-2.5, 118];

  return (
    <div>
      <MapContainer
        center={center}
        zoom={value ? 12 : 5}
        scrollWheelZoom={false}
        className="relative z-0 h-64 w-full overflow-hidden rounded-2xl border border-border"
        aria-label="Map — click to drop a delivery pin"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickLayer onPick={onPick} />
        {value && <Marker position={[value.lat, value.lng]} icon={pinIcon} />}
      </MapContainer>
      <p className="mt-2 flex items-start gap-1.5 text-xs text-foreground/50">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>Click the map to drop your delivery pin — province and city are filled in for you.</span>
      </p>
      <div className="mt-2">
        <button type="button" className="btn btn-ghost w-full !py-2.5 text-sm" onClick={handleLocate} disabled={locating}>
          {locating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Locating…
            </>
          ) : (
            <>
              <Crosshair className="h-4 w-4" aria-hidden="true" /> Use my location
            </>
          )}
        </button>
      </div>
    </div>
  );
}