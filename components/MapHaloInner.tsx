"use client";

import { MapContainer, TileLayer, Circle, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type Props = {
  lat: number;
  lng: number;
  label?: string;
  radiusM?: number;
};

export default function MapHaloInner({ lat, lng, radiusM = 500 }: Props) {
  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 h-[320px] relative shadow-sm">
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
        attributionControl={true}
      >
        <TileLayer
          url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <Circle
          center={[lat, lng]}
          radius={radiusM}
          pathOptions={{
            color: "#0891B2",
            weight: 2,
            fillColor: "#0891B2",
            fillOpacity: 0.10,
          }}
        />
        <CircleMarker
          center={[lat, lng]}
          radius={7}
          pathOptions={{
            color: "#FFFFFF",
            weight: 2,
            fillColor: "#0891B2",
            fillOpacity: 1,
          }}
        />
      </MapContainer>
    </div>
  );
}
