"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle,
  XCircle,
  QrCode,
  User,
  MapPin,
  Calendar,
  ArrowLeft,
  Scan,
  AlertTriangle,
  Users,
  CameraOff,
  Upload,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Html5QrcodeScanner } from "html5-qrcode";
import Header from "@/components/Header";

interface BookingData {
  id: string;
  pnr: string;
  status: string;
  paymentStatus: string;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string;
  totalAmount: number;
  seatNumbers: string[];
  allPassengers: {
    name: string;
    seatNumber: string;
  }[];
  route: {
    origin: string;
    destination: string;
  };
  schedule: {
    departureTime: string;
    arrivalTime: string;
    busNumber: string;
    operator: string;
  };
  isValid: boolean;
  validationReasons?: string[];
  validationTimestamp: string;
  boardingWindow?: {
    earliest: string;
    latest: string;
  };
}

export default function QRScannerPage() {
  const router = useRouter();
  const [pnrInput, setPnrInput] = useState("");
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scannerElementRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isScanning && scannerElementRef.current) {
      const isMobile =
        /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
          navigator.userAgent
        );

      const config = {
        fps: isMobile ? 5 : 10,
        qrbox: function (viewfinderWidth: number, viewfinderHeight: number) {
          const minEdgePercentage = isMobile ? 0.6 : 0.7;
          const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
          return {
            width: qrboxSize,
            height: qrboxSize,
          };
        },
        aspectRatio: 1.0,

        videoConstraints: {
          facingMode: isMobile ? "environment" : "user",
        },

        verbose: !isMobile,
      };

      const scanner = new Html5QrcodeScanner("qr-scanner", config, false);
      scannerRef.current = scanner;

      scanner.render(
        (decodedText) => {
          console.log("📱 Mobile QR Code scanned:", decodedText);
          handleScanSuccess(decodedText);
        },
        (errorMessage) => {
          if (!errorMessage.includes("No MultiFormat Readers")) {
            console.debug("QR Scan error:", errorMessage);
          }
        }
      );

      return () => {
        if (scannerRef.current) {
          scannerRef.current.clear().catch(console.error);
        }
      };
    }
  }, [isScanning]);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, []);

  const validateTicket = async (pnr: string) => {
    setIsLoading(true);
    setCameraError(null);
    console.log(`🔍 Starting validation for PNR: ${pnr}`);

    try {
      const response = await fetch(
        `/api/bookings/validate?pnr=${encodeURIComponent(pnr)}`
      );
      const data = await response.json();

      console.log("Validation response:", data);

      if (data.success && data.booking) {
        setBookingData(data.booking);
        if (data.booking.isValid) {
          toast.success("✅ Valid ticket - boarding approved!");
        } else {
          const reasons =
            data.booking.validationReasons?.length > 0
              ? ` (${data.booking.validationReasons.join(", ")})`
              : "";
          toast.error(`❌ Invalid ticket - boarding denied!${reasons}`);
        }
      } else {
        console.error("Validation failed:", data.error);
        toast.error(data.error || "❌ Invalid ticket - not found!");
        setBookingData(null);
      }
    } catch (error) {
      console.error("Validation error:", error);
      toast.error(
        "🔧 Failed to validate ticket - system error. Please try again."
      );
      setBookingData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const extractTextFromPDF = async (pdfData: ArrayBuffer): Promise<string> => {
    try {
      const text = new TextDecoder().decode(pdfData);
      return text;
    } catch (error) {
      console.error("PDF text extraction error:", error);
      throw error;
    }
  };

  const handleManualValidation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pnrInput.trim()) {
      toast.error("Please enter a PNR number");
      return;
    }
    validateTicket(pnrInput.trim().toUpperCase());
  };

  const handleScanSuccess = useCallback((scannedData: string) => {
    console.log("Raw QR Code data:", scannedData);

    let pnr = "";
    let downloadUrl = "";
    let validationUrl = "";
    let mobileUrl = "";
    let qrDataObject: Record<string, unknown> | null = null;

    const isMobile =
      /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        navigator.userAgent
      );
    console.log("Mobile device detected:", isMobile);

    try {
      const parsed = JSON.parse(scannedData);
      console.log("Parsed JSON:", parsed);
      qrDataObject = parsed;

      pnr =
        parsed.pnr ||
        parsed.PNR ||
        parsed.bookingId ||
        parsed.booking_id ||
        parsed.reference ||
        parsed.confirmationNumber ||
        "";

      if (parsed.urls) {
        downloadUrl = parsed.urls.download || "";
        mobileUrl = parsed.urls.mobile || parsed.urls.directDownload || "";
        validationUrl = parsed.urls.validate || parsed.urls.validation || "";
      } else {
        downloadUrl =
          parsed.downloadUrl || parsed.download_url || parsed.url || "";
        mobileUrl =
          parsed.mobileDownloadUrl ||
          parsed.directMobileUrl ||
          parsed.mobile?.directDownload ||
          "";
        validationUrl =
          parsed.validationUrl ||
          parsed.validation_url ||
          parsed.mobile?.validation ||
          "";
      }

      if (!pnr && parsed.booking) {
        pnr = parsed.booking.pnr || parsed.booking.PNR || "";
      }

      if (
        qrDataObject &&
        (qrDataObject.type === "bus-ticket" ||
          qrDataObject.ticketType === "bus-ticket") &&
        pnr
      ) {
        console.log("Enhanced PDF ticket QR detected:", {
          pnr: pnr,
          passenger: qrDataObject.passenger,
          route: qrDataObject.route,
          departure: qrDataObject.departure,
          seats: qrDataObject.seats,
          isMobile: isMobile,
          version: qrDataObject.version || "legacy",
        });

        const ticketInfo =
          `🎟️ Ticket Found!\n` +
          `📋 PNR: ${pnr}\n` +
          `👤 Passenger: ${qrDataObject.passenger || "N/A"}\n` +
          `🚌 Route: ${qrDataObject.route || "N/A"}\n` +
          `📅 Departure: ${
            qrDataObject.departure
              ? new Date(qrDataObject.departure as string).toLocaleDateString()
              : "N/A"
          }\n` +
          `💺 Seats: ${qrDataObject.seats || "N/A"}`;

        if (isMobile) {
          console.log("📱 Processing mobile QR scan with options:", {
            mobileUrl,
            downloadUrl,
            validationUrl,

            hasMobileOptimization: !!(
              qrDataObject &&
              typeof qrDataObject.mobile === "object" &&
              qrDataObject.mobile &&
              (qrDataObject.mobile as { optimized?: boolean }).optimized
            ),
          });

          const targetUrl = mobileUrl || validationUrl || downloadUrl;

          if (targetUrl) {
            toast.success(ticketInfo + "\n\n📱 Opening mobile ticket view...", {
              duration: 4000,
            });

            setTimeout(() => {
              if (mobileUrl) {
                window.location.href = mobileUrl;
              } else if (
                validationUrl &&
                validationUrl.includes("/api/bookings/validate")
              ) {
                const mobileValidationUrl =
                  validationUrl +
                  (validationUrl.includes("?") ? "&" : "?") +
                  "mobile=true";
                window.location.href = mobileValidationUrl;
              } else {
                const mobileDownloadUrl =
                  targetUrl +
                  (targetUrl.includes("?") ? "&" : "?") +
                  "mobile=true";
                window.location.href = mobileDownloadUrl;
              }
            }, 1500);
          } else {
            toast.success(
              ticketInfo + "\n\n✅ Ticket validated successfully!",
              { duration: 4000 }
            );

            validateTicket(pnr);
          }
        } else {
          toast.success(ticketInfo, { duration: 4000 });

          if (downloadUrl) {
            setTimeout(() => {
              window.open(downloadUrl, "_blank");
            }, 1500);
          }
        }

        setPnrInput(pnr);
        validateTicket(pnr);
        stopScanning();
        return;
      }

      if (downloadUrl && downloadUrl.includes("/booking/confirmation/")) {
        if (isMobile) {
          const mobileUrl =
            downloadUrl +
            (downloadUrl.includes("?") ? "&" : "?") +
            "mobile=true";
          window.location.href = mobileUrl;
          toast.success("📱 Redirecting to mobile ticket download...");
        } else {
          window.open(downloadUrl, "_blank");
          toast.success("📱 Opening ticket download page!");
        }
        stopScanning();
        return;
      }

      if (validationUrl && validationUrl.includes("/api/bookings/validate")) {
        console.log("Validation QR detected:", validationUrl);

        if (isMobile) {
          const urlParams = new URLSearchParams(
            validationUrl.split("?")[1] || ""
          );
          const urlPnr = urlParams.get("pnr");
          if (urlPnr) {
            setPnrInput(urlPnr);
            validateTicket(urlPnr);
            toast.success("📱 Mobile validation started!");
            stopScanning();
            return;
          }
        } else {
          window.open(validationUrl, "_blank");
          toast.success("🔍 Opening validation page!");
          stopScanning();
          return;
        }
      }
    } catch (jsonError) {
      console.log("Not valid JSON, treating as plain text:", jsonError);

      if (
        scannedData.startsWith("http") &&
        scannedData.includes("/booking/confirmation/")
      ) {
        console.log("Direct URL detected:", scannedData);
        if (isMobile) {
          window.location.href =
            scannedData +
            (scannedData.includes("?") ? "&" : "?") +
            "mobile=true";
          toast.success("📱 Redirecting to mobile ticket view...");
        } else {
          window.open(scannedData, "_blank");
          toast.success("📱 Opening ticket download page!");
        }
        stopScanning();
        return;
      }

      if (
        scannedData.startsWith("http") &&
        scannedData.includes("/api/qr/download")
      ) {
        console.log("API download URL detected:", scannedData);
        if (isMobile) {
          window.location.href = scannedData;
          toast.success("📱 Processing mobile ticket request...");
        } else {
          window.open(scannedData, "_blank");
          toast.success("🔍 Opening ticket download!");
        }
        stopScanning();
        return;
      }

      const trimmedData = scannedData.trim().toUpperCase();

      const pnrPattern = /^[A-Z0-9]{6,20}$/;
      if (pnrPattern.test(trimmedData)) {
        pnr = trimmedData;
        console.log("Direct PNR match:", pnr);
      } else {
        const pnrMatches =
          trimmedData.match(/\b([A-Z]{2}[0-9]{10,}[A-Z0-9]{0,8})\b/g) ||
          trimmedData.match(/\b([A-Z0-9]{8,20})\b/g);

        if (pnrMatches && pnrMatches.length > 0) {
          pnr = pnrMatches[0];
          console.log("Pattern matched PNR:", pnr);
        } else {
          const prefixMatch = trimmedData.match(/PNR:?\s*([A-Z0-9]+)/i);
          if (prefixMatch) {
            pnr = prefixMatch[1];
            console.log("Prefix matched PNR:", pnr);
          } else {
            if (trimmedData.length >= 6 && trimmedData.length <= 20) {
              pnr = trimmedData;
              console.log("Fallback PNR:", pnr);
            }
          }
        }
      }
    }

    if (pnr && pnr.length >= 3) {
      console.log("Final PNR for validation:", pnr);
      setPnrInput(pnr);
      validateTicket(pnr);
      stopScanning();
      toast.success("📱 QR Code scanned successfully!");
    } else {
      console.error("No valid PNR found in QR code data:", scannedData);
      toast.error("❌ No valid PNR found in QR code. Please try manual entry.");
    }
  }, []);

  const startScanning = async () => {
    try {
      setCameraError(null);
      setIsScanning(true);
      setBookingData(null);
    } catch (error) {
      console.error("Camera access error:", error);
      setCameraError("Unable to access camera. Please check permissions.");
      toast.error("Camera access denied");
    }
  };

  const stopScanning = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
      scannerRef.current = null;
    }
    setIsScanning(false);
    setCameraError(null);
  }, [setIsScanning, setCameraError]);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isImage = file.type.match(/^image\//);
    const isPDF =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isImage && !isPDF) {
      toast.error("Please select an image file (PNG, JPG, JPEG) or PDF file");
      return;
    }

    setBookingData(null);

    try {
      if (isPDF) {
        console.log("📝 Processing PDF file:", file.name);
        toast.loading("Processing PDF for QR codes...");

        const reader = new FileReader();
        reader.onload = async (e) => {
          const pdfData = e.target?.result;

          try {
            const text = await extractTextFromPDF(pdfData as ArrayBuffer);
            if (text && text.includes("pnr")) {
              const pnrMatch = text.match(/"pnr"\s*:\s*"([A-Z0-9]+)"/i);
              if (pnrMatch) {
                const extractedPnr = pnrMatch[1];
                console.log("Extracted PNR from PDF text:", extractedPnr);
                setPnrInput(extractedPnr);
                validateTicket(extractedPnr);
                toast.success("📄 PNR extracted from PDF!");
                return;
              }
            }
          } catch (pdfError) {
            console.log("PDF text extraction failed:", pdfError);
          }

          toast.dismiss();
          toast(
            "📄 PDF uploaded! For best results: 1) Take a screenshot of the QR code, 2) Upload the image, or 3) Use camera scanning",
            { duration: 6000, icon: "💡" }
          );
        };
        reader.readAsArrayBuffer(file);
      } else {
        console.log("🔍 Scanning uploaded image:", file.name);
        toast.loading("Scanning image for QR codes...", {
          id: "image-processing",
        });

        try {
          const { Html5Qrcode } = await import("html5-qrcode");
          const html5QrCode = new Html5Qrcode("file-scanner");

          const result = await html5QrCode.scanFile(file, true);
          console.log("📱 QR Code found in image:", result);

          toast.dismiss("image-processing");
          toast.success("🎯 QR Code found in uploaded image!");
          handleScanSuccess(result);
          html5QrCode.clear();
        } catch (scanError) {
          toast.dismiss("image-processing");
          console.error("Image scanning error:", scanError);

          try {
            toast.loading("Applying image filters and retrying...", {
              id: "image-retry",
            });

            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            const img = new Image();

            img.onload = async () => {
              canvas.width = img.width;
              canvas.height = img.height;
              ctx?.drawImage(img, 0, 0);

              if (ctx) {
                const imageData = ctx.getImageData(
                  0,
                  0,
                  canvas.width,
                  canvas.height
                );
                const data = imageData.data;
                const contrast = 1.5;
                const factor =
                  (259 * (contrast + 255)) / (255 * (29 - contrast));

                for (let i = 0; i < data.length; i += 4) {
                  data[i] = factor * (data[i] - 128) + 128;
                  data[i + 1] = factor * (data[i + 1] - 128) + 128;
                  data[i + 2] = factor * (data[i + 2] - 128) + 128;
                }

                ctx.putImageData(imageData, 0, 0);

                canvas.toBlob(
                  async (processedBlob) => {
                    if (processedBlob) {
                      try {
                        const processedFile = new File(
                          [processedBlob],
                          "processed.png",
                          { type: "image/png" }
                        );
                        const { Html5Qrcode } = await import("html5-qrcode");
                        const html5QrCodeRetry = new Html5Qrcode(
                          "file-scanner-retry"
                        );
                        const retryResult = await html5QrCodeRetry.scanFile(
                          processedFile,
                          true
                        );

                        toast.dismiss("image-retry");
                        toast.success(
                          "🎯 QR Code found after image processing!"
                        );
                        handleScanSuccess(retryResult);
                        html5QrCodeRetry.clear();
                      } catch (_retryError) {
                        toast.dismiss("image-retry");
                        toast.error(
                          "❌ No QR code found. Try:\n• Better lighting\n• Higher resolution image\n• Camera scanning instead",
                          { duration: 6000 }
                        );
                      }
                    }
                  },
                  "image/png",
                  0.95
                );
              }
            };

            const reader = new FileReader();
            reader.onload = (e) => {
              img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
          } catch (_preprocessError) {
            toast.dismiss("image-retry");
            toast.error(
              "❌ No QR code found in the uploaded file. Try camera scanning or a different image.",
              { duration: 6000 }
            );
          }
        }
      }
    } catch (error) {
      console.error("File scanning error:", error);
      toast.error(
        "❌ No QR code found in the uploaded file. Please try a different image or use camera scanning."
      );
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800">
      <Header />
      <div className="p-4 pb-20 md:pb-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl font-bold text-white">QR Scanner</h1>
            <div className="w-16"></div>
          </div>

          <Card className="mb-6 bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <CardTitle className="flex items-center justify-center text-foreground">
                <QrCode className="h-6 w-6 mr-2 text-blue-600 dark:text-blue-400" />
                Ticket Validator
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Scan QR code or enter PNR manually to validate tickets
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div id="file-scanner" className="hidden"></div>

                {isScanning ? (
                  <div className="bg-gray-900 rounded-lg p-4 text-white">
                    {cameraError ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center"
                      >
                        <CameraOff className="h-16 w-16 mx-auto mb-4 text-red-400" />
                        <p className="text-sm text-red-300 mb-4">
                          {cameraError}
                        </p>
                        <Button
                          variant="outline"
                          onClick={stopScanning}
                          className="bg-white text-gray-900 border-gray-300"
                        >
                          Try Again
                        </Button>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div
                          id="qr-scanner"
                          ref={scannerElementRef}
                          className="mb-4"
                        />
                        <p className="text-sm mb-2">
                          Position QR code within the frame
                        </p>
                        <p className="text-xs text-gray-400 mb-4">
                          Camera scanning for ticket QR codes...
                        </p>
                        <Button
                          variant="outline"
                          onClick={stopScanning}
                          className="bg-white text-gray-900 border-gray-300"
                        >
                          Stop Scanning
                        </Button>
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Button
                      onClick={startScanning}
                      className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Scan className="h-8 w-8 mr-3" />
                      <div className="text-left">
                        <div className="text-lg font-semibold">
                          Scan with Camera
                        </div>
                        <div className="text-sm opacity-90">
                          Point camera at QR code
                        </div>
                      </div>
                    </Button>

                    <Button
                      onClick={triggerFileUpload}
                      variant="outline"
                      className="w-full h-16 border-2 border-dashed border-border hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-foreground hover:text-blue-700 dark:hover:text-blue-300"
                    >
                      <Upload className="h-8 w-8 mr-3" />
                      <div className="text-left">
                        <div className="text-lg font-semibold">
                          Upload Image/PDF
                        </div>
                        <div className="text-sm opacity-75">
                          Select QR code from gallery or PDF
                        </div>
                      </div>
                    </Button>
                  </div>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <form onSubmit={handleManualValidation} className="space-y-4">
                <div>
                  <Label htmlFor="pnr" className="text-gray-700 font-medium">
                    Enter Full PNR Number
                  </Label>
                  <Input
                    id="pnr"
                    type="text"
                    value={pnrInput}
                    onChange={(e) => {
                      const value = e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9]/g, "");
                      setPnrInput(value);
                    }}
                    placeholder="Enter full PNR (e.g., BT1727448123ABCD)"
                    className="mt-1 text-center text-sm font-mono tracking-wider"
                    maxLength={20}
                    minLength={3}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Validating...
                    </div>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Validate Ticket
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {bookingData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-white/95 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-gray-800">
                      Ticket Validation Result
                    </CardTitle>
                    <Badge
                      variant={bookingData.isValid ? "default" : "destructive"}
                      className={`${
                        bookingData.isValid
                          ? "bg-green-500 hover:bg-green-600"
                          : "bg-red-500 hover:bg-red-600"
                      } text-white text-lg px-4 py-2`}
                    >
                      {bookingData.isValid ? (
                        <CheckCircle className="h-5 w-5 mr-2" />
                      ) : (
                        <XCircle className="h-5 w-5 mr-2" />
                      )}
                      {bookingData.isValid ? "✅ VALID" : "❌ INVALID"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="flex items-center text-muted-foreground mb-1">
                        <QrCode className="h-4 w-4 mr-1" />
                        PNR Number
                      </div>
                      <div className="font-mono font-bold text-lg">
                        {bookingData.pnr}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center text-muted-foreground mb-1">
                        <User className="h-4 w-4 mr-1" />
                        Primary Passenger
                      </div>
                      <div className="font-semibold">
                        {bookingData.passengerName}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center text-muted-foreground mb-1">
                        <MapPin className="h-4 w-4 mr-1" />
                        Route
                      </div>
                      <div className="font-semibold">
                        {bookingData.route.origin} →{" "}
                        {bookingData.route.destination}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center text-muted-foreground mb-1">
                        <Calendar className="h-4 w-4 mr-1" />
                        Departure
                      </div>
                      <div className="font-semibold">
                        {new Date(
                          bookingData.schedule.departureTime
                        ).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(
                          bookingData.schedule.departureTime
                        ).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600 mb-1">Booking Status</div>
                        <Badge
                          variant={
                            bookingData.status === "CONFIRMED"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {bookingData.status}
                        </Badge>
                      </div>
                      <div>
                        <div className="text-gray-600 mb-1">Payment Status</div>
                        <Badge
                          variant={
                            bookingData.paymentStatus === "COMPLETED"
                              ? "default"
                              : "destructive"
                          }
                        >
                          {bookingData.paymentStatus}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {bookingData.allPassengers &&
                    bookingData.allPassengers.length > 0 && (
                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex items-center text-gray-600 text-sm mb-3">
                          <Users className="h-4 w-4 mr-1" />
                          All Passengers ({bookingData.allPassengers.length})
                        </div>
                        <div className="space-y-2">
                          {bookingData.allPassengers.map((passenger, index) => (
                            <div
                              key={index}
                              className="flex justify-between items-center bg-gray-50 p-2 rounded"
                            >
                              <span className="font-medium">
                                {passenger.name}
                              </span>
                              <Badge variant="outline" className="font-mono">
                                Seat {passenger.seatNumber}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  <div className="pt-4 border-t border-gray-200">
                    <div className="text-gray-600 text-sm mb-2">
                      Bus Details
                    </div>
                    <div className="text-sm space-y-1">
                      <div>
                        <span className="font-semibold">Operator:</span>{" "}
                        {bookingData.schedule.operator}
                      </div>
                      <div>
                        <span className="font-semibold">Bus Number:</span>{" "}
                        {bookingData.schedule.busNumber}
                      </div>
                      <div>
                        <span className="font-semibold">Total Amount:</span> $
                        {bookingData.totalAmount.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <div className="text-xs text-gray-500">
                      Validated at:{" "}
                      {new Date(
                        bookingData.validationTimestamp
                      ).toLocaleString()}
                    </div>
                  </div>

                  {!bookingData.isValid && (
                    <div className="pt-4 border-t border-red-200 bg-red-50 p-4 rounded-lg">
                      <div className="flex items-center text-red-800">
                        <AlertTriangle className="h-5 w-5 mr-2" />
                        <span className="font-semibold">Ticket Invalid</span>
                      </div>
                      <p className="text-sm text-red-700 mt-1">
                        This ticket cannot be used for boarding.
                      </p>
                      {bookingData.validationReasons &&
                        bookingData.validationReasons.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-semibold text-red-800 mb-1">
                              Reasons:
                            </p>
                            <ul className="text-xs text-red-700 space-y-1">
                              {bookingData.validationReasons.map(
                                (reason, index) => (
                                  <li key={index} className="flex items-start">
                                    <span className="text-red-500 mr-1">•</span>
                                    {reason}
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                    </div>
                  )}

                  {bookingData.isValid && bookingData.boardingWindow && (
                    <div className="pt-4 border-t border-green-200 bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center text-green-800 mb-2">
                        <CheckCircle className="h-5 w-5 mr-2" />
                        <span className="font-semibold">
                          Boarding Information
                        </span>
                      </div>
                      <div className="text-sm text-green-700 space-y-1">
                        <div>
                          <strong>Boarding Window:</strong>
                        </div>
                        <div className="ml-2 space-y-1">
                          <div>
                            • <strong>Earliest:</strong>{" "}
                            {new Date(
                              bookingData.boardingWindow.earliest
                            ).toLocaleString()}
                          </div>
                          <div>
                            • <strong>Latest:</strong>{" "}
                            {new Date(
                              bookingData.boardingWindow.latest
                            ).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          <Card className="mt-6 bg-white/90 backdrop-blur-sm">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-gray-800 mb-3">
                📱 How to validate tickets:
              </h3>
              <ol className="text-sm text-gray-600 space-y-2">
                <li className="flex">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 text-xs font-bold mt-0.5">
                    1
                  </span>
                  <div>
                    <strong>Scan with Camera:</strong> Tap &quot;Scan with
                    Camera&quot; to activate live scanning
                  </div>
                </li>
                <li className="flex">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 text-xs font-bold mt-0.5">
                    2
                  </span>
                  <div>
                    <strong>Upload Image:</strong> Tap &quot;Upload
                    Image/PDF&quot; to select QR code from photos
                  </div>
                </li>
                <li className="flex">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 text-xs font-bold mt-0.5">
                    3
                  </span>
                  <div>
                    <strong>Manual Entry:</strong> Or manually enter the full
                    PNR number (e.g., BT1727448123ABCD)
                  </div>
                </li>
                <li className="flex">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 text-xs font-bold mt-0.5">
                    4
                  </span>
                  <div>
                    <strong>Check Result:</strong> ✅ Green = Valid ticket, ❌
                    Red = Invalid/Expired
                  </div>
                </li>
              </ol>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700">
                  <strong>🔒 Security Note:</strong> Only valid, paid tickets
                  with confirmed status will show as VALID. Camera scanning and
                  file upload both supported for maximum convenience. Check
                  passenger ID matches the name on the ticket.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
