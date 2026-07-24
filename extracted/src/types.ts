export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  state?: string;
  district?: string;
  lat?: number;
  lng?: number;
  createdAt?: string;
  emailVerified?: boolean;
  isBlocked?: boolean;
  isSuperAdmin?: boolean;
  isAdmin?: boolean;
  role?: string;
  profilePhoto?: string;
  online?: boolean;
  lastSeen?: number;
}

export interface SparePart {
  id: string;
  title: string;
  description: string;
  price: number;
  carBrand: string; // e.g. "Maruti Suzuki"
  carModel: string; // e.g. "Swift"
  carVariant?: string; // e.g. "VXi"
  category: string; // e.g. "Engine Components"
  partName?: string; // e.g. "Pistons"
  condition: "Brand New" | "Like New" | "Used (Good)" | "For Scrap/Spares";
  location: string; // e.g. "Mumbai" (fallback/legacy or formatted)
  state?: string;   // e.g. "Maharashtra"
  district?: string; // e.g. "Mumbai"
  lat?: number;
  lng?: number;
  contactName: string;
  contactPhone: string;
  imageUrl: string;
  imageUrls?: string[];
  imagePublicIds?: string[];
  sellerId: string;
  sellerEmail: string;
  sold?: boolean;
  featured?: boolean;
  verified?: boolean;
  approved?: boolean;
  status?: "pending" | "approved" | "rejected";
  isDeleted?: boolean;
  reported?: boolean;
  isDemo?: boolean;
  createdAt: number;
}

export const INDIAN_CAR_BRANDS: Record<string, string[]> = {
  "Maruti Suzuki": [
    "Swift", "Baleno", "Alto", "Brezza", "Dzire", "Ertiga", "WagonR", "Celerio", 
    "Ignis", "Fronx", "Grand Vitara", "Jimny", "XL6", "Ciaz", "S-Presso", "Eeco", 
    "Ritz", "SX4", "Zen", "Esteem"
  ],
  "Hyundai": [
    "i20", "Creta", "i10 Grand Nios", "Verna", "Venue", "Exter", "Alcazar", 
    "Tucson", "Santro", "Eon", "Elantra", "Santa Fe"
  ],
  "Tata": [
    "Nexon", "Punch", "Altroz", "Tiago", "Tigor", "Harrier", "Safari", "Curvv", 
    "Indica", "Indigo", "Sumo", "Bolt", "Zest"
  ],
  "Mahindra": [
    "Scorpio-N", "Scorpio Classic", "XUV700", "Thar", "Bolero", "Bolero Neo", 
    "XUV300", "XUV400", "XUV500", "TUV300", "Marazzo", "KUV100", "Xylo"
  ],
  "Toyota": [
    "Innova Crysta", "Innova Hycross", "Fortuner", "Glanza", "Urban Cruiser Taisor", 
    "Rumion", "Camry", "Hilux", "Etios", "Liva", "Corolla Altis", "Qualis"
  ],
  "Kia": [
    "Seltos", "Sonet", "Carens", "Carnival", "EV6"
  ],
  "Honda": [
    "City", "Amaze", "Elevate", "Jazz", "WR-V", "Brio", "Civic", "Accord", "CR-V"
  ],
  "Volkswagen": [
    "Virtus", "Taigun", "Tiguan", "Polo", "Vento", "Jetta"
  ],
  "Skoda": [
    "Slavia", "Kushaq", "Kodiaq", "Rapid", "Octavia", "Superb"
  ],
  "Renault": [
    "Kwid", "Triber", "Kiger", "Duster", "Lodgy", "Pulse"
  ],
  "Nissan": [
    "Magnite", "Sunny", "Micra", "Terrano"
  ],
  "MG (Morris Garages)": [
    "Hector", "Astor", "ZS EV", "Comet EV", "Gloster"
  ],
  "Ford": [
    "EcoSport", "Endeavour", "Figo", "Aspire", "Freestyle", "Ikon", "Fiesta"
  ],
  "Jeep": [
    "Compass", "Meridian", "Wrangler", "Grand Cherokee"
  ],
  "Force Motors": [
    "Gurkha", "Trax", "Traveller", "Force One"
  ],
  "Isuzu": [
    "D-Max", "V-Cross", "MU-X", "hi-lander"
  ],
  "BMW": [
    "3 Series", "5 Series", "7 Series", "X1", "X3", "X5", "X7", "M3", "M5"
  ],
  "Mercedes-Benz": [
    "C-Class", "E-Class", "S-Class", "GLA", "GLC", "GLE", "GLS", "G-Wagon"
  ],
  "Audi": [
    "A4", "A6", "A8", "Q3", "Q5", "Q7", "Q8", "e-tron"
  ],
  "Volvo": [
    "XC40", "XC60", "XC90", "S60", "S90"
  ],
  "Land Rover": [
    "Defender", "Range Rover Evoque", "Range Rover Sport", "Discovery", "Velar"
  ],
  "Jaguar": [
    "XE", "XF", "F-Pace", "F-Type"
  ],
  "Porsche": [
    "Macan", "Cayenne", "911", "Panamera", "Taycan"
  ]
};

