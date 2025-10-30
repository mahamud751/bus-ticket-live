import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: parseInt(process.env.EMAIL_SERVER_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

interface BookingEmailData {
  pnr: string;
  passengerName: string;
  passengerEmail: string;
  route: {
    origin: string;
    destination: string;
  };
  schedule: {
    departureTime: string;
    arrivalTime: string;
  };
  seats: Array<{
    seatNumber: string;
    seatType: string;
    price: number;
  }>;
  totalAmount: number;
  operator: string;
  busNumber: string;
  allPassengers?: Array<{
    name: string;
    seatId: string;
  }>;
}

export async function sendBookingConfirmationEmail(
  bookingData: BookingEmailData
): Promise<boolean> {
  try {
    const departureDate = new Date(bookingData.schedule.departureTime);
    const arrivalDate = new Date(bookingData.schedule.arrivalTime);

    // Format passenger list if multiple passengers
    const passengersList = bookingData.allPassengers
      ? bookingData.allPassengers.map((p) => `• ${p.name}`).join("\n")
      : `• ${bookingData.passengerName}`;

    const seatsList = bookingData.seats
      .map((s) => `• Seat ${s.seatNumber} (${s.seatType}) - ৳${s.price}`)
      .join("\n");

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Booking Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; margin: 10px 0; }
          .detail-label { font-weight: bold; }
          .route-info { background: #eff6ff; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .important { background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎫 Booking Confirmed!</h1>
            <p>Your bus ticket has been successfully booked</p>
          </div>
          
          <div class="content">
            <div class="important">
              <strong>PNR Number: ${bookingData.pnr}</strong><br>
              Please save this number for future reference and show it during boarding.
            </div>

            <div class="booking-details">
              <h2>🚌 Journey Details</h2>
              <div class="route-info">
                <h3>${bookingData.route.origin} → ${
      bookingData.route.destination
    }</h3>
                <div class="detail-row">
                  <span class="detail-label">Departure:</span>
                  <span>${departureDate.toLocaleDateString()} at ${departureDate.toLocaleTimeString()}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Arrival:</span>
                  <span>${arrivalDate.toLocaleDateString()} at ${arrivalDate.toLocaleTimeString()}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Operator:</span>
                  <span>${bookingData.operator}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Bus Number:</span>
                  <span>${bookingData.busNumber}</span>
                </div>
              </div>
            </div>

            <div class="booking-details">
              <h2>👥 Passenger Information</h2>
              <pre style="font-family: Arial, sans-serif; margin: 0;">${passengersList}</pre>
            </div>

            <div class="booking-details">
              <h2>🪑 Seat Details</h2>
              <pre style="font-family: Arial, sans-serif; margin: 0;">${seatsList}</pre>
              <div class="detail-row" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                <span class="detail-label">Total Amount:</span>
                <span style="font-size: 18px; font-weight: bold; color: #059669;">৳${
                  bookingData.totalAmount
                }</span>
              </div>
            </div>

            <div class="important">
              <h3>📋 Important Instructions:</h3>
              <ul style="margin: 10px 0;">
                <li>Arrive at the boarding point 15 minutes before departure</li>
                <li>Carry a valid photo ID for verification</li>
                <li>Show this email or your PNR number during boarding</li>
                <li>Contact support if you need to make any changes</li>
              </ul>
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <p>Have a safe and comfortable journey! 🚌✨</p>
            </div>
          </div>

          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>BusTicket - Your trusted travel partner</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: bookingData.passengerEmail,
      subject: `🎫 Booking Confirmed - PNR: ${bookingData.pnr}`,
      html: emailHtml,
    };

    await transporter.sendMail(mailOptions);
    console.log(
      `📧 Booking confirmation email sent to ${bookingData.passengerEmail}`
    );
    return true;
  } catch (error) {
    console.error("❌ Failed to send booking confirmation email:", error);
    return false;
  }
}

export async function testEmailConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    console.log("✅ Email server connection verified");
    return true;
  } catch (error) {
    console.error("❌ Email server connection failed:", error);
    return false;
  }
}
