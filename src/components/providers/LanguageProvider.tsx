"use client";

import { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "bn";

interface Translations {
  [key: string]: {
    en: string;
    bn: string;
  };
}

// Translation dictionary
const translations: Translations = {
  // Navigation
  "nav.home": { en: "Home", bn: "হোম" },
  "nav.routes": { en: "Routes", bn: "রুট" },
  "nav.bookings": { en: "My Bookings", bn: "আমার বুকিং" },
  "nav.support": { en: "Support", bn: "সাপোর্ট" },
  "nav.search": { en: "Search", bn: "খোঁজ" },
  "nav.signin": { en: "Sign In", bn: "সাইন ইন" },
  "nav.signup": { en: "Sign Up", bn: "সাইন আপ" },
  "nav.signout": { en: "Sign Out", bn: "সাইন আউট" },
  "nav.admin": { en: "Admin", bn: "অ্যাডমিন" },
  
  // Home Page
  "home.title": { en: "Your Journey", bn: "আপনার যাত্রা" },
  "home.subtitle": { en: "Starts Here", bn: "এখানে শুরু" },
  "home.description": { en: "Book bus tickets instantly with real-time seat selection, secure payments, and hassle-free travel experience.", bn: "রিয়েল-টাইম সিট নির্বাচন, নিরাপদ পেমেন্ট এবং ঝামেলা-মুক্ত ভ্রমণের অভিজ্ঞতা সহ তাত্ক্ষণিক বাস টিকিট বুক করুন।" },
  
  // Search Form
  "search.from": { en: "From", bn: "থেকে" },
  "search.to": { en: "To", bn: "যেখানে" },
  "search.date": { en: "Departure Date", bn: "যাত্রার তারিখ" },
  "search.passengers": { en: "Select Passengers", bn: "যাত্রী নির্বাচন করুন" },
  "search.passenger": { en: "Passenger", bn: "যাত্রী" },
  "search.passengers_plural": { en: "Passengers", bn: "যাত্রী" },
  "search.button": { en: "Search Amazing Bus Routes", bn: "আশ্চর্যজনক বাস রুট খুঁজুন" },
  "search.origin_placeholder": { en: "Select Origin", bn: "যাত্রা শুরুর স্থান নির্বাচন করুন" },
  "search.destination_placeholder": { en: "Select Destination", bn: "গন্তব্য নির্বাচন করুন" },
  
  // Features
  "features.tracking": { en: "Real-time Tracking", bn: "রিয়েল-টাইম ট্র্যাকিং" },
  "features.tracking_desc": { en: "Track your bus location and get live updates on departure and arrival times.", bn: "আপনার বাসের অবস্থান ট্র্যাক করুন এবং ছাড়া ও আগমনের সময়ের লাইভ আপডেট পান।" },
  "features.seats": { en: "Live Seat Selection", bn: "লাইভ সিট নির্বাচন" },
  "features.seats_desc": { en: "Choose your preferred seats with our interactive seat map and real-time availability.", bn: "আমাদের ইন্টারঅ্যাক্টিভ সিট ম্যাপ এবং রিয়েল-টাইম উপলব্ধতা দিয়ে আপনার পছন্দের সিট বেছে নিন।" },
  "features.payments": { en: "Secure Payments", bn: "নিরাপদ পেমেন্ট" },
  "features.payments_desc": { en: "Pay safely with our encrypted payment system and get instant confirmation.", bn: "আমাদের এনক্রিপ্টেড পেমেন্ট সিস্টেমের সাথে নিরাপদে অর্থ প্রদান করুন এবং তাৎক্ষণিক নিশ্চিতকরণ পান।" },
  
  // Cities
  "city.dhaka": { en: "Dhaka", bn: "ঢাকা" },
  "city.chittagong": { en: "Chittagong", bn: "চট্টগ্রাম" },
  "city.sylhet": { en: "Sylhet", bn: "সিলেট" },
  "city.rajshahi": { en: "Rajshahi", bn: "রাজশাহী" },
  "city.khulna": { en: "Khulna", bn: "খুলনা" },
  
  // Theme
  "theme.light": { en: "Light", bn: "হালকা" },
  "theme.dark": { en: "Dark", bn: "অন্ধকার" },
  "theme.system": { en: "System", bn: "সিস্টেম" },
  
  // Common
  "common.loading": { en: "Loading...", bn: "লোড হচ্ছে..." },
  "common.error": { en: "Error", bn: "ত্রুটি" },
  "common.success": { en: "Success", bn: "সফল" },
  "common.cancel": { en: "Cancel", bn: "বাতিল" },
  "common.confirm": { en: "Confirm", bn: "নিশ্চিত করুন" },
  "common.save": { en: "Save", bn: "সংরক্ষণ করুন" },
  "common.back": { en: "Back", bn: "পিছনে" },
  "common.next": { en: "Next", bn: "পরবর্তী" },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    const savedLanguage = localStorage.getItem("bus-ticket-language") as Language;
    if (savedLanguage && (savedLanguage === "en" || savedLanguage === "bn")) {
      setLanguage(savedLanguage);
    }
  }, []);

  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("bus-ticket-language", lang);
  };

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }
    return translation[language] || translation.en || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage: changeLanguage,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}