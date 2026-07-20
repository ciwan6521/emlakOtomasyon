"use client";

import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { formatCurrency } from "@/lib/utils";
import type { PropertyDto } from "@reos/shared";

const defaultCenter: [number, number] = [42.4304, 19.2594];

function FitBounds({ points }: { points: PropertyDto[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(
      points.map((p) => [p.latitude!, p.longitude!]),
    );
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [map, points]);
  return null;
}

const pinIcon = L.divIcon({
  className: "",
  html: '<div style="width:28px;height:28px;border-radius:50%;background:hsl(222 89% 55%);border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.25)"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

export function PropertyMap({ properties }: { properties: PropertyDto[] }) {
  const points = properties.filter(
    (p) => p.latitude != null && p.longitude != null,
  );

  return (
    <MapContainer
      center={defaultCenter}
      zoom={10}
      className="h-[520px] w-full rounded-xl"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.length > 0 && <FitBounds points={points} />}
      {points.map((p) => (
        <Marker
          key={p.id}
          position={[p.latitude!, p.longitude!]}
          icon={pinIcon}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{p.title}</p>
              <p className="text-muted-foreground">
                {p.region} · {p.rooms}
              </p>
              <p className="font-medium">{formatCurrency(p.price)}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
