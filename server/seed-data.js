/**
 * SEED DATA GENERATOR
 * Creates test transactions for development/testing
 */

const db = require('./database');

/**
 * Generate customer ID in format: GS-YYYYMMDD-XXXX
 */
function generateCustomerID(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let random = '';
  for (let i = 0; i < 4; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `GS-${dateStr}-${random}`;
}

/**
 * Generate random test transaction data
 */
function generateTransaction(targetDate) {
  const names = [
    'John Smith', 'Sarah Johnson', 'Michael Brown', 'Emily Davis',
    'David Wilson', 'Jessica Garcia', 'James Martinez', 'Ashley Rodriguez',
    'Robert Lee', 'Amanda Taylor', 'Chris Anderson', 'Jennifer White',
    'Daniel Harris', 'Lisa Thompson', 'Matthew Jackson'
  ];

  const backgrounds = [
    { id: 'beach', name: 'Tropical Beach' },
    { id: 'mountains', name: 'Mountain Vista' },
    { id: 'cityscape', name: 'City Skyline' },
    { id: 'forest', name: 'Forest Path' },
    { id: 'space', name: 'Outer Space' },
    { id: 'underwater', name: 'Underwater Scene' },
    { id: 'desert', name: 'Desert Sunset' },
    { id: 'snowscape', name: 'Winter Wonderland' }
  ];

  const deliveryMethods = ['print', 'email', 'both'];
  const paymentMethods = ['credit', 'cash', 'check'];

  const name = names[Math.floor(Math.random() * names.length)];
  const partySize = Math.floor(Math.random() * 8) + 1; // 1-8 people
  const background = backgrounds[Math.floor(Math.random() * backgrounds.length)];
  const deliveryMethod = deliveryMethods[Math.floor(Math.random() * deliveryMethods.length)];
  const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

  let printQuantity = 0;
  let emailAddresses = [];
  let totalPrice = 0;

  // Generate quantities based on delivery method
  if (deliveryMethod === 'print' || deliveryMethod === 'both') {
    printQuantity = Math.floor(Math.random() * 4) + 1; // 1-4 prints
    totalPrice += [10, 15, 20, 25][printQuantity - 1] || 10;
  }

  if (deliveryMethod === 'email' || deliveryMethod === 'both') {
    const emailCount = Math.floor(Math.random() * 3) + 1; // 1-3 emails
    for (let i = 0; i < emailCount; i++) {
      const emailName = name.toLowerCase().replace(' ', '.');
      emailAddresses.push({
        value: `${emailName}${i > 0 ? i + 1 : ''}@example.com`
      });
    }
    totalPrice += 10 + (emailCount - 1); // Base + $1 per additional
  }

  // Random statuses
  const statusPhotoTaken = 1; // Always taken
  const statusPaid = Math.random() > 0.1 ? 1 : 0; // 90% paid
  const statusEmailsSent = (deliveryMethod === 'email' || deliveryMethod === 'both') && Math.random() > 0.3 ? 1 : 0;
  const statusPrintsReady = (deliveryMethod === 'print' || deliveryMethod === 'both') && Math.random() > 0.4 ? 1 : 0;
  const statusPickedUp = statusPrintsReady && Math.random() > 0.5 ? 1 : 0;

  // Add some random time to the target date
  const randomHour = Math.floor(Math.random() * 12) + 10; // 10am - 10pm
  const randomMinute = Math.floor(Math.random() * 60);

  // Format date as local time string (YYYY-MM-DD HH:MM:SS) without timezone conversion
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  const hours = String(randomHour).padStart(2, '0');
  const minutes = String(randomMinute).padStart(2, '0');

  const createdAtLocal = `${year}-${month}-${day} ${hours}:${minutes}:00`;
  const eventDateLocal = `${year}-${month}-${day}`;

  // Create a date object for customer ID generation (using local time components)
  const transactionDate = new Date(year, targetDate.getMonth(), targetDate.getDate(), randomHour, randomMinute, 0);

  return {
    customerNumber: generateCustomerID(transactionDate),
    customerName: name,
    partySize: partySize,
    customerPhotoPath: null, // Could add fake image paths later
    backgroundId: background.id,
    backgroundName: background.name,
    deliveryMethod: deliveryMethod,
    printQuantity: printQuantity,
    emailAddresses: emailAddresses,
    emailCount: emailAddresses.length,
    paymentMethod: paymentMethod,
    totalPrice: totalPrice,
    statusPhotoTaken: statusPhotoTaken,
    statusPaid: statusPaid,
    statusEmailsSent: statusEmailsSent,
    statusPrintsReady: statusPrintsReady,
    statusPickedUp: statusPickedUp,
    operatorNotes: Math.random() > 0.7 ? 'Test note: Customer was very happy!' : null,
    eventName: 'Greenscreen Sprint Demo Event',
    eventDate: eventDateLocal,
    createdAt: createdAtLocal
  };
}

/**
 * Seed the database with test data
 */
async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');

  // Initialize database
  await db.initializeDatabase();
  console.log('✓ Database initialized\n');

  // Generate transactions for 10/1/2025
  const date1 = new Date('2025-10-01T00:00:00');
  console.log(`📅 Generating 10 transactions for ${date1.toLocaleDateString()}...`);

  for (let i = 0; i < 10; i++) {
    const transaction = generateTransaction(date1);
    const result = db.createTransaction(transaction);
    if (result) {
      console.log(`  ✓ Created: ${transaction.customerNumber} - ${transaction.customerName}`);
    } else {
      console.log(`  ✗ Failed: ${transaction.customerNumber}`);
    }
  }

  console.log('');

  // Generate transactions for 10/22/2025
  const date2 = new Date('2025-10-22T00:00:00');
  console.log(`📅 Generating 10 transactions for ${date2.toLocaleDateString()}...`);

  for (let i = 0; i < 10; i++) {
    const transaction = generateTransaction(date2);
    const result = db.createTransaction(transaction);
    if (result) {
      console.log(`  ✓ Created: ${transaction.customerNumber} - ${transaction.customerName}`);
    } else {
      console.log(`  ✗ Failed: ${transaction.customerNumber}`);
    }
  }

  console.log('');

  // Get statistics
  const stats = db.getStatistics();
  console.log('📊 Database Statistics:');
  console.log(`  Total Transactions: ${stats.totalOrders}`);
  console.log(`  Total Revenue: $${stats.totalRevenue.toFixed(2)}`);
  console.log(`  Paid Orders: ${stats.paidOrders}`);
  console.log(`  Picked Up: ${stats.pickedUp}`);

  console.log('\n✅ Seeding complete!');

  // Close database
  db.closeDatabase();
  process.exit(0);
}

// Run the seeder
seedDatabase().catch(error => {
  console.error('❌ Error seeding database:', error);
  process.exit(1);
});
