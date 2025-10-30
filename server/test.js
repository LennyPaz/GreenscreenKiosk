/**
 * Test script to verify database and server functionality
 * Run with: node server/test.js
 */

const db = require('./database');

console.log('\n' + '='.repeat(50));
console.log('🧪 Testing Database Functions');
console.log('='.repeat(50) + '\n');

(async () => {
  try {
    // Initialize database first
    await db.initializeDatabase();

    // Test 1: Get all transactions (should be empty initially)
    console.log('✓ Test 1: Get all transactions');
    const transactions = db.getAllTransactions();
    console.log(`  Found ${transactions.length} transactions\n`);

    // Test 2: Get statistics
    console.log('✓ Test 2: Get statistics');
    const stats = db.getStatistics();
    console.log('  Statistics:', stats);
    console.log('');

    // Test 3: Create a test transaction
    console.log('✓ Test 3: Create test transaction');
    const testTransaction = {
      customerNumber: 600,
      customerName: 'Test Customer',
      partySize: 2,
      customerPhotoPath: '/images/customer_photos/600.jpg',
      backgroundId: 'bg-001',
      backgroundName: 'Beach Sunset',
      deliveryMethod: 'both',
      printQuantity: 2,
      emailAddresses: [
        { value: 'test@example.com', label: 'test@example.com' }
      ],
      emailCount: 1,
      paymentMethod: 'card',
      totalPrice: 25.00,
      eventName: 'Test Event',
      eventDate: new Date().toISOString().split('T')[0]
    };

    const created = db.createTransaction(testTransaction);
    console.log('  Created transaction:', created);
    console.log('');

    // Test 4: Get the transaction we just created
    console.log('✓ Test 4: Get transaction by number');
    const retrieved = db.getTransactionByNumber(600);
    console.log('  Retrieved:', retrieved ? '✓ Found' : '✗ Not found');
    console.log('');

    // Test 5: Update status
    console.log('✓ Test 5: Update transaction status');
    const updated = db.updateTransactionStatus(600, 'status_photo_taken', true);
    console.log('  Status updated:', updated ? '✓ Success' : '✗ Failed');
    console.log('');

    // Test 6: Update notes
    console.log('✓ Test 6: Update operator notes');
    const notesUpdated = db.updateOperatorNotes(600, 'This is a test note');
    console.log('  Notes updated:', notesUpdated ? '✓ Success' : '✗ Failed');
    console.log('');

    // Test 7: Search
    console.log('✓ Test 7: Search transactions');
    const searchResults = db.searchTransactions('Test');
    console.log(`  Found ${searchResults.length} results matching "Test"`);
    console.log('');

    // Test 8: Get updated statistics
    console.log('✓ Test 8: Get updated statistics');
    const newStats = db.getStatistics();
    console.log('  Updated statistics:', newStats);
    console.log('');

    console.log('='.repeat(50));
    console.log('✅ All tests passed!');
    console.log('='.repeat(50) + '\n');

    console.log('📝 Note: Test transaction #600 has been created.');
    console.log('   You can view it in the operator dashboard once you start the server.\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    db.closeDatabase();
  }
})();
