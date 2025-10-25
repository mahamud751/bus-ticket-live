const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestBookings() {
  try {
    console.log('Creating test booking data...');
    
    // Get some schedules and users
    const schedules = await prisma.schedule.findMany({
      take: 10,
      include: {
        route: {
          include: {
            origin: true,
            destination: true
          }
        },
        operator: true
      }
    });
    
    const users = await prisma.user.findMany({
      take: 5
    });
    
    if (schedules.length === 0) {
      console.log('No schedules found. Please run the seed first.');
      return;
    }
    
    if (users.length === 0) {
      console.log('No users found. Creating test user...');
      const testUser = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User',
          role: 'USER'
        }
      });
      users.push(testUser);
    }
    
    // Create test bookings for the last 7 days
    const bookings = [];
    for (let i = 0; i < 20; i++) {
      const randomSchedule = schedules[Math.floor(Math.random() * schedules.length)];
      const randomUser = users[Math.floor(Math.random() * users.length)];
      
      // Random date within last 7 days
      const bookingDate = new Date();
      bookingDate.setDate(bookingDate.getDate() - Math.floor(Math.random() * 7));
      
      const statuses = ['CONFIRMED', 'PENDING', 'CANCELLED'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      const totalAmount = Math.floor(Math.random() * 500 + 200);
      
      const booking = await prisma.booking.create({
        data: {
          pnr: `BT${Date.now()}${i}`,
          userId: randomUser.id,
          scheduleId: randomSchedule.id,
          passengerName: `Passenger ${i + 1}`,
          passengerPhone: `+88017000000${i.toString().padStart(2, '0')}`,
          passengerEmail: `passenger${i + 1}@example.com`,
          totalAmount,
          status,
          paymentStatus: status === 'CONFIRMED' ? 'COMPLETED' : 'PENDING',
          bookingDate,
        }
      });
      
      console.log(`Created booking ${i + 1}: ${booking.pnr} - ${randomSchedule.route.origin.name} to ${randomSchedule.route.destination.name} - ${status}`);
      bookings.push(booking);
    }
    
    console.log(`✅ Created ${bookings.length} test bookings`);
    console.log('Test booking data created successfully!');
    
  } catch (error) {
    console.error('Error creating test bookings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestBookings();