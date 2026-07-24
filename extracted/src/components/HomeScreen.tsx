import React, { useState } from "react";
import { 
  Search, 
  MapPin, 
  Filter, 
  Phone, 
  MessageSquare, 
  Calendar, 
  Car, 
  Compass, 
  X, 
  Tag, 
  ChevronRight, 
  ChevronLeft,
  ChevronDown,
  Sparkles,
  Info,
  Layers,
  Heart,
  SlidersHorizontal,
  Plus,
  Maximize2,
  Star,
  ArrowLeft,
  Share2,
  AlertCircle,
  Image as ImageIcon,
  Zap,
  Wind,
  Disc,
  ShieldCheck,
  Flame,
  Grid,
  Settings,
  CircleDot,
  CheckCircle2,
  Check
} from "lucide-react";
import { SparePart, INDIAN_CAR_BRANDS, CAR_PART_CATEGORIES, CAR_SPARE_PARTS_BY_CATEGORY, POPULAR_LOCATIONS, User } from "../types";
import { INDIAN_STATES_AND_DISTRICTS } from "../data/indianLocations";
import { motion, AnimatePresence } from "motion/react";
import ImageGalleryModal from "./ImageGalleryModal";
import { fetchSellerReviews, deleteSparePartListing, updateSparePartListing } from "../lib/firebase";
import SellerProfileView from "./SellerProfileView";
import EditListingModal from "./EditListingModal";
import { useLanguage } from "../lib/LanguageContext";
import { translateDynamic } from "../lib/translations";
import LanguageSelector from "./LanguageSelector";
import GMap from "./GMap";
import BrandLogo from "./BrandLogo";

// No fallback categories helper is needed as we only display real uploaded images.

import { detectUserLocationWithReverseGeocode } from "../utils/locationHelper";
import { requestLocationPermissionJIT } from "../utils/permissionUtils";

function getCategoryIcon(catName: string) {
  const lower = catName.toLowerCase();
  if (lower.includes("engine")) return <Layers size={18} className="text-amber-500" />;
  if (lower.includes("suspension")) return <SlidersHorizontal size={18} className="text-blue-500" />;
  if (lower.includes("brake")) return <Disc size={18} className="text-rose-500" />;
  if (lower.includes("electric")) return <Zap size={18} className="text-yellow-500" />;
  if (lower.includes("body")) return <Car size={18} className="text-emerald-500" />;
  if (lower.includes("light")) return <Sparkles size={18} className="text-indigo-500" />;
  if (lower.includes("interior") || lower.includes("wheel")) return <CircleDot size={18} className="text-cyan-500" />;
  if (lower.includes("ac") || lower.includes("air")) return <Wind size={18} className="text-sky-500" />;
  if (lower.includes("transmission")) return <Settings size={18} className="text-purple-500" />;
  return <Grid size={18} className="text-blue-600" />;
}

interface HomeScreenProps {
  parts: SparePart[];
  onFavoriteToggle?: (partId: string) => void;
  favorites: string[];
  onStartChat?: (part: SparePart) => void;
  currentUser: User | null;
}

