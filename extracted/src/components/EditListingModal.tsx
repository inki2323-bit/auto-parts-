import React, { useState, useEffect } from "react";
import { 
  X, 
  UploadCloud, 
  Check, 
  Camera, 
  Image as ImageIcon, 
  Sparkles, 
  AlertCircle, 
  FileText, 
  Compass, 
  MapPin, 
  Layers, 
  Phone, 
  User as UserIcon 
} from "lucide-react";
import { SparePart, INDIAN_CAR_BRANDS, CAR_PART_CATEGORIES, CAR_SPARE_PARTS_BY_CATEGORY, DEFAULT_MODEL_VARIANTS } from "../types";
import { INDIAN_STATES_AND_DISTRICTS } from "../data/indianLocations";
import { uploadProductImage, fetchFullTaxonomyConfig } from "../lib/firebase";
import { useLanguage } from "../lib/LanguageContext";
import { translateDynamic } from "../lib/translations";
import MapLocationModal from "./MapLocationModal";
import { getApproxCoordinates } from "../utils/locationHelper";
import { requestCameraPermissionJIT } from "../utils/permissionUtils";
import { compressImageFile } from "../utils/imageCompressor";

interface EditListingModalProps {
  part: SparePart;
  onClose: () => void;
  onSave: (partId: string, updates: Partial<SparePart>) => Promise<void>;
}

