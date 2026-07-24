export interface PermissionResult {
  granted: boolean;
  deniedPermanently?: boolean;
  message?: string;
}

/**
 * Request camera permission JIT (Just-In-Time) when user explicitly taps "Add Photo" or "Open Camera".
 * Never called on app startup or background resume.
 */
export async function requestCameraPermissionJIT(): Promise<PermissionResult> {
  // Web platform: permission requested by browser automatically on input file picker trigger
  return { granted: true };
}

/**
 * Request location permission JIT (Just-In-Time) when user explicitly taps "Use Current Location" or "My GPS".
 * Never called on app startup or background resume.
 */
export async function requestLocationPermissionJIT(): Promise<{
  granted: boolean;
  coords?: { lat: number; lng: number };
  message?: string;
  canOpenSettings?: boolean;
}> {
  // Web browser fallback
  return new Promise((resolve) => {
    // Detect iframe preview limitation
    const isIframe = typeof window !== "undefined" && window.self !== window.top;
    if (isIframe) {
      resolve({
        granted: false,
        message: "Current GPS location is unavailable in Preview iframe. Please test on a real mobile device or select location on the map."
      });
      return;
    }

    if (!navigator.geolocation) {
      resolve({
        granted: false,
        message: "Geolocation is not supported by your browser."
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          granted: true,
          coords: {
            lat: parseFloat(position.coords.latitude.toFixed(6)),
            lng: parseFloat(position.coords.longitude.toFixed(6))
          }
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          resolve({
            granted: false,
            canOpenSettings: true,
            message: "Location permission was denied. Please allow location access in browser/device settings to use GPS pinpointing."
          });
        } else {
          resolve({
            granted: false,
            message: "Could not fetch GPS coordinates. You can still select your state & district manually or drop a pin on the map."
          });
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  });
}
