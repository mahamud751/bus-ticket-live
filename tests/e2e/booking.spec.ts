import { test, expect } from '@playwright/test';

test.describe('Bus Ticket Booking E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the homepage correctly', async ({ page }) => {
    // Check if the main elements are visible
    await expect(page.locator('h1')).toContainText('Your Journey');
    await expect(page.getByText('Starts Here')).toBeVisible();
    await expect(page.getByText('Book bus tickets instantly')).toBeVisible();
  });

  test('should search for bus routes', async ({ page }) => {
    // Fill search form
    await page.selectOption('select[id="origin"]', 'DHK');
    await page.selectOption('select[id="destination"]', 'CTG');
    
    // Set departure date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    await page.fill('input[type="date"]', dateStr);
    
    // Select passengers
    await page.selectOption('select[id="passengers"]', '2');
    
    // Submit search
    await page.click('button[type="submit"]');
    
    // Should navigate to search results
    await expect(page).toHaveURL(/\/search/);
  });

  test('should handle authentication flow', async ({ page }) => {
    // Click sign in
    await page.click('text=Sign In');
    
    // Should navigate to signin page
    await expect(page).toHaveURL(/\/auth\/signin/);
    
    // Fill login form with demo credentials
    await page.fill('input[type="email"]', 'admin@busticketing.com');
    await page.fill('input[type="password"]', 'admin123');
    
    // Submit login
    await page.click('button[type="submit"]');
    
    // Should navigate back to home and show user info
    await expect(page).toHaveURL('/');
    await expect(page.getByText('Hello,')).toBeVisible();
  });

  test('should toggle theme', async ({ page }) => {
    // Find and click theme toggle
    const themeToggle = page.locator('[aria-label="Toggle theme"]');
    await themeToggle.click();
    
    // Check if dark mode is applied
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('should toggle language', async ({ page }) => {
    // Find and click language toggle
    const langToggle = page.getByTitle(/Switch to/);
    await langToggle.click();
    
    // Check if language changed (look for Bangla text)
    await expect(page.getByText('হোম')).toBeVisible();
  });

  test('should access QR scanner page', async ({ page }) => {
    // Navigate directly to QR scanner
    await page.goto('/qr-scanner');
    
    // Check if QR scanner elements are present
    await expect(page.getByText('QR Scanner')).toBeVisible();
    await expect(page.getByText('Scan QR Code')).toBeVisible();
    await expect(page.getByText('Enter PNR Number')).toBeVisible();
  });

  test('should access offline tickets page', async ({ page }) => {
    // Navigate to offline tickets
    await page.goto('/offline-tickets');
    
    // Check if offline tickets page loads
    await expect(page.getByText('Offline Tickets')).toBeVisible();
    await expect(page.getByText('No Offline Tickets')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check if mobile navigation is visible
    await expect(page.locator('.md\\:hidden.fixed.bottom-0')).toBeVisible();
    
    // Check if desktop navigation is hidden
    await expect(page.locator('.hidden.md\\:block')).not.toBeVisible();
  });

  test('should handle rate limiting', async ({ page, context }) => {
    // Make multiple rapid requests to test rate limiting
    const promises = [];
    for (let i = 0; i < 15; i++) {
      promises.push(
        context.request.post('/api/routes/search', {
          data: {
            origin: 'DHK',
            destination: 'CTG',
            departureDate: '2025-10-01',
            passengers: 1
          }
        })
      );
    }
    
    const responses = await Promise.all(promises);
    
    // Some requests should be rate limited (429 status)
    const rateLimited = responses.filter(r => r.status() === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});

test.describe('Booking Flow E2E', () => {
  test('should complete full booking flow', async ({ page }) => {
    // Login first
    await page.goto('/auth/signin');
    await page.fill('input[type="email"]', 'admin@busticketing.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to home
    await page.waitForURL('/');
    
    // Search for routes
    await page.selectOption('select[id="origin"]', 'DHK');
    await page.selectOption('select[id="destination"]', 'CTG');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    await page.fill('input[type="date"]', dateStr);
    
    await page.click('button[type="submit"]');
    
    // Wait for search results
    await page.waitForURL(/\/search/);
    
    // Select first available route
    const firstRoute = page.locator('.bg-white.p-6.rounded-lg').first();
    await firstRoute.locator('button:has-text("Select Seats")').click();
    
    // Should navigate to seat selection
    await page.waitForURL(/\/booking\/[^/]+/);
    
    // Select an available seat
    await page.locator('.seat-available').first().click();
    
    // Proceed to booking
    await page.click('button:has-text("Proceed to Booking")');
    
    // Fill passenger info
    await page.fill('input[name="name"]', 'Test Passenger');
    await page.fill('input[name="phone"]', '+8801234567890');
    await page.fill('input[name="email"]', 'test@example.com');
    
    // Submit booking
    await page.click('button:has-text("Confirm Booking")');
    
    // Should navigate to confirmation page
    await page.waitForURL(/\/booking\/confirmation\/[^/]+/);
    
    // Check if booking confirmation is shown
    await expect(page.getByText('Booking Confirmed!')).toBeVisible();
    await expect(page.getByText('PNR:')).toBeVisible();
  });
});

test.describe('Admin Dashboard E2E', () => {
  test('should access admin dashboard with admin user', async ({ page }) => {
    // Login as admin
    await page.goto('/auth/signin');
    await page.fill('input[type="email"]', 'admin@busticketing.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Navigate to admin dashboard
    await page.click('text=Admin');
    await page.waitForURL('/admin');
    
    // Check admin dashboard elements
    await expect(page.getByText('Admin Dashboard')).toBeVisible();
    await expect(page.getByText('Total Bookings')).toBeVisible();
    await expect(page.getByText('Analytics')).toBeVisible();
    await expect(page.getByText('Manage Schedules')).toBeVisible();
  });

  test('should manage schedules in admin panel', async ({ page }) => {
    // Login as admin and navigate to admin
    await page.goto('/auth/signin');
    await page.fill('input[type="email"]', 'admin@busticketing.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.click('text=Admin');
    
    // Navigate to schedules management
    await page.click('text=Manage Schedules');
    await page.waitForURL('/admin/schedules');
    
    // Check schedules page
    await expect(page.getByText('Manage Schedules')).toBeVisible();
    await expect(page.getByText('Create Schedule')).toBeVisible();
  });
});