export interface LatLng {
  lat: number;
  lng: number;
}

const DISTRICT_COORDINATES: Record<string, LatLng> = {
  // Delhi
  "new delhi": { lat: 28.6139, lng: 77.2090 },
  "north delhi": { lat: 28.7041, lng: 77.1025 },
  "south delhi": { lat: 28.5300, lng: 77.2628 },
  "east delhi": { lat: 28.6304, lng: 77.2921 },
  "west delhi": { lat: 28.6675, lng: 77.1250 },
  "dwarka": { lat: 28.5889, lng: 77.0578 },
  "rohini": { lat: 28.7455, lng: 77.1149 },
  "connaught place": { lat: 28.6304, lng: 77.2177 },

  // Maharashtra
  "mumbai": { lat: 19.0760, lng: 72.8777 },
  "pune": { lat: 18.5204, lng: 73.8567 },
  "nagpur": { lat: 21.1458, lng: 79.0882 },
  "thane": { lat: 19.2183, lng: 72.9781 },
  "nashik": { lat: 19.9975, lng: 73.7898 },
  "navi mumbai": { lat: 19.0330, lng: 73.0297 },
  "aurangabad": { lat: 19.8762, lng: 75.3433 },
  "solapur": { lat: 17.6599, lng: 75.9064 },
  "kolhapur": { lat: 16.7050, lng: 74.2433 },

  // Karnataka
  "bengaluru": { lat: 12.9716, lng: 77.5946 },
  "mysuru": { lat: 12.2958, lng: 76.6394 },
  "mangaluru": { lat: 12.9141, lng: 74.8560 },
  "hubballi-dharwad": { lat: 15.3647, lng: 75.1240 },
  "belagavi": { lat: 15.8497, lng: 74.4977 },

  // Tamil Nadu
  "chennai": { lat: 13.0827, lng: 80.2707 },
  "coimbatore": { lat: 11.0168, lng: 76.9558 },
  "madurai": { lat: 9.9252, lng: 78.1198 },
  "trichy": { lat: 10.7905, lng: 78.7047 },
  "salem": { lat: 11.6643, lng: 78.1460 },

  // Telangana
  "hyderabad": { lat: 17.3850, lng: 78.4867 },
  "warangal": { lat: 17.9689, lng: 79.5941 },
  "nizamabad": { lat: 18.6725, lng: 78.0941 },

  // Gujarat
  "ahmedabad": { lat: 23.0225, lng: 72.5714 },
  "surat": { lat: 21.1702, lng: 72.8311 },
  "vadodara": { lat: 22.3072, lng: 73.1812 },
  "rajkot": { lat: 22.3039, lng: 70.8022 },
  "gandhinagar": { lat: 23.2156, lng: 72.6369 },

  // West Bengal
  "kolkata": { lat: 22.5726, lng: 88.3639 },
  "howrah": { lat: 22.5958, lng: 88.2636 },
  "darjeeling": { lat: 27.0410, lng: 88.2627 },
  "siliguri": { lat: 26.7271, lng: 88.3953 },

  // Uttar Pradesh
  "lucknow": { lat: 26.8467, lng: 80.9462 },
  "kanpur": { lat: 26.4499, lng: 80.3319 },
  "noida": { lat: 28.5355, lng: 77.3910 },
  "ghaziabad": { lat: 28.6692, lng: 77.4538 },
  "agra": { lat: 27.1767, lng: 78.0081 },
  "varanasi": { lat: 25.3176, lng: 82.9739 },

  // Kerala
  "kochi": { lat: 9.9312, lng: 76.2673 },
  "thiruvananthapuram": { lat: 8.5241, lng: 76.9366 },
  "kozhikode": { lat: 11.2588, lng: 75.7804 },

  // Rajasthan
  "jaipur": { lat: 26.9124, lng: 75.7873 },
  "jodhpur": { lat: 26.2389, lng: 73.0243 },
  "udaipur": { lat: 24.5854, lng: 73.7125 },

  // Haryana
  "gurugram": { lat: 28.4595, lng: 77.0266 },
  "faridabad": { lat: 28.4089, lng: 77.3178 },

  // Punjab
  "ludhiana": { lat: 30.9010, lng: 75.8573 },
  "amritsar": { lat: 31.6340, lng: 74.8723 },

  // Bihar
  "patna": { lat: 25.5941, lng: 85.1376 },

  // Madhya Pradesh
  "indore": { lat: 22.7196, lng: 75.8577 },
  "bhopal": { lat: 23.2599, lng: 77.4126 },

  // Andhra Pradesh
  "visakhapatnam": { lat: 17.6868, lng: 83.2185 },

  // Assam
  "guwahati": { lat: 26.1445, lng: 91.7362 }
};

