import React, { useState, useEffect, useRef } from "react";
import L from "leaflet";
import { MapPin, Compass, Navigation, ExternalLink } from "lucide-react";
import { getApproxCoordinates, LatLng } from "../utils/locationHelper";

interface GMapProps {
  lat?: number;
  lng?: number;
  state?: string;
  district?: string;
  interactive?: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
  height?: string;
  className?: string;
}

export default function GMap({
  lat,
  lng,
  state,
  district,
  interactive = false,
  onLocationSelect,
  height = "200px",
  className = ""
}: GMapProps) {
  const [coords, setCoords] = useState<LatLng>({ lat: 28.6139, lng: 77.2090 });
  
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerInstanceRef = useRef<L.Marker | null>(null);

  // Sync internal coordinates state with props
  useEffect(() => {
    if (
      lat !== undefined &&
      lat !== null &&
      lng !== undefined &&
      lng !== null &&
      lat !== 0 &&
      lng !== 0 &&
      typeof lat === "number" &&
      typeof lng === "number" &&
      !isNaN(lat) &&
      !isNaN(lng)
    ) {
      setCoords({ lat, lng });
    } else {
      const approx = getApproxCoordinates(state, district);
      setCoords(approx);
    }
  }, [lat, lng, state, district]);

  // Handle Leaflet map instance lifecycle
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    // Safely remove any lingering Leaflet instance on this container
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.off();
        mapInstanceRef.current.remove();
      } catch (e) {
        // Ignore silent cleanup errors
      }
      mapInstanceRef.current = null;
      markerInstanceRef.current = null;
    }

    if ((container as any)._leaflet_id) {
      (container as any)._leaflet_id = null;
    }
    container.innerHTML = "";

    // Custom stylized marker matching our modern branding with tailwind styles
    const customMarkerIcon = L.divIcon({
      html: `
        <div class="relative flex flex-col items-center select-none">
          <span class="absolute inline-flex h-10 w-10 rounded-full bg-indigo-500/20 animate-ping -top-1"></span>
          <div class="bg-indigo-600 border-2 border-white p-2 rounded-full shadow-lg relative z-10 text-white flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div class="w-2 h-2 bg-indigo-600 rounded-full border-2 border-white -mt-1 shadow-sm"></div>
        </div>
      `,
      className: "custom-leaflet-marker",
      iconSize: [40, 48],
      iconAnchor: [20, 42]
    });

    let map: L.Map | null = null;
    try {
      // Initialize Map on container element directly
      map = L.map(container, {
        zoomControl: !interactive, // Show default zoom controls only when read-only for clean UI
        dragging: true,
        scrollWheelZoom: true,
        touchZoom: true,
        doubleClickZoom: true,
        boxZoom: false,
        keyboard: false,
        attributionControl: false
      }).setView([coords.lat, coords.lng], 13);

      // Set up open source OSM Tile Layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19
      }).addTo(map);

      // Create the physical marker
      const marker = L.marker([coords.lat, coords.lng], {
        icon: customMarkerIcon,
        draggable: interactive
      }).addTo(map);

      mapInstanceRef.current = map;
      markerInstanceRef.current = marker;

      // Handle clicks to position pin in interactive mode
      if (interactive) {
        map.on("click", (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          const roundedLat = parseFloat(lat.toFixed(6));
          const roundedLng = parseFloat(lng.toFixed(6));
          marker.setLatLng([roundedLat, roundedLng]);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.panTo([roundedLat, roundedLng]);
          }
          setCoords({ lat: roundedLat, lng: roundedLng });
          if (onLocationSelect) {
            onLocationSelect(roundedLat, roundedLng);
          }
        });

        // Handle dragging pin in interactive mode
        marker.on("dragend", () => {
          const position = marker.getLatLng();
          const roundedLat = parseFloat(position.lat.toFixed(6));
          const roundedLng = parseFloat(position.lng.toFixed(6));
          if (mapInstanceRef.current) {
            mapInstanceRef.current.panTo([roundedLat, roundedLng]);
          }
          setCoords({ lat: roundedLat, lng: roundedLng });
          if (onLocationSelect) {
            onLocationSelect(roundedLat, roundedLng);
          }
        });
      }

      // Force tile recalculation once rendered in the DOM
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 150);
    } catch (err) {
      console.warn("Leaflet init error handled gracefully:", err);
    }

    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.off();
          mapInstanceRef.current.remove();
        } catch (e) {
          // Ignore cleanup errors on unmount
        }
        mapInstanceRef.current = null;
        markerInstanceRef.current = null;
      }
      if (container) {
        (container as any)._leaflet_id = null;
        container.innerHTML = "";
      }
    };
  }, [interactive]);

  // Keep map view & marker synced with external coordinate state changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const marker = markerInstanceRef.current;
    if (map && marker) {
      const currentPos = marker.getLatLng();
      if (currentPos.lat !== coords.lat || currentPos.lng !== coords.lng) {
        marker.setLatLng([coords.lat, coords.lng]);
        map.setView([coords.lat, coords.lng], map.getZoom());
      }
    }
  }, [coords]);

  // Open native maps or start driving navigation in standard system browser/app handler
  const handleNavigate = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (interactive) return;

    // OpenStreetMap URL for direct navigation / location viewing (100% free, no API keys)
    const url = `https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=16/${coords.lat}/${coords.lng}`;
    
    window.open(url, "_blank");
  };

  return (
    <div 
      className={`relative rounded-3xl overflow-hidden border border-slate-200 bg-slate-100 flex flex-col text-slate-900 shadow-sm transition-all duration-300 ${className}`}
      style={{ height }}
      id="openstreetmap-container"
    >
      {/* Map Element */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-full flex-1 z-0"
        onClick={() => !interactive && handleNavigate()}
        title={!interactive ? "Click to open in Google Maps / start navigation" : undefined}
      />

      {/* Coordinate HUD indicator */}
      <div className="absolute top-3 left-3 z-[400] bg-white/95 border border-slate-200 px-3 py-1.5 rounded-xl font-mono text-[10px] text-slate-700 shadow-sm flex items-center gap-1.5 backdrop-blur-md">
        <Compass size={11} className="text-indigo-600 animate-spin-slow" />
        <span className="font-bold text-slate-500">LAT:</span>
        <span className="font-extrabold text-slate-800">{coords.lat.toFixed(5)}</span>
        <span className="text-slate-300">|</span>
        <span className="font-bold text-slate-500">LNG:</span>
        <span className="font-extrabold text-slate-800">{coords.lng.toFixed(5)}</span>
      </div>

      {/* Mode-specific user tips and action buttons */}
      {interactive ? (
        <div className="absolute bottom-3 left-3 right-3 z-[400] bg-indigo-600/95 text-white py-2 px-3 rounded-2xl text-[10px] font-bold shadow-md flex items-center justify-between gap-2 backdrop-blur-xs animate-bounce">
          <div className="flex items-center gap-1.5">
            <span className="p-1 bg-white/10 rounded-lg">🎯</span>
            <span>Tap map or drag the pin to place your shop location</span>
          </div>
        </div>
      ) : (
        <div className="absolute bottom-3 right-3 z-[400] flex gap-2">
          {/* Quick driving direction button */}
          <button
            type="button"
            onClick={handleNavigate}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 border border-indigo-500 text-white font-black text-xs px-3.5 py-2 rounded-2xl shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
            id="map-navigate-btn"
          >
            <Navigation size={12} className="fill-white" />
            <span>Navigate</span>
          </button>
          
          <button
            type="button"
            onClick={handleNavigate}
            className="flex items-center gap-1 bg-white hover:bg-slate-50 active:scale-95 border border-slate-200 text-slate-700 font-extrabold text-xs px-3 py-2 rounded-2xl shadow-md transition-all cursor-pointer"
            id="map-open-maps-btn"
          >
            <ExternalLink size={12} />
            <span>Open in Maps</span>
          </button>
        </div>
      )}
    </div>
  );
}
