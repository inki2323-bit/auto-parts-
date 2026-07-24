import React from "react";
import { useLanguage } from "../lib/LanguageContext";
import { Globe, ChevronDown } from "lucide-react";
import { Language } from "../lib/translations";

interface LanguageSelectorProps {
  variant?: "light" | "dark";
}

export default function LanguageSelector({ variant = "light" }: LanguageSelectorProps) {
  const { language, setLanguage } = useLanguage();

  const languages: { code: Language; label: string; nativeLabel: string }[] = [
    { code: "en", label: "English", nativeLabel: "English" },
    { code: "ta", label: "Tamil", nativeLabel: "தமிழ்" },
    { code: "hi", label: "Hindi", nativeLabel: "हिंदी" }
  ];

  const isLight = variant === "light";

  return (
    <div className="relative inline-flex items-center" id="language-selector-wrapper">
      <div className={`flex items-center gap-1 rounded-full py-0.5 px-2.5 shadow-2xs transition-all cursor-pointer group ${
        isLight
          ? "bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-800"
          : "bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100"
      }`}>
        <Globe size={12} className={isLight ? "text-[#2563EB]" : "text-sky-400"} />
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          className={`bg-transparent text-[11px] font-extrabold focus:outline-none cursor-pointer border-none pr-0.5 pl-0.5 appearance-none select-none ${
            isLight ? "text-slate-800" : "text-slate-100"
          }`}
          id="language-select"
          style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code} className={isLight ? "bg-white text-slate-900 text-xs" : "bg-slate-900 text-white text-xs"}>
              {lang.nativeLabel}
            </option>
          ))}
        </select>
        <ChevronDown size={10} className={isLight ? "text-slate-500 shrink-0 pointer-events-none" : "text-slate-400 shrink-0 pointer-events-none"} />
      </div>
    </div>
  );
}
