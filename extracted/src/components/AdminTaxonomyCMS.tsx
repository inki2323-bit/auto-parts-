import React, { useState, useEffect } from "react";
import { 
  Tag, Layers, Car, Settings, MapPin, Globe, Building, Upload, 
  X, Edit2, Trash2, Plus, Search, Image as ImageIcon, Check, 
  RefreshCw, AlertCircle, Sparkles, Download, Filter, UploadCloud,
  SlidersHorizontal, CheckCircle2
} from "lucide-react";
import { SparePart, User, CAR_PART_CATEGORIES, INDIAN_CAR_BRANDS, CAR_SPARE_PARTS_BY_CATEGORY, POPULAR_LOCATIONS } from "../types";
import { INDIAN_STATES_AND_DISTRICTS } from "../data/indianLocations";
import { 
  fetchFullTaxonomyConfig, saveTaxonomyDoc, uploadProductImage, 
  createSparePartListing, updateSparePartListing, deleteSparePartListing 
} from "../lib/firebase";

interface AdminTaxonomyCMSProps {
  allParts: SparePart[];
  onPartUpdated: () => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  setConfirmModal: (modal: any) => void;
  currentUser: User | null;
}

export default function AdminTaxonomyCMS({
  allParts,
  onPartUpdated,
  showToast,
  setConfirmModal,
  currentUser
}: AdminTaxonomyCMSProps) {
  // Sub-tab selection
  const [activeCmsTab, setActiveCmsTab] = useState<
    "categories" | "subcategories" | "brands" | "models" | "variants" | "parts" | "states" | "districts" | "cities" | "locations"
  >("categories");

  // Loading state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Full Taxonomy State
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryImages, setCategoryImages] = useState<Record<string, string>>({});
  const [subcategories, setSubcategories] = useState<Record<string, string[]>>({});
  const [brands, setBrands] = useState<Record<string, string[]>>({});
  const [brandLogos, setBrandLogos] = useState<Record<string, string>>({});
  const [variants, setVariants] = useState<Record<string, string[]>>({});
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<Record<string, string[]>>({});
  const [cities, setCities] = useState<Record<string, string[]>>({});
  const [locations, setLocations] = useState<string[]>([]);

  // Category Inputs
  const [catName, setCatName] = useState("");
  const [catImage, setCatImage] = useState("");

  // Subcategory Inputs
  const [subcatParent, setSubcatParent] = useState("");
  const [subcatName, setSubcatName] = useState("");

  // Brand Inputs
  const [brandName, setBrandName] = useState("");
  const [brandLogo, setBrandLogo] = useState("");

  // Model Inputs
  const [modelParentBrand, setModelParentBrand] = useState("");
  const [modelName, setModelName] = useState("");

  // Variant Inputs
  const [variantParentBrand, setVariantParentBrand] = useState("");
  const [variantParentModel, setVariantParentModel] = useState("");
  const [variantName, setVariantName] = useState("");

  // State Inputs
  const [stateName, setStateName] = useState("");

  // District Inputs
  const [districtParentState, setDistrictParentState] = useState("");
  const [districtName, setDistrictName] = useState("");

  // City Inputs
  const [cityParentState, setCityParentState] = useState("");
  const [cityParentDistrict, setCityParentDistrict] = useState("");
  const [cityName, setCityName] = useState("");

  // Location Inputs
  const [locationName, setLocationName] = useState("");

  // Editing State Modal
  const [editingItem, setEditingItem] = useState<{
    type: "category" | "subcategory" | "brand" | "model" | "variant" | "state" | "district" | "city" | "location";
    parentKey?: string;
    parentSubKey?: string;
    oldName: string;
    newName: string;
    imageUrl?: string;
  } | null>(null);

  // Add Spare Part Modal
  const [showAddPartModal, setShowAddPartModal] = useState(false);
  const [editingPart, setEditingPart] = useState<SparePart | null>(null);
  const [partForm, setPartForm] = useState({
    title: "",
    description: "",
    price: "",
    carBrand: "",
    carModel: "",
    category: "",
    partName: "",
    condition: "Brand New" as "Brand New" | "Like New" | "Used (Good)" | "For Scrap/Spares",
    state: "",
    district: "",
    contactName: currentUser?.name || "Admin",
    contactPhone: currentUser?.phone || "+91 98765 43210",
    imageUrl: "",
    imageUrls: [] as string[]
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  // Load all taxonomy items from Firestore
  const loadTaxonomy = async () => {
    setLoading(true);
    try {
      const full = await fetchFullTaxonomyConfig();
      setCategories(full.categories || []);
      setCategoryImages(full.categoryImages || {});
      setSubcategories(full.subcategories || {});
      setBrands(full.brands || {});
      setBrandLogos(full.brandLogos || {});
      setVariants(full.variants || {});
      setStates(full.states || []);
      setDistricts(full.districts || {});
      setCities(full.cities || {});
      setLocations(full.locations || []);

      if (full.categories?.length > 0 && !subcatParent) {
        setSubcatParent(full.categories[0]);
      }
      if (Object.keys(full.brands || {}).length > 0 && !modelParentBrand) {
        const firstBrand = Object.keys(full.brands)[0];
        setModelParentBrand(firstBrand);
        setVariantParentBrand(firstBrand);
        const models = full.brands[firstBrand] || [];
        if (models.length > 0) setVariantParentModel(models[0]);
      }
      if (full.states?.length > 0 && !districtParentState) {
        const firstState = full.states[0];
        setDistrictParentState(firstState);
        setCityParentState(firstState);
        const dists = (full.districts || {})[firstState] || [];
        if (dists.length > 0) setCityParentDistrict(dists[0]);
      }
    } catch (e) {
      console.error("Failed to load taxonomy in AdminTaxonomyCMS:", e);
      showToast("Failed to load taxonomy from Firestore.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTaxonomy();
  }, []);

  // Duplicate Check Helper
  const isDuplicate = (list: string[], val: string, ignoreVal?: string) => {
    const normVal = val.trim().toLowerCase();
    const normIgnore = ignoreVal ? ignoreVal.trim().toLowerCase() : null;
    return list.some((item) => {
      const normItem = item.trim().toLowerCase();
      if (normIgnore && normItem === normIgnore) return false;
      return normItem === normVal;
    });
  };

  // Image Upload Helper for Mobile Device File Selector
  const handleFileUpload = async (
    file: File,
    onSuccess: (url: string) => void
  ) => {
    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const url = await uploadProductImage(base64);
          onSuccess(url);
          showToast("Image uploaded successfully!");
        } catch (err) {
          onSuccess(base64); // Fallback to base64
          showToast("Image set via base64 encoding.");
        } finally {
          setUploadingImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setUploadingImage(false);
      showToast("Failed to process image file.", "error");
    }
  };

  // 1. CATEGORY HANDLERS
  const handleAddCategory = async () => {
    const trimmed = catName.trim();
    if (!trimmed) {
      showToast("Please enter a category name.", "error");
      return;
    }
    if (isDuplicate(categories, trimmed)) {
      showToast(`Duplicate entry! Category "${trimmed}" already exists.`, "error");
      return;
    }

    setSaving(true);
    try {
      const updatedCats = [...categories, trimmed];
      const updatedImgs = { ...categoryImages, [trimmed]: catImage.trim() };
      await saveTaxonomyDoc("categories", { list: updatedCats });
      if (catImage.trim()) {
        await saveTaxonomyDoc("category_images", { map: updatedImgs });
      }

      setCategories(updatedCats);
      setCategoryImages(updatedImgs);
      setCatName("");
      setCatImage("");
      if (!subcatParent) setSubcatParent(trimmed);
      showToast(`Category "${trimmed}" saved to Firestore.`);
    } catch (err: any) {
      showToast("Failed to save category: " + (err?.message || err), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEditCategory = async () => {
    if (!editingItem) return;
    const { oldName, newName, imageUrl } = editingItem;
    const trimmedNew = newName.trim();
    if (!trimmedNew) {
      showToast("Category name cannot be empty.", "error");
      return;
    }
    if (isDuplicate(categories, trimmedNew, oldName)) {
      showToast(`Duplicate entry! Category "${trimmedNew}" already exists.`, "error");
      return;
    }

    setSaving(true);
    try {
      const updatedCats = categories.map((c) => (c === oldName ? trimmedNew : c));
      const updatedImgs = { ...categoryImages };
      delete updatedImgs[oldName];
      if (imageUrl?.trim()) {
        updatedImgs[trimmedNew] = imageUrl.trim();
      }

      const updatedSubcats = { ...subcategories };
      if (updatedSubcats[oldName]) {
        updatedSubcats[trimmedNew] = updatedSubcats[oldName];
        delete updatedSubcats[oldName];
      }

      await saveTaxonomyDoc("categories", { list: updatedCats });
      await saveTaxonomyDoc("category_images", { map: updatedImgs });
      await saveTaxonomyDoc("subcategories", { map: updatedSubcats });

      setCategories(updatedCats);
      setCategoryImages(updatedImgs);
      setSubcategories(updatedSubcats);
      setEditingItem(null);
      showToast(`Category "${trimmedNew}" updated successfully.`);
    } catch (err: any) {
      showToast("Failed to edit category: " + (err?.message || err), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = (cat: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Category",
      message: `Are you sure you want to delete category "${cat}"? This will also remove its subcategories and images.`,
      confirmText: "Delete Category",
      isDanger: true,
      onConfirm: async () => {
        setSaving(true);
        try {
          const updatedCats = categories.filter((c) => c !== cat);
          const updatedImgs = { ...categoryImages };
          delete updatedImgs[cat];
          const updatedSubcats = { ...subcategories };
          delete updatedSubcats[cat];

          await saveTaxonomyDoc("categories", { list: updatedCats });
          await saveTaxonomyDoc("category_images", { map: updatedImgs });
          await saveTaxonomyDoc("subcategories", { map: updatedSubcats });

          setCategories(updatedCats);
          setCategoryImages(updatedImgs);
          setSubcategories(updatedSubcats);
          showToast(`Category "${cat}" deleted.`);
        } catch (err: any) {
          showToast("Failed to delete category: " + (err?.message || err), "error");
        } finally {
          setSaving(false);
        }
      }
    });
  };

  // 2. SUBCATEGORY HANDLERS
  const handleAddSubcategory = async () => {
    if (!subcatParent) {
      showToast("Please select or create a Category first.", "error");
      return;
    }
    const trimmed = subcatName.trim();
    if (!trimmed) {
      showToast("Please enter a subcategory name.", "error");
      return;
    }
    const currentList = subcategories[subcatParent] || [];
    if (isDuplicate(currentList, trimmed)) {
      showToast(`Duplicate entry! Subcategory "${trimmed}" already exists under ${subcatParent}.`, "error");
      return;
    }

    setSaving(true);
    try {
      const updatedList = [...currentList, trimmed];
      const updatedMap = { ...subcategories, [subcatParent]: updatedList };

      await saveTaxonomyDoc("subcategories", { map: updatedMap });
      setSubcategories(updatedMap);
      setSubcatName("");
      showToast(`Subcategory "${trimmed}" added to ${subcatParent}.`);
    } catch (err: any) {
      showToast("Failed to save subcategory: " + (err?.message || err), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEditSubcategory = async () => {
    if (!editingItem || !editingItem.parentKey) return;
    const { parentKey, oldName, newName } = editingItem;
    const trimmedNew = newName.trim();
    if (!trimmedNew) {
      showToast("Subcategory name cannot be empty.", "error");
      return;
    }
    const currentList = subcategories[parentKey] || [];
    if (isDuplicate(currentList, trimmedNew, oldName)) {
      showToast(`Duplicate entry! Subcategory "${trimmedNew}" already exists under ${parentKey}.`, "error");
      return;
    }

    setSaving(true);
    try {
      const updatedList = currentList.map((item) => (item === oldName ? trimmedNew : item));
      const updatedMap = { ...subcategories, [parentKey]: updatedList };

      await saveTaxonomyDoc("subcategories", { map: updatedMap });
      setSubcategories(updatedMap);
      setEditingItem(null);
      showToast(`Subcategory updated to "${trimmedNew}".`);
    } catch (err: any) {
      showToast("Failed to edit subcategory: " + (err?.message || err), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubcategory = (parentCat: string, subName: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Subcategory",
      message: `Delete subcategory "${subName}" from "${parentCat}"?`,
      confirmText: "Delete Subcategory",
      isDanger: true,
      onConfirm: async () => {
        setSaving(true);
        try {
          const currentList = subcategories[parentCat] || [];
          const updatedList = currentList.filter((s) => s !== subName);
          const updatedMap = { ...subcategories, [parentCat]: updatedList };

          await saveTaxonomyDoc("subcategories", { map: updatedMap });
          setSubcategories(updatedMap);
          showToast(`Subcategory "${subName}" deleted.`);
        } catch (err: any) {
          showToast("Failed to delete subcategory: " + (err?.message || err), "error");
        } finally {
          setSaving(false);
        }
      }
    });
  };

  // 3. CAR BRAND HANDLERS
  const handleAddBrand = async () => {
    const trimmed = brandName.trim();
    if (!trimmed) {
      showToast("Please enter a Brand name.", "error");
      return;
    }
    if (isDuplicate(Object.keys(brands), trimmed)) {
      showToast(`Duplicate entry! Brand "${trimmed}" already exists.`, "error");
      return;
    }

    setSaving(true);
    try {
      const updatedBrands = { ...brands, [trimmed]: brands[trimmed] || [] };
      const updatedLogos = { ...brandLogos, [trimmed]: brandLogo.trim() };

      await saveTaxonomyDoc("brands", { map: updatedBrands });
      if (brandLogo.trim()) {
        await saveTaxonomyDoc("brand_images", { map: updatedLogos });
      }

      setBrands(updatedBrands);
      setBrandLogos(updatedLogos);
      setBrandName("");
      setBrandLogo("");
      if (!modelParentBrand) setModelParentBrand(trimmed);
      showToast(`Brand "${trimmed}" saved to Firestore.`);
    } catch (err: any) {
      showToast("Failed to save brand: " + (err?.message || err), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEditBrand = async () => {
    if (!editingItem) return;
    const { oldName, newName, imageUrl } = editingItem;
    const trimmedNew = newName.trim();
    if (!trimmedNew) {
      showToast("Brand name cannot be empty.", "error");
      return;
    }
    if (isDuplicate(Object.keys(brands), trimmedNew, oldName)) {
      showToast(`Duplicate entry! Brand "${trimmedNew}" already exists.`, "error");
      return;
    }

    setSaving(true);
    try {
      const updatedBrands = { ...brands };
      const existingModels = updatedBrands[oldName] || [];
      delete updatedBrands[oldName];
      updatedBrands[trimmedNew] = existingModels;

      const updatedLogos = { ...brandLogos };
      delete updatedLogos[oldName];
      if (imageUrl?.trim()) {
        updatedLogos[trimmedNew] = imageUrl.trim();
      }

      await saveTaxonomyDoc("brands", { map: updatedBrands });
      await saveTaxonomyDoc("brand_images", { map: updatedLogos });

      setBrands(updatedBrands);
      setBrandLogos(updatedLogos);
      setEditingItem(null);
      showToast(`Brand "${trimmedNew}" updated.`);
    } catch (err: any) {
      showToast("Failed to edit brand: " + (err?.message || err), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBrand = (bName: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Car Brand",
      message: `Delete brand "${bName}" and all associated models?`,
      confirmText: "Delete Brand",
      isDanger: true,
      onConfirm: async () => {
        setSaving(true);
        try {
          const updatedBrands = { ...brands };
          delete updatedBrands[bName];
          const updatedLogos = { ...brandLogos };
          delete updatedLogos[bName];

          await saveTaxonomyDoc("brands", { map: updatedBrands });
          await saveTaxonomyDoc("brand_images", { map: updatedLogos });

          setBrands(updatedBrands);
          setBrandLogos(updatedLogos);
          showToast(`Brand "${bName}" deleted.`);
        } catch (err: any) {
          showToast("Failed to delete brand: " + (err?.message || err), "error");
        } finally {
          setSaving(false);
        }
      }
    });
  };

  // 4. CAR MODEL HANDLERS
  const handleAddModel = async () => {
    if (!modelParentBrand) {
      showToast("Please select or add a Car Brand first.", "error");
      return;
    }
    const trimmed = modelName.trim();
    if (!trimmed) {
      showToast("Please enter a Model name.", "error");
      return;
    }
    const currentList = brands[modelParentBrand] || [];
    if (isDuplicate(currentList, trimmed)) {
      showToast(`Duplicate entry! Model "${trimmed}" already exists under ${modelParentBrand}.`, "error");
      return;
    }

    setSaving(true);
    try {
      const updatedList = [...currentList, trimmed];
      const updatedBrands = { ...brands, [modelParentBrand]: updatedList };

      await saveTaxonomyDoc("brands", { map: updatedBrands });
      setBrands(updatedBrands);
      setModelName("");
      showToast(`Model "${trimmed}" added to ${modelParentBrand}.`);
    } catch (err: any) {
      showToast("Failed to save model: " + (err?.message || err), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEditModel = async () => {
    if (!editingItem || !editingItem.parentKey) return;
    const { parentKey, oldName, newName } = editingItem;
    const trimmedNew = newName.trim();
    if (!trimmedNew) return;
    const currentList = brands[parentKey] || [];
    if (isDuplicate(currentList, trimmedNew, oldName)) {
      showToast(`Duplicate entry! Model "${trimmedNew}" already exists under ${parentKey}.`, "error");
      return;
    }

    setSaving(true);
    try {
      const updatedList = currentList.map((m) => (m === oldName ? trimmedNew : m));
      const updatedBrands = { ...brands, [parentKey]: updatedList };

      await saveTaxonomyDoc("brands", { map: updatedBrands });
      setBrands(updatedBrands);
      setEditingItem(null);
      showToast(`Model updated to "${trimmedNew}".`);
    } catch (err: any) {
      showToast("Failed to edit model: " + (err?.message || err), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteModel = (parentBrand: string, mName: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Car Model",
      message: `Delete model "${mName}" from "${parentBrand}"?`,
      confirmText: "Delete Model",
      isDanger: true,
      onConfirm: async () => {
        setSaving(true);
        try {
          const currentList = brands[parentBrand] || [];
          const updatedList = currentList.filter((m) => m !== mName);
          const updatedBrands = { ...brands, [parentBrand]: updatedList };

          await saveTaxonomyDoc("brands", { map: updatedBrands });
          setBrands(updatedBrands);
          showToast(`Model "${mName}" deleted.`);
        } catch (err: any) {
          showToast("Failed to delete model: " + (err?.message || err), "error");
        } finally {
          setSaving(false);
        }
      }
    });
  };

  // 5. VARIANT HANDLERS
  const getModelKey = (b: string, m: string) => `${b}:${m}`;

  const handleAddVariant = async () => {
    if (!variantParentModel) {
      showToast("Please select a Model first.", "error");
      return;
    }
    const trimmed = variantName.trim();
    if (!trimmed) {
      showToast("Please enter a variant name.", "error");
      return;
    }
    const key = getModelKey(variantParentBrand, variantParentModel);
    const currentList = variants[key] || variants[variantParentModel] || [];
    if (isDuplicate(currentList, trimmed)) {
      showToast(`Duplicate entry! Variant "${trimmed}" already exists for ${variantParentModel}.`, "error");
      return;
    }

    setSaving(true);
    try {
      const updatedList = [...currentList, trimmed];
      const updatedVariants = { ...variants, [key]: updatedList };

      await saveTaxonomyDoc("variants", { map: updatedVariants });
      setVariants(updatedVariants);
      setVariantName("");
      showToast(`Variant "${trimmed}" added to ${variantParentModel}.`);
    } catch (err: any) {
      showToast("Failed to save variant: " + (err?.message || err), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVariant = (key: string, vName: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Variant",
      message: `Delete variant "${vName}"?`,
      confirmText: "Delete Variant",
      isDanger: true,
      onConfirm: async () => {
        setSaving(true);
        try {
          const currentList = variants[key] || [];
          const updatedList = currentList.filter((v) => v !== vName);
          const updatedVariants = { ...variants, [key]: updatedList };

          await saveTaxonomyDoc("variants", { map: updatedVariants });
          setVariants(updatedVariants);
          showToast(`Variant "${vName}" deleted.`);
        } catch (err: any) {
          showToast("Failed to delete variant: " + (err?.message || err), "error");
        } finally {
          setSaving(false);
        }
      }
    });
  };

  // 6. STATE HANDLERS
  const handleAddState = async () => {
    const trimmed = stateName.trim();
    if (!trimmed) return;
    if (isDuplicate(states, trimmed)) {
      showToast(`Duplicate entry! State "${trimmed}" already exists.`, "error");
      return;
    }

    setSaving(true);
    try {
      const updatedStates = [...states, trimmed];
      await saveTaxonomyDoc("states", { list: updatedStates });
      setStates(updatedStates);
      setStateName("");
      if (!districtParentState) setDistrictParentState(trimmed);
      showToast(`State "${trimmed}" added.`);
    } catch (err: any) {
      showToast("Failed to save state: " + (err?.message || err), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteState = (sName: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete State",
      message: `Delete state "${sName}" and its districts?`,
      confirmText: "Delete State",
      isDanger: true,
      onConfirm: async () => {
        setSaving(true);
        try {
          const updatedStates = states.filter((s) => s !== sName);
          const updatedDistricts = { ...districts };
          delete updatedDistricts[sName];

          await saveTaxonomyDoc("states", { list: updatedStates });
          await saveTaxonomyDoc("districts", { map: updatedDistricts });

          setStates(updatedStates);
          setDistricts(updatedDistricts);
          showToast(`State "${sName}" deleted.`);
        } catch (err: any) {
          showToast("Failed to delete state: " + (err?.message || err), "error");
        } finally {
          setSaving(false);
        }
      }
    });
  };

  // 7. DISTRICT HANDLERS
  const handleAddDistrict = async () => {
    if (!districtParentState) {
      showToast("Please select a State first.", "error");
      return;
    }
    const trimmed = districtName.trim();
    if (!trimmed) return;
    const currentList = districts[districtParentState] || [];
    if (isDuplicate(currentList, trimmed)) {
      showToast(`Duplicate entry! District "${trimmed}" already exists under ${districtParentState}.`, "error");
      return;
    }

    setSaving(true);
    try {
      const updatedList = [...currentList, trimmed];
      const updatedDistricts = { ...districts, [districtParentState]: updatedList };

      await saveTaxonomyDoc("districts", { map: updatedDistricts });
      setDistricts(updatedDistricts);
      setDistrictName("");
      showToast(`District "${trimmed}" added to ${districtParentState}.`);
    } catch (err: any) {
      showToast("Failed to save district: " + (err?.message || err), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDistrict = (parentState: string, dName: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete District",
      message: `Delete district "${dName}" from "${parentState}"?`,
      confirmText: "Delete District",
      isDanger: true,
      onConfirm: async () => {
        setSaving(true);
        try {
          const currentList = districts[parentState] || [];
          const updatedList = currentList.filter((d) => d !== dName);
          const updatedDistricts = { ...districts, [parentState]: updatedList };

          await saveTaxonomyDoc("districts", { map: updatedDistricts });
          setDistricts(updatedDistricts);
          showToast(`District "${dName}" deleted.`);
        } catch (err: any) {
          showToast("Failed to delete district: " + (err?.message || err), "error");
        } finally {
          setSaving(false);
        }
      }
    });
  };

  // 8. CITY HANDLERS
  const handleAddCity = async () => {
    if (!cityParentDistrict) {
      showToast("Please select a District first.", "error");
      return;
    }
    const trimmed = cityName.trim();
    if (!trimmed) return;
    const currentList = cities[cityParentDistrict] || [];
    if (isDuplicate(currentList, trimmed)) {
      showToast(`Duplicate entry! City "${trimmed}" already exists under ${cityParentDistrict}.`, "error");
      return;
    }

    setSaving(true);
    try {
      const updatedList = [...currentList, trimmed];
      const updatedCities = { ...cities, [cityParentDistrict]: updatedList };

      await saveTaxonomyDoc("cities", { map: updatedCities });
      setCities(updatedCities);
      setCityName("");
      showToast(`City "${trimmed}" added to ${cityParentDistrict}.`);
    } catch (err: any) {
      showToast("Failed to save city: " + (err?.message || err), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCity = (parentDistrict: string, cName: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete City",
      message: `Delete city "${cName}" from "${parentDistrict}"?`,
      confirmText: "Delete City",
      isDanger: true,
      onConfirm: async () => {
        setSaving(true);
        try {
          const currentList = cities[parentDistrict] || [];
          const updatedList = currentList.filter((c) => c !== cName);
          const updatedCities = { ...cities, [parentDistrict]: updatedList };

          await saveTaxonomyDoc("cities", { map: updatedCities });
          setCities(updatedCities);
          showToast(`City "${cName}" deleted.`);
        } catch (err: any) {
          showToast("Failed to delete city: " + (err?.message || err), "error");
        } finally {
          setSaving(false);
        }
      }
    });
  };

  // 9. POPULAR LOCATIONS HANDLERS
  const handleAddPopularLocation = async () => {
    const trimmed = locationName.trim();
    if (!trimmed) return;
    if (isDuplicate(locations, trimmed)) {
      showToast(`Duplicate entry! Location "${trimmed}" already exists.`, "error");
      return;
    }

    setSaving(true);
    try {
      const updatedLocations = [...locations, trimmed];
      await saveTaxonomyDoc("locations", { list: updatedLocations });
      setLocations(updatedLocations);
      setLocationName("");
      showToast(`Location "${trimmed}" saved.`);
    } catch (err: any) {
      showToast("Failed to save location: " + (err?.message || err), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePopularLocation = (loc: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Location",
      message: `Delete popular location "${loc}"?`,
      confirmText: "Delete Location",
      isDanger: true,
      onConfirm: async () => {
        setSaving(true);
        try {
          const updatedLocations = locations.filter((l) => l !== loc);
          await saveTaxonomyDoc("locations", { list: updatedLocations });
          setLocations(updatedLocations);
          showToast(`Location "${loc}" deleted.`);
        } catch (err: any) {
          showToast("Failed to delete location: " + (err?.message || err), "error");
        } finally {
          setSaving(false);
        }
      }
    });
  };

  // 10. SPARE PART CREATION / EDITING
  const handleSaveSparePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partForm.title.trim() || !partForm.price || !partForm.category.trim() || !partForm.carBrand.trim()) {
      showToast("Please fill in Title, Price, Category, and Car Brand.", "error");
      return;
    }

    setSaving(true);
    try {
      if (editingPart) {
        // Edit existing listing
        await updateSparePartListing(editingPart.id, {
          title: partForm.title.trim(),
          description: partForm.description.trim(),
          price: parseFloat(partForm.price) || 0,
          carBrand: partForm.carBrand.trim(),
          carModel: partForm.carModel.trim(),
          category: partForm.category.trim(),
          partName: partForm.partName.trim(),
          condition: partForm.condition,
          state: partForm.state.trim(),
          district: partForm.district.trim(),
          location: partForm.district.trim() || partForm.state.trim() || "India",
          contactName: partForm.contactName.trim(),
          contactPhone: partForm.contactPhone.trim(),
          imageUrl: partForm.imageUrl || "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&q=80",
          imageUrls: partForm.imageUrls.length > 0 ? partForm.imageUrls : [partForm.imageUrl || "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&q=80"]
        });
        showToast(`Spare Part "${partForm.title}" updated.`);
      } else {
        // Create new listing directly in Firestore
        await createSparePartListing({
          title: partForm.title.trim(),
          description: partForm.description.trim(),
          price: parseFloat(partForm.price) || 0,
          carBrand: partForm.carBrand.trim(),
          carModel: partForm.carModel.trim(),
          category: partForm.category.trim(),
          partName: partForm.partName.trim(),
          condition: partForm.condition,
          state: partForm.state.trim(),
          district: partForm.district.trim(),
          location: partForm.district.trim() || partForm.state.trim() || "India",
          contactName: partForm.contactName.trim(),
          contactPhone: partForm.contactPhone.trim(),
          imageUrl: partForm.imageUrl || "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&q=80",
          imageUrls: partForm.imageUrls.length > 0 ? partForm.imageUrls : [partForm.imageUrl || "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&q=80"],
          sellerId: currentUser?.id || "admin",
          sellerEmail: currentUser?.email || "admin@autoparts.app",
          approved: true,
          status: "approved"
        });
        showToast(`New Spare Part "${partForm.title}" added to Firestore.`);
      }

      setShowAddPartModal(false);
      setEditingPart(null);
      onPartUpdated();
    } catch (err: any) {
      showToast("Failed to save spare part: " + (err?.message || err), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSparePart = (part: SparePart) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Spare Part",
      message: `Are you sure you want to delete listing "${part.title}"?`,
      confirmText: "Delete Spare Part",
      isDanger: true,
      onConfirm: async () => {
        try {
          await deleteSparePartListing(part.id);
          showToast(`Listing "${part.title}" deleted.`);
          onPartUpdated();
        } catch (err: any) {
          showToast("Failed to delete listing: " + (err?.message || err), "error");
        }
      }
    });
  };

  // 11. OPTIONAL SEEDER FUNCTION FOR STANDARD AUTOMOTIVE TAXONOMY
  const handleSeedStandardTaxonomy = () => {
    setConfirmModal({
      isOpen: true,
      title: "Seed Standard Automotive Taxonomy",
      message: "This will populate standard Indian categories, car brands, models, states, and districts into Firestore config. Continue?",
      confirmText: "Seed Standard Taxonomy",
      isDanger: false,
      onConfirm: async () => {
        setSaving(true);
        try {
          const catList = CAR_PART_CATEGORIES;
          const brandMap = INDIAN_CAR_BRANDS;
          const subMap = CAR_SPARE_PARTS_BY_CATEGORY;
          const locList = POPULAR_LOCATIONS;

          const stateList = INDIAN_STATES_AND_DISTRICTS.map((s) => s.state);
          const distMap: Record<string, string[]> = {};
          INDIAN_STATES_AND_DISTRICTS.forEach((s) => {
            distMap[s.state] = s.districts;
          });

          await saveTaxonomyDoc("categories", { list: catList });
          await saveTaxonomyDoc("brands", { map: brandMap });
          await saveTaxonomyDoc("subcategories", { map: subMap });
          await saveTaxonomyDoc("locations", { list: locList });
          await saveTaxonomyDoc("states", { list: stateList });
          await saveTaxonomyDoc("districts", { map: distMap });

          await loadTaxonomy();
          showToast("Standard Automotive Taxonomy successfully seeded into Firestore!");
        } catch (err: any) {
          showToast("Failed to seed taxonomy: " + (err?.message || err), "error");
        } finally {
          setSaving(false);
        }
      }
    });
  };

  // Filtered lists based on search term
  const filterList = (items: string[]) => {
    if (!searchQuery.trim()) return items;
    const norm = searchQuery.trim().toLowerCase();
    return items.filter((item) => item.toLowerCase().includes(norm));
  };

  return (
    <div className="space-y-4">
      {/* CMS Header & Sub-Navigation */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
              <Settings className="text-[#0056D2]" size={18} />
              Taxonomy & Content Management
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Manage categories, brands, models, variants, spare parts, and locations live in Firestore.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              onClick={handleSeedStandardTaxonomy}
              disabled={saving}
              className="flex-1 sm:flex-initial bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Sparkles size={14} className="text-amber-600" />
              <span>Seed Standard Data</span>
            </button>
            <button
              onClick={loadTaxonomy}
              disabled={loading}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw size={16} className={loading ? "animate-spin text-[#0056D2]" : ""} />
            </button>
          </div>
        </div>

        {/* Sub Tabs Mobile Scrollable */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px] font-bold">
          {[
            { id: "categories", label: `Categories (${categories.length})`, icon: Tag },
            { id: "subcategories", label: "Sub Categories", icon: Layers },
            { id: "brands", label: `Brands (${Object.keys(brands).length})`, icon: Car },
            { id: "models", label: "Car Models", icon: Settings },
            { id: "variants", label: "Variants", icon: SlidersHorizontal },
            { id: "parts", label: `Spare Parts (${allParts.length})`, icon: Plus },
            { id: "states", label: `States (${states.length})`, icon: Globe },
            { id: "districts", label: "Districts", icon: MapPin },
            { id: "cities", label: "Cities", icon: Building },
            { id: "locations", label: `Popular Loc (${locations.length})`, icon: MapPin },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeCmsTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveCmsTab(tab.id as any);
                  setSearchQuery("");
                }}
                className={`px-3 py-1.5 rounded-xl shrink-0 flex items-center gap-1.5 cursor-pointer transition-all ${
                  isActive
                    ? "bg-[#0056D2] text-white font-extrabold shadow-sm shadow-[#0056D2]/30"
                    : "bg-slate-100/80 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Bar for Taxonomy CMS */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${activeCmsTab.replace("_", " ")}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs font-medium focus:outline-none focus:border-[#0056D2]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* SUB TAB CONTENT */}

      {/* 1. CATEGORIES CMS */}
      {activeCmsTab === "categories" && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs space-y-4">
          <h3 className="text-xs font-black text-slate-800 border-b border-slate-50 pb-2">
            Manage Part Categories
          </h3>

          {/* Add Category Form */}
          <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 space-y-2.5">
            <input
              type="text"
              placeholder="New Category Name (e.g., Engine Components)"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-[#0056D2]"
            />

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Image URL or upload image below"
                value={catImage}
                onChange={(e) => setCatImage(e.target.value)}
                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-[#0056D2]"
              />
              <label className="bg-slate-200 hover:bg-slate-300 text-slate-700 p-2 rounded-lg cursor-pointer transition-colors shrink-0">
                <UploadCloud size={16} className="text-[#0056D2]" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, setCatImage);
                  }}
                  className="hidden"
                />
              </label>
              <button
                onClick={handleAddCategory}
                disabled={saving}
                className="bg-[#0056D2] hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg cursor-pointer text-xs flex items-center gap-1 shrink-0"
              >
                <Plus size={14} /> Add Category
              </button>
            </div>
          </div>

          {/* Category List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filterList(categories).map((cat) => {
              const imgUrl = categoryImages[cat];
              const subCount = (subcategories[cat] || []).length;
              return (
                <div
                  key={cat}
                  className="border border-slate-100 rounded-xl p-3 flex items-center justify-between gap-2 bg-slate-50/30 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {imgUrl ? (
                      <img src={imgUrl} alt={cat} className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                        <Tag size={16} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-800 truncate">{cat}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{subCount} subcategories</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEditingItem({ type: "category", oldName: cat, newName: cat, imageUrl: imgUrl || "" })}
                      className="p-1.5 text-slate-400 hover:text-[#0056D2] transition-colors cursor-pointer"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. SUBCATEGORIES CMS */}
      {activeCmsTab === "subcategories" && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs space-y-4">
          <h3 className="text-xs font-black text-slate-800 border-b border-slate-50 pb-2">
            Manage Sub Categories
          </h3>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-600">Select Parent Category:</label>
            <select
              value={subcatParent}
              onChange={(e) => setSubcatParent(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#0056D2]"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder={`Add Sub Category under ${subcatParent || "Category"}`}
              value={subcatName}
              onChange={(e) => setSubcatName(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#0056D2]"
            />
            <button
              onClick={handleAddSubcategory}
              disabled={saving}
              className="bg-[#0056D2] hover:bg-blue-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Plus size={14} /> Add
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-2">
            {filterList(subcategories[subcatParent] || []).map((sub) => (
              <span
                key={sub}
                className="bg-slate-100 text-slate-800 text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-slate-200/60"
              >
                <span>{sub}</span>
                <button
                  onClick={() => setEditingItem({ type: "subcategory", parentKey: subcatParent, oldName: sub, newName: sub })}
                  className="text-slate-400 hover:text-[#0056D2] transition-colors cursor-pointer"
                >
                  <Edit2 size={10} />
                </button>
                <button
                  onClick={() => handleDeleteSubcategory(subcatParent, sub)}
                  className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 3. CAR BRANDS CMS */}
      {activeCmsTab === "brands" && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs space-y-4">
          <h3 className="text-xs font-black text-slate-800 border-b border-slate-50 pb-2">
            Manage Car Brands
          </h3>

          <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 space-y-2.5">
            <input
              type="text"
              placeholder="Brand Name (e.g. Maruti Suzuki)"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-[#0056D2]"
            />

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Logo URL or upload file below"
                value={brandLogo}
                onChange={(e) => setBrandLogo(e.target.value)}
                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-[#0056D2]"
              />
              <label className="bg-slate-200 hover:bg-slate-300 text-slate-700 p-2 rounded-lg cursor-pointer transition-colors shrink-0">
                <UploadCloud size={16} className="text-[#0056D2]" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, setBrandLogo);
                  }}
                  className="hidden"
                />
              </label>
              <button
                onClick={handleAddBrand}
                disabled={saving}
                className="bg-[#0056D2] hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg cursor-pointer text-xs flex items-center gap-1 shrink-0"
              >
                <Plus size={14} /> Add Brand
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filterList(Object.keys(brands)).map((bName) => {
              const logo = brandLogos[bName];
              const models = brands[bName] || [];
              return (
                <div
                  key={bName}
                  className="border border-slate-100 rounded-xl p-3 flex items-center justify-between gap-2 bg-slate-50/30 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {logo ? (
                      <img src={logo} alt={bName} className="w-9 h-9 rounded-lg object-contain bg-white border border-slate-200 p-0.5 shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                        <Car size={16} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-800 truncate">{bName}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{models.length} car models</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEditingItem({ type: "brand", oldName: bName, newName: bName, imageUrl: logo || "" })}
                      className="p-1.5 text-slate-400 hover:text-[#0056D2] transition-colors cursor-pointer"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteBrand(bName)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. CAR MODELS CMS */}
      {activeCmsTab === "models" && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs space-y-4">
          <h3 className="text-xs font-black text-slate-800 border-b border-slate-50 pb-2">
            Manage Car Models
          </h3>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-600">Select Brand:</label>
            <select
              value={modelParentBrand}
              onChange={(e) => setModelParentBrand(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#0056D2]"
            >
              {Object.keys(brands).map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder={`Add Model under ${modelParentBrand || "Brand"}`}
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#0056D2]"
            />
            <button
              onClick={handleAddModel}
              disabled={saving}
              className="bg-[#0056D2] hover:bg-blue-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Plus size={14} /> Add Model
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-2">
            {filterList(brands[modelParentBrand] || []).map((m) => (
              <span
                key={m}
                className="bg-slate-100 text-slate-800 text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-slate-200/60"
              >
                <span>{m}</span>
                <button
                  onClick={() => setEditingItem({ type: "model", parentKey: modelParentBrand, oldName: m, newName: m })}
                  className="text-slate-400 hover:text-[#0056D2] transition-colors cursor-pointer"
                >
                  <Edit2 size={10} />
                </button>
                <button
                  onClick={() => handleDeleteModel(modelParentBrand, m)}
                  className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 5. VARIANTS CMS */}
      {activeCmsTab === "variants" && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs space-y-4">
          <h3 className="text-xs font-black text-slate-800 border-b border-slate-50 pb-2">
            Manage Car Model Variants
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold text-slate-600">Brand:</label>
              <select
                value={variantParentBrand}
                onChange={(e) => {
                  setVariantParentBrand(e.target.value);
                  const firstM = (brands[e.target.value] || [])[0] || "";
                  setVariantParentModel(firstM);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#0056D2]"
              >
                {Object.keys(brands).map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600">Model:</label>
              <select
                value={variantParentModel}
                onChange={(e) => setVariantParentModel(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#0056D2]"
              >
                {(brands[variantParentBrand] || []).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder={`Add Variant (e.g. VXi, ZXi, Automatic)`}
              value={variantName}
              onChange={(e) => setVariantName(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#0056D2]"
            />
            <button
              onClick={handleAddVariant}
              disabled={saving}
              className="bg-[#0056D2] hover:bg-blue-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Plus size={14} /> Add Variant
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-2">
            {filterList(
              variants[`${variantParentBrand}:${variantParentModel}`] ||
              variants[variantParentModel] ||
              []
            ).map((v) => (
              <span
                key={v}
                className="bg-slate-100 text-slate-800 text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-slate-200/60"
              >
                <span>{v}</span>
                <button
                  onClick={() => handleDeleteVariant(getModelKey(variantParentBrand, variantParentModel), v)}
                  className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 6. SPARE PARTS CMS */}
      {activeCmsTab === "parts" && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-2">
            <h3 className="text-xs font-black text-slate-800">
              Spare Parts Catalog ({allParts.length})
            </h3>
            <button
              onClick={() => {
                setEditingPart(null);
                setPartForm({
                  title: "",
                  description: "",
                  price: "",
                  carBrand: Object.keys(brands)[0] || "",
                  carModel: (brands[Object.keys(brands)[0]] || [])[0] || "",
                  category: categories[0] || "",
                  partName: "",
                  condition: "Brand New",
                  state: states[0] || "",
                  district: "",
                  contactName: currentUser?.name || "Admin",
                  contactPhone: currentUser?.phone || "+91 98765 43210",
                  imageUrl: "",
                  imageUrls: []
                });
                setShowAddPartModal(true);
              }}
              className="bg-[#0056D2] hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 cursor-pointer"
            >
              <Plus size={14} /> Add Spare Part
            </button>
          </div>

          {/* Parts List Grid */}
          <div className="space-y-2">
            {allParts
              .filter((p) => {
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                return (
                  p.title.toLowerCase().includes(q) ||
                  p.carBrand.toLowerCase().includes(q) ||
                  p.carModel.toLowerCase().includes(q) ||
                  p.category.toLowerCase().includes(q)
                );
              })
              .map((part) => (
                <div
                  key={part.id}
                  className="border border-slate-100 rounded-xl p-3 flex items-center justify-between gap-3 bg-slate-50/20 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={part.imageUrl}
                      alt={part.title}
                      className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-800 truncate">{part.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        ₹{part.price.toLocaleString("en-IN")} • {part.carBrand} {part.carModel} • {part.category}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setEditingPart(part);
                        setPartForm({
                          title: part.title,
                          description: part.description,
                          price: String(part.price),
                          carBrand: part.carBrand,
                          carModel: part.carModel,
                          category: part.category,
                          partName: part.partName || "",
                          condition: part.condition,
                          state: part.state || "",
                          district: part.district || "",
                          contactName: part.contactName,
                          contactPhone: part.contactPhone,
                          imageUrl: part.imageUrl,
                          imageUrls: part.imageUrls || [part.imageUrl]
                        });
                        setShowAddPartModal(true);
                      }}
                      className="p-2 text-slate-400 hover:text-[#0056D2] transition-colors cursor-pointer"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteSparePart(part)}
                      className="p-2 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 7. STATES CMS */}
      {activeCmsTab === "states" && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs space-y-4">
          <h3 className="text-xs font-black text-slate-800 border-b border-slate-50 pb-2">
            Manage Indian States
          </h3>

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="State Name (e.g. Maharashtra)"
              value={stateName}
              onChange={(e) => setStateName(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#0056D2]"
            />
            <button
              onClick={handleAddState}
              disabled={saving}
              className="bg-[#0056D2] hover:bg-blue-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Plus size={14} /> Add State
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-2">
            {filterList(states).map((s) => (
              <span
                key={s}
                className="bg-slate-100 text-slate-800 text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-slate-200/60"
              >
                <span>{s}</span>
                <button
                  onClick={() => handleDeleteState(s)}
                  className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 8. DISTRICTS CMS */}
      {activeCmsTab === "districts" && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs space-y-4">
          <h3 className="text-xs font-black text-slate-800 border-b border-slate-50 pb-2">
            Manage Districts
          </h3>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-600">Select State:</label>
            <select
              value={districtParentState}
              onChange={(e) => setDistrictParentState(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#0056D2]"
            >
              {states.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder={`Add District under ${districtParentState || "State"}`}
              value={districtName}
              onChange={(e) => setDistrictName(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#0056D2]"
            />
            <button
              onClick={handleAddDistrict}
              disabled={saving}
              className="bg-[#0056D2] hover:bg-blue-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Plus size={14} /> Add District
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-2">
            {filterList(districts[districtParentState] || []).map((d) => (
              <span
                key={d}
                className="bg-slate-100 text-slate-800 text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-slate-200/60"
              >
                <span>{d}</span>
                <button
                  onClick={() => handleDeleteDistrict(districtParentState, d)}
                  className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 9. CITIES CMS */}
      {activeCmsTab === "cities" && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs space-y-4">
          <h3 className="text-xs font-black text-slate-800 border-b border-slate-50 pb-2">
            Manage Cities
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold text-slate-600">State:</label>
              <select
                value={cityParentState}
                onChange={(e) => {
                  setCityParentState(e.target.value);
                  const firstD = (districts[e.target.value] || [])[0] || "";
                  setCityParentDistrict(firstD);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#0056D2]"
              >
                {states.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600">District:</label>
              <select
                value={cityParentDistrict}
                onChange={(e) => setCityParentDistrict(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#0056D2]"
              >
                {(districts[cityParentState] || []).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder={`Add City under ${cityParentDistrict || "District"}`}
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#0056D2]"
            />
            <button
              onClick={handleAddCity}
              disabled={saving}
              className="bg-[#0056D2] hover:bg-blue-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Plus size={14} /> Add City
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-2">
            {filterList(cities[cityParentDistrict] || []).map((c) => (
              <span
                key={c}
                className="bg-slate-100 text-slate-800 text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-slate-200/60"
              >
                <span>{c}</span>
                <button
                  onClick={() => handleDeleteCity(cityParentDistrict, c)}
                  className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 10. POPULAR LOCATIONS CMS */}
      {activeCmsTab === "locations" && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs space-y-4">
          <h3 className="text-xs font-black text-slate-800 border-b border-slate-50 pb-2">
            Manage Popular Locations
          </h3>

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Popular Location (e.g. All India, Mumbai)"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#0056D2]"
            />
            <button
              onClick={handleAddPopularLocation}
              disabled={saving}
              className="bg-[#0056D2] hover:bg-blue-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Plus size={14} /> Add Location
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-2">
            {filterList(locations).map((loc) => (
              <span
                key={loc}
                className="bg-slate-100 text-slate-800 text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-slate-200/60"
              >
                <span>{loc}</span>
                <button
                  onClick={() => handleDeletePopularLocation(loc)}
                  className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* EDIT TAXONOMY MODAL */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-black text-slate-800">
                Edit {editingItem.type.toUpperCase()}
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600">Name:</label>
                <input
                  type="text"
                  value={editingItem.newName}
                  onChange={(e) => setEditingItem({ ...editingItem, newName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#0056D2] mt-1"
                />
              </div>

              {(editingItem.type === "category" || editingItem.type === "brand") && (
                <div>
                  <label className="text-[11px] font-bold text-slate-600">
                    {editingItem.type === "category" ? "Category Image:" : "Brand Logo:"}
                  </label>
                  <input
                    type="text"
                    placeholder="Image URL"
                    value={editingItem.imageUrl || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, imageUrl: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#0056D2] mt-1"
                  />
                  <label className="mt-1.5 inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors">
                    <UploadCloud size={12} className="text-[#0056D2]" />
                    <span>Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, (url) => setEditingItem({ ...editingItem, imageUrl: url }));
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setEditingItem(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (editingItem.type === "category") handleSaveEditCategory();
                  else if (editingItem.type === "subcategory") handleSaveEditSubcategory();
                  else if (editingItem.type === "brand") handleSaveEditBrand();
                  else if (editingItem.type === "model") handleSaveEditModel();
                }}
                disabled={saving}
                className="bg-[#0056D2] hover:bg-blue-700 text-white font-bold px-4 py-1.5 rounded-xl text-xs cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT SPARE PART MODAL */}
      {showAddPartModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-100 space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-black text-slate-800">
                {editingPart ? "Edit Spare Part Listing" : "Add New Spare Part"}
              </h3>
              <button
                onClick={() => setShowAddPartModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSparePart} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700">Part Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Swift Carbon Fiber Steering Wheel"
                  value={partForm.title}
                  onChange={(e) => setPartForm({ ...partForm, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#0056D2] mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700">Price (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="8900"
                    value={partForm.price}
                    onChange={(e) => setPartForm({ ...partForm, price: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#0056D2] mt-1"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700">Condition</label>
                  <select
                    value={partForm.condition}
                    onChange={(e) => setPartForm({ ...partForm, condition: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#0056D2] mt-1"
                  >
                    <option value="Brand New">Brand New</option>
                    <option value="Like New">Like New</option>
                    <option value="Used (Good)">Used (Good)</option>
                    <option value="For Scrap/Spares">For Scrap/Spares</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700">Category *</label>
                  <select
                    value={partForm.category}
                    onChange={(e) => setPartForm({ ...partForm, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#0056D2] mt-1"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700">Car Brand *</label>
                  <select
                    value={partForm.carBrand}
                    onChange={(e) => setPartForm({ ...partForm, carBrand: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#0056D2] mt-1"
                  >
                    <option value="">Select Brand</option>
                    {Object.keys(brands).map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700">Car Model</label>
                  <select
                    value={partForm.carModel}
                    onChange={(e) => setPartForm({ ...partForm, carModel: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#0056D2] mt-1"
                  >
                    <option value="">Select Model</option>
                    {(brands[partForm.carBrand] || []).map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700">Part Name/Subcat</label>
                  <input
                    type="text"
                    placeholder="e.g. Steering Wheel"
                    value={partForm.partName}
                    onChange={(e) => setPartForm({ ...partForm, partName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#0056D2] mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700">Description</label>
                <textarea
                  rows={2}
                  placeholder="Detailed part description..."
                  value={partForm.description}
                  onChange={(e) => setPartForm({ ...partForm, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium focus:outline-none focus:border-[#0056D2] mt-1"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700">Image URL / Upload</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    placeholder="Paste Image URL"
                    value={partForm.imageUrl}
                    onChange={(e) => setPartForm({ ...partForm, imageUrl: e.target.value })}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#0056D2]"
                  />
                  <label className="bg-slate-200 hover:bg-slate-300 text-slate-700 p-2 rounded-xl cursor-pointer transition-colors shrink-0">
                    <UploadCloud size={16} className="text-[#0056D2]" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, (url) => setPartForm({ ...partForm, imageUrl: url, imageUrls: [url] }));
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddPartModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#0056D2] hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-xl text-xs cursor-pointer shadow-sm shadow-[#0056D2]/30"
                >
                  {saving ? "Saving..." : editingPart ? "Update Listing" : "Publish Part"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
