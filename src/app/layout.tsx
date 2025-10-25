import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { LanguageProvider } from "@/components/providers/LanguageProvider";
import AnimatedFooter from "@/components/AnimatedFooter";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "National Bus Ticketing System",
  description:
    "Book bus tickets online with real-time seat selection and secure payments",
  keywords: "bus tickets, online booking, travel, transportation, Bangladesh",
  manifest: "/manifest.json",
  themeColor: "#2563eb",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BusTicket",
  },
  openGraph: {
    type: "website",
    title: "National Bus Ticketing System",
    description: "Book bus tickets online with real-time seat selection",
    url: "https://busticketing.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background font-sans`}
      >
        <ThemeProvider
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider>
            <AuthProvider>
              <div className="min-h-screen flex flex-col">
                <div className="flex-1">{children}</div>
                <AnimatedFooter />
              </div>
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  className: "dark:bg-slate-800 dark:text-white",
                  style: {
                    background: "var(--background)",
                    color: "var(--foreground)",
                    border: "1px solid var(--border)",
                  },
                }}
              />
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