export const CAR_PART_CATEGORIES = [
  "Engine & Mechanical",
  "Body & Exterior",
  "Lights & Electricals",
  "Suspension & Brakes",
  "Interior & Wheels",
  "Wiring & Harnesses"
];

export const CAR_SPARE_PARTS_BY_CATEGORY: Record<string, string[]> = {
  "Engine & Mechanical": [
    "Engine Assembly", "Gearbox/Transmission", "Alternator", "Starter Motor", "Radiator", 
    "AC Compressor", "Fuel Pump", "Turbocharger", "Cylinder Head", "Clutch Plate & Flywheel", 
    "Oil Pump", "Intercooler", "Timing Belt/Chain Kit", "Pistons & Connecting Rods"
  ],
  "Body & Exterior": [
    "Doors", "Windshield Glass", "Bonnet", "Boot Lid", "Front Bumper", 
    "Rear Bumper", "Grille", "Side Mirrors (ORVM)", "Fender", "Quarter Panel", 
    "Headlight Bracket", "Running Board", "Roof Rails", "Rear Spoiler"
  ],
  "Lights & Electricals": [
    "Headlights", "Taillights", "Fog Lights", "Indicators", "Horn", 
    "Battery", "ECU (Engine Control Unit)", "Fuse Box", "Relay Modules", 
    "Key Fob/Sensors", "Parking Sensors", "Reverse Camera", "Wiring Loom"
  ],
  "Suspension & Brakes": [
    "Shock Absorbers", "Steering Rack", "Brake Calipers", "Brake Discs & Pads", "Axle", 
    "Driveshaft", "Control Arms", "Ball Joints", "Stabilizer Link", "ABS Sensor", 
    "Master Cylinder", "Steering Column"
  ],
  "Interior & Wheels": [
    "Seats", "Dashboard Panel", "Steering Wheel", "Music System/Stereo", "Alloy Wheels", 
    "Steel Rims", "Tyres", "Floor Mats", "Power Window Switch", "Instrument Cluster", 
    "Airbag Module", "Gear Knob", "AC Vents"
  ],
  "Wiring & Harnesses": [
    "Main Wiring Harness", "Engine Harness", "Dashboard Wiring Loom", "Door Wiring Harness", 
    "Battery Cables", "Sensor Harness", "Ignition Coil Harness", "ECU Wiring Connector"
  ]
};