const STATE_COORDINATES: Record<string, LatLng> = {
  "andhra pradesh": { lat: 15.9129, lng: 79.7400 },
  "assam": { lat: 26.2006, lng: 92.9376 },
  "bihar": { lat: 25.0961, lng: 85.3131 },
  "delhi": { lat: 28.7041, lng: 77.1025 },
  "gujarat": { lat: 22.2587, lng: 71.1924 },
  "haryana": { lat: 29.0588, lng: 76.0856 },
  "karnataka": { lat: 15.3173, lng: 75.7139 },
  "kerala": { lat: 10.8505, lng: 76.2711 },
  "madhya pradesh": { lat: 22.9734, lng: 78.6569 },
  "maharashtra": { lat: 19.7515, lng: 75.7139 },
  "punjab": { lat: 31.1471, lng: 75.3412 },
  "rajasthan": { lat: 27.0238, lng: 74.2179 },
  "tamil nadu": { lat: 11.1271, lng: 78.6569 },
  "telangana": { lat: 18.1124, lng: 79.0193 },
  "uttar pradesh": { lat: 26.8467, lng: 80.9462 },
  "west bengal": { lat: 22.9868, lng: 87.8550 }
};

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

export function findNearestStateAndDistrict(lat: number, lng: number): { state: string; district: string } {
  let closestDistrictName = "New Delhi";
  let minDistDist = Infinity;

  for (const [distKey, coords] of Object.entries(DISTRICT_COORDINATES)) {
    const d = calculateDistance(lat, lng, coords.lat, coords.lng);
    if (d < minDistDist) {
      minDistDist = d;
      closestDistrictName = distKey;
    }
  }

  let closestStateName = "Delhi";
  let minStateDist = Infinity;

  for (const [stateKey, coords] of Object.entries(STATE_COORDINATES)) {
    const d = calculateDistance(lat, lng, coords.lat, coords.lng);
    if (d < minStateDist) {
      minStateDist = d;
      closestStateName = stateKey;
    }
  }

  // Capitalize nicely
  const capitalize = (str: string) => str.replace(/\b\w/g, l => l.toUpperCase());
  return {
    state: capitalize(closestStateName),
    district: capitalize(closestDistrictName)
  };
}

export async function detectUserLocationWithReverseGeocode(allStatesAndDistricts: { state: string; districts: string[] }[]): Promise<{ state: string; district: string; lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        try {
          // Attempt Nominatim reverse geocode with a timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);

          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`,
            { signal: controller.signal }
          );
          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            const addr = data?.address || {};

            const rawState = addr.state || addr.region || addr.territory || "";
            const rawDistrict = addr.state_district || addr.county || addr.city || addr.district || addr.town || addr.suburb || "";

            // Match state in allStatesAndDistricts
            let matchedState = allStatesAndDistricts.find(
              s => rawState.toLowerCase().includes(s.state.toLowerCase()) || s.state.toLowerCase().includes(rawState.toLowerCase())
            );

            if (matchedState) {
              let matchedDistrict = matchedState.districts.find(
                d => rawDistrict.toLowerCase().includes(d.toLowerCase()) || d.toLowerCase().includes(rawDistrict.toLowerCase())
              );

              resolve({
                state: matchedState.state,
                district: matchedDistrict || matchedState.districts[0] || "All Districts",
                lat,
                lng
              });
              return;
            }
          }
        } catch (e) {
          // Fallback to geometric distance matching if Nominatim fails or times out
        }

        // Geometric distance fallback
        const nearest = findNearestStateAndDistrict(lat, lng);
        let stateObj = allStatesAndDistricts.find(s => s.state.toLowerCase() === nearest.state.toLowerCase());
        if (!stateObj) {
          stateObj = allStatesAndDistricts.find(s => s.state.toLowerCase().includes(nearest.state.toLowerCase()));
        }

        const stateName = stateObj ? stateObj.state : "Delhi";
        let districtName = "All Districts";
        if (stateObj) {
          const foundDist = stateObj.districts.find(d => d.toLowerCase() === nearest.district.toLowerCase() || d.toLowerCase().includes(nearest.district.toLowerCase()));
          if (foundDist) districtName = foundDist;
        }

        resolve({
          state: stateName,
          district: districtName,
          lat,
          lng
        });
      },
      (err) => {
        reject(err);
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  });
}

export function getApproxCoordinates(state?: string, district?: string): LatLng {
  const normDistrict = district?.toLowerCase().trim();
  const normState = state?.toLowerCase().trim();

  if (normDistrict && DISTRICT_COORDINATES[normDistrict]) {
    return DISTRICT_COORDINATES[normDistrict];
  }

  if (normState && STATE_COORDINATES[normState]) {
    return STATE_COORDINATES[normState];
  }

  // Fallback to New Delhi center
  return { lat: 28.6139, lng: 77.2090 };
}