export default function EditListingModal({ part, onClose, onSave }: EditListingModalProps) {
  const { t, language } = useLanguage();
  const [title, setTitle] = useState(part.title || "");
  const [description, setDescription] = useState(part.description || "");
  const [price, setPrice] = useState(part.price?.toString() || "");
  const [carBrand, setCarBrand] = useState(part.carBrand || "");
  const [carModel, setCarModel] = useState(part.carModel || "");
  const [carVariant, setCarVariant] = useState(part.carVariant || "");
  const [category, setCategory] = useState(part.category || "");
  const [partName, setPartName] = useState(part.partName || "");
  const [condition, setCondition] = useState<"Brand New" | "Like New" | "Used (Good)" | "For Scrap/Spares">(part.condition || "Brand New");
  const [selectedState, setSelectedState] = useState(part.state || "");
  const [selectedDistrict, setSelectedDistrict] = useState(part.district || "");
  const [contactName, setContactName] = useState(part.contactName || "");
  const [contactPhone, setContactPhone] = useState(part.contactPhone || "");
  const [uploadedImages, setUploadedImages] = useState<string[]>(part.imageUrls || (part.imageUrl ? [part.imageUrl] : []));
  
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
        console.warn("Failed to load taxonomy in EditListingModal:", e);
      }
    };
    loadTaxonomy();
  }, []);

  // Coordinates State
  const [lat, setLat] = useState<number | undefined>(part.lat);
  const [lng, setLng] = useState<number | undefined>(part.lng);
  const [showMapModal, setShowMapModal] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const availableModels = carBrand ? taxonomy.brands[carBrand] || [] : [];
  const availableVariants = carModel ? (taxonomy.variants[carModel] || taxonomy.variants[`${carBrand}_${carModel}`] || ["Base", "Mid", "Top Spec", "VXi", "ZXi", "SX", "Alpha", "GT", "LXi"]) : [];
  const availablePartNames = category ? taxonomy.subcategories[category] || [] : [];
  const availableDistricts = selectedState ? taxonomy.districts[selectedState] || [] : [];

  const handleBrandChange = (brand: string) => {
    setCarBrand(brand);
    setCarModel("");
    setCarVariant("");
  };

  const handleModelChange = (model: string) => {
    setCarModel(model);
    setCarVariant("");
  };

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    setPartName("");
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
      setError("Maximum 6 images allowed.");
      return;
    }

    setIsUploading(true);
    setError(null);

    const uploadedUrls: string[] = [];
    const initialCount = uploadedImages.length;
    const totalFiles = files.length;

    try {
      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        const currentProgressNum = initialCount + i + 1;
        setUploadProgress(`Uploading: ${currentProgressNum}/6`);

        const base64Data = await compressImageFile(file, 1200, 1200, 0.82);
        const cloudinaryUrl = await uploadProductImage(base64Data);
        uploadedUrls.push(cloudinaryUrl);
      }
      setUploadedImages(prev => [...prev, ...uploadedUrls]);
    } catch (err: any) {
      setError(err.message || "Failed to upload one or more images. Please try again.");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title || !description || !price || !carBrand || !carModel || !category || !partName || !selectedState || !selectedDistrict || !contactName || !contactPhone) {
      setError("Please fill in all listing details including Car Brand, Model, Part Category, Specific Part, and complete Location.");
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError("Please specify a valid positive price in ₹.");
      return;
    }

    if (uploadedImages.length === 0) {
      setError("Please upload at least one photo of the spare part.");
      return;
    }

    setIsSaving(true);

    try {
      // Resolve latitude and longitude or fallback
      let finalLat = lat;
      let finalLng = lng;
      if (finalLat === undefined || finalLng === undefined || finalLat === 0 || finalLng === 0) {
        const approx = getApproxCoordinates(selectedState, selectedDistrict);
        finalLat = approx.lat;
        finalLng = approx.lng;
      }

      const primaryImage = uploadedImages[0];
      const updates: Partial<SparePart> = {
        title,
        description,
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
        contactName,
        contactPhone,
        imageUrl: primaryImage,
        imageUrls: uploadedImages
      };

      await onSave(part.id, updates);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" id="edit-listing-modal-overlay">
      <div className="bg-white rounded-3xl w-full max-w-lg h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-slate-100" id="edit-listing-modal-content">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-extrabold tracking-tight">Edit Advertisement</h2>
            <p className="text-[10px] text-slate-400">Update your spare part details</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all"
            id="close-edit-modal-btn"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4" id="edit-listing-form">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-xs text-rose-600 flex items-start gap-2 animate-fade-in">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Product photos section */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Product Photos (Max 6)
              </label>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                {uploadedImages.length}/6
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-1.5">
              {uploadedImages.map((img, idx) => (
                <div key={idx} className="relative aspect-square bg-slate-200 rounded-xl overflow-hidden group shadow-sm border border-slate-100">
                  <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 p-1 bg-slate-950/70 hover:bg-rose-600 text-white rounded-lg transition-all"
                    title="Remove Photo"
                  >
                    <X size={10} />
                  </button>
                  {idx === 0 && (
                    <div className="absolute bottom-0 inset-x-0 bg-indigo-600 text-white text-[8px] font-black tracking-widest text-center py-0.5 uppercase">
                      Primary
                    </div>
                  )}
                </div>
              ))}

              {uploadedImages.length < 6 && (
                <label 
                  onClick={handlePhotoPickerClick}
                  className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                  isUploading 
                    ? "border-slate-300 bg-slate-100/50 cursor-not-allowed" 
                    : "border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/10"
                }`}>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageFilesChange}
                    disabled={isUploading}
                    className="hidden"
                  />
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-[8px] text-slate-500 font-extrabold uppercase mt-1">{uploadProgress || "Uploading"}</span>
                    </div>
                  ) : (
                    <>
                      <Camera size={18} className="text-slate-400" />
                      <span className="text-[9px] text-slate-400 font-bold uppercase">Add Photo</span>
                    </>
                  )}
                </label>
              )}
            </div>
          </div>

          {/* Ad Title */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 block">ADVERTISEMENT TITLE</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Maruti Suzuki Swift Headlight Right Side"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          {/* Brand, Model & Variant */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 block">CAR BRAND</span>
              <div className="relative">
                <Layers size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={carBrand}
                  onChange={(e) => handleBrandChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-8 pr-1 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none font-bold"
                  required
                >
                  <option value="">Choose Brand</option>
                  {Object.keys(taxonomy.brands).map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 block">CAR MODEL</span>
              <div className="relative">
                <Layers size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={carModel}
                  disabled={!carBrand}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="w-full bg-slate-50 disabled:opacity-50 border border-slate-200 rounded-xl py-2.5 pl-8 pr-1 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none font-bold"
                  required
                >
                  <option value="">Choose Model</option>
                  {availableModels.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 block">VARIANT</span>
              <div className="relative">
                <Layers size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={carVariant}
                  disabled={!carModel}
                  onChange={(e) => setCarVariant(e.target.value)}
                  className="w-full bg-slate-50 disabled:opacity-50 border border-slate-200 rounded-xl py-2.5 pl-8 pr-1 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none font-bold"
                >
                  <option value="">Variant</option>
                  {availableVariants.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Category & Specific Part */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 block">PART CATEGORY</span>
              <div className="relative">
                <Compass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none font-bold"
                  required
                >
                  <option value="">{t("selectCategory")}</option>
                  {taxonomy.categories.map((cat) => (
                    <option key={cat} value={cat}>{translateDynamic(cat, language)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 block">SPECIFIC SPARE PART</span>
              <div className="relative">
                <Compass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={partName}
                  disabled={!category}
                  onChange={(e) => setPartName(e.target.value)}
                  className="w-full bg-slate-50 disabled:opacity-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none font-bold"
                  required
                >
                  <option value="">Select Specific Part</option>
                  {availablePartNames.map((part) => (
                    <option key={part} value={part}>{part}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Condition */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 block">PART CONDITION</span>
            <div className="grid grid-cols-2 gap-2">
              {(["Brand New", "Like New", "Used (Good)", "For Scrap/Spares"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setCondition(opt)}
                  className={`py-2 px-1 text-[11px] font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                    condition === opt
                      ? "bg-indigo-50 border-indigo-500 text-indigo-600 font-extrabold"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {condition === opt && <Check size={11} className="text-indigo-600 shrink-0" />}
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Price & State & District */}
          <div className="space-y-3">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 block">PRICE (₹ INR)</span>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-700 text-xs font-black font-mono">₹</span>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 4500"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-8 pr-4 text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 block">STATE</span>
                <div className="relative">
                  <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                  <select
                    value={selectedState}
                    onChange={(e) => {
                      setSelectedState(e.target.value);
                      setSelectedDistrict("");
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none font-bold"
                    required
                  >
                    <option value="">Choose State</option>
                    {INDIAN_STATES_AND_DISTRICTS.map((s) => (
                      <option key={s.state} value={s.state}>{s.state}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 block">DISTRICT / CITY</span>
                <div className="relative">
                  <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                  <select
                    value={selectedDistrict}
                    disabled={!selectedState}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="w-full bg-slate-50 disabled:opacity-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none font-bold"
                    required
                  >
                    <option value="">Choose District</option>
                    {availableDistricts.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Map Picker Trigger Button */}
            <div className="pt-1.5">
              <button
                type="button"
                onClick={() => setShowMapModal(true)}
                className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-2xl text-xs font-extrabold border transition-all cursor-pointer shadow-sm active:scale-[0.99] ${
                  typeof lat === "number" && typeof lng === "number"
                    ? "bg-indigo-50 border-indigo-200 text-indigo-600 font-extrabold"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
                id="edit-map-picker-trigger"
              >
                <Compass size={14} className={typeof lat === "number" && typeof lng === "number" ? "text-indigo-600 animate-spin-slow" : "text-slate-400"} />
                {typeof lat === "number" && typeof lng === "number" ? (
                  <span>📍 Pin Placed ({lat.toFixed(4)}, {lng.toFixed(4)})</span>
                ) : (
                  <span>Select Shop Location on Map (Optional Pin)</span>
                )}
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 block">AD DESCRIPTION</span>
            <div className="relative">
              <FileText size={15} className="absolute left-3 top-3 text-slate-400" />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Specify details..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-4 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-500 leading-relaxed"
                required
              />
            </div>
          </div>

          {/* Contact Details Card */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-4">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Seller Contact Info
            </label>

            <div className="grid grid-cols-1 gap-3.5">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 block">NAME</span>
                <div className="relative">
                  <UserIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Seller contact name"
                    className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-9 pr-4 text-xs text-slate-700"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 block">CONTACT PHONE</span>
                <div className="relative">
                  <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+91 98765 XXXXX"
                    className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-9 pr-4 text-xs text-slate-700"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-2xl text-xs uppercase tracking-wider transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 rounded-2xl text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>

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
