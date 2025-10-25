#!/usr/bin/env tsx
/**
 * Daily Ticket Seeding Script
 *
 * This script is designed to run daily to seed new tickets for the system.
 * It can be scheduled using cron or other job schedulers.
 *
 * Usage:
 *   npm run seed:tickets:daily
 *
 * Or directly:
 *   tsx scripts/daily-ticket-seed.ts
 */

import {
  PrismaClient,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

async function seedDailyTickets() {
  console.log("🌱 Starting daily ticket seeding...");

  try {
    // Get all users to randomly assign tickets
    const users = await prisma.user.findMany();

    if (users.length === 0) {
      console.log("⚠️  No users found. Skipping ticket seeding.");
      return;
    }

    // Create a set number of tickets each day (e.g., 5-10)
    const numberOfTickets = Math.floor(Math.random() * 6) + 5; // 5-10 tickets

    const categories = Object.values(TicketCategory);
    const priorities = Object.values(TicketPriority);
    const statuses = [TicketStatus.OPEN, TicketStatus.IN_PROGRESS];

    const ticketSubjects = [
      "Booking confirmation not received",
      "Payment processing issue",
      "Schedule change request",
      "Refund inquiry",
      "Account access problem",
      "Mobile app technical issue",
      "Seat selection problem",
      "Route information request",
      "Bus delay complaint",
      "Luggage policy clarification",
    ];

    const ticketDescriptions = [
      "I haven't received my booking confirmation email. Please assist.",
      "There was an issue processing my payment. The transaction failed but my card was charged.",
      "I need to change my travel date. Is this possible?",
      "I requested a refund but haven't received it yet. When can I expect it?",
      "I'm unable to log into my account. My credentials seem correct.",
      "The mobile app keeps crashing when I try to search for buses.",
      "I'm having trouble selecting seats for my booking.",
      "Can you provide more information about the route between two cities?",
      "My bus was delayed by more than 2 hours. What compensation is available?",
      "What are the policies regarding luggage size and weight?",
    ];

    const createdTickets = [];

    for (let i = 0; i < numberOfTickets; i++) {
      // Randomly select a user
      const randomUser = users[Math.floor(Math.random() * users.length)];

      // Randomly select ticket details
      const randomCategory =
        categories[Math.floor(Math.random() * categories.length)];
      const randomPriority =
        priorities[Math.floor(Math.random() * priorities.length)];
      const randomStatus =
        statuses[Math.floor(Math.random() * statuses.length)];
      const randomSubject =
        ticketSubjects[Math.floor(Math.random() * ticketSubjects.length)];
      const randomDescription =
        ticketDescriptions[
          Math.floor(Math.random() * ticketDescriptions.length)
        ];

      const ticket = await prisma.ticket.create({
        data: {
          subject: randomSubject,
          description: randomDescription,
          category: randomCategory,
          priority: randomPriority,
          status: randomStatus,
          userId: randomUser.id,
        },
      });

      createdTickets.push(ticket);
    }

    console.log(`✅ Successfully created ${createdTickets.length} tickets.`);

    // Log summary
    const statusCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    const priorityCounts: Record<string, number> = {};

    createdTickets.forEach((ticket) => {
      statusCounts[ticket.status] = (statusCounts[ticket.status] || 0) + 1;
      categoryCounts[ticket.category] =
        (categoryCounts[ticket.category] || 0) + 1;
      priorityCounts[ticket.priority] =
        (priorityCounts[ticket.priority] || 0) + 1;
    });

    console.log("\n📊 Ticket Summary:");
    console.log(`Status:`, statusCounts);
    console.log(`Category:`, categoryCounts);
    console.log(`Priority:`, priorityCounts);
  } catch (error) {
    console.error("❌ Error seeding daily tickets:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding function if this file is executed directly
if (require.main === module) {
  seedDailyTickets().catch(console.error);
}

export default seedDailyTickets;
