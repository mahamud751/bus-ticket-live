"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  ArrowLeftRight,
  Calendar,
  MapPin,
  Users,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { CityAutoComplete, extendedCities } from "@/components/ui/autocomplete";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface SearchFormData {
  origin: string;
  destination: string;
  departureDate: string;
  passengers: number;
}

// Using extendedCities from autocomplete component for consistency

export default function HeroSection() {
  const router = useRouter();
  const ref = useRef(null);
  const isInView = useInView(ref);
  const { t } = useLanguage();

  const [searchData, setSearchData] = useState<SearchFormData>({
    origin: "",
    destination: "",
    departureDate: new Date().toISOString().split("T")[0], // Set to today by default
    passengers: 1,
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form data
    if (
      !searchData.origin ||
      !searchData.destination ||
      !searchData.departureDate
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (searchData.origin === searchData.destination) {
      toast.error("Origin and destination cannot be the same");
      return;
    }

    // Validate departure date is not in the past
    const selectedDate = new Date(searchData.departureDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
    
    if (selectedDate < today) {
      toast.error("Departure date cannot be in the past. Please select today or a future date.");
      return;
    }

    setIsLoading(true);

    try {
      // Build search URL with query parameters
      const searchParams = new URLSearchParams({
        origin: searchData.origin,
        destination: searchData.destination,
        departureDate: searchData.departureDate,
        passengers: searchData.passengers.toString(),
      });

      // Navigate to search results page
      router.push(`/search?${searchParams.toString()}`);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const swapCities = () => {
    setSearchData((prev) => ({
      ...prev,
      origin: prev.destination,
      destination: prev.origin,
    }));
  };

  const formatDate = (date: string) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <section
      ref={ref}
      className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 overflow-hidden min-h-screen"
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        {/* Floating Circles */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={`circle-${i}`}
            className="absolute bg-white/10 rounded-full"
            style={{
              width: Math.random() * 100 + 50,
              height: Math.random() * 100 + 50,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              x: [0, 20, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: Math.random() * 10 + 15,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 2,
            }}
          />
        ))}

        {/* Floating Squares */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={`square-${i}`}
            className="absolute bg-gradient-to-br from-yellow-400/20 to-orange-500/20 rounded-lg"
            style={{
              width: Math.random() * 60 + 30,
              height: Math.random() * 60 + 30,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              rotate: [0, 180, 360],
              y: [0, -40, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: Math.random() * 12 + 18,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 3,
            }}
          />
        ))}

        {/* Floating Triangles */}
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={`triangle-${i}`}
            className="absolute"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: 0,
              height: 0,
              borderLeft: `${Math.random() * 20 + 15}px solid transparent`,
              borderRight: `${Math.random() * 20 + 15}px solid transparent`,
              borderBottom: `${
                Math.random() * 30 + 20
              }px solid rgba(255, 255, 255, 0.1)`,
            }}
            animate={{
              rotate: [0, 120, 240, 360],
              y: [0, -25, 0],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: Math.random() * 15 + 20,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 4,
            }}
          />
        ))}
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/5 to-black/20"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="text-center mb-12">
          <motion.h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={
                isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }
              }
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Your Journey
            </motion.div>
            <motion.span
              className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500"
              initial={{ opacity: 0, x: -30 }}
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              Starts Here
            </motion.span>
          </motion.h1>
          <motion.p
            className="text-xl sm:text-2xl text-blue-100 max-w-3xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            Book bus tickets instantly with real-time seat selection, secure
            payments, and hassle-free travel experience.
          </motion.p>

          {/* Statistics */}
          <motion.div
            className="flex flex-wrap justify-center gap-8 mt-8 text-white"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.8, delay: 1.0 }}
          >
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">50+</div>
              <div className="text-sm text-blue-200">Cities Connected</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">500+</div>
              <div className="text-sm text-blue-200">Daily Routes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">10K+</div>
              <div className="text-sm text-blue-200">Happy Customers</div>
            </div>
          </motion.div>
        </div>

        {/* Search Form */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={
            isInView
              ? { opacity: 1, y: 0, scale: 1 }
              : { opacity: 0, y: 40, scale: 0.95 }
          }
          transition={{ duration: 0.8, delay: 1.2 }}
        >
          <Card className="max-w-5xl mx-auto shadow-2xl border-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
            <CardContent className="p-8">
              <form onSubmit={handleSearch} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Origin */}
                  <motion.div
                    className="space-y-2"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <Label
                      htmlFor="origin"
                      className="text-foreground font-medium flex items-center"
                    >
                      <MapPin className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                      {t('search.from')}
                    </Label>
                    <CityAutoComplete
                      value={searchData.origin}
                      onValueChange={(value) =>
                        setSearchData((prev) => ({
                          ...prev,
                          origin: value,
                        }))
                      }
                      cities={extendedCities}
                      placeholder={t('search.origin_placeholder')}
                      className="w-full"
                    />
                  </motion.div>

                  {/* Swap Button */}
                  <div className="flex items-end pb-2 lg:pb-0 lg:items-center justify-center">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 180 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                      }}
                    >
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={swapCities}
                        className="h-12 w-12 rounded-full border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        <ArrowLeftRight className="h-5 w-5 text-blue-600" />
                      </Button>
                    </motion.div>
                  </div>

                  {/* Destination */}
                  <motion.div
                    className="space-y-2"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <Label
                      htmlFor="destination"
                      className="text-foreground font-medium flex items-center"
                    >
                      <MapPin className="h-4 w-4 mr-2 text-red-600 dark:text-red-400" />
                      {t('search.to')}
                    </Label>
                    <CityAutoComplete
                      value={searchData.destination}
                      onValueChange={(value) =>
                        setSearchData((prev) => ({
                          ...prev,
                          destination: value,
                        }))
                      }
                      cities={extendedCities.filter((city) => city.code !== searchData.origin)}
                      placeholder={t('search.destination_placeholder')}
                      className="w-full"
                    />
                  </motion.div>

                  {/* Date */}
                  <motion.div
                    className="space-y-2"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <Label
                      htmlFor="date"
                      className="text-foreground font-medium flex items-center"
                    >
                      <Calendar className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
                      Departure Date
                    </Label>
                    <motion.div whileFocus={{ scale: 1.02 }} className="relative">
                      <Input
                        id="date"
                        type="date"
                        value={searchData.departureDate}
                        min={new Date().toISOString().split("T")[0]}
                        max={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]} // 1 year from now
                        onChange={(e) => {
                          const selectedDate = new Date(e.target.value);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          
                          if (selectedDate >= today) {
                            setSearchData((prev) => ({
                              ...prev,
                              departureDate: e.target.value,
                            }));
                          } else {
                            toast.error("Please select today or a future date");
                          }
                        }}
                        className="h-12 text-lg bg-background border-input text-foreground transition-all duration-200 hover:border-green-400 focus:border-green-500 focus:ring-green-500/20 shadow-sm hover:shadow-md rounded-lg [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:dark:filter [&::-webkit-calendar-picker-indicator]:dark:invert [&::-webkit-calendar-picker-indicator]:dark:brightness-0 [&::-webkit-calendar-picker-indicator]:dark:contrast-200 [&::-webkit-calendar-picker-indicator]:hover:opacity-80 [&::-webkit-calendar-picker-indicator]:transition-all"
                        required
                      />
                      {/* Custom date field styling wrapper */}
                      <div className="absolute inset-0 pointer-events-none rounded-lg border-2 border-transparent group-hover:border-green-200 dark:group-hover:border-green-800 transition-colors" />
                    </motion.div>
                    {searchData.departureDate && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
                      >
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <span className="text-sm font-medium text-green-800 dark:text-green-200">
                            Selected: {formatDate(searchData.departureDate)}
                          </span>
                        </div>
                        <div className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                          ✓ Valid
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                </div>

                {/* Passengers and Search Button */}
                <motion.div
                  className="flex flex-col gap-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                >
                  {/* Passengers - Full Width */}
                  <motion.div
                    className="space-y-2 w-full"
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <Label
                      htmlFor="passengers"
                      className="text-foreground font-medium flex items-center text-lg"
                    >
                      <Users className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" />
                      Select Passengers
                    </Label>
                    <motion.select
                      id="passengers"
                      value={searchData.passengers}
                      onChange={(e) =>
                        setSearchData((prev) => ({
                          ...prev,
                          passengers: parseInt(e.target.value),
                        }))
                      }
                      className="w-full h-14 px-4 border border-input rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-background text-foreground text-lg transition-all duration-200 hover:border-purple-400 shadow-sm hover:shadow-md"
                      whileFocus={{ scale: 1.02 }}
                    >
                      {[1, 2, 3, 4].map((num) => (
                        <option key={num} value={num}>
                          {num} {num === 1 ? "Passenger" : "Passengers"} -
                          {num === 1
                            ? "Solo Travel"
                            : num === 2
                            ? "Couple"
                            : num <= 4
                            ? "Small Group"
                            : "Large Group"}
                        </option>
                      ))}
                    </motion.select>

                    {/* Passenger count display */}
                    <motion.div
                      className="flex items-center justify-center p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30 rounded-lg border border-purple-200 dark:border-purple-700"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      key={searchData.passengers}
                    >
                      <Users className="h-5 w-5 text-purple-600 dark:text-purple-400 mr-2" />
                      <span className="text-lg font-semibold text-foreground">
                        {searchData.passengers}{" "}
                        {searchData.passengers === 1
                          ? "Passenger"
                          : "Passengers"}{" "}
                        Selected
                      </span>
                      <motion.div
                        className="ml-2"
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                      >
                        <Sparkles className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
                      </motion.div>
                    </motion.div>
                  </motion.div>

                  {/* Search Button - Full Width */}
                  <motion.div
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-16 px-8 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 hover:from-blue-700 hover:via-purple-700 hover:to-blue-900 text-white font-bold text-xl shadow-2xl transition-all duration-300 rounded-xl border-0 relative overflow-hidden group"
                    >
                      {/* Animated background */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-orange-500/20"
                        initial={{ x: "-100%" }}
                        whileHover={{ x: "100%" }}
                        transition={{ duration: 0.6 }}
                      />

                      {isLoading ? (
                        <motion.div
                          className="flex items-center justify-center"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          <motion.div
                            className="w-6 h-6 border-3 border-white border-t-transparent rounded-full mr-3"
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                          />
                          <span>Searching for the Best Routes...</span>
                          <motion.div
                            className="ml-2"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                          >
                            <Zap className="h-5 w-5" />
                          </motion.div>
                        </motion.div>
                      ) : (
                        <motion.div
                          className="flex items-center justify-center relative z-10"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          <motion.div
                            animate={{ x: [0, 5, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <ArrowRight className="mr-3 h-6 w-6" />
                          </motion.div>
                          <span>Search Amazing Bus Routes</span>
                          <motion.div
                            className="ml-3"
                            animate={{ rotate: [0, 15, -15, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <Sparkles className="h-5 w-5" />
                          </motion.div>
                        </motion.div>
                      )}
                    </Button>
                  </motion.div>
                </motion.div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Features */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 text-white"
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.8, delay: 1.4 }}
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="h-8 w-8 text-yellow-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Real-time Tracking</h3>
            <p className="text-blue-200">
              Track your bus location and get live updates on departure and
              arrival times.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-yellow-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Live Seat Selection</h3>
            <p className="text-blue-200">
              Choose your preferred seats with our interactive seat map and
              real-time availability.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-yellow-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Secure Payments</h3>
            <p className="text-blue-200">
              Pay safely with our encrypted payment system and get instant
              confirmation.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
