import jsPDF from "jspdf";
import * as QRCode from "qrcode";

interface BookingData {
  pnr: string;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string;
  totalAmount: number;
  route: {
    origin: string;
    destination: string;
  };
  schedule: {
    departureTime: string;
    arrivalTime: string;
  };
  operator: string;
  busNumber: string;
  seats: Array<{
    seatNumber: string;
    seatType: string;
    price: number;
  }>;
  passengers?: Array<{
    passengerName: string;
    seatNumber: string;
  }>;
}

export class TicketPDFGenerator {
  static async generateTicket(bookingData: BookingData): Promise<Blob> {
    const doc = new jsPDF();

    // Set up colors
    const primaryColor: [number, number, number] = [37, 99, 235]; // Blue
    const textColor: [number, number, number] = [55, 65, 81]; // Gray-700
    const lightGray: [number, number, number] = [229, 231, 235]; // Gray-200

    // Header
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, "F");

    // Logo and Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("BusTicket", 20, 25);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Your Digital Bus Ticket", 20, 32);

    // PNR in header
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`PNR: ${bookingData.pnr}`, 150, 25);

    // Reset text color
    doc.setTextColor(...textColor);

    // Passenger Information
    let yPos = 60;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Passenger Information", 20, yPos);

    yPos += 10;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");

    // Contact Information
    doc.text(`Contact Phone: ${bookingData.passengerPhone}`, 20, yPos);
    yPos += 6;
    doc.text(`Contact Email: ${bookingData.passengerEmail}`, 20, yPos);
    yPos += 6;

    // Individual Passengers
    if (bookingData.passengers && bookingData.passengers.length > 0) {
      yPos += 4;
      doc.setFont("helvetica", "bold");
      doc.text("Passengers:", 20, yPos);
      yPos += 6;
      doc.setFont("helvetica", "normal");

      bookingData.passengers.forEach((passenger) => {
        doc.text(
          `• ${passenger.passengerName} (Seat ${passenger.seatNumber})`,
          25,
          yPos
        );
        yPos += 5;
      });
    } else {
      yPos += 4;
      doc.text(`Passenger Name: ${bookingData.passengerName}`, 20, yPos);
      yPos += 6;
    }

    // Journey Details
    yPos += 20;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Journey Details", 20, yPos);

    yPos += 10;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`From: ${bookingData.route.origin}`, 20, yPos);
    doc.text(`To: ${bookingData.route.destination}`, 120, yPos);

    yPos += 6;
    const departureDate = new Date(bookingData.schedule.departureTime);
    const arrivalDate = new Date(bookingData.schedule.arrivalTime);

    doc.text(
      `Departure: ${departureDate.toLocaleDateString()} ${departureDate.toLocaleTimeString()}`,
      20,
      yPos
    );
    yPos += 6;
    doc.text(
      `Arrival: ${arrivalDate.toLocaleDateString()} ${arrivalDate.toLocaleTimeString()}`,
      20,
      yPos
    );
    yPos += 6;
    doc.text(`Operator: ${bookingData.operator}`, 20, yPos);
    yPos += 6;
    doc.text(`Bus: ${bookingData.busNumber}`, 20, yPos);

    // Seat Information
    yPos += 20;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Seat Information", 20, yPos);

    yPos += 10;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");

    bookingData.seats.forEach((seat) => {
      doc.text(
        `Seat ${seat.seatNumber} (${seat.seatType}): $${seat.price}`,
        20,
        yPos
      );
      yPos += 6;
    });

    // Total Amount
    yPos += 10;
    doc.setFillColor(...lightGray);
    doc.rect(15, yPos - 5, 180, 15, "F");

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Amount: $${bookingData.totalAmount}`, 20, yPos + 5);

    // QR Code with mobile-optimized data structure
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://busticketing.com';
    const mobileDownloadUrl = `${baseUrl}/api/qr/download?pnr=${bookingData.pnr}&action=mobile`;
    
    // Create a SIMPLIFIED mobile-friendly QR data structure for better scanning reliability
    // Following memory recommendations: smaller data = better mobile scanning
    const qrData = JSON.stringify({
      type: "bus-ticket",
      pnr: bookingData.pnr,
      passenger: bookingData.passengerName.substring(0, 20), // Limit name length
      route: `${bookingData.route.origin.substring(0, 10)}-${bookingData.route.destination.substring(0, 10)}`,
      departure: bookingData.schedule.departureTime,
      seats: bookingData.seats.map((s) => s.seatNumber).join(","),
      // Single mobile-optimized URL to reduce data size
      url: mobileDownloadUrl,
      // Essential mobile metadata only
      mobile: {
        optimized: true
      }
    });

    // Fallback simple URL for maximum compatibility
    const fallbackUrl = mobileDownloadUrl;

    try {
      // Try mobile-optimized QR code generation with simplified data first
      let qrCodeDataURL: string;
      
      try {
        // Primary attempt: JSON data with mobile optimization
        qrCodeDataURL = await QRCode.toDataURL(qrData, {
          width: 150, // Increased to minimum 150px for reliable mobile scanning
          margin: 4,  // Increased margin for better mobile camera detection
          color: {
            dark: "#000000", // Pure black for maximum contrast
            light: "#FFFFFF" // Pure white background
          },
          errorCorrectionLevel: 'M', // 'M' level error correction as per memory specs
          type: 'image/png'
        });
      } catch (jsonError) {
        console.log("JSON QR generation failed, using simple URL fallback:", jsonError);
        // Fallback: Use simple URL for maximum mobile compatibility
        qrCodeDataURL = await QRCode.toDataURL(fallbackUrl, {
          width: 150,
          margin: 4,
          color: {
            dark: "#000000",
            light: "#FFFFFF"
          },
          errorCorrectionLevel: 'M',
          type: 'image/png'
        });
      }

      // QR Code background with maximum contrast for mobile scanning
      doc.setFillColor(255, 255, 255); // Pure white background
      doc.rect(135, yPos + 10, 70, 80, "F");
      
      // Add border for better QR code definition and mobile detection
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1.0); // Thicker border for better mobile detection
      doc.rect(138, yPos + 13, 64, 64, "S");
      
      // Larger QR code following memory specs: minimum 120x120 pixels, using 60x60 points
      // (PDF points to pixels: 60 points ≈ 150 pixels at 150 DPI)
      doc.addImage(qrCodeDataURL, "PNG", 140, yPos + 15, 60, 60);

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0); // Black text for better readability
      doc.text("📱 Scan with Mobile", 148, yPos + 82);
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text("Mobile Optimized QR", 152, yPos + 88);
      
      doc.setFontSize(7);
      doc.setTextColor(80, 80, 80);
      doc.text("High contrast • Error correction", 142, yPos + 93);
    } catch (error) {
      console.error("Error generating QR code:", error);
    }

    // Important Notes
    yPos += 80;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Important Notes:", 20, yPos);

    yPos += 8;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const notes = [
      "• Please arrive at the departure point at least 30 minutes before departure",
      "• Carry a valid photo ID along with this ticket",
      "• This ticket is non-transferable and non-refundable",
      "• Scan the QR code with your mobile device for instant access and validation",
      "• QR code is optimized for mobile scanning with high contrast and error correction",
      "• Contact support for any queries with your PNR",
    ];

    notes.forEach((note) => {
      doc.text(note, 20, yPos);
      yPos += 5;
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 280);
    doc.text("BusTicket - Your trusted travel partner", 120, 280);

    return doc.output("blob");
  }

  static downloadTicket(bookingData: BookingData) {
    this.generateTicket(bookingData).then((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `bus-ticket-${bookingData.pnr}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  }

  static async emailTicket(bookingData: BookingData, email: string) {
    // This would integrate with your email service
    // For now, just download the ticket
    console.log(`Emailing ticket to ${email}`);
    return this.downloadTicket(bookingData);
  }
}
