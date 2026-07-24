import React, { createContext, useContext, useState, useEffect } from "react";
import { translations, Language } from "./translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations["en"]) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("autoparts_language");
    return (saved as Language) || "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("autoparts_language", lang);
    // Dispatch a storage event or custom event so other potential tabs/instances update
    window.dispatchEvent(new Event("autoparts_language_changed"));
  };

  useEffect(() => {
    const handleLangChanged = () => {
      const saved = localStorage.getItem("autoparts_language");
      if (saved && saved !== language) {
        setLanguageState(saved as Language);
      }
    };
    window.addEventListener("autoparts_language_changed", handleLangChanged);
    return () => {
      window.removeEventListener("autoparts_language_changed", handleLangChanged);
    };
  }, [language]);

  const t = (key: keyof typeof translations["en"]): string => {
    const langDict = translations[language] || translations["en"];
    return langDict[key] || translations["en"][key] || String(key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
