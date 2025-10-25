# National Bus Ticketing System

A production-grade web application for bus ticket booking with real-time seat selection, secure payments, and comprehensive admin management.

## 🚀 Features

### Core Features

- **Real-time Bus Search**: Search routes with origin, destination, and date
- **Interactive Seat Selection**: Visual seat map with real-time locking (5-minute hold)
- **Secure Payment Processing**: Stripe integration with test card support
- **PDF Ticket Generation**: QR code-enabled digital tickets
- **Admin Dashboard**: Complete route, schedule, and analytics management
- **User Authentication**: NextAuth.js with credential and Google OAuth
- **Responsive Design**: Mobile-first design with Tailwind CSS

### Technical Features

- **Real-time Updates**: Socket.IO for live seat availability
- **Database Transactions**: Atomic seat locking to prevent double bookings
- **Rate Limiting**: API protection against abuse
- **Caching**: Optimized performance with data caching
- **SEO Optimized**: Server-side rendering for search pages
- **Type Safety**: Full TypeScript implementation

## 🛠 Tech Stack

- **Framework**: Next.js 15 with App Router
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Payments**: Stripe (Test Mode)
- **Styling**: Tailwind CSS with Radix UI components
- **Real-time**: Socket.IO
- **PDF Generation**: jsPDF with QR codes
- **Email**: Nodemailer (configured for Mailtrap)

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL database
- Stripe account (test mode)
- Git

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd bus-ticket
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Copy `.env.example` to `.env` and configure:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/bus_ticket"

# NextAuth.js
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Stripe (Test Mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Email (Optional - for ticket confirmations)
EMAIL_SERVER_HOST="sandbox.smtp.mailtrap.io"
EMAIL_SERVER_PORT=2525
EMAIL_SERVER_USER="your-username"
EMAIL_SERVER_PASSWORD="your-password"
EMAIL_FROM="noreply@busticketing.com"
```

### 4. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed with sample data
npm run db:seed
```

### 5. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## 🗄 Database Schema

The system includes comprehensive models for:

- **Users & Authentication**: User management with role-based access
- **Location Management**: Cities and route definitions
- **Fleet Management**: Operators, buses, and seat layouts
- **Scheduling**: Time-based route schedules with pricing tiers
- **Booking System**: Reservations, payments, and seat assignments
- **Real-time Features**: Seat locks and availability tracking

## 👥 Default Users

After seeding, you can use these accounts:

**Admin Account:**

- Email: `admin@busticketing.com`
- Password: `admin123`
- Access: Full admin dashboard and analytics

## 💳 Payment Testing

Use these Stripe test cards:

- **Visa**: `4242 4242 4242 4242`
- **Mastercard**: `5555 5555 5555 4444`
- **Expiry**: Any future date
- **CVC**: Any 3 digits

## 🌍 API Endpoints

### Public APIs

- `GET /api/cities` - List all cities
- `GET /api/routes/search` - Search bus routes
- `GET /api/schedules/[id]/seats` - Get seat map

### Booking APIs

- `POST /api/seats/lock` - Lock seats temporarily
- `POST /api/bookings` - Create booking
- `GET /api/bookings` - Get booking details

### Admin APIs

- `GET /api/admin/analytics` - Analytics data
- `GET /api/admin/schedules` - Schedule management
- `POST /api/admin/schedules` - Create schedule

### Payment APIs

- `POST /api/webhooks/stripe` - Stripe webhook handler

## 🏗 Architecture

### Seat Locking Algorithm

1. User selects seats → 5-minute lock with session ID
2. Concurrent users see seats as "temporarily unavailable"
3. Lock expires automatically or on successful payment
4. Atomic database transactions prevent race conditions

### Real-time Updates

- Socket.IO connections for live seat status
- Server-sent events for booking confirmations
- Automatic cleanup of expired locks

### Caching Strategy

- Route search results cached with revalidation
- Static data (cities, operators) cached at build time
- Real-time data bypasses cache

## 📱 User Flow

1. **Search**: Select origin, destination, date, passengers
2. **Browse**: View available routes with pricing and amenities
3. **Select**: Choose seats on interactive bus layout
4. **Book**: Enter passenger details and payment info
5. **Pay**: Secure Stripe payment processing
6. **Confirm**: Receive booking confirmation with PDF ticket

## 🔒 Security Features

- **Authentication**: Secure session management with NextAuth.js
- **Authorization**: Role-based access control
- **Rate Limiting**: API endpoint protection
- **Input Validation**: Zod schema validation
- **SQL Injection Protection**: Prisma ORM parameterized queries
- **CSRF Protection**: Built-in Next.js protection

## 📊 Admin Features

### Dashboard

- Real-time booking statistics
- Revenue analytics
- Top routes and operators
- Booking status overview

### Management

- Route and schedule creation
- Pricing tier management
- Bus fleet management
- User role management

## 🧪 Testing

### Manual Testing

1. **Search Flow**: Test route search with various parameters
2. **Booking Flow**: Complete end-to-end booking process
3. **Payment Flow**: Test with Stripe test cards
4. **Admin Flow**: Access admin dashboard and management features

### Concurrent Testing

- Open multiple browser tabs
- Select same seats simultaneously
- Verify only one booking succeeds

## 🚀 Deployment

### Vercel Deployment

1. Connect GitHub repository to Vercel
2. Configure environment variables
3. Add PostgreSQL database (Neon/PlanetScale recommended)
4. Deploy with automatic builds

### Environment Variables for Production

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="strong-random-secret"
NEXTAUTH_URL="https://your-domain.com"
STRIPE_SECRET_KEY="sk_live_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
```

## 📈 Performance Optimizations

- **Edge Runtime**: API routes deployed to edge for low latency
- **Image Optimization**: Next.js automatic image optimization
- **Code Splitting**: Dynamic imports for optimal loading
- **Database Indexing**: Optimized queries with proper indexes
- **Caching**: Strategic caching for frequently accessed data

## 🐛 Troubleshooting

### Common Issues

**Database Connection**

```bash
# Reset and remigrate database
npm run db:reset
npm run db:seed
```

**Stripe Webhooks**

- Use ngrok for local webhook testing
- Verify webhook endpoint in Stripe dashboard

**Authentication Issues**

- Clear browser cookies and localStorage
- Verify NEXTAUTH_SECRET is set

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Prisma for excellent database tooling
- Stripe for robust payment processing
- Radix UI for accessible components

---

**Built with ❤️ for efficient bus travel management**
# ticket-booking