export default function HomeScreen({ parts, onFavoriteToggle, favorites, onStartChat, currentUser }: HomeScreenProps) {
  const { t, language } = useLanguage();
  const [categories, setCategories] = React.useState<string[]>(CAR_PART_CATEGORIES);
  const [brands, setBrands] = React.useState<Record<string, string[]>>(INDIAN_CAR_BRANDS);

  React.useEffect(() => {
    const loadDynamicMeta = async () => {
      const { fetchFullTaxonomyConfig } = await import("../lib/firebase");
      try {
        const config = await fetchFullTaxonomyConfig();
        if (config.categories?.length) setCategories(config.categories);
        if (Object.keys(config.brands || {}).length) setBrands(config.brands);
      } catch (e) {
        console.warn("Failed to load catalog metadata in HomeScreen:", e);
      }
    };
    loadDynamicMeta();

    window.addEventListener("config_updated", loadDynamicMeta);
    return () => {
      window.removeEventListener("config_updated", loadDynamicMeta);
    };
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("All Brands");
  const [selectedModel, setSelectedModel] = useState("All Models");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedPartName, setSelectedPartName] = useState("All Parts");
  const [selectedState, setSelectedState] = useState(() => {
    return localStorage.getItem("autoparts_selected_state") || "All States";
  });
  const [selectedDistrict, setSelectedDistrict] = useState(() => {
    return localStorage.getItem("autoparts_selected_district") || "All Districts";
  });
  const [selectedCondition, setSelectedCondition] = useState("All Conditions");
  const [selectedPart, setSelectedPart] = useState<SparePart | null>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [detailImageIndex, setDetailImageIndex] = useState(0);

  // Viewer Location Detection State
  const [userDetectedState, setUserDetectedState] = useState<string | null>(null);
  const [userDetectedDistrict, setUserDetectedDistrict] = useState<string | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationDetectError, setLocationDetectError] = useState<string | null>(null);

  // Load saved state/district preference on mount (without automatic GPS prompt)
  React.useEffect(() => {
    const savedState = localStorage.getItem("autoparts_selected_state");
    const savedDistrict = localStorage.getItem("autoparts_selected_district");

    if (savedState) {
      setSelectedState(savedState);
      if (savedDistrict) setSelectedDistrict(savedDistrict);
    }
  }, []);

  const handleDetectLocationClick = async () => {
    setIsDetectingLocation(true);
    setLocationDetectError(null);
    try {
      const permRes = await requestLocationPermissionJIT();
      if (!permRes.granted) {
        setLocationDetectError(permRes.message || "Location access was denied. You can still select your State & District manually.");
        setIsDetectingLocation(false);
        return;
      }

      const res = await detectUserLocationWithReverseGeocode(INDIAN_STATES_AND_DISTRICTS);
      setUserDetectedState(res.state);
      setUserDetectedDistrict(res.district);
      setSelectedState(res.state);
      setSelectedDistrict(res.district || "All Districts");
      localStorage.setItem("autoparts_selected_state", res.state);
      localStorage.setItem("autoparts_selected_district", res.district || "All Districts");
      setShowLocationModal(false);
    } catch (err: any) {
      setLocationDetectError(err.message || "Could not detect location. Please select state manually.");
    } finally {
      setIsDetectingLocation(false);
    }
  };
  
  // Local state for editing and deleting own listing
  const [editingPart, setEditingPart] = useState<SparePart | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleSaveListingChanges = async (partId: string, updates: Partial<SparePart>) => {
    try {
      const ok = await updateSparePartListing(partId, updates);
      if (ok) {
        setEditingPart(null);
        setSelectedPart(prev => prev && prev.id === partId ? { ...prev, ...updates } : prev);
      }
    } catch (err: any) {
      setDeleteError(err.message || "Failed to update listing.");
    }
  };
  
  // Local state for toggling advanced filters drawer
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  // Home screen location selector state
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locSearchQuery, setLocSearchQuery] = useState("");
  const [locActiveState, setLocActiveState] = useState<string | null>(null);

  // Seller Rating & Reviews states
  const [sellerRating, setSellerRating] = useState<{ average: number; count: number } | null>(null);
  const [showReviews, setShowReviews] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);

  // Recently Viewed Parts state
  const [recentlyViewed, setRecentlyViewed] = useState<SparePart[]>([]);

  React.useEffect(() => {
    if (selectedPart) {
      try {
        const stored = localStorage.getItem("autoparts_recently_viewed_ids") || "[]";
        let ids: string[] = JSON.parse(stored);
        ids = [selectedPart.id, ...ids.filter(id => id !== selectedPart.id)].slice(0, 8);
        localStorage.setItem("autoparts_recently_viewed_ids", JSON.stringify(ids));
      } catch (e) {
        console.warn("Failed to store recently viewed part ID:", e);
      }
    }
  }, [selectedPart]);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("autoparts_recently_viewed_ids") || "[]";
      const ids: string[] = JSON.parse(stored);
      if (ids.length > 0 && parts.length > 0) {
        const matched = ids.map(id => parts.find(p => p.id === id)).filter((p): p is SparePart => p !== undefined);
        setRecentlyViewed(matched);
      }
    } catch (e) {
      // ignore error
    }
  }, [parts]);

  // Carousel Promotional Banner State & Config
  const [activeBanner, setActiveBanner] = useState(0);
  const promoBanners = React.useMemo(() => [
    {
      title: "100% OEM & Quality Spare Parts",
      subtitle: "Verified by top mechanics & dismantling hubs",
      tag: "Verified Marketplace",
      badgeBg: "bg-blue-500/20 text-blue-300 border-blue-400/30",
      bgGradient: "from-[#0B1A30] via-[#102444] to-[#1E293B]",
      icon: ShieldCheck
    },
    {
      title: "Direct Mechanic & Seller Connect",
      subtitle: "Call or chat instantly with sellers in your state & district",
      tag: "Direct Deals",
      badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
      bgGradient: "from-[#0F172A] via-[#112F2A] to-[#1E293B]",
      icon: Phone
    },
    {
      title: "Engine, Brakes & Electrical Parts",
      subtitle: "Filter by car brand, model year & condition across India",
      tag: "Precision Search",
      badgeBg: "bg-amber-500/20 text-amber-300 border-amber-400/30",
      bgGradient: "from-[#1E1B4B] via-[#2E1065] to-[#0F172A]",
      icon: Sparkles
    }
  ], []);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setActiveBanner((prev) => (prev + 1) % promoBanners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [promoBanners.length]);

  // Compute Top Verified Sellers
  const topSellers = React.useMemo(() => {
    const map = new Map<string, { sellerId: string; sellerName: string; location: string; count: number; sampleImage?: string }>();
    parts.forEach(p => {
      if (!p.contactName) return;
      const key = p.sellerId || p.contactName;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        if (!existing.sampleImage && p.imageUrl) existing.sampleImage = p.imageUrl;
      } else {
        map.set(key, {
          sellerId: key,
          sellerName: p.contactName,
          location: p.district || p.location || "India",
          count: 1,
          sampleImage: p.imageUrl
        });
      }
    });
    return Array.from(map.values()).slice(0, 6);
  }, [parts]);

  React.useEffect(() => {
    const updateRating = () => {
      const sId = selectedPart?.sellerId;
      if (sId) {
        fetchSellerReviews(sId).then((revs) => {
          const count = revs.length;
          const average = count > 0 
            ? parseFloat((revs.reduce((sum, r) => sum + r.rating, 0) / count).toFixed(1))
            : 0;
          setSellerRating({ average, count });
        });
      } else {
        setSellerRating(null);
      }
    };

    updateRating();
    setDetailImageIndex(0);
    window.addEventListener("autoparts_reviews_updated", updateRating);
    window.addEventListener("storage", updateRating);
    return () => {
      window.removeEventListener("autoparts_reviews_updated", updateRating);
      window.removeEventListener("storage", updateRating);
    };
  }, [selectedPart]);

  // Flat list of all spare part names, brands, and models for suggestions and search
  const ALL_SPARE_PART_NAMES = React.useMemo(() => Object.values(CAR_SPARE_PARTS_BY_CATEGORY).flat(), []);
  const ALL_BRANDS = React.useMemo(() => Object.keys(brands), [brands]);
  const ALL_MODELS = React.useMemo(() => Object.values(brands).flat() as string[], [brands]);

  // Search and Multi-tier Fallback Filter Logic
  const activeParts = React.useMemo(() => {
    return parts.filter((part) => {
      const isSold = part.sold === true;
      const isExpired = (Date.now() - part.createdAt) > 90 * 24 * 60 * 60 * 1000;
      return !isSold && !isExpired;
    });
  }, [parts]);

  const { finalFilteredParts, fallbackBanner } = React.useMemo(() => {
    if (activeParts.length === 0) {
      return { finalFilteredParts: [], fallbackBanner: null };
    }

    const query = (searchQuery || "").trim().toLowerCase();

    const matchesFilterProps = (
      part: SparePart,
      opts: {
        checkQuery?: boolean;
        checkSpecifics?: boolean;
        checkState?: boolean;
        checkDistrict?: boolean;
      }
    ) => {
      const { checkQuery = true, checkSpecifics = true, checkState = true, checkDistrict = true } = opts;

      if (checkQuery && query) {
        const title = (part.title || "").toLowerCase();
        const description = (part.description || "").toLowerCase();
        const carModel = (part.carModel || "").toLowerCase();
        const carBrand = (part.carBrand || "").toLowerCase();
        const category = (part.category || "").toLowerCase();
        const partName = (part.partName || "").toLowerCase();
        const state = (part.state || "").toLowerCase();
        const district = (part.district || "").toLowerCase();
        const location = (part.location || "").toLowerCase();

        const match =
          title.includes(query) ||
          description.includes(query) ||
          carModel.includes(query) ||
          carBrand.includes(query) ||
          category.includes(query) ||
          partName.includes(query) ||
          state.includes(query) ||
          district.includes(query) ||
          location.includes(query);

        if (!match) return false;
      }

      if (checkSpecifics) {
        if (selectedBrand !== "All Brands" && part.carBrand !== selectedBrand) return false;
        if (selectedModel !== "All Models" && part.carModel !== selectedModel) return false;
        if (selectedCategory !== "All Categories" && part.category !== selectedCategory) return false;
        if (
          selectedPartName !== "All Parts" &&
          part.partName !== selectedPartName &&
          !part.title?.toLowerCase().includes(selectedPartName.toLowerCase())
        ) return false;
        if (selectedCondition !== "All Conditions" && part.condition !== selectedCondition) return false;
      }

      if (checkState && selectedState !== "All States" && selectedState !== "All India") {
        const matchesStateField =
          part.state === selectedState ||
          (!part.state && part.location?.toLowerCase().includes(selectedState.toLowerCase()));

        if (!matchesStateField) return false;

        if (checkDistrict && selectedDistrict !== "All Districts") {
          const matchesDistField =
            part.district === selectedDistrict ||
            (!part.district && part.location?.toLowerCase().includes(selectedDistrict.toLowerCase()));

          if (!matchesDistField) return false;
        }
      }

      return true;
    };

    // Priority 1: Exact Match (State + District + All Active Filters)
    const tier1 = activeParts.filter(p => matchesFilterProps(p, {
      checkQuery: true,
      checkSpecifics: true,
      checkState: true,
      checkDistrict: true
    }));

    if (tier1.length > 0) {
      return { finalFilteredParts: tier1, fallbackBanner: null };
    }

    // Priority 2: Same State (Ignore District) + All Active Filters
    if (selectedDistrict !== "All Districts" && selectedState !== "All States" && selectedState !== "All India") {
      const tier2 = activeParts.filter(p => matchesFilterProps(p, {
        checkQuery: true,
        checkSpecifics: true,
        checkState: true,
        checkDistrict: false
      }));

      if (tier2.length > 0) {
        return {
          finalFilteredParts: tier2,
          fallbackBanner: "No exact matches found. Showing the closest available listings."
        };
      }
    }

    // Priority 3: All India (Ignore State & District) + All Active Filters
    const tier3 = activeParts.filter(p => matchesFilterProps(p, {
      checkQuery: true,
      checkSpecifics: true,
      checkState: false,
      checkDistrict: false
    }));

    if (tier3.length > 0) {
      return {
        finalFilteredParts: tier3,
        fallbackBanner: "No exact matches found. Showing the closest available listings."
      };
    }

    // Priority 4: Relaxed Filters (Query-only if present, or all available listings across India)
    if (query) {
      const tier4QueryOnly = activeParts.filter(p => matchesFilterProps(p, {
        checkQuery: true,
        checkSpecifics: false,
        checkState: false,
        checkDistrict: false
      }));

      if (tier4QueryOnly.length > 0) {
        return {
          finalFilteredParts: tier4QueryOnly,
          fallbackBanner: "No exact matches found. Showing the closest available listings."
        };
      }
    }

    // Absolute Fallback: Never show an empty marketplace if advertisements exist anywhere
    return {
      finalFilteredParts: activeParts,
      fallbackBanner: "No exact matches found. Showing the closest available listings."
    };
  }, [
    activeParts,
    searchQuery,
    selectedBrand,
    selectedModel,
    selectedCategory,
    selectedPartName,
    selectedCondition,
    selectedState,
    selectedDistrict
  ]);

  const sortedFilteredParts = React.useMemo(() => {
    const list = [...finalFilteredParts];
    const targetDistrict = selectedDistrict !== "All Districts" ? selectedDistrict : userDetectedDistrict;
    const targetState = (selectedState !== "All States" && selectedState !== "All India") ? selectedState : userDetectedState;

    return list.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      if (targetDistrict) {
        const aDistMatch = a.district === targetDistrict || (a.location && a.location.toLowerCase().includes(targetDistrict.toLowerCase()));
        const bDistMatch = b.district === targetDistrict || (b.location && b.location.toLowerCase().includes(targetDistrict.toLowerCase()));
        if (aDistMatch) scoreA += 10;
        if (bDistMatch) scoreB += 10;
      }

      if (targetState) {
        const aStateMatch = a.state === targetState || (a.location && a.location.toLowerCase().includes(targetState.toLowerCase()));
        const bStateMatch = b.state === targetState || (b.location && b.location.toLowerCase().includes(targetState.toLowerCase()));
        if (aStateMatch) scoreA += 5;
        if (bStateMatch) scoreB += 5;
      }

      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }

      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [finalFilteredParts, selectedDistrict, userDetectedDistrict, selectedState, userDetectedState]);

  const trimmedQuery = searchQuery.trim().toLowerCase();
  
  const suggestions = React.useMemo(() => {
    const result: { text: string; type: "Part Name" | "Brand" | "Model" }[] = [];
    if (!trimmedQuery) return result;

    // Match brands
    ALL_BRANDS.forEach(brand => {
      if (brand.toLowerCase().includes(trimmedQuery) && !result.some(s => s.text === brand)) {
        result.push({ text: brand, type: "Brand" });
      }
    });
    
    // Match models
    ALL_MODELS.forEach(model => {
      if (model.toLowerCase().includes(trimmedQuery) && !result.some(s => s.text === model)) {
        result.push({ text: model, type: "Model" });
      }
    });

    // Match part names
    ALL_SPARE_PART_NAMES.forEach(name => {
      if (name.toLowerCase().includes(trimmedQuery) && !result.some(s => s.text === name)) {
        result.push({ text: name, type: "Part Name" });
      }
    });

    return result.slice(0, 10);
  }, [trimmedQuery, ALL_BRANDS, ALL_MODELS, ALL_SPARE_PART_NAMES]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(price);
  };

  const getRelativeTime = (timestamp: number) => {
    const difference = Date.now() - timestamp;
    const hours = Math.floor(difference / (3600 * 1000));
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "Brand New":
        return "bg-emerald-500 text-white border-emerald-600";
      case "Like New":
        return "bg-cyan-500 text-white border-cyan-600";
      case "Used (Good)":
        return "bg-amber-500 text-white border-amber-600";
      case "For Scrap/Spares":
        return "bg-rose-500 text-white border-rose-600";
      default:
        return "bg-slate-500 text-white border-slate-600";
    }
  };

  // Handle brand selection change to sync/reset model
  const handleBrandChange = (brand: string) => {
    setSelectedBrand(brand);
    setSelectedModel("All Models");
  };

  // Get available models based on selected brand
  const availableModels = selectedBrand !== "All Brands" ? brands[selectedBrand] || [] : [];

  return (
    <div className="flex-1 flex flex-col bg-slate-50 text-slate-900 h-full relative" id="home-screen-container">
      {/* Premium Compact Light Top Search Header */}
      <div className="bg-white border-b border-slate-200/90 text-slate-900 pt-2.5 pb-2.5 px-3.5 sticky top-0 z-20 shadow-xs">
        {/* Brand Bar */}
        <div className="flex items-center justify-between mb-2">
          <BrandLogo size="sm" variant="horizontal" theme="light" showTagline={false} />
          
          <div className="flex items-center gap-2 shrink-0">
            {/* Premium Header Verified Badge */}
            <div className="inline-flex items-center gap-1.5 bg-blue-50/90 border border-blue-200/90 px-2.5 py-1 rounded-full text-xs font-bold text-blue-900 shadow-2xs shrink-0 select-none" id="header-verified-badge">
              <div className="w-4 h-4 rounded-full bg-[#2563EB] flex items-center justify-center shrink-0 shadow-2xs">
                <Check size={10} className="text-white stroke-[3.5]" />
              </div>
              <span className="text-xs font-black text-[#1E3A8A] tracking-tight">Verified</span>
            </div>

            <LanguageSelector variant="light" />
          </div>
        </div>

        {/* Location selector bar */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <button
            onClick={() => {
              setLocSearchQuery("");
              setLocActiveState(null);
              setShowLocationModal(true);
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 rounded-full transition-all border border-slate-200/80 shadow-2xs max-w-full active:scale-95"
            id="header-location-picker-btn"
          >
            <MapPin size={13} className="text-[#2563EB] shrink-0" />
            <span className="truncate" id="selected-location-text">
              {selectedState === "All States" || selectedState === "All India"
                ? "All India"
                : selectedDistrict === "All Districts"
                  ? `${selectedState} > All`
                  : `${selectedState} > ${selectedDistrict}`}
            </span>
            <ChevronDown size={11} className="text-slate-500 shrink-0 ml-0.5" />
          </button>
        </div>

        {/* Custom Search Input & Matching Filter Button */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative h-9">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              placeholder={t("searchPlaceholder")}
              className="w-full h-9 bg-slate-100/90 border border-slate-200 rounded-xl py-1.5 pl-8 pr-8 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] focus:bg-white transition-all shadow-2xs"
              id="search-parts-input"
            />
            {searchQuery && (
              <button 
                onClick={() => {
                  setSearchQuery("");
                  setShowSuggestions(false);
                }} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-0.5"
                id="search-clear-btn"
              >
                <X size={13} />
              </button>
            )}

            {/* Auto-suggestions list */}
            {showSuggestions && suggestions.length > 0 && (
              <div 
                className="absolute left-0 right-0 mt-1.5 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-52 overflow-y-auto"
                id="search-suggestions-dropdown"
              >
                {suggestions.slice(0, 6).map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setSearchQuery(suggestion.text);
                      setShowSuggestions(false);
                      if (suggestion.type === "Brand") {
                        handleBrandChange(suggestion.text);
                      } else if (suggestion.type === "Model") {
                        const brand = Object.keys(brands).find(b => 
                          brands[b].includes(suggestion.text)
                        );
                        if (brand) {
                          setSelectedBrand(brand);
                          setSelectedModel(suggestion.text);
                        }
                      }
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-xs text-slate-800 hover:bg-slate-50 transition-colors flex items-center justify-between border-b border-slate-100 last:border-none"
                  >
                    <span className="font-semibold">{suggestion.text}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      suggestion.type === "Brand" 
                        ? "text-emerald-700 bg-emerald-50 border border-emerald-200" 
                        : suggestion.type === "Model" 
                          ? "text-sky-700 bg-sky-50 border border-sky-200" 
                          : "text-[#2563EB] bg-blue-50 border border-blue-200"
                    }`}>
                      {suggestion.type}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowFiltersModal(true)}
            className={`h-9 w-9 shrink-0 rounded-xl border flex items-center justify-center transition-all cursor-pointer relative shadow-2xs active:scale-95 ${
              selectedBrand !== "All Brands" || 
              selectedModel !== "All Models" || 
              selectedCategory !== "All Categories" || 
              selectedPartName !== "All Parts" ||
              selectedState !== "All States" ||
              selectedDistrict !== "All Districts" ||
              selectedCondition !== "All Conditions"
                ? "bg-blue-50 border-blue-200 text-[#2563EB] shadow-2xs font-bold"
                : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200/80"
            }`}
            id="filters-modal-toggle"
            title="Advanced Filters"
          >
            <Filter size={15} />
            {(selectedBrand !== "All Brands" || selectedModel !== "All Models" || selectedCategory !== "All Categories" || selectedPartName !== "All Parts" || selectedState !== "All States" || selectedDistrict !== "All Districts" || selectedCondition !== "All Conditions") && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Main Scrollable Content Container */}
      <div className="flex-1 overflow-y-auto min-h-0 pb-16 scroll-smooth" id="home-scrollable-content">
        
        {/* Category Icons Row with Horizontal Swipe */}
        <div className="bg-white border-b border-slate-200/80 py-3 px-3 shadow-2xs">
          <div className="flex items-center justify-between mb-2 px-0.5">
            <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase flex items-center gap-1">
              <Grid size={12} className="text-[#2563EB]" /> Top Categories
            </span>
            {selectedCategory !== "All Categories" && (
              <button
                onClick={() => {
                  setSelectedCategory("All Categories");
                  setSelectedPartName("All Parts");
                }}
                className="text-[10px] text-[#2563EB] font-bold hover:underline cursor-pointer"
              >
                Clear Category
              </button>
            )}
          </div>

          <div className="overflow-x-auto whitespace-nowrap flex gap-2.5 scrollbar-none snap-x snap-mandatory scroll-smooth pb-1 pt-0.5 items-center">
            {/* All Parts Tile */}
            <button
              onClick={() => {
                setSelectedCategory("All Categories");
                setSelectedPartName("All Parts");
              }}
              className={`shrink-0 flex-none snap-start flex flex-col items-center justify-between p-2 rounded-2xl w-20 h-[84px] transition-all cursor-pointer text-center border ${
                selectedCategory === "All Categories"
                  ? "bg-blue-50/70 border-blue-200 text-[#2563EB]"
                  : "bg-white border-slate-200/80 text-slate-700 hover:bg-slate-50"
              }`}
              id="category-pill-all"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                selectedCategory === "All Categories" 
                  ? "bg-blue-100/60 text-[#2563EB] border border-blue-200/60" 
                  : "bg-slate-50 text-slate-600 border border-slate-100"
              }`}>
                <Car size={20} />
              </div>
              <span className={`text-[10px] truncate w-full leading-tight ${
                selectedCategory === "All Categories" ? "font-bold text-[#2563EB]" : "font-semibold text-slate-700"
              }`}>
                All Parts
              </span>
            </button>

            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setSelectedPartName("All Parts");
                  }}
                  className={`shrink-0 flex-none snap-start flex flex-col items-center justify-between p-2 rounded-2xl w-20 h-[84px] transition-all cursor-pointer text-center border ${
                    isActive
                      ? "bg-blue-50/70 border-blue-200 text-[#2563EB]"
                      : "bg-white border-slate-200/80 text-slate-700 hover:bg-slate-50"
                  }`}
                  id={`category-pill-${cat.replace(/\s+/g, '-').toLowerCase()}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    isActive 
                      ? "bg-blue-100/60 text-[#2563EB] border border-blue-200/60" 
                      : "bg-slate-50 text-slate-600 border border-slate-100"
                  }`}>
                    {getCategoryIcon(cat)}
                  </div>
                  <span className={`text-[10px] truncate w-full leading-tight ${
                    isActive ? "font-bold text-[#2563EB]" : "font-semibold text-slate-700"
                  }`}>
                    {translateDynamic(cat, language)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Hero Promotional Banner Carousel */}
        <div className="px-3 pt-2.5 pb-1 bg-slate-50">
          <AnimatePresence mode="wait">
            {(() => {
              const currentBanner = promoBanners[activeBanner];
              const IconComp = currentBanner.icon;
              return (
                <motion.div
                  key={activeBanner}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${currentBanner.bgGradient} p-3.5 text-white shadow-xs border border-slate-800`}
                >
                  <div className="relative z-10 flex items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <span className={`text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${currentBanner.badgeBg}`}>
                        <IconComp size={10} /> {currentBanner.tag}
                      </span>
                      <h2 className="text-xs font-black text-white tracking-tight truncate">
                        {currentBanner.title}
                      </h2>
                      <p className="text-[10px] text-slate-300 font-medium truncate">
                        {currentBanner.subtitle}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <div className="w-10 h-10 rounded-2xl bg-[#2563EB] flex items-center justify-center text-white shadow-md border border-blue-400/40">
                        <Car size={20} />
                      </div>
                    </div>
                  </div>

                  {/* Indicator Dots */}
                  <div className="flex items-center gap-1.5 mt-2.5">
                    {promoBanners.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveBanner(idx)}
                        className={`h-1 rounded-full transition-all duration-300 ${
                          idx === activeBanner ? "w-5 bg-[#2563EB]" : "w-1.5 bg-white/30"
                        }`}
                      />
                    ))}
                  </div>
                </motion.div>
              );
            })()}
          </AnimatePresence>
        </div>

        {/* Quick Popular Brands Horizontal Swipe */}
        <div className="bg-white border-y border-slate-200/80 py-2 px-3 overflow-x-auto whitespace-nowrap flex gap-1.5 scrollbar-none snap-x snap-mandatory scroll-smooth items-center">
          <span className="text-[9px] text-slate-400 font-black uppercase shrink-0 mr-1 flex items-center gap-1">
            <Flame size={11} className="text-amber-500" /> Brands:
          </span>
          <button
            onClick={() => handleBrandChange("All Brands")}
            className={`shrink-0 flex-none snap-start px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
              selectedBrand === "All Brands"
                ? "bg-[#0B1A30] text-white font-black shadow-2xs"
                : "text-slate-600 hover:text-slate-900 bg-slate-100 border border-slate-200/60"
            }`}
          >
            All Brands
          </button>
          {Object.keys(brands).map((b) => (
            <button
              key={b}
              onClick={() => handleBrandChange(b)}
              className={`shrink-0 flex-none snap-start px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                selectedBrand === b
                  ? "bg-blue-50 text-[#2563EB] border border-blue-200 font-bold shadow-2xs"
                  : "text-slate-700 hover:text-slate-900 bg-slate-50 border border-slate-200/80"
              }`}
            >
              {b}
            </button>
          ))}
        </div>

        {/* Recently Viewed Row */}
        {recentlyViewed.length > 0 && (
          <div className="bg-white border-b border-slate-200/80 py-2.5 px-3 space-y-2">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase flex items-center gap-1">
                <Tag size={12} className="text-indigo-600" /> Recently Viewed
              </span>
              <button
                onClick={() => {
                  localStorage.removeItem("autoparts_recently_viewed_ids");
                  setRecentlyViewed([]);
                }}
                className="text-[9px] text-slate-400 hover:text-slate-600 font-bold"
              >
                Clear
              </button>
            </div>
            <div className="overflow-x-auto whitespace-nowrap flex gap-2 scrollbar-none pb-0.5">
              {recentlyViewed.map((part) => (
                <div
                  key={`rv-${part.id}`}
                  onClick={() => setSelectedPart(part)}
                  className="shrink-0 w-28 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden cursor-pointer hover:border-[#2563EB] transition-all p-1.5 flex flex-col justify-between"
                >
                  <div className="h-16 w-full bg-slate-900 rounded-lg overflow-hidden relative mb-1">
                    {part.imageUrl ? (
                      <img src={part.imageUrl} alt={part.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500">
                        <Car size={16} />
                      </div>
                    )}
                  </div>
                  <h5 className="text-[10px] font-bold text-slate-900 truncate leading-tight">{part.title}</h5>
                  <span className="text-[10px] font-black text-[#2563EB] font-mono mt-0.5">₹{part.price?.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Verified Sellers Row */}
        {topSellers.length > 0 && (
          <div className="bg-slate-100/70 border-b border-slate-200/80 py-2.5 px-3 space-y-2">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase flex items-center gap-1">
                <ShieldCheck size={12} className="text-emerald-600" /> Top Verified Sellers
              </span>
            </div>
            <div className="overflow-x-auto whitespace-nowrap flex gap-2 scrollbar-none">
              {topSellers.map((seller) => (
                <div
                  key={seller.sellerId}
                  onClick={() => {
                    const samplePart = parts.find(p => p.sellerId === seller.sellerId || p.contactName === seller.sellerName);
                    if (samplePart) {
                      setSelectedPart(samplePart);
                      setShowReviews(true);
                    }
                  }}
                  className="shrink-0 bg-white border border-slate-200/90 rounded-xl p-2 flex items-center gap-2 cursor-pointer hover:border-emerald-500 transition-all shadow-2xs"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-extrabold text-xs uppercase shrink-0">
                    {seller.sellerName.substring(0, 2)}
                  </div>
                  <div className="flex flex-col min-w-[90px]">
                    <span className="text-[10px] font-bold text-slate-900 truncate max-w-[100px]">{seller.sellerName}</span>
                    <span className="text-[8.5px] text-slate-500 font-medium truncate max-w-[100px] flex items-center gap-0.5">
                      <MapPin size={9} className="text-emerald-600" /> {seller.location}
                    </span>
                    <span className="text-[8px] font-black text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded w-fit mt-0.5">
                      {seller.count} Parts Listed
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Parts Feed List */}
        <div className="p-2.5 sm:p-3 space-y-2">
          {/* Fallback Notice Banner */}
          {fallbackBanner && sortedFilteredParts.length > 0 && (
            <div className="bg-amber-50 border border-amber-200/90 text-amber-900 px-3 py-1.5 rounded-xl text-xs flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-1.5">
                <Compass size={14} className="text-amber-600 shrink-0" />
                <span className="font-semibold text-[10px] leading-tight">
                  {fallbackBanner}
                </span>
              </div>
              <span className="text-[8px] font-extrabold uppercase tracking-wider bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded shrink-0">
                Closest Matches
              </span>
            </div>
          )}

          <div className="flex justify-between items-center px-0.5">
            <div className="flex flex-col">
              <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-wider">
                {selectedCategory === "All Categories" ? "RECOMMENDED PARTS" : selectedCategory.toUpperCase()}
              </h3>
              {selectedBrand !== "All Brands" && (
                <span className="text-[10px] text-[#2563EB] font-bold">
                  Fitment: {selectedBrand} {selectedModel !== "All Models" ? `• ${selectedModel}` : ""}
                </span>
              )}
            </div>
            <span className="text-[10px] font-extrabold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full font-mono">
              {sortedFilteredParts.length} Listed
            </span>
          </div>

        {sortedFilteredParts.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 px-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="w-11 h-11 bg-slate-100 rounded-full flex items-center justify-center mb-2.5 text-slate-400">
              <Compass size={22} />
            </div>
            <h4 className="text-xs font-black text-slate-800">No spare parts found</h4>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xs leading-relaxed">
              Try selecting a different brand, category, or resetting location filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedBrand("All Brands");
                setSelectedModel("All Models");
                setSelectedCategory("All Categories");
                setSelectedPartName("All Parts");
                setSelectedState("All States");
                setSelectedDistrict("All Districts");
                setSelectedCondition("All Conditions");
              }}
              className="mt-3 px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs active:scale-95 cursor-pointer"
              id="reset-filters-btn"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-4" id="parts-grid">
            {sortedFilteredParts.map((part) => {
              const isFav = favorites.includes(part.id);
              return (
                <motion.div
                  key={part.id}
                  whileHover={{ y: -2 }}
                  onClick={() => setSelectedPart(part)}
                  className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-md hover:border-[#2563EB]/40 transition-all duration-200 flex flex-col cursor-pointer relative group h-full justify-between"
                  id={`part-card-${part.id}`}
                >
                  {/* Image container clickable for direct fullscreen view */}
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPart(part);
                      setDetailImageIndex(0);
                      setIsGalleryOpen(true);
                    }}
                    className="h-28 sm:h-32 w-full bg-slate-900 relative overflow-hidden group/img cursor-zoom-in shrink-0"
                    title="Click to view full-screen image gallery"
                  >
                    {part.imageUrl ? (
                      <img
                        src={part.imageUrl}
                        alt={part.title}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          // Fallback on broken image
                          (e.target as HTMLImageElement).style.display = 'none';
                          const parent = (e.target as HTMLImageElement).parentElement;
                          if (parent) {
                            const fallback = parent.querySelector('.image-fallback-container');
                            if (fallback) fallback.classList.remove('hidden');
                          }
                        }}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
                      />
                    ) : null}

                    {/* Image Fallback container when missing or broken */}
                    <div className={`w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col items-center justify-center text-indigo-300 gap-1 p-2 image-fallback-container ${part.imageUrl ? 'hidden' : ''}`}>
                      <ImageIcon size={22} className="text-blue-400/80 animate-pulse" />
                      <span className="text-[8px] font-extrabold tracking-wider uppercase text-slate-300 text-center line-clamp-2 px-1">
                        {part.partName || part.category}
                      </span>
                    </div>

                    {/* Interactive hover zoom overlay */}
                    <div className="absolute inset-0 bg-slate-950/25 opacity-0 group-hover/img:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <div className="bg-slate-900/90 backdrop-blur-md p-1.5 rounded-full text-white border border-white/20 scale-90 group-hover/img:scale-100 transition-transform duration-200 shadow-md">
                        <Maximize2 size={12} className="text-blue-400" />
                      </div>
                    </div>

                    {part.sold && (
                      <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-10">
                        <span className="text-[9px] font-black tracking-widest text-white bg-rose-600 px-2 py-0.5 rounded-full uppercase shadow-md">
                          SOLD OUT
                        </span>
                      </div>
                    )}
                    
                    {/* Condition badge */}
                    <div className="absolute top-2 left-2 flex gap-1 z-10">
                      <span className={`text-[8px] font-black tracking-wider px-1.5 py-0.5 rounded-md shadow-2xs border uppercase ${getConditionColor(part.condition)}`}>
                        {part.condition}
                      </span>
                    </div>

                    {/* Favorite Button */}
                    {onFavoriteToggle && (
                      <motion.button
                        whileTap={{ scale: 0.8 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onFavoriteToggle(part.id);
                        }}
                        className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-md transition-all z-10 ${
                          isFav 
                            ? "bg-rose-500 text-white shadow-md shadow-rose-500/30" 
                            : "bg-slate-950/50 text-white hover:bg-slate-950/80 border border-white/20"
                        }`}
                        id={`fav-btn-${part.id}`}
                      >
                        <Heart size={12} fill={isFav ? "currentColor" : "none"} strokeWidth={2.5} />
                      </motion.button>
                    )}

                    {/* Price Tag Overlay */}
                    <div className="absolute bottom-2 left-2 bg-[#0B1220]/90 backdrop-blur-xs text-white text-[11px] font-black px-2 py-0.5 rounded-md shadow-2xs font-mono border border-white/10 flex items-center gap-0.5">
                      <span className="text-[#60A5FA] text-[9px]">₹</span>
                      <span>{part.price ? part.price.toLocaleString("en-IN") : "N/A"}</span>
                    </div>
                  </div>

                  {/* Card Content details */}
                  <div className="p-2.5 flex-1 flex flex-col justify-between bg-white">
                    <div>
                      <div className="flex items-center gap-1 mb-1 font-bold text-[9px]">
                        <span className="text-slate-700 uppercase truncate bg-slate-100 px-1 py-0.5 rounded max-w-[50%]">
                          {part.carBrand}
                        </span>
                        <span className="text-[#2563EB] uppercase truncate bg-[#2563EB]/10 px-1 py-0.5 rounded max-w-[50%]">
                          {part.carModel}
                        </span>
                      </div>
                      
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1 group-hover:text-[#2563EB] transition-colors leading-tight">
                        {part.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5 font-medium">
                        {part.category}
                      </p>
                    </div>

                    <div className="border-t border-slate-100 pt-1.5 mt-2 flex items-center justify-between text-[9px] text-slate-400 font-semibold">
                      <span className="flex items-center gap-0.5 text-slate-500 max-w-[65%] truncate">
                        <MapPin size={10} className="text-blue-600 shrink-0" />
                        <span className="truncate font-medium">{part.location}</span>
                      </span>
                      <span className="font-mono text-slate-400 shrink-0">{getRelativeTime(part.createdAt)}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>

      {/* Part Detail Drawer Overlay */}
      <AnimatePresence>
        {selectedPart && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
            className="absolute inset-0 bg-slate-50 z-30 flex flex-col text-slate-900 overflow-hidden"
            id="part-detail-backdrop"
          >
            {/* Custom Toast Alert for sharing link */}
            <AnimatePresence>
              {showShareToast && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 10 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="absolute top-14 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-full shadow-lg font-bold flex items-center gap-2 z-[99]"
                >
                  <Sparkles size={14} className="text-amber-400" />
                  <span>Link copied to clipboard!</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sticky Top Header Bar */}
            <div className="sticky top-0 bg-white border-b border-slate-100 px-3.5 py-2.5 flex items-center justify-between z-20 shadow-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedPart(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-full transition-all active:scale-95 cursor-pointer text-slate-800"
                  id="close-detail-btn"
                >
                  <ArrowLeft size={22} strokeWidth={2.5} />
                </button>
                <div className="flex flex-col">
                  <span className="font-extrabold text-xs text-slate-900 tracking-wide uppercase">Ad Details</span>
                  <span className="text-[10px] text-slate-400 font-bold font-mono">ID: {selectedPart.id.substring(0, 8).toUpperCase()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Share Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const shareUrl = window.location.origin + "?part=" + selectedPart.id;
                    if (navigator.share) {
                      navigator.share({
                        title: selectedPart.title,
                        text: `Check out this ${selectedPart.carBrand} ${selectedPart.carModel} ${selectedPart.title} on Autoparts India!`,
                        url: shareUrl
                      }).catch(() => {
                        navigator.clipboard.writeText(shareUrl);
                        setShowShareToast(true);
                        setTimeout(() => setShowShareToast(false), 2000);
                      });
                    } else {
                      navigator.clipboard.writeText(shareUrl);
                      setShowShareToast(true);
                      setTimeout(() => setShowShareToast(false), 2000);
                    }
                  }}
                  className="p-2 hover:bg-slate-100 rounded-full transition-all active:scale-95 text-slate-700 cursor-pointer"
                  title="Share"
                >
                  <Share2 size={20} />
                </button>

                {/* Heart/Favorite Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onFavoriteToggle) onFavoriteToggle(selectedPart.id);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-full transition-all active:scale-95 cursor-pointer text-slate-700"
                  title="Favorite"
                >
                  <Heart
                    size={20}
                    className={favorites.includes(selectedPart.id) ? "fill-red-500 text-red-500 stroke-red-500 animate-pulse" : "text-slate-700"}
                  />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto pb-24 scrollbar-none bg-slate-50">
              {/* Cover Image Carousel */}
              {(() => {
                const imageList: string[] = [];
                if (selectedPart.imageUrls && selectedPart.imageUrls.length > 0) {
                  selectedPart.imageUrls.forEach(url => {
                    if (url && !imageList.includes(url)) {
                      imageList.push(url);
                    }
                  });
                } else if (selectedPart.imageUrl) {
                  imageList.push(selectedPart.imageUrl);
                }

                // Touch swipe handlers
                let touchStartX = 0;

                const handleTouchStartLocal = (e: React.TouchEvent) => {
                  touchStartX = e.touches[0].clientX;
                };

                const handleTouchEndLocal = (e: React.TouchEvent) => {
                  const touchEndX = e.changedTouches[0].clientX;
                  const diffX = touchEndX - touchStartX;
                  if (Math.abs(diffX) > 40) {
                    if (diffX > 0) {
                      // swipe right -> previous image
                      setDetailImageIndex(prev => (prev > 0 ? prev - 1 : imageList.length - 1));
                    } else {
                      // swipe left -> next image
                      setDetailImageIndex(prev => (prev < imageList.length - 1 ? prev + 1 : 0));
                    }
                  }
                };

                return (
                  <div 
                    className="h-80 w-full bg-slate-950 relative cursor-pointer group overflow-hidden select-none touch-pan-y flex items-center justify-center border-b border-slate-200"
                    onTouchStart={handleTouchStartLocal}
                    onTouchEnd={handleTouchEndLocal}
                    onClick={() => setIsGalleryOpen(true)}
                    title="Swipe horizontally or click to view gallery"
                  >
                    <AnimatePresence mode="wait">
                      {imageList[detailImageIndex] ? (
                        <motion.img
                          key={detailImageIndex}
                          src={imageList[detailImageIndex]}
                          alt={selectedPart.title}
                          referrerPolicy="no-referrer"
                          initial={{ opacity: 0.85, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0.85, scale: 0.98 }}
                          transition={{ duration: 0.2 }}
                          className="w-full h-full object-contain max-h-80"
                        />
                      ) : (
                        <div className="w-full h-full min-h-[220px] bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center text-indigo-400 gap-2 p-4">
                          <ImageIcon size={36} className="text-indigo-400/80 animate-pulse" />
                          <span className="text-xs font-bold tracking-wider uppercase opacity-80 text-center">{selectedPart.partName || selectedPart.category}</span>
                        </div>
                      )}
                    </AnimatePresence>

                    {/* Left/Right click arrow buttons for desktop */}
                    {imageList.length > 1 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailImageIndex(prev => (prev > 0 ? prev - 1 : imageList.length - 1));
                          }}
                          className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/45 hover:bg-indigo-600 text-white rounded-full transition-all z-10 cursor-pointer shadow-md opacity-0 group-hover:opacity-100 md:opacity-80 flex items-center justify-center"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailImageIndex(prev => (prev < imageList.length - 1 ? prev + 1 : 0));
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/45 hover:bg-indigo-600 text-white rounded-full transition-all z-10 cursor-pointer shadow-md opacity-0 group-hover:opacity-100 md:opacity-80 flex items-center justify-center"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </>
                    )}

                    {/* Progress indicators dots or pills */}
                    {imageList.length > 1 && (
                      <div className="absolute bottom-4 left-4 flex items-center gap-1.5 z-10">
                        {imageList.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailImageIndex(idx);
                            }}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              idx === detailImageIndex ? "w-4 bg-indigo-500" : "w-1.5 bg-white/45"
                            }`}
                          />
                        ))}
                      </div>
                    )}

                    {/* Image Counter Badge (OLX style) */}
                    <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-xs text-[11px] font-bold text-white px-2.5 py-1 rounded-md tracking-wider font-mono z-10">
                      {detailImageIndex + 1} / {imageList.length}
                    </div>

                    {/* Gallery hint badge (Top Left) */}
                    <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-sm text-[10px] font-black tracking-wider text-white px-2.5 py-1.5 rounded-md flex items-center gap-1 border border-white/10 opacity-90 transition-all z-10">
                      <Maximize2 size={10} className="text-indigo-400 animate-pulse" />
                      VIEW FULLSCREEN
                    </div>

                    {selectedPart.sold && (
                      <div className="absolute inset-0 bg-slate-950/65 flex items-center justify-center z-20">
                        <span className="text-xs font-black tracking-widest text-white bg-rose-600 px-4 py-2 rounded-md uppercase shadow-xl border border-rose-500">
                          SOLD OUT
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="space-y-3 mt-3">
                {/* Price, Title, Location details */}
                <div className="bg-white p-4 shadow-xs border-y border-slate-100 space-y-1.5">
                  <div className="flex justify-between items-start">
                    <span className="text-2xl font-black text-slate-900 tracking-tight font-sans">
                      {formatPrice(selectedPart.price)}
                    </span>
                    <span className={`inline-block px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${getConditionColor(selectedPart.condition)}`}>
                      {selectedPart.condition}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800 leading-snug tracking-tight">
                    {selectedPart.title}
                  </h3>
                  <div className="h-px bg-slate-100 my-2.5" />
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1 font-bold">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      {selectedPart.district || selectedPart.location}, {selectedPart.state || "All India"}
                    </span>
                    <span>
                      {new Date(selectedPart.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short"
                      })}
                    </span>
                  </div>
                </div>

                {/* Key attributes/Specification grid */}
                <div className="bg-white p-4 shadow-xs border-y border-slate-100 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide border-l-3 border-indigo-600 pl-2">
                    Details & Specifications
                  </h4>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-1">
                    <div className="flex flex-col border-b border-slate-100 pb-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Brand</span>
                      <span className="text-xs font-extrabold text-slate-800 mt-0.5">{selectedPart.carBrand}</span>
                    </div>
                    <div className="flex flex-col border-b border-slate-100 pb-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Model Compatibility</span>
                      <span className="text-xs font-extrabold text-slate-800 mt-0.5">{selectedPart.carModel}</span>
                    </div>
                    <div className="flex flex-col border-b border-slate-100 pb-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Category</span>
                      <span className="text-xs font-extrabold text-slate-800 mt-0.5">{selectedPart.category}</span>
                    </div>
                    <div className="flex flex-col border-b border-slate-100 pb-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Condition</span>
                      <span className="text-xs font-extrabold text-slate-800 mt-0.5">{selectedPart.condition}</span>
                    </div>
                    <div className="flex flex-col border-b border-slate-100 pb-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">State</span>
                      <span className="text-xs font-extrabold text-slate-800 mt-0.5">{selectedPart.state || "All India"}</span>
                    </div>
                    <div className="flex flex-col border-b border-slate-100 pb-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">District</span>
                      <span className="text-xs font-extrabold text-slate-800 mt-0.5">{selectedPart.district || "All Districts"}</span>
                    </div>
                  </div>
                </div>

                {/* Description block */}
                <div className="bg-white p-4 shadow-xs border-y border-slate-100 space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide border-l-3 border-indigo-600 pl-2">
                    Description
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line font-medium pt-1">
                    {selectedPart.description}
                  </p>
                </div>

                {/* Verified Seller info */}
                <div 
                  onClick={() => setShowReviews(true)}
                  className="bg-white p-4 shadow-xs border-y border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-100 rounded-full border border-slate-200/80 flex items-center justify-center text-indigo-600 font-bold text-sm uppercase shadow-inner">
                      {selectedPart.contactName.substring(0, 2)}
                    </div>
                    <div>
                      <span className="text-[9px] text-indigo-600 font-black tracking-widest block uppercase leading-none">Verified Seller</span>
                      <h5 className="text-xs font-black text-slate-800 mt-1">{selectedPart.contactName}</h5>
                      
                      {/* Rating details button */}
                      {sellerRating ? (
                        <div className="flex items-center gap-0.5 mt-0.5">
                          <Star size={11} className="fill-current text-amber-500" />
                          <span className="text-[10px] text-slate-500 font-bold">
                            {sellerRating.count > 0 ? `${sellerRating.average} (${sellerRating.count} reviews)` : "New Seller (No reviews)"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">Click to view reviews</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-400" />
                </div>

                {/* Map approximate location card */}
                <div className="bg-white p-4 shadow-xs border-y border-slate-100 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide border-l-3 border-indigo-600 pl-2">
                    Posted In
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold">
                    <MapPin size={14} className="text-indigo-600" />
                    <span>{selectedPart.district || selectedPart.location}, {selectedPart.state || "All India"}</span>
                  </div>
                  <GMap
                    lat={selectedPart.lat}
                    lng={selectedPart.lng}
                    state={selectedPart.state}
                    district={selectedPart.district}
                    height="180px"
                  />
                </div>
              </div>
            </div>

            {/* Sticky Bottom Call / Chat Action Bar */}
            <div className="absolute bottom-0 inset-x-0 bg-white border-t border-slate-200 p-3 flex items-center gap-3 z-20 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
              {currentUser && selectedPart.sellerId === currentUser.id ? (
                <>
                  <button
                    onClick={() => {
                      setEditingPart(selectedPart);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-md font-black text-xs uppercase tracking-wider shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                    id="edit-own-listing-btn"
                  >
                    Edit Listing
                  </button>
                  <button
                    onClick={async () => {
                      if (window.confirm("Are you sure you want to delete this listing?")) {
                        try {
                          await deleteSparePartListing(selectedPart.id);
                          setSelectedPart(null);
                        } catch (err: any) {
                          setDeleteError(err.message || "Failed to delete listing.");
                        }
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white py-3 rounded-md font-black text-xs uppercase tracking-wider shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                    id="delete-own-listing-btn"
                  >
                    Delete Listing
                  </button>
                </>
              ) : (
                <>
                  {onStartChat && (
                    <button
                      onClick={() => {
                        if (selectedPart.sold) return;
                        onStartChat(selectedPart);
                        setSelectedPart(null); // Close the detail drawer so the chat window overlay is visible
                      }}
                      disabled={selectedPart.sold}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-md font-black text-xs uppercase tracking-wider shadow-xs transition-all active:scale-[0.98] cursor-pointer ${
                        selectedPart.sold
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed opacity-60"
                          : "bg-teal-600 hover:bg-teal-500 text-white"
                      }`}
                      id="inapp-chat-btn"
                    >
                      <MessageSquare size={14} />
                      {selectedPart.sold ? t("soldOut") : "Chat Now"}
                    </button>
                  )}
                  <a
                    href={`tel:${selectedPart.contactPhone}`}
                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-md font-black text-xs uppercase tracking-wider shadow-xs transition-all active:scale-[0.98] text-center"
                    id="call-seller-btn"
                  >
                    <Phone size={13} />
                    {t("callSeller")}
                  </a>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Seller Profile View Overlay */}
      <AnimatePresence>
        {showReviews && selectedPart && (
          <SellerProfileView
            sellerId={selectedPart.sellerId}
            sellerName={selectedPart.contactName}
            currentUser={currentUser}
            onClose={() => setShowReviews(false)}
            onStartChat={onStartChat}
            allParts={parts}
            onSelectPart={(part) => setSelectedPart(part)}
          />
        )}
      </AnimatePresence>

      {/* Advanced Filter Drawer */}
      <AnimatePresence>
        {showFiltersModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowFiltersModal(false)}
            className="absolute inset-0 bg-black/60 z-30 flex items-end"
            id="filters-backdrop"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-[32px] w-full max-h-[85%] overflow-y-auto p-5 space-y-5 shadow-2xl relative text-slate-900"
              id="filters-modal-body"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <SlidersHorizontal size={16} className="text-indigo-600" />
                  Advanced Filter
                </h3>
                <button
                  onClick={() => setShowFiltersModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full"
                  id="close-filters-btn"
                >
                  <X size={16} />
                </button>
              </div>

              {/* 1. Brand Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  1. Select Car Brand
                </label>
                <select
                  value={selectedBrand}
                  onChange={(e) => handleBrandChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="All Brands">All Brands (India)</option>
                  {Object.keys(brands).map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* 2. Model Dropdown (Disabled if Brand is All Brands) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  2. Select Specific Model
                </label>
                <select
                  value={selectedModel}
                  disabled={selectedBrand === "All Brands"}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-slate-50 disabled:opacity-55 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="All Models">All Models</option>
                  {availableModels.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                {selectedBrand === "All Brands" && (
                  <span className="text-[9px] text-slate-400 font-medium block">Choose a Brand first to view specific models.</span>
                )}
              </div>

              {/* 3. Category Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  3. Part Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setSelectedPartName("All Parts");
                  }}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="All Categories">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* 3b. Specific Part Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  3b. Specific Spare Part
                </label>
                <select
                  value={selectedPartName}
                  disabled={selectedCategory === "All Categories"}
                  onChange={(e) => setSelectedPartName(e.target.value)}
                  className="w-full bg-slate-50 disabled:opacity-55 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="All Parts">All Parts</option>
                  {(selectedCategory !== "All Categories" ? CAR_SPARE_PARTS_BY_CATEGORY[selectedCategory] || [] : []).map((part) => (
                    <option key={part} value={part}>{part}</option>
                  ))}
                </select>
                {selectedCategory === "All Categories" && (
                  <span className="text-[9px] text-slate-400 font-medium block">Choose a Category first to view specific spare parts.</span>
                )}
              </div>

              {/* 4. Condition Filter */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  4. Part Condition
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {["All Conditions", "Brand New", "Like New", "Used (Good)", "For Scrap/Spares"].map((cond) => (
                    <button
                      key={cond}
                      onClick={() => setSelectedCondition(cond)}
                      className={`py-1.5 px-1 text-[10px] font-bold rounded-xl border text-center transition-all truncate ${
                        selectedCondition === cond
                          ? "bg-blue-50 border-blue-200 text-[#2563EB] font-bold shadow-2xs"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                      title={cond}
                    >
                      {cond === "All Conditions" ? "All" : cond}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Cascading Location Filter */}
              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  5. Location (Cascading Filter)
                </span>
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 block">STATE</span>
                    <select
                      value={selectedState}
                      onChange={(e) => {
                        setSelectedState(e.target.value);
                        setSelectedDistrict("All Districts");
                      }}
                      className="w-full bg-white border border-slate-200 text-slate-800 text-xs font-bold rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="All States">All India</option>
                      {INDIAN_STATES_AND_DISTRICTS.map((s) => (
                        <option key={s.state} value={s.state}>{s.state}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 block">DISTRICT</span>
                    <select
                      value={selectedDistrict}
                      disabled={selectedState === "All States"}
                      onChange={(e) => setSelectedDistrict(e.target.value)}
                      className="w-full bg-white disabled:opacity-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="All Districts">All Districts</option>
                      {(INDIAN_STATES_AND_DISTRICTS.find(s => s.state === selectedState)?.districts || []).map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={() => {
                    setSelectedBrand("All Brands");
                    setSelectedModel("All Models");
                    setSelectedCategory("All Categories");
                    setSelectedPartName("All Parts");
                    setSelectedState("All States");
                    setSelectedDistrict("All Districts");
                    setSelectedCondition("All Conditions");
                    setShowFiltersModal(false);
                  }}
                  className="flex-1 py-3 border border-slate-200 text-slate-500 font-bold text-xs rounded-2xl hover:bg-slate-50 transition-all text-center"
                  id="filter-reset-all-btn"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowFiltersModal(false)}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow-sm text-center"
                  id="filter-apply-all-btn"
                >
                  Show Results
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Home Location Selector Modal */}
      <AnimatePresence>
        {showLocationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLocationModal(false)}
            className="absolute inset-0 bg-black/60 z-35 flex items-end"
            id="location-selector-backdrop"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-[32px] w-full h-[80%] flex flex-col shadow-2xl relative text-slate-900 overflow-hidden"
              id="location-selector-modal-body"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    Select Location
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {selectedState === "All States" ? "All India" : selectedDistrict === "All Districts" ? `${selectedState} > All Districts` : `${selectedState} > ${selectedDistrict}`}
                  </p>
                </div>
                <button
                  onClick={() => setShowLocationModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 p-1.5 rounded-full transition-colors"
                  id="close-location-modal-btn"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Search Box & Auto Detect */}
              <div className="p-3.5 border-b border-slate-100 shrink-0 bg-white space-y-2">
                <button
                  onClick={handleDetectLocationClick}
                  disabled={isDetectingLocation}
                  className="w-full bg-blue-50 hover:bg-blue-100/70 text-[#2563EB] border border-blue-200/80 rounded-xl py-2.5 px-3 flex items-center justify-between transition-all active:scale-[0.99] shadow-2xs cursor-pointer"
                  id="detect-location-btn"
                >
                  <div className="flex items-center gap-2">
                    <Compass size={15} className={`text-[#2563EB] shrink-0 ${isDetectingLocation ? "animate-spin" : ""}`} />
                    <div className="text-left">
                      <span className="text-xs font-bold block leading-none text-slate-900">
                        {isDetectingLocation ? "Detecting location..." : "Use Current Location"}
                      </span>
                      <span className="text-[10px] text-[#2563EB] font-medium">
                        {userDetectedState ? `Detected: ${userDetectedState}${userDetectedDistrict ? ` > ${userDetectedDistrict}` : ""}` : "Auto-detect via GPS"}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] bg-[#2563EB] text-white font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shadow-2xs">
                    GPS
                  </span>
                </button>

                {locationDetectError && (
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-[10px] text-rose-600 flex items-center gap-1.5">
                    <AlertCircle size={12} className="shrink-0" />
                    <span>{locationDetectError}</span>
                  </div>
                )}

                <div className="relative">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={locSearchQuery}
                    onChange={(e) => {
                      setLocSearchQuery(e.target.value);
                      // Reset active browsing state if search is active
                      if (e.target.value.trim()) {
                        setLocActiveState(null);
                      }
                    }}
                    placeholder="Search states or districts (e.g. Pune, Karnataka)..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-8 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                    id="location-search-input"
                  />
                  {locSearchQuery && (
                    <button
                      onClick={() => setLocSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Modal Content / Lists */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {locSearchQuery.trim() ? (
                  /* --- SEARCH RESULTS VIEW --- */
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1 mb-2">
                      Search Results
                    </span>

                    {/* All India option if matched */}
                    {("all india".includes(locSearchQuery.trim().toLowerCase()) || "india".includes(locSearchQuery.trim().toLowerCase())) && (
                      <button
                        onClick={() => {
                          setSelectedState("All States");
                          setSelectedDistrict("All Districts");
                          setShowLocationModal(false);
                        }}
                        className="w-full text-left px-3.5 py-3 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between border border-transparent hover:border-slate-100"
                      >
                        <div className="flex items-center gap-2.5">
                          <Compass size={14} className="text-sky-500 shrink-0" />
                          <span className="text-xs font-bold text-slate-800">All India</span>
                        </div>
                        <span className="text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase">Default</span>
                      </button>
                    )}

                    {/* State & District matches */}
                    {(() => {
                      const query = locSearchQuery.trim().toLowerCase();
                      const items: React.ReactNode[] = [];
                      
                      INDIAN_STATES_AND_DISTRICTS.forEach((s) => {
                        // Check state name match
                        if (s.state.toLowerCase().includes(query)) {
                          items.push(
                            <button
                              key={`state-${s.state}`}
                              onClick={() => {
                                // Transition to showing districts for this state
                                setLocActiveState(s.state);
                                setLocSearchQuery(""); // Clear search to show district list directly
                              }}
                              className="w-full text-left px-3.5 py-3 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between border border-transparent hover:border-slate-100"
                            >
                              <div className="flex items-center gap-2.5">
                                <MapPin size={14} className="text-indigo-500 shrink-0" />
                                <span className="text-xs font-bold text-slate-800">{s.state}</span>
                              </div>
                              <span className="text-[9px] bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded font-mono font-bold uppercase">State</span>
                            </button>
                          );
                        }

                        // Check district matches
                        s.districts.forEach((d) => {
                          if (d.toLowerCase().includes(query)) {
                            items.push(
                              <button
                                key={`dist-${s.state}-${d}`}
                                onClick={() => {
                                  setSelectedState(s.state);
                                  setSelectedDistrict(d);
                                  setShowLocationModal(false);
                                }}
                                className="w-full text-left px-3.5 py-3 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between border border-transparent hover:border-slate-100"
                              >
                                <div className="flex items-center gap-2.5">
                                  <MapPin size={14} className="text-emerald-500 shrink-0" />
                                  <span className="text-xs font-bold text-slate-800">
                                    {s.state} <span className="text-slate-400 font-medium">›</span> {d}
                                  </span>
                                </div>
                                <span className="text-[9px] bg-emerald-50 text-emerald-500 px-1.5 py-0.5 rounded font-mono font-bold uppercase">District</span>
                              </button>
                            );
                          }
                        });
                      });

                      if (items.length === 0 && !("all india".includes(query) || "india".includes(query))) {
                        return (
                          <div className="text-center py-8">
                            <span className="text-xs text-slate-400 font-medium">No states or districts match your search</span>
                          </div>
                        );
                      }

                      return items;
                    })()}
                  </div>
                ) : locActiveState ? (
                  /* --- DISTRICTS LIST FOR ACTIVE STATE --- */
                  <div className="space-y-1">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <button
                        onClick={() => setLocActiveState(null)}
                        className="text-xs font-bold text-sky-500 hover:text-sky-600 flex items-center gap-1"
                        id="loc-back-to-states-btn"
                      >
                        ← Back to States
                      </button>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {locActiveState} Districts
                      </span>
                    </div>

                    {/* All Districts of this State option */}
                    <button
                      onClick={() => {
                        setSelectedState(locActiveState);
                        setSelectedDistrict("All Districts");
                        setShowLocationModal(false);
                      }}
                      className="w-full text-left px-3.5 py-3 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between border border-transparent hover:border-slate-100"
                    >
                      <div className="flex items-center gap-2.5">
                        <Compass size={14} className="text-indigo-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-800">All Districts in {locActiveState}</span>
                      </div>
                      <span className="text-[9px] bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded font-mono font-bold uppercase">All Districts</span>
                    </button>

                    {/* List of Districts */}
                    {(INDIAN_STATES_AND_DISTRICTS.find(s => s.state === locActiveState)?.districts || []).map((d) => {
                      const isCurrentlySelected = selectedState === locActiveState && selectedDistrict === d;
                      return (
                        <button
                          key={d}
                          onClick={() => {
                            setSelectedState(locActiveState);
                            setSelectedDistrict(d);
                            setShowLocationModal(false);
                          }}
                          className={`w-full text-left px-3.5 py-3 rounded-xl transition-colors flex items-center justify-between border ${
                            isCurrentlySelected 
                              ? "bg-blue-50 border-blue-200 text-[#2563EB]" 
                              : "border-transparent hover:bg-slate-50 hover:border-slate-100 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <MapPin size={14} className={isCurrentlySelected ? "text-[#2563EB] shrink-0" : "text-slate-400 shrink-0"} />
                            <span className="text-xs font-bold">{d}</span>
                          </div>
                          {isCurrentlySelected && (
                            <span className="text-[9px] bg-[#2563EB] text-white px-1.5 py-0.5 rounded font-mono font-bold uppercase">Selected</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  /* --- DEFAULT STATES LIST --- */
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1 mb-2">
                      All Regions
                    </span>

                    {/* All India default option */}
                    <button
                      onClick={() => {
                        setSelectedState("All States");
                        setSelectedDistrict("All Districts");
                        setShowLocationModal(false);
                      }}
                      className={`w-full text-left px-3.5 py-3 rounded-xl transition-colors flex items-center justify-between border ${
                        selectedState === "All States"
                          ? "bg-blue-50 border-blue-200 text-[#2563EB]"
                          : "border-transparent hover:bg-slate-50 hover:border-slate-100 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Compass size={14} className={selectedState === "All States" ? "text-[#2563EB] shrink-0" : "text-slate-400 shrink-0"} />
                        <span className="text-xs font-bold">All India</span>
                      </div>
                      <span className="text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase">Default</span>
                    </button>

                    <div className="border-t border-slate-100 my-2"></div>

                    {/* List of States */}
                    {INDIAN_STATES_AND_DISTRICTS.map((s) => {
                      const isStateSelected = selectedState === s.state;
                      return (
                        <button
                          key={s.state}
                          onClick={() => {
                            // Immediately transition to show district list for this state
                            setLocActiveState(s.state);
                          }}
                          className={`w-full text-left px-3.5 py-3 rounded-xl transition-colors flex items-center justify-between border ${
                            isStateSelected 
                              ? "bg-blue-50 border-blue-200 text-[#2563EB]" 
                              : "border-transparent hover:bg-slate-50 hover:border-slate-100 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <MapPin size={14} className={isStateSelected ? "text-[#2563EB] shrink-0" : "text-slate-400 shrink-0"} />
                            <span className="text-xs font-bold">{s.state}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold">
                              {s.districts.length} districts
                            </span>
                            <ChevronRight size={12} className="text-slate-400" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen Image Gallery Modal */}
      <ImageGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        part={selectedPart}
        initialIndex={detailImageIndex}
      />

      {editingPart && (
        <EditListingModal
          part={editingPart}
          onClose={() => setEditingPart(null)}
          onSave={handleSaveListingChanges}
        />
      )}

      {deleteError && (
        <div className="fixed bottom-4 left-4 right-4 bg-rose-600 text-white p-3 rounded-xl shadow-lg z-50 text-xs flex items-center justify-between">
          <span>{deleteError}</span>
          <button onClick={() => setDeleteError(null)} className="font-bold underline">Dismiss</button>
        </div>
      )}
    </div>
  );
}
