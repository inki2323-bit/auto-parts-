import React, { useState, useEffect } from "react";
import { 
  Camera, 
  Tag, 
  Compass, 
  MapPin, 
  Phone, 
  User as UserIcon, 
  Image as ImageIcon, 
  CheckCircle2, 
  Sparkles, 
  AlertCircle,
  FileText,
  DollarSign,
  Car,
  Layers,
  UploadCloud,
  Check,
  X,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import { User, SparePart, INDIAN_CAR_BRANDS, CAR_PART_CATEGORIES, CAR_SPARE_PARTS_BY_CATEGORY, DEFAULT_MODEL_VARIANTS } from "../types";
import { createSparePartListing, uploadProductImage, fetchFullTaxonomyConfig } from "../lib/firebase";
import { INDIAN_STATES_AND_DISTRICTS } from "../data/indianLocations";
import MapLocationModal from "./MapLocationModal";
import { getApproxCoordinates } from "../utils/locationHelper";
import { useLanguage } from "../lib/LanguageContext";
import { translateDynamic } from "../lib/translations";
import BrandLogo from "./BrandLogo";
import { requestCameraPermissionJIT } from "../utils/permissionUtils";

import { compressImageFile } from "../utils/imageCompressor";

interface SellScreenProps {
  currentUser: User;
  onPublishSuccess: (newPart: SparePart) => void;
  parts: SparePart[];
}

export default function SellScreen({ currentUser, onPublishSuccess, parts }: SellScreenProps) {
  const { t, language } = useLanguage();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [carBrand, setCarBrand] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carVariant, setCarVariant] = useState("");
  const [category, setCategory] = useState("");
  const [partName, setPartName] = useState("");
  const [condition, setCondition] = useState<"Brand New" | "Like New" | "Used (Good)" | "For Scrap/Spares">("Brand New");
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [contactName, setContactName] = useState(currentUser.name || "");
  const [contactPhone, setContactPhone] = useState(currentUser.phone || "");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  // Dynamic taxonomy state
  const [taxonomy, setTaxonomy] = useState<{
    categories: string[];
    brands: Record<string, string[]>;
    subcategories: Record<string, string[]>;
    variants: Record<string, string[]>;
    states: string[];
    districts: Record<string, string[]>;
  }>({
    categories: CAR_PART_CATEGORIES,
    brands: INDIAN_CAR_BRANDS,
    subcategories: CAR_SPARE_PARTS_BY_CATEGORY,
    variants: DEFAULT_MODEL_VARIANTS,
    states: INDIAN_STATES_AND_DISTRICTS.map(s => s.state),
    districts: INDIAN_STATES_AND_DISTRICTS.reduce((acc, s) => ({ ...acc, [s.state]: s.districts }), {})
  });

  useEffect(() => {
    const loadTaxonomy = async () => {
      try {
        const full = await fetchFullTaxonomyConfig();
        if (full) {
          setTaxonomy({
            categories: full.categories?.length ? full.categories : CAR_PART_CATEGORIES,
            brands: Object.keys(full.brands || {}).length ? full.brands : INDIAN_CAR_BRANDS,
            subcategories: Object.keys(full.subcategories || {}).length ? full.subcategories : CAR_SPARE_PARTS_BY_CATEGORY,
            variants: Object.keys(full.variants || {}).length ? full.variants : DEFAULT_MODEL_VARIANTS,
            states: full.states?.length ? full.states : INDIAN_STATES_AND_DISTRICTS.map(s => s.state),
            districts: Object.keys(full.districts || {}).length ? full.districts : INDIAN_STATES_AND_DISTRICTS.reduce((acc, s) => ({ ...acc, [s.state]: s.districts }), {})
          });
        }
      } catch (e) {
        console.warn("Failed to load taxonomy in SellScreen:", e);
      }
    };
    loadTaxonomy();
    window.addEventListener("config_updated", loadTaxonomy);
    return () => window.removeEventListener("config_updated", loadTaxonomy);
  }, []);
  
  // Coordinates State
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [showMapModal, setShowMapModal] = useState(false);
  
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic dropdown options derived from taxonomy state
  const availableModels = carBrand ? taxonomy.brands[carBrand] || [] : [];
  const availableVariants = carModel ? (taxonomy.variants[carModel] || taxonomy.variants[`${carBrand}_${carModel}`] || ["Base", "Mid", "Top Spec", "VXi", "ZXi", "SX", "Alpha", "GT", "LXi"]) : [];
  const availablePartNames = category ? taxonomy.subcategories[category] || [] : [];
  const availableDistricts = selectedState ? taxonomy.districts[selectedState] || [] : [];

  const updateAutoTitle = (brand: string, model: string, variant: string, part: string) => {
    const parts = [brand, model, variant, part].filter(Boolean);
    if (parts.length >= 2) {
      setTitle(parts.join(" "));
    }
  };

  const handleBrandChange = (brand: string) => {
    setCarBrand(brand);
    setCarModel("");
    setCarVariant("");
    updateAutoTitle(brand, "", "", partName);
  };

  const handleModelChange = (model: string) => {
    setCarModel(model);
    setCarVariant("");
    updateAutoTitle(carBrand, model, "", partName);
  };

  const handleVariantChange = (v: string) => {
    setCarVariant(v);
    updateAutoTitle(carBrand, carModel, v, partName);
  };

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    setPartName("");
    updateAutoTitle(carBrand, carModel, carVariant, "");
  };

  const handlePartNameChange = (part: string) => {
    setPartName(part);
    updateAutoTitle(carBrand, carModel, carVariant, part);
  };

  const handlePhotoPickerClick = async (e: React.MouseEvent) => {
    const res = await requestCameraPermissionJIT();
    if (!res.granted) {
      e.preventDefault();
      setError(res.message || "Camera & Photos permission is needed to attach spare part images.");
    }
  };

  const handleImageFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length > 6 || uploadedImages.length + files.length > 6) {
      setError("Maximum 6 images allowed per listing.");
      return;
    }

    setError(null);
    const newBase64s: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressedBase64 = await compressImageFile(file, 1200, 1200, 0.82);
        newBase64s.push(compressedBase64);
      }
      setUploadedImages(prev => [...prev, ...newBase64s]);
    } catch (err: any) {
      setError(err.message || "Failed to read local image files.");
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setUploadedImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !description.trim() || !price || !carBrand || !carModel || !category || !partName || !selectedState || !selectedDistrict || !contactName.trim() || !contactPhone.trim()) {
      setError("Please fill in all mandatory fields (Vehicle, Category, Title, Price, Location, Contact).");
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError("Please specify a valid price in ₹.");
      return;
    }

    if (uploadedImages.length === 0) {
      setError("Please upload at least one photo of the spare part.");
      return;
    }

    const isDuplicate = parts.some(
      p => p.sellerId === currentUser.id &&
           p.title.trim().toLowerCase() === title.trim().toLowerCase() &&
           p.price === priceNum &&
           p.description.trim().toLowerCase() === description.trim().toLowerCase()
    );
    if (isDuplicate) {
      setError("You have already published a duplicate listing with these details.");
      return;
    }

    setIsUploading(true);
    setUploadProgress("Initiating photo upload...");

    try {
      const cloudinaryUrls: string[] = [];
      const totalImages = uploadedImages.length;
      for (let i = 0; i < totalImages; i++) {
        const img = uploadedImages[i];
        if (img.startsWith("data:image/")) {
          setUploadProgress(`Uploading image ${i + 1} of ${totalImages}...`);
          const uploadedUrl = await uploadProductImage(img);
          cloudinaryUrls.push(uploadedUrl);
        } else {
          cloudinaryUrls.push(img);
        }
      }

      setUploadProgress("Saving listing...");
      
      let finalLat = lat;
      let finalLng = lng;
      if (finalLat === undefined || finalLng === undefined || finalLat === 0 || finalLng === 0) {
        const approx = getApproxCoordinates(selectedState, selectedDistrict);
        finalLat = approx.lat;
        finalLng = approx.lng;
      }

      const savedPart = await createSparePartListing({
        title: title.trim(),
        description: description.trim(),
        price: priceNum,
        carBrand,
        carModel,
        carVariant: carVariant || undefined,
        category,
        partName,
        condition,
        location: `${selectedDistrict}, ${selectedState}`,
        state: selectedState,
        district: selectedDistrict,
        lat: finalLat,
        lng: finalLng,
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        imageUrl: cloudinaryUrls[0],
        imageUrls: cloudinaryUrls,
        sellerId: currentUser.id,
        sellerEmail: currentUser.email
      });

      setUploadProgress(null);
      setShowSuccess(true);
      
      setTimeout(() => {
        onPublishSuccess(savedPart);
        resetForm();
      }, 1600);

    } catch (err: any) {
      setError(err.message || "Failed to publish listing. Please check internet connection.");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPrice("");
    setCarBrand("");
    setCarModel("");
    setCategory("");
    setPartName("");
    setCondition("Brand New");
    setSelectedState("");
    setSelectedDistrict("");
    setLat(undefined);
    setLng(undefined);
    setUploadedImages([]);
    setUploadProgress(null);
    setShowSuccess(false);
    setError(null);
  };

  if (showSuccess) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0B1220] text-white p-6 text-center animate-fade-in" id="sell-success-container">
        <div className="w-16 h-16 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center mb-4">
          <CheckCircle2 size={36} className="animate-bounce" />
        </div>
        <h2 className="text-lg font-extrabold tracking-tight">Listing Published Successfully</h2>
        <p className="text-xs text-slate-300 mt-1.5 max-w-xs leading-relaxed">
          Your ad is now active on Auto Parts India. Buyers across India can contact you directly.
        </p>
        <span className="text-[10px] text-[#60A5FA] mt-5 font-mono animate-pulse">Redirecting to marketplace...</span>
      </div>
    );
  }

  const userActiveAds = parts.filter(p => 
    p.sellerId === currentUser.id && 
    p.sold !== true && 
    (Date.now() - p.createdAt) <= 90 * 24 * 60 * 60 * 1000
  );
  const isLimitReached = userActiveAds.length >= 5;

  if (isLimitReached) {
    return (
      <div className="flex-1 flex flex-col bg-slate-50 text-slate-900 h-full overflow-hidden" id="sell-screen-container">
        <div className="bg-[#0B1220] text-white px-4 py-3 sticky top-0 z-10 shadow-xs border-b border-[#18233C] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <BrandLogo size="sm" variant="icon" theme="dark" showTagline={false} />
            <div>
              <h2 className="text-sm font-extrabold text-white">Sell Spare Part</h2>
              <p className="text-[9px] text-slate-400">Post ads across India</p>
            </div>
          </div>
          <Sparkles size={16} className="text-[#60A5FA]" />
        </div>

        <div className="p-4 flex-1 overflow-y-auto flex flex-col justify-center items-center text-center max-w-md mx-auto">
          <div className="w-12 h-12 bg-amber-50 text-amber-500 border border-amber-200 rounded-full flex items-center justify-center mb-3">
            <AlertCircle size={24} />
          </div>
          <h3 className="text-sm font-extrabold text-slate-800">5 Active Ads Limit Reached</h3>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            You currently have 5 active listings. Delete or mark an old ad as sold to post new parts.
          </p>
          <div className="mt-4 p-3 bg-white border border-slate-200 rounded-xl w-full text-left shadow-xs">
            <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Your Active Ads:</h4>
            <div className="space-y-1.5">
              {userActiveAds.map(ad => (
                <div key={ad.id} className="flex gap-2 items-center text-xs">
                  <div className="w-7 h-7 rounded bg-slate-100 overflow-hidden shrink-0">
                    {ad.imageUrl && <img src={ad.imageUrl} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <span className="font-semibold text-slate-700 truncate flex-1">{ad.title}</span>
                  <span className="font-mono font-bold text-slate-900">₹{ad.price}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 text-slate-900 h-full overflow-hidden" id="sell-screen-container">
      {/* OLX Mobile Style Top App Bar */}
      <div className="bg-[#0B1220] text-white px-4 py-3 shrink-0 shadow-xs border-b border-[#18233C] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BrandLogo size="sm" variant="icon" theme="dark" showTagline={false} />
          <div>
            <h2 className="text-sm font-extrabold text-white tracking-tight">Post Your Ad</h2>
            <p className="text-[9px] text-slate-400">Sell genuine spare parts fast</p>
          </div>
        </div>
        <span className="text-[9px] font-mono font-bold bg-[#2563EB]/20 text-[#60A5FA] px-2.5 py-0.5 rounded-full border border-[#2563EB]/30">
          Free Listing
        </span>
      </div>

      {/* Main Form Scroll Area */}
      <form onSubmit={handlePublish} className="flex-1 overflow-y-auto p-3 space-y-3 pb-24 max-w-2xl mx-auto w-full">
        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 flex items-start gap-2 shadow-xs">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-500" />
            <span className="font-semibold leading-normal">{error}</span>
          </div>
        )}

        {/* 1. Photos Section (OLX Mobile Style) */}
        <div className="bg-white rounded-xl p-3 border border-slate-200 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Camera size={14} className="text-[#2563EB]" />
              Upload Photos ({uploadedImages.length}/6)
            </span>
            <span className="text-[9px] font-medium text-slate-400">First photo is cover</span>
          </div>

          {uploadProgress && (
            <div className="text-xs text-[#2563EB] font-bold bg-[#2563EB]/10 p-2 rounded-lg border border-[#2563EB]/20 flex items-center gap-2 animate-pulse">
              <span className="h-2 w-2 bg-[#2563EB] rounded-full"></span>
              {uploadProgress}
            </div>
          )}

          {uploadedImages.length > 0 ? (
            <div className="space-y-2">
              <div className="h-36 w-full rounded-lg bg-slate-900 border border-slate-200 overflow-hidden relative group">
                <img
                  src={uploadedImages[0]}
                  alt="Primary preview"
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-2 left-2 bg-[#0B1220]/90 text-white text-[8px] font-extrabold uppercase px-2 py-0.5 rounded backdrop-blur-xs border border-white/20">
                  Main Cover
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveImage(0)}
                  className="absolute top-2 right-2 bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-bold py-0.5 px-2 rounded backdrop-blur-xs transition-colors cursor-pointer"
                  id="remove-main-img-btn"
                >
                  Remove
                </button>
              </div>

              {uploadedImages.length > 1 && (
                <div className="grid grid-cols-5 gap-1.5 pt-0.5">
                  {uploadedImages.slice(1).map((imgUrl, index) => (
                    <div key={index} className="aspect-square rounded-lg bg-slate-100 border border-slate-200 overflow-hidden relative group">
                      <img
                        src={imgUrl}
                        alt={`Preview ${index + 2}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index + 1)}
                        className="absolute top-0.5 right-0.5 bg-[#0B1220]/80 text-white rounded-full p-0.5 transition-colors cursor-pointer"
                        id={`remove-sub-img-btn-${index + 1}`}
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {uploadedImages.length < 6 && (
                <div className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-lg p-2">
                  <span className="text-[10px] font-bold text-slate-700">Add extra photos</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageFilesChange}
                    className="hidden"
                    id="add-more-image-picker"
                  />
                  <label
                    htmlFor="add-more-image-picker"
                    onClick={handlePhotoPickerClick}
                    className="px-2.5 py-1 bg-white border border-slate-200 text-slate-800 rounded text-xs font-bold hover:bg-slate-50 cursor-pointer shadow-xs active:scale-95 transition-all"
                  >
                    + Add More
                  </label>
                </div>
              )}
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center text-center hover:border-[#2563EB] transition-colors bg-slate-50">
              <UploadCloud size={26} className="text-[#2563EB] mb-1" />
              <p className="text-xs font-extrabold text-slate-800">Tap to upload photos</p>
              <p className="text-[9px] text-slate-400 mt-0.5">Supports JPG, PNG up to 6 photos</p>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageFilesChange}
                className="hidden"
                id="image-file-picker"
              />
              <label
                htmlFor="image-file-picker"
                onClick={handlePhotoPickerClick}
                className="mt-2 px-3.5 py-1.5 bg-[#2563EB] hover:bg-blue-600 text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs active:scale-95 transition-all"
                id="btn-upload-file"
              >
                Choose Photos
              </label>
            </div>
          )}
        </div>

        {/* 2. Vehicle & Category Fitment */}
        <div className="bg-white rounded-xl p-3 border border-slate-200 space-y-2.5 shadow-xs">
          <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Car size={14} className="text-[#2563EB]" />
            Vehicle & Category
          </span>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-[9px] font-extrabold text-slate-500 uppercase block">Car Brand *</label>
              <select
                value={carBrand}
                onChange={(e) => handleBrandChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#2563EB] cursor-pointer"
                required
                id="listing-brand"
              >
                <option value="">Select Brand</option>
                {Object.keys(taxonomy.brands).map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-extrabold text-slate-500 uppercase block">Car Model *</label>
              <select
                value={carModel}
                disabled={!carBrand}
                onChange={(e) => handleModelChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#2563EB] cursor-pointer disabled:opacity-50"
                required
                id="listing-model"
              >
                <option value="">Select Model</option>
                {availableModels.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-extrabold text-slate-500 uppercase block">Variant</label>
              <select
                value={carVariant}
                disabled={!carModel}
                onChange={(e) => handleVariantChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#2563EB] cursor-pointer disabled:opacity-50"
                id="listing-variant"
              >
                <option value="">Select Variant</option>
                {availableVariants.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[9px] font-extrabold text-slate-500 uppercase block">Category *</label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#2563EB] cursor-pointer"
                required
                id="listing-category"
              >
                <option value="">Select Category</option>
                {taxonomy.categories.map((cat) => (
                  <option key={cat} value={cat}>{translateDynamic(cat, language)}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-extrabold text-slate-500 uppercase block">Specific Part *</label>
              <select
                value={partName}
                disabled={!category}
                onChange={(e) => handlePartNameChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#2563EB] cursor-pointer disabled:opacity-50"
                required
                id="listing-part-name"
              >
                <option value="">Select Part Name</option>
                {availablePartNames.map((part) => (
                  <option key={part} value={part}>{part}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 3. Title, Condition & Price */}
        <div className="bg-white rounded-xl p-3 border border-slate-200 space-y-2.5 shadow-xs">
          <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Tag size={14} className="text-[#2563EB]" />
            Ad Details & Price
          </span>

          <div className="space-y-1">
            <label className="text-[9px] font-extrabold text-slate-500 uppercase block">Ad Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Maruti Swift Brake Pad Assembly"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#2563EB]"
              required
              id="listing-title"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-extrabold text-slate-500 uppercase block">Condition</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(["Brand New", "Like New", "Used (Good)", "For Scrap/Spares"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setCondition(opt)}
                  className={`py-1.5 px-2 text-[10px] font-bold rounded-lg border flex items-center justify-center gap-1 cursor-pointer transition-all ${
                    condition === opt
                      ? "bg-[#2563EB]/10 border-[#2563EB] text-[#2563EB] font-extrabold"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                  id={`condition-opt-${opt.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                >
                  {condition === opt && <Check size={11} className="text-[#2563EB]" />}
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[9px] font-extrabold text-slate-500 uppercase block">Price (₹ INR) *</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-800 text-xs font-black font-mono">₹</span>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 4500"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-7 pr-2.5 text-xs font-extrabold text-slate-900 focus:outline-none focus:border-[#2563EB] font-mono"
                  required
                  id="listing-price"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-extrabold text-slate-500 uppercase block">Description *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mention condition, usage history & exact fitment details..."
                rows={2}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#2563EB]"
                required
                id="listing-description"
              />
            </div>
          </div>
        </div>

        {/* 4. Location & Map Pin */}
        <div className="bg-white rounded-xl p-3 border border-slate-200 space-y-2 shadow-xs">
          <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin size={14} className="text-[#2563EB]" />
            Item Location
          </span>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[9px] font-extrabold text-slate-500 uppercase block">State *</label>
              <select
                value={selectedState}
                onChange={(e) => {
                  setSelectedState(e.target.value);
                  setSelectedDistrict("");
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#2563EB] cursor-pointer"
                required
                id="listing-state"
              >
                <option value="">Select State</option>
                {INDIAN_STATES_AND_DISTRICTS.map((s) => (
                  <option key={s.state} value={s.state}>{s.state}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-extrabold text-slate-500 uppercase block">District / City *</label>
              <select
                value={selectedDistrict}
                disabled={!selectedState}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#2563EB] cursor-pointer disabled:opacity-50"
                required
                id="listing-district"
              >
                <option value="">Select District</option>
                {availableDistricts.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowMapModal(true)}
            className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-extrabold border transition-all cursor-pointer shadow-xs ${
              typeof lat === "number" && typeof lng === "number"
                ? "bg-[#2563EB]/10 border-[#2563EB]/40 text-[#2563EB]"
                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
            id="listing-map-picker-trigger"
          >
            <Compass size={14} className={typeof lat === "number" && typeof lng === "number" ? "text-[#2563EB]" : "text-slate-400"} />
            {typeof lat === "number" && typeof lng === "number" ? (
              <span>Map Pin Set ({lat.toFixed(3)}, {lng.toFixed(3)})</span>
            ) : (
              <span>Set Precise Location on Map (Optional)</span>
            )}
          </button>
        </div>

        {/* 5. Seller Contact */}
        <div className="bg-white rounded-xl p-3 border border-slate-200 space-y-2 shadow-xs">
          <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <UserIcon size={14} className="text-[#2563EB]" />
            Seller Info
          </span>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[9px] font-extrabold text-slate-500 uppercase block">Name *</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Seller Name"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2563EB]"
                required
                id="listing-contact-name"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-extrabold text-slate-500 uppercase block">Phone *</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 Phone"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2563EB]"
                required
                id="listing-contact-phone"
              />
            </div>
          </div>
        </div>

        {/* Submit Action Button */}
        <button
          type="submit"
          disabled={isUploading}
          className="w-full bg-[#2563EB] hover:bg-blue-600 text-white font-black py-3 rounded-xl text-xs tracking-wider uppercase transition-all shadow-xs active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          id="listing-submit-btn"
        >
          {isUploading ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>POST AD NOW</span>
          )}
        </button>
      </form>

      {/* Map Picker Modal */}
      {showMapModal && (
        <MapLocationModal
          initialLat={lat}
          initialLng={lng}
          state={selectedState}
          district={selectedDistrict}
          onConfirm={(selectedLat, selectedLng) => {
            setLat(selectedLat);
            setLng(selectedLng);
          }}
          onClose={() => setShowMapModal(false)}
        />
      )}
    </div>
  );
}
