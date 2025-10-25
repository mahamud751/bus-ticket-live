"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  MapPin,
  Phone,
  Mail,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
} from "lucide-react";

export default function AnimatedFooter() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
      },
    },
  };

  return (
    <footer className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        {/* Large Floating Bubbles */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={`bubble-${i}`}
            className="absolute rounded-full opacity-10"
            style={{
              background: `linear-gradient(45deg, ${
                i % 3 === 0 ? "#3B82F6" : i % 3 === 1 ? "#8B5CF6" : "#06B6D4"
              }, transparent)`,
              width: Math.random() * 120 + 60,
              height: Math.random() * 120 + 60,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              x: [0, Math.random() * 40 - 20, 0],
              scale: [1, 1.1, 1],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: Math.random() * 20 + 15,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 5,
            }}
          />
        ))}

        {/* Small Floating Particles */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-2 h-2 bg-white rounded-full opacity-20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0.2, 0.8, 0.2],
            }}
            transition={{
              duration: Math.random() * 10 + 8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 3,
            }}
          />
        ))}

        {/* Geometric Shapes */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={`shape-${i}`}
            className="absolute opacity-5"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              rotate: [0, 360],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: Math.random() * 25 + 20,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 5,
            }}
          >
            {i % 3 === 0 ? (
              <div className="w-16 h-16 border-2 border-white rounded-lg" />
            ) : i % 3 === 1 ? (
              <div className="w-12 h-12 bg-white rounded-full" />
            ) : (
              <div
                className="w-0 h-0 border-l-8 border-r-8 border-b-16"
                style={{
                  borderLeftColor: "transparent",
                  borderRightColor: "transparent",
                  borderBottomColor: "rgba(255, 255, 255, 0.1)",
                }}
              />
            )}
          </motion.div>
        ))}
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {/* Company Info */}
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex items-center space-x-2">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <MapPin className="h-8 w-8 text-blue-400" />
              </motion.div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                2025 Bus Ticket
              </h3>
            </div>
            <p className="text-gray-300 leading-relaxed">
              Your trusted partner for comfortable and safe bus travel across
              the country. Book your journey with confidence and enjoy the ride.
            </p>
            <div className="flex space-x-4">
              {[Facebook, Twitter, Instagram, Youtube].map((Icon, index) => (
                <motion.a
                  key={index}
                  href="#"
                  className="text-gray-400 hover:text-blue-400 transition-colors"
                  whileHover={{ scale: 1.2, rotate: 10 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Icon className="h-6 w-6" />
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div variants={itemVariants} className="space-y-4">
            <h4 className="text-lg font-semibold text-blue-400">Quick Links</h4>
            <ul className="space-y-2">
              {[
                { name: "Home", href: "/" },
                { name: "Search Routes", href: "/search" },
                { name: "My Bookings", href: "/my-bookings" },
                { name: "Contact: +8801789999751", href: "tel:+8801789999751" },
                { name: "About Us", href: "#" },
              ].map((link, index) => (
                <motion.li
                  key={index}
                  whileHover={{ x: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Link
                    href={link.href}
                    className="text-gray-300 hover:text-blue-400 transition-colors duration-300 flex items-center"
                  >
                    <motion.span
                      className="w-2 h-2 bg-blue-400 rounded-full mr-2 opacity-0"
                      whileHover={{ opacity: 1, scale: 1.5 }}
                    />
                    {link.name}
                  </Link>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Services */}
          <motion.div variants={itemVariants} className="space-y-4">
            <h4 className="text-lg font-semibold text-purple-400">Services</h4>
            <ul className="space-y-2">
              {[
                "Real-time Booking",
                "Seat Selection",
                "Secure Payments",
                "Mobile Tickets",
                "24/7 Support",
              ].map((service, index) => (
                <motion.li
                  key={index}
                  className="text-gray-300 flex items-center"
                  whileHover={{ x: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <motion.span
                    className="w-2 h-2 bg-purple-400 rounded-full mr-2"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: index * 0.2,
                    }}
                  />
                  {service}
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Contact Info */}
          <motion.div variants={itemVariants} className="space-y-4">
            <h4 className="text-lg font-semibold text-green-400">Contact Us</h4>
            <div className="space-y-3">
              <motion.div
                className="flex items-center space-x-2 text-gray-300"
                whileHover={{ scale: 1.05 }}
              >
                <Phone className="h-5 w-5 text-green-400" />
                <a href="tel:+8801789999751" className="hover:text-green-300 transition-colors">+8801789999751</a>
              </motion.div>
              <motion.div
                className="flex items-center space-x-2 text-gray-300"
                whileHover={{ scale: 1.05 }}
              >
                <Mail className="h-5 w-5 text-blue-400" />
                <span>support@busticket.com</span>
              </motion.div>
              <motion.div
                className="flex items-start space-x-2 text-gray-300"
                whileHover={{ scale: 1.05 }}
              >
                <MapPin className="h-5 w-5 text-purple-400 mt-0.5" />
                <span>123 Transport Street, Dhaka, Bangladesh</span>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>

        {/* Bottom Bar */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-12 pt-8 border-t border-gray-700 flex flex-col md:flex-row justify-between items-center"
        >
          <div className="text-gray-400 text-sm mb-4 md:mb-0">
            © 2025 Bus Ticket. All rights reserved.
          </div>
          <div className="flex space-x-6 text-sm">
            {["Privacy Policy", "Terms of Service", "Cookie Policy"].map(
              (item, index) => (
                <motion.a
                  key={index}
                  href="#"
                  className="text-gray-400 hover:text-blue-400 transition-colors"
                  whileHover={{ y: -2 }}
                >
                  {item}
                </motion.a>
              )
            )}
          </div>
        </motion.div>
      </div>

      {/* Floating Action Elements */}
      <motion.div
        className="absolute bottom-4 right-4"
        animate={{
          y: [0, -10, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <motion.div
          className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center cursor-pointer shadow-lg"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            <MapPin className="h-6 w-6 text-white" />
          </motion.div>
        </motion.div>
      </motion.div>
    </footer>
  );
}
