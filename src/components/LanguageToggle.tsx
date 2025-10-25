"use client";

import { Globe } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { Button } from "@/components/ui/button";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "bn" : "en");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleLanguage}
      className="h-9 w-9"
      title={language === "en" ? "Switch to Bangla" : "ইংরেজিতে পরিবর্তন করুন"}
    >
      <Globe className="h-4 w-4" />
      <span className="sr-only ml-1 text-xs font-medium">
        {language === "en" ? "বাং" : "EN"}
      </span>
    </Button>
  );
}

// Mobile Language Toggle
export function MobileLanguageToggle() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "bn" : "en");
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center justify-center p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      title={language === "en" ? "Switch to Bangla" : "ইংরেজিতে পরিবর্তন করুন"}
    >
      <Globe className="h-4 w-4 mr-1" />
      <span className="text-xs font-medium">
        {language === "en" ? "বাং" : "EN"}
      </span>
    </button>
  );
}