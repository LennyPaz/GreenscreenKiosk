/**
 * Test Data Generator
 * Creates sample transactions for testing the operator dashboard
 */

const API_BASE_URL = 'http://localhost:5000/api';

// Sample data
const customerNames = [
  'John Smith', 'Emma Johnson', 'Michael Brown', 'Sarah Davis',
  'James Wilson', 'Emily Martinez', 'David Anderson', 'Olivia Taylor',
  'Robert Thomas', 'Sophia Garcia', 'William Rodriguez', 'Isabella Lee',
  'Christopher White', 'Mia Harris', 'Daniel Clark', 'Charlotte Lewis'
];

const backgrounds = [
  { id: 'bg_beach', name: 'Tropical Beach' },
  { id: 'bg_mountains', name: 'Mountain Vista' },
  { id: 'bg_city', name: 'City Skyline' },
  { id: 'bg_paris', name: 'Paris Tower' },
  { id: 'bg_space', name: 'Space Galaxy' },
  { id: 'bg_forest', name: 'Enchanted Forest' },
  { id: 'bg_underwater', name: 'Underwater World' },
  { id: 'bg_castle', name: 'Medieval Castle' },
  { id: 'bg_desert', name: 'Desert Oasis' },
  { id: 'bg_aurora', name: 'Northern Lights' }
];

const deliveryMethods = ['print', 'email', 'both'];
const paymentMethods = ['cash', 'card', 'venmo'];

/**
 * Generate a random integer between min and max (inclusive)
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate random email addresses
 */
function generateEmails(count) {
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'example.com'];
  const emails = [];
  
  for (let i = 0; i < count; i++) {
    const username = `user${randomInt(100, 999)}`;
    const domain = domains[randomInt(0, domains.length - 1)];
    emails.push({ value: `${username}@${domain}` });
  }
  
  return emails;
}

/**
 * Generate a random date within the last N days
 */
function randomDate(daysAgo) {
  const now = new Date();
  const past = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
  const random = new Date(past.getTime() + Math.random() * (now.getTime() - past.getTime()));
  return random.toISOString();
}

/**
 * Create a single test transaction
 */
async function createTestTransaction(customerNumber) {
  const deliveryMethod = deliveryMethods[randomInt(0, deliveryMethods.length - 1)];
  const background = backgrounds[randomInt(0, backgrounds.length - 1)];
  const partySize = randomInt(1, 6);
  
  // Determine quantities based on delivery method
  let printQuantity = 0;
  let emailCount = 0;
  let emailAddresses = [];
  
  if (deliveryMethod === 'print') {
    printQuantity = randomInt(1, 4);
  } else if (deliveryMethod === 'email') {
    emailCount = randomInt(1, 3);
    emailAddresses = generateEmails(emailCount);
  } else { // both
    printQuantity = randomInt(1, 3);
    emailCount = randomInt(1, 2);
    emailAddresses = generateEmails(emailCount);
  }
  
  // Calculate price
  const basePrice = 10.00;
  const printPrice = printQuantity * 5.00;
  const emailPrice = emailCount * 2.00;
  const totalPrice = basePrice + printPrice + emailPrice;
  
  // Random status values
  const statusPhotoTaken = Math.random() > 0.1 ? 1 : 0; // 90% have photo
  const statusPaid = statusPhotoTaken && Math.random() > 0.2 ? 1 : 0; // 80% paid if photo taken
  const statusEmailsSent = statusPaid && (deliveryMethod === 'email' || deliveryMethod === 'both') && Math.random() > 0.3 ? 1 : 0;
  const statusPrintsReady = statusPaid && (deliveryMethod === 'print' || deliveryMethod === 'both') && Math.random() > 0.4 ? 1 : 0;
  const statusPickedUp = statusPaid && statusPrintsReady && Math.random() > 0.5 ? 1 : 0;
  
  const transaction = {
    customerNumber,
    customerName: customerNames[randomInt(0, customerNames.length - 1)],
    partySize,
    backgroundId: background.id,
    backgroundName: background.name,
    deliveryMethod,
    printQuantity,
    emailAddresses,
    emailCount,
    paymentMethod: paymentMethods[randomInt(0, paymentMethods.length - 1)],
    totalPrice: parseFloat(totalPrice.toFixed(2)),
    eventName: Math.random() > 0.7 ? 'Fall Festival 2025' : null
  };
  
  try {
    const response = await fetch(`${API_BASE_URL}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transaction)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create transaction ${customerNumber}`);
    }
    
    const result = await response.json();
    console.log(`✓ Created order #${customerNumber} - ${transaction.customerName}`);
    
    // Update statuses if needed
    if (statusPhotoTaken) {
      await updateStatus(customerNumber, 'status_photo_taken', true);
    }
    if (statusPaid) {
      await updateStatus(customerNumber, 'status_paid', true);
    }
    if (statusEmailsSent) {
      await updateStatus(customerNumber, 'status_emails_sent', true);
    }
    if (statusPrintsReady) {
      await updateStatus(customerNumber, 'status_prints_ready', true);
    }
    if (statusPickedUp) {
      await updateStatus(customerNumber, 'status_picked_up', true);
    }
    
    return result;
  } catch (error) {
    console.error(`✗ Error creating transaction ${customerNumber}:`, error.message);
    throw error;
  }
}

/**
 * Update transaction status
 */
async function updateStatus(customerNumber, field, value) {
  try {
    const response = await fetch(`${API_BASE_URL}/transactions/${customerNumber}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field, value })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update status for transaction ${customerNumber}`);
    }
  } catch (error) {
    console.error(`✗ Error updating status:`, error.message);
  }
}

/**
 * Generate multiple test transactions
 */
async function generateTestData(count = 25) {
  console.log(`\n${'='.repeat(50)}`);
  console.log('🧪 Test Data Generator');
  console.log(`${'='.repeat(50)}\n`);
  
  console.log(`Creating ${count} test transactions...`);
  console.log('');
  
  const startNumber = 1000; // Start from order #1000
  
  for (let i = 0; i < count; i++) {
    const customerNumber = startNumber + i;
    await createTestTransaction(customerNumber);
    
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log('');
  console.log(`${'='.repeat(50)}`);
  console.log(`✅ Successfully created ${count} test transactions!`);
  console.log(`${'='.repeat(50)}`);
  console.log('');
  console.log('👉 View the operator dashboard at: http://localhost:5000/operator');
  console.log('');
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      throw new Error('Server returned error');
    }
    console.log('✓ Server is running');
    return true;
  } catch (error) {
    console.error('✗ Server is not running!');
    console.error('');
    console.error('Please start the server first:');
    console.error('  cd GreenscreenSprint');
    console.error('  npm start');
    console.error('');
    return false;
  }
}

// Main execution
(async () => {
  const isServerRunning = await checkServer();
  
  if (!isServerRunning) {
    process.exit(1);
  }
  
  // Get count from command line args or default to 25
  const count = parseInt(process.argv[2]) || 25;
  
  await generateTestData(count);
})();
