"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function AnimatedBus() {
  const [windowWidth, setWindowWidth] = useState(1200);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWindowWidth(window.innerWidth);
      const handleResize = () => setWindowWidth(window.innerWidth);
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  return (
    <div className="relative w-full h-20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-100 to-blue-50">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={`sky-cloud-${i}`}
            className="absolute bg-white opacity-40 rounded-full"
            style={{
              width: Math.random() * 40 + 20,
              height: Math.random() * 15 + 8,
              left: `${Math.random() * 120}%`,
              top: `${Math.random() * 40 + 5}%`,
            }}
            animate={{
              x: [-20, windowWidth + 50],
            }}
            transition={{
              duration: 15 + Math.random() * 10,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>

      {/* Road with enhanced styling */}
      <div className="absolute bottom-0 w-full h-2 bg-gradient-to-r from-gray-400 to-gray-500 shadow-inner">
        <motion.div
          className="h-full"
          style={{
            background:
              "repeating-linear-gradient(90deg, #fbbf24 0px, #fbbf24 25px, transparent 25px, transparent 50px)",
          }}
          animate={{
            x: [0, -50],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        {/* Road reflections */}
        <div className="absolute top-0 w-full h-full bg-gradient-to-b from-transparent to-black opacity-10" />
      </div>

      {/* Bus with enhanced shadow and glow */}
      <motion.div
        className="absolute bottom-2"
        animate={{
          x: [-120, windowWidth + 120],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "linear",
          repeatDelay: 3,
        }}
      >
        {/* Bus shadow */}
        <motion.div
          className="absolute top-8 left-1 w-20 h-4 bg-black opacity-20 rounded-full blur-sm"
          animate={{
            scaleX: [1, 1.1, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <svg
          width="90"
          height="45"
          viewBox="0 0 90 45"
          className="drop-shadow-xl filter"
        >
          {/* Glow effect */}
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient
              id="busGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="50%" stopColor="#1D4ED8" />
              <stop offset="100%" stopColor="#1E40AF" />
            </linearGradient>
          </defs>

          {/* Bus Body with gradient */}
          <rect
            x="6"
            y="9"
            width="68"
            height="28"
            rx="4"
            fill="url(#busGradient)"
            stroke="#1E40AF"
            strokeWidth="1.5"
            filter="url(#glow)"
          />

          {/* Bus roof */}
          <rect x="8" y="7" width="64" height="4" rx="2" fill="#1E40AF" />

          {/* Windows with reflections */}
          <rect
            x="12"
            y="14"
            width="9"
            height="7"
            rx="1.5"
            fill="#E0F2FE"
            stroke="#BAE6FD"
            strokeWidth="0.5"
          />
          <rect
            x="23"
            y="14"
            width="9"
            height="7"
            rx="1.5"
            fill="#E0F2FE"
            stroke="#BAE6FD"
            strokeWidth="0.5"
          />
          <rect
            x="34"
            y="14"
            width="9"
            height="7"
            rx="1.5"
            fill="#E0F2FE"
            stroke="#BAE6FD"
            strokeWidth="0.5"
          />
          <rect
            x="45"
            y="14"
            width="9"
            height="7"
            rx="1.5"
            fill="#E0F2FE"
            stroke="#BAE6FD"
            strokeWidth="0.5"
          />
          <rect
            x="56"
            y="14"
            width="9"
            height="7"
            rx="1.5"
            fill="#E0F2FE"
            stroke="#BAE6FD"
            strokeWidth="0.5"
          />

          {/* Window reflections */}
          <rect
            x="13"
            y="15"
            width="3"
            height="5"
            rx="0.5"
            fill="#FFFFFF"
            opacity="0.6"
          />
          <rect
            x="24"
            y="15"
            width="3"
            height="5"
            rx="0.5"
            fill="#FFFFFF"
            opacity="0.6"
          />
          <rect
            x="35"
            y="15"
            width="3"
            height="5"
            rx="0.5"
            fill="#FFFFFF"
            opacity="0.6"
          />
          <rect
            x="46"
            y="15"
            width="3"
            height="5"
            rx="0.5"
            fill="#FFFFFF"
            opacity="0.6"
          />
          <rect
            x="57"
            y="15"
            width="3"
            height="5"
            rx="0.5"
            fill="#FFFFFF"
            opacity="0.6"
          />

          {/* Front Window */}
          <rect
            x="6"
            y="14"
            width="5"
            height="10"
            rx="1.5"
            fill="#E0F2FE"
            stroke="#BAE6FD"
            strokeWidth="0.5"
          />
          <rect
            x="7"
            y="15"
            width="2"
            height="8"
            rx="0.5"
            fill="#FFFFFF"
            opacity="0.6"
          />

          {/* Door */}
          <rect
            x="40"
            y="23"
            width="14"
            height="14"
            rx="1.5"
            fill="#1E40AF"
            stroke="#1E3A8A"
            strokeWidth="0.5"
          />
          <circle
            cx="51"
            cy="30"
            r="1.2"
            fill="#FCD34D"
            stroke="#F59E0B"
            strokeWidth="0.3"
          />
          <rect x="41" y="25" width="12" height="1" fill="#1E3A8A" />
          <rect x="41" y="28" width="12" height="1" fill="#1E3A8A" />
          <rect x="41" y="31" width="12" height="1" fill="#1E3A8A" />

          {/* Enhanced Wheels with spokes */}
          <motion.g
            animate={{ rotate: 360 }}
            transition={{
              duration: 0.4,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{ transformOrigin: "20px 39px" }}
          >
            <circle
              cx="20"
              cy="39"
              r="5"
              fill="#374151"
              stroke="#111827"
              strokeWidth="1.5"
            />
            <circle cx="20" cy="39" r="3" fill="#6B7280" />
            <circle cx="20" cy="39" r="1.5" fill="#9CA3AF" />
            {/* Spokes */}
            <line
              x1="20"
              y1="34"
              x2="20"
              y2="44"
              stroke="#4B5563"
              strokeWidth="0.8"
            />
            <line
              x1="15"
              y1="39"
              x2="25"
              y2="39"
              stroke="#4B5563"
              strokeWidth="0.8"
            />
            <line
              x1="16.5"
              y1="35.5"
              x2="23.5"
              y2="42.5"
              stroke="#4B5563"
              strokeWidth="0.5"
            />
            <line
              x1="23.5"
              y1="35.5"
              x2="16.5"
              y2="42.5"
              stroke="#4B5563"
              strokeWidth="0.5"
            />
          </motion.g>

          <motion.g
            animate={{ rotate: 360 }}
            transition={{
              duration: 0.4,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{ transformOrigin: "58px 39px" }}
          >
            <circle
              cx="58"
              cy="39"
              r="5"
              fill="#374151"
              stroke="#111827"
              strokeWidth="1.5"
            />
            <circle cx="58" cy="39" r="3" fill="#6B7280" />
            <circle cx="58" cy="39" r="1.5" fill="#9CA3AF" />
            {/* Spokes */}
            <line
              x1="58"
              y1="34"
              x2="58"
              y2="44"
              stroke="#4B5563"
              strokeWidth="0.8"
            />
            <line
              x1="53"
              y1="39"
              x2="63"
              y2="39"
              stroke="#4B5563"
              strokeWidth="0.8"
            />
            <line
              x1="54.5"
              y1="35.5"
              x2="61.5"
              y2="42.5"
              stroke="#4B5563"
              strokeWidth="0.5"
            />
            <line
              x1="61.5"
              y1="35.5"
              x2="54.5"
              y2="42.5"
              stroke="#4B5563"
              strokeWidth="0.5"
            />
          </motion.g>

          {/* Enhanced Headlights with glow */}
          <circle
            cx="4"
            cy="22"
            r="2.5"
            fill="#FBBF24"
            opacity="0.9"
            stroke="#F59E0B"
            strokeWidth="0.5"
          />
          <circle
            cx="4"
            cy="28"
            r="2.5"
            fill="#FBBF24"
            opacity="0.9"
            stroke="#F59E0B"
            strokeWidth="0.5"
          />
          <circle cx="4" cy="22" r="1" fill="#FFFFFF" opacity="0.8" />
          <circle cx="4" cy="28" r="1" fill="#FFFFFF" opacity="0.8" />

          {/* Light beams */}
          <motion.polygon
            points="4,20 4,24 -5,22 -5,20"
            fill="#FBBF24"
            opacity="0.3"
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.polygon
            points="4,26 4,30 -5,28 -5,26"
            fill="#FBBF24"
            opacity="0.3"
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
          />

          {/* Enhanced Exhaust smoke */}
          <motion.g
            animate={{
              opacity: [0.4, 0.8, 0.4],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <circle cx="82" cy="17" r="2.5" fill="#9CA3AF" opacity="0.5" />
            <circle cx="85" cy="14" r="2" fill="#9CA3AF" opacity="0.4" />
            <circle cx="84" cy="11" r="1.5" fill="#9CA3AF" opacity="0.3" />
            <circle cx="87" cy="8" r="1" fill="#9CA3AF" opacity="0.2" />
          </motion.g>

          {/* Bus details */}
          <rect x="8" y="32" width="62" height="2" fill="#1E40AF" />
          <rect x="10" y="30" width="58" height="1" fill="#3B82F6" />
          <text
            x="39"
            y="42"
            textAnchor="middle"
            fontSize="4"
            fill="#FFFFFF"
            fontWeight="bold"
          >
            BUS
          </text>
        </svg>
      </motion.div>

      {/* Enhanced road particles and effects */}
      <div className="absolute bottom-0 w-full">
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute bottom-1 w-1 h-1 bg-gray-500 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
            }}
            animate={{
              x: [-15, -120],
              opacity: [0, 1, 0],
              scale: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              delay: i * 0.25,
              ease: "linear",
            }}
          />
        ))}

        {/* Speed lines */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={`speed-line-${i}`}
            className="absolute bottom-3 h-0.5 bg-blue-300 opacity-30"
            style={{
              left: `${Math.random() * 100}%`,
              width: Math.random() * 30 + 10,
            }}
            animate={{
              x: [-20, -150],
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.3,
              ease: "easeOut",
            }}
          />
        ))}
      </div>
    </div>
  );
}