export const DEFAULT_MODEL_VARIANTS: Record<string, string[]> = {
  "Swift": ["LXi", "VXi", "ZXi", "ZXi+", "VXi AMT", "ZXi AMT", "ZXi+ AMT", "CNG VXi", "CNG ZXi"],
  "Baleno": ["Sigma", "Delta", "Zeta", "Alpha", "Delta AMT", "Zeta AMT", "Alpha AMT", "CNG Delta"],
  "Brezza": ["LXi", "VXi", "ZXi", "ZXi+", "VXi AT", "ZXi AT", "ZXi+ AT", "CNG VXi"],
  "Dzire": ["LXi", "VXi", "ZXi", "ZXi+", "VXi AMT", "ZXi AMT", "CNG VXi"],
  "Creta": ["E", "EX", "S", "S(O)", "SX", "SX Tech", "SX(O)", "1.5 Turbo DCT", "1.5 Diesel AT"],
  "i20": ["Era", "Magna", "Sportz", "Asta", "Asta (O)", "N Line N6", "N Line N8"],
  "Venue": ["E", "S", "S+", "S(O)", "SX", "SX(O)", "N Line N6", "N Line N8"],
  "Nexon": ["Smart", "Smart+", "Pure", "Creative", "Creative+", "Fearless", "Fearless+", "EV Empowered"],
  "Punch": ["Pure", "Adventure", "Accomplished", "Creative", "CNG Pure", "CNG Adventure"],
  "Harrier": ["Smart", "Pure", "Adventure", "Fearless", "Dark Edition"],
  "Safari": ["Smart", "Pure", "Adventure", "Accomplished", "Dark Edition"],
  "Scorpio-N": ["Z2", "Z4", "Z6", "Z8", "Z8 Select", "Z8L", "Z8L 4x4 MT", "Z8L 4x4 AT"],
  "Thar": ["AX(O) Convertible", "AX(O) Hard Top", "LX Hard Top 4x4 Petrol", "LX Hard Top 4x4 Diesel", "RWD Diesel"],
  "XUV700": ["MX", "AX3", "AX5", "AX7", "AX7 Luxury Pack", "AX7L AWD"],
  "Bolero": ["B4", "B6", "B6(O)"],
  "Fortuner": ["2.7 Petrol MT", "2.7 Petrol AT", "2.8 Diesel 4x2 MT", "2.8 Diesel 4x2 AT", "2.8 Diesel 4x4 MT", "2.8 Diesel 4x4 AT", "Legender 4x2 AT", "Legender 4x4 AT"],
  "Innova Crysta": ["GX 7STR", "GX 8STR", "VX 7STR", "ZX 7STR", "GX+"],
  "City": ["SV", "V", "VX", "ZX", "e:HEV Hybrid"],
  "Amaze": ["E", "S", "VX", "VX CVT"],
  "Seltos": ["HTE", "HTK", "HTK+", "HTX", "HTX+", "GTX+", "X-Line"],
  "Sonet": ["HTE", "HTK", "HTK+", "HTX", "HTX+", "GTX+", "X-Line"],
  "Virtus": ["Highline", "Topline", "GT", "GT Plus"],
  "Polo": ["Trendline", "Comfortline", "Highline", "Highline Plus", "GT TSI"],
  "Slavia": ["Active", "Ambition", "Style", "Monte Carlo"]
};

export const POPULAR_LOCATIONS = [
  "All India",
  "Mumbai",
  "Delhi NCR",
  "Bangalore",
  "Chennai",
  "Hyderabad",
  "Pune",
  "Kolkata",
  "Ahmedabad",
  "Kochi"
];

export interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: number;
  status?: "pending" | "sent" | "delivered" | "read" | "failed";
  imageUrl?: string;
  senderName?: string;
  senderAvatar?: string;
}

export interface Chat {
  id: string;
  partId: string;
  partTitle: string;
  partImageUrl: string;
  partPrice: number;
  buyerId: string;
  buyerName: string;
  buyerPhoto?: string;
  sellerId: string;
  sellerName: string;
  sellerPhoto?: string;
  lastMessageText: string;
  lastMessageAt: number;
  lastSenderId?: string;
  lastMessage?: string;
  updatedAt?: number;
}

export interface SellerReview {
  id: string;
  sellerId: string;
  buyerId: string;
  buyerName: string;
  rating: number; // 1-5
  comment: string;
  partId?: string;
  partTitle?: string;
  createdAt: number;
}

export interface Notification {
  id: string; // `${chatId}_${recipientId}`
  chatId: string;
  recipientId: string;
  senderId: string;
  text: string;
  createdAt: number;
  read: boolean;
  partTitle: string;
  partPrice: number;
  partImageUrl: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
}

export interface AppVersionConfig {
  latestVersion: string;
  minimumSupportedVersion: string;
  forceUpdate: boolean;
  apkDownloadUrl: string;
  releaseNotes: string;
  releaseDate: string;
}


