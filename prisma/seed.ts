import {
  PrismaClient,
  SeatType,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create cities
  const cities = await Promise.all([
    prisma.city.upsert({
      where: { code: "DHK" },
      update: {},
      create: {
        name: "Dhaka",
        state: "Dhaka Division",
        country: "Bangladesh",
        code: "DHK",
      },
    }),
    prisma.city.upsert({
      where: { code: "CTG" },
      update: {},
      create: {
        name: "Chittagong",
        state: "Chittagong Division",
        country: "Bangladesh",
        code: "CTG",
      },
    }),
    prisma.city.upsert({
      where: { code: "SYL" },
      update: {},
      create: {
        name: "Sylhet",
        state: "Sylhet Division",
        country: "Bangladesh",
        code: "SYL",
      },
    }),
    prisma.city.upsert({
      where: { code: "RAJ" },
      update: {},
      create: {
        name: "Rajshahi",
        state: "Rajshahi Division",
        country: "Bangladesh",
        code: "RAJ",
      },
    }),
    prisma.city.upsert({
      where: { code: "KHL" },
      update: {},
      create: {
        name: "Khulna",
        state: "Khulna Division",
        country: "Bangladesh",
        code: "KHL",
      },
    }),
  ]);

  console.log("✅ Created cities");

  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 12);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@busticketing.com" },
    update: {},
    create: {
      email: "admin@busticketing.com",
      name: "System Administrator",
      role: "ADMIN",
      password: hashedPassword,
      phone: "+8801234567890",
    },
  });

  // Create sample customer users
  const customerUsers = await Promise.all([
    prisma.user.upsert({
      where: { email: "customer1@example.com" },
      update: {},
      create: {
        email: "customer1@example.com",
        name: "John Doe",
        role: "USER",
        password: await bcrypt.hash("customer123", 12),
        phone: "+8801234567891",
      },
    }),
    prisma.user.upsert({
      where: { email: "customer2@example.com" },
      update: {},
      create: {
        email: "customer2@example.com",
        name: "Jane Smith",
        role: "USER",
        password: await bcrypt.hash("customer123", 12),
        phone: "+8801234567892",
      },
    }),
  ]);

  console.log("✅ Created admin and customer users");

  // Create operators with more variety
  const operators = await Promise.all([
    prisma.operator.upsert({
      where: { name: "Green Line Paribahan" },
      update: {},
      create: {
        name: "Green Line Paribahan",
        contactInfo: "+8801711111111",
      },
    }),
    prisma.operator.upsert({
      where: { name: "Hanif Enterprise" },
      update: {},
      create: {
        name: "Hanif Enterprise",
        contactInfo: "+8801722222222",
      },
    }),
    prisma.operator.upsert({
      where: { name: "Shyamoli Paribahan" },
      update: {},
      create: {
        name: "Shyamoli Paribahan",
        contactInfo: "+8801733333333",
      },
    }),
    prisma.operator.upsert({
      where: { name: "Ena Transport" },
      update: {},
      create: {
        name: "Ena Transport",
        contactInfo: "+8801744444444",
      },
    }),
    prisma.operator.upsert({
      where: { name: "Soudia Coach Service" },
      update: {},
      create: {
        name: "Soudia Coach Service",
        contactInfo: "+8801755555555",
      },
    }),
    prisma.operator.upsert({
      where: { name: "TR Travels" },
      update: {},
      create: {
        name: "TR Travels",
        contactInfo: "+8801766666666",
      },
    }),
    prisma.operator.upsert({
      where: { name: "Eagle Paribahan" },
      update: {},
      create: {
        name: "Eagle Paribahan",
        contactInfo: "+8801777777777",
      },
    }),
  ]);

  console.log("✅ Created operators");

  // Create buses for each operator
  const buses = [];
  for (const operator of operators) {
    for (let i = 1; i <= 3; i++) {
      const bus = await prisma.bus.create({
        data: {
          operatorId: operator.id,
          busNumber: `${operator.name.substring(0, 3).toUpperCase()}-${i
            .toString()
            .padStart(3, "0")}`,
          busType: i === 1 ? "LUXURY" : i === 2 ? "AC" : "NON_AC",
          totalSeats: 40,
          amenities:
            i === 1
              ? ["AC", "WiFi", "USB_Charging", "Restroom"]
              : i === 2
              ? ["AC", "USB_Charging"]
              : ["USB_Charging"],
        },
      });
      buses.push(bus);

      // Create seat layout for each bus
      const seatLayout = [];
      for (let row = 1; row <= 10; row++) {
        for (const col of ["A", "B", "C", "D"]) {
          seatLayout.push({
            busId: bus.id,
            seatNumber: `${row}${col}`,
            seatType: row <= 2 ? SeatType.PREMIUM : SeatType.REGULAR,
          });
        }
      }

      await prisma.seatLayout.createMany({
        data: seatLayout,
      });
    }
  }

  console.log("✅ Created buses and seat layouts");

  // Create routes with realistic coverage (not every operator covers every route)
  const routes = [];
  const cityPairs = [];

  // Generate all possible city pairs
  for (let i = 0; i < cities.length; i++) {
    for (let j = 0; j < cities.length; j++) {
      if (i !== j) {
        cityPairs.push({ origin: cities[i], destination: cities[j] });
      }
    }
  }

  // Define operator coverage patterns (more realistic)
  const operatorCoverage: Record<string, number> = {
    "Green Line Paribahan": 0.9, // Covers 90% of routes (premium operator)
    "Hanif Enterprise": 0.8, // Covers 80% of routes
    "Shyamoli Paribahan": 0.7, // Covers 70% of routes
    "Ena Transport": 0.6, // Covers 60% of routes
    "Soudia Coach Service": 0.5, // Covers 50% of routes
    "TR Travels": 0.4, // Covers 40% of routes (budget)
    "Eagle Paribahan": 0.3, // Covers 30% of routes (limited)
  };

  for (const { origin, destination } of cityPairs) {
    for (const operator of operators) {
      const coverage = operatorCoverage[operator.name] || 0.5;

      // Randomly decide if this operator covers this route based on coverage
      if (Math.random() < coverage) {
        // Calculate realistic distance and duration
        const baseDistance = Math.random() * 200 + 100; // 100-300 km
        const distance = Math.round(baseDistance);

        // Duration based on distance (roughly 50-80 km/h average speed)
        const baseSpeed = Math.random() * 30 + 50; // 50-80 km/h
        const duration = Math.round((distance / baseSpeed) * 60); // Convert to minutes

        const route = await prisma.route.create({
          data: {
            operatorId: operator.id,
            originId: origin.id,
            destinationId: destination.id,
            distance,
            duration,
          },
        });
        routes.push(route);
      }
    }
  }

  console.log("✅ Created routes");

  // Create schedules for the next 7 days with more variety
  const schedules = [];
  console.log(
    `Creating varied schedules for ${routes.length} routes over next 7 days...`
  );

  // More realistic departure times with variety
  const baseDepartureTimes = [
    { hour: 5, minute: 30 }, // Early morning
    { hour: 6, minute: 15 }, // Morning
    { hour: 7, minute: 0 }, // Morning rush
    { hour: 8, minute: 45 }, // Late morning
    { hour: 10, minute: 30 }, // Mid morning
    { hour: 12, minute: 0 }, // Noon
    { hour: 14, minute: 15 }, // Afternoon
    { hour: 16, minute: 30 }, // Late afternoon
    { hour: 18, minute: 0 }, // Evening
    { hour: 20, minute: 15 }, // Night
    { hour: 22, minute: 30 }, // Late night
  ];

  for (const route of routes) {
    const routeBuses = buses.filter(
      (bus) => bus.operatorId === route.operatorId
    );

    for (let day = 0; day < 7; day++) {
      const date = new Date();
      date.setDate(date.getDate() + day);
      date.setHours(0, 0, 0, 0);

      // Create varied number of schedules per day (2-5 schedules)
      const numberOfSchedules = Math.floor(Math.random() * 4) + 2; // 2-5 schedules

      // Select random departure times for this route/day combination
      const selectedTimes = [];
      const availableTimes = [...baseDepartureTimes];

      for (let i = 0; i < numberOfSchedules && availableTimes.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * availableTimes.length);
        selectedTimes.push(availableTimes.splice(randomIndex, 1)[0]);
      }

      // Sort selected times by hour
      selectedTimes.sort((a, b) => a.hour - b.hour);

      for (
        let scheduleIndex = 0;
        scheduleIndex < selectedTimes.length;
        scheduleIndex++
      ) {
        const { hour, minute } = selectedTimes[scheduleIndex];

        // Add some random variation to minutes (±15 minutes)
        const variationMinutes = Math.floor(Math.random() * 31) - 15; // -15 to +15
        const departureTime = new Date(date);
        departureTime.setHours(hour, minute + variationMinutes, 0, 0);

        // Ensure departure time is not negative
        if (departureTime.getHours() < 0) {
          departureTime.setHours(0, 0, 0, 0);
        }
        if (departureTime.getHours() >= 24) {
          departureTime.setHours(23, 59, 0, 0);
        }

        const arrivalTime = new Date(departureTime);
        arrivalTime.setMinutes(arrivalTime.getMinutes() + route.duration);

        const bus = routeBuses[scheduleIndex % routeBuses.length];

        // Add price variation based on time and day
        let basePriceMultiplier = 1.0;

        // Weekend pricing (Friday, Saturday slightly higher)
        const dayOfWeek = departureTime.getDay();
        if (dayOfWeek === 5 || dayOfWeek === 6) {
          // Friday or Saturday
          basePriceMultiplier += 0.15;
        }

        // Peak hour pricing
        const departureHour = departureTime.getHours();
        if (
          (departureHour >= 7 && departureHour <= 9) ||
          (departureHour >= 17 && departureHour <= 19)
        ) {
          basePriceMultiplier += 0.1; // Peak hours
        } else if (departureHour >= 22 || departureHour <= 5) {
          basePriceMultiplier -= 0.1; // Late night/early morning discount
        }

        const basePrice = Math.floor(
          (Math.random() * 300 + 200) * basePriceMultiplier
        ); // 200-500 with multipliers

        const schedule = await prisma.schedule.create({
          data: {
            routeId: route.id,
            busId: bus.id,
            operatorId: route.operatorId,
            departureTime,
            arrivalTime,
            basePrice,
          },
        });

        // Create pricing tiers for this schedule
        await prisma.pricingTier.createMany({
          data: [
            {
              scheduleId: schedule.id,
              seatType: SeatType.REGULAR,
              price: schedule.basePrice,
            },
            {
              scheduleId: schedule.id,
              seatType: SeatType.PREMIUM,
              price: Math.floor(schedule.basePrice * 1.5),
            },
          ],
        });

        schedules.push(schedule);
      }
    }
  }

  console.log("✅ Created schedules, pricing tiers, and seats for all routes");

  // Create sample tickets
  const tickets = await Promise.all([
    prisma.ticket.create({
      data: {
        subject: "Issue with booking confirmation",
        description:
          "I did not receive a confirmation email for my booking. Please help me resolve this issue.",
        category: TicketCategory.GENERAL,
        priority: TicketPriority.MEDIUM,
        status: TicketStatus.OPEN,
        userId: customerUsers[0].id,
      },
    }),
    prisma.ticket.create({
      data: {
        subject: "Payment not processed",
        description:
          "I tried to make a payment but it failed. My card was charged but the booking was not confirmed.",
        category: TicketCategory.BILLING,
        priority: TicketPriority.HIGH,
        status: TicketStatus.IN_PROGRESS,
        userId: customerUsers[1].id,
      },
    }),
    prisma.ticket.create({
      data: {
        subject: "Account access issue",
        description:
          "I'm unable to access my account. It says my credentials are incorrect.",
        category: TicketCategory.ACCOUNT,
        priority: TicketPriority.MEDIUM,
        status: TicketStatus.OPEN,
        userId: customerUsers[0].id,
      },
    }),
    prisma.ticket.create({
      data: {
        subject: "Technical issue with mobile app",
        description:
          "The mobile app keeps crashing when I try to search for buses.",
        category: TicketCategory.TECHNICAL,
        priority: TicketPriority.LOW,
        status: TicketStatus.RESOLVED,
        userId: customerUsers[1].id,
      },
    }),
  ]);

  console.log("✅ Created sample tickets");

  // Create sample comments for tickets
  const comments = await Promise.all([
    prisma.comment.create({
      data: {
        content:
          "Thank you for reporting this issue. We are looking into it and will get back to you shortly.",
        ticketId: tickets[0].id,
        userId: adminUser.id,
      },
    }),
    prisma.comment.create({
      data: {
        content:
          "I have checked your account and resent the confirmation email. Please check your inbox.",
        ticketId: tickets[0].id,
        userId: adminUser.id,
      },
    }),
    prisma.comment.create({
      data: {
        content:
          "I'm still waiting for the confirmation. Did not receive any email yet.",
        ticketId: tickets[0].id,
        userId: customerUsers[0].id,
      },
    }),
    prisma.comment.create({
      data: {
        content:
          "We have refunded the amount to your card. Please allow 5-7 business days for the refund to appear.",
        ticketId: tickets[1].id,
        userId: adminUser.id,
      },
    }),
  ]);

  console.log("✅ Created sample comments");

  // Create sample chat messages for tickets
  const chats = await Promise.all([
    prisma.chat.create({
      data: {
        content: "Hello, I'm having an issue with my booking.",
        ticketId: tickets[0].id,
        userId: customerUsers[0].id,
      },
    }),
    prisma.chat.create({
      data: {
        content:
          "Hi there, I can help you with that. Can you please provide your booking reference?",
        ticketId: tickets[0].id,
        userId: adminUser.id,
      },
    }),
    prisma.chat.create({
      data: {
        content: "Sure, it's BKG-123456",
        ticketId: tickets[0].id,
        userId: customerUsers[0].id,
      },
    }),
  ]);

  console.log("✅ Created sample chat messages");

  console.log("🎉 Database seeded successfully!");
  console.log(`
📊 Summary:
- Cities: ${cities.length}
- Users: 1 admin, ${customerUsers.length} customers
- Operators: ${operators.length}
- Buses: ${buses.length} (each with 40 seat layouts)
- Routes: ${routes.length}
- Schedules: ${
    schedules.length
  } (for next 7 days - 3 schedules per day per route)
- Total Available Seats: ${
    schedules.length * 40
  } (40 seats available per schedule)
- Tickets: ${tickets.length}
- Comments: ${comments.length}
- Chat Messages: ${chats.length}
- Admin User: admin@busticketing.com (password: admin123)
- Customer Users: customer1@example.com, customer2@example.com (password: customer123)
  `);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
