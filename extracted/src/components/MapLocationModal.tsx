import React, { useState } from "react";
import { X, MapPin, Check, Compass, Locate, RefreshCw, Settings } from "lucide-react";
import GMap from "./GMap";
import { requestLocationPermissionJIT } from "../utils/permissionUtils";

interface MapLocationModalProps {
  initialLat?: number;
  initialLng?: number;
  state?: string;
  district?: string;
  onConfirm: (lat: number, lng: number) => void;
  onClose: () => void;
}

export default function MapLocationModal({
  initialLat,
  initialLng,
  state,
  district,
  onConfirm,
  onClose
}: MapLocationModalProps) {
  const [selectedLat, setSelectedLat] = useState<number>(initialLat || 28.6139);
  const [selectedLng, setSelectedLng] = useState<number>(initialLng || 77.2090);
  const [hasSelected, setHasSelected] = useState<boolean>(
    Boolean(initialLat && initialLng && initialLat !== 0 && initialLng !== 0)
  );
  const [error, setError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const handleLocationSelect = (lat: number, lng: number) => {
    setSelectedLat(lat);
    setSelectedLng(lng);
    setHasSelected(true);
    setError(null);
  };

  const handleUseCurrentLocation = async () => {
    setError(null);
    setIsLocating(true);

    try {
      const res = await requestLocationPermissionJIT();
      if (res.granted && res.coords) {
        setSelectedLat(res.coords.lat);
        setSelectedLng(res.coords.lng);
        setHasSelected(true);
      } else {
        setError(res.message || "Location permission was denied or unavailable.");
      }
    } catch (e: any) {
      console.error("GPS location request error:", e);
      setError("Unable to obtain GPS location. Please try again or tap directly on the map.");
    } finally {
      setIsLocating(false);
    }
  };

  const handleSave = () => {
    onConfirm(selectedLat, selectedLng);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" id="map-picker-modal">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <MapPin size={16} />
            </span>
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider">Select Location</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Drop a pin on your approximate location</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
            id="close-map-picker-modal-btn"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Content - Map Container */}
        <div className="p-4 flex-1 flex flex-col space-y-4">
          
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex-1 min-h-[280px]">
            <GMap
              lat={selectedLat}
              lng={selectedLng}
              state={state}
              district={district}
              interactive={true}
              onLocationSelect={handleLocationSelect}
              height="100%"
              className="absolute inset-0"
            />
          </div>

          {/* Location details and GPS controls */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-3">
            {error && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/25 rounded-xl text-[10px] text-rose-400 font-medium leading-relaxed">
                {error}
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-slate-300 font-mono text-[10px]">
                <Compass size={13} className="text-indigo-400 animate-spin-slow" />
                <span className="font-extrabold text-slate-400">COORDINATES:</span>
                <span>{typeof selectedLat === "number" ? selectedLat.toFixed(5) : "0.00000"}, {typeof selectedLng === "number" ? selectedLng.toFixed(5) : "0.00000"}</span>
              </div>
              
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 border border-indigo-500/80 px-2.5 py-1 rounded-xl text-[9px] text-white font-bold transition-all cursor-pointer shadow-xs"
                id="gps-locate-btn"
              >
                {isLocating ? (
                  <RefreshCw size={10} className="animate-spin" />
                ) : (
                  <Locate size={10} />
                )}
                <span>{isLocating ? "Getting GPS..." : "My GPS"}</span>
              </button>
            </div>

            <div className="text-[10px] text-slate-400 flex items-start gap-1 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/40">
              <span className="text-indigo-400 font-bold mt-0.5">Note:</span>
              <span>
                {hasSelected
                  ? "Coordinates configured perfectly! You can move the pin at any time by clicking on different areas of the grid/map."
                  : `Currently centered on ${district || state || "your state"}. Click on the map grid to select your precise shop/listing pin!`}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-4 border-t border-slate-800 bg-slate-950/40 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2.5 rounded-2xl text-xs text-slate-300 font-bold transition-all cursor-pointer"
            id="cancel-map-picker-btn"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 text-white px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/10 cursor-pointer"
            id="confirm-map-picker-btn"
          >
            <Check size={14} />
            Confirm Pin
          </button>
        </div>

      </div>
    </div>
  );
}
