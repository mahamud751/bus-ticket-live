#!/usr/bin/env tsx
/**
 * Automatic Schedule Creation Script
 *
 * This script creates schedules for the next 15 days to ensure continuous availability.
 * It can be scheduled using cron or other job schedulers to run periodically.
 *
 * Usage:
 *   npm run db:schedules:auto
 *
 * Or directly:
 *   tsx scripts/auto-schedule-creation.ts
 */

import { PrismaClient, SeatType } from "@prisma/client";

const prisma = new PrismaClient();

async function createFutureSchedules() {
  console.log("🌱 Starting automatic schedule creation...");

  try {
    // Get all active routes
    const routes = await prisma.route.findMany({
      where: {
        isActive: true,
      },
      include: {
        operator: true,
      },
    });

    console.log(`Found ${routes.length} active routes.`);

    // Get all buses
    const buses = await prisma.bus.findMany({
      where: {
        isActive: true,
      },
    });

    console.log(`Found ${buses.length} active buses.`);

    const schedules = [];
    
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

    // Create schedules for the next 15 days
    for (const route of routes) {
      const routeBuses = buses.filter(
        (bus) => bus.operatorId === route.operatorId
      );

      // Skip if no buses for this route
      if (routeBuses.length === 0) {
        console.log(`No buses found for route ${route.id}. Skipping.`);
        continue;
      }

      for (let day = 0; day < 15; day++) {
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

          // Price range: 700-2200 BDT
          const basePrice = Math.floor(
            (Math.random() * 1500 + 700) * basePriceMultiplier
          );

          try {
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
            await prisma.pricingTier.create({
              data: {
                scheduleId: schedule.id,
                seatType: SeatType.REGULAR,
                price: schedule.basePrice,
              },
            });

            await prisma.pricingTier.create({
              data: {
                scheduleId: schedule.id,
                seatType: SeatType.PREMIUM,
                price: Math.floor(schedule.basePrice * 1.5),
              },
            });

            schedules.push(schedule);
          } catch (error) {
            // Schedule might already exist, skip it
            if (error instanceof Error && error.message.includes('Unique constraint failed')) {
              console.log(`Schedule already exists for route ${route.id} on ${departureTime.toISOString()}. Skipping.`);
            } else {
              console.error(`Error creating schedule for route ${route.id}:`, error);
            }
          }
        }
      }
    }

    console.log(`✅ Successfully created ${schedules.length} new schedules.`);
  } catch (error) {
    console.error("❌ Error creating schedules:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the schedule creation function if this file is executed directly
if (require.main === module) {
  createFutureSchedules().catch(console.error);
}

export default createFutureSchedules;