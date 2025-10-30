/**
 * KIOSK RECEIPT INTEGRATION - CODE TO ADD
 * 
 * Instructions:
 * 1. Add the submitOrderToAPI() function after the "CUSTOMER NUMBER GENERATOR" section
 * 2. Replace the existing createProcessingScreen() function with the new one below
 * 3. Update event listeners to handle submission
 */

// ============================================
// TRANSACTION SUBMISSION (ADD AFTER CUSTOMER NUMBER GENERATOR)
// ============================================

/**
 * Submit order to backend API
 * @returns {Promise<Object>} Transaction result
 */
async function submitOrderToAPI() {
  try {
    // Prepare order data
    const orderData = {
      customerNumber: state.customerNumber,
      customerName: state.customerName,
      partySize: state.partySize,
      customerPhoto: state.customerPhoto, // Base64 image
      selectedBackground: state.selectedBackground,
      backgroundId: state.selectedBackground,
      backgroundName: state.backgroundName,
      deliveryMethod: state.deliveryMethod,
      printQuantity: state.printQuantity,
      emailAddresses: state.emailAddresses.map(e => typeof e === 'object' ? e.value : e), // Extract values
      paymentMethod: state.paymentMethod,
      totalPrice: state.totalPrice,
      eventName: state.config?.eventName || null,
      eventDate: new Date().toISOString().split('T')[0]
    };

    console.log('Submitting order to API...', orderData);

    // Submit to backend
    const response = await fetch('http://localhost:5000/api/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to create transaction');
    }

    console.log('Order submitted successfully:', result);
    return result;

  } catch (error) {
    console.error('Error submitting order:', error);
    throw error;
  }
}

// ============================================
// SCREEN 12: PROCESSING - REPLACE EXISTING FUNCTION
// ============================================

/**
 * Create processing screen with automatic order submission
 * IMPORTANT: Replace the existing createProcessingScreen() function with this one
 */
function createProcessingScreen() {
  // Generate customer number if not already generated
  if (!state.customerNumber) {
    state.customerNumber = generateCustomerNumber();
  }

  // Start submission process after a short delay
  setTimeout(async () => {
    try {
      // Submit order to API
      const result = await submitOrderToAPI();
      
      // Update status to show success
      const statusContainer = document.getElementById('processingStatus');
      if (statusContainer) {
        statusContainer.innerHTML = `
          <div style="background: rgba(16, 185, 129, 0.2); padding: var(--space-lg); border-radius: var(--radius-lg); margin-bottom: var(--space-xl); border: 2px solid rgba(16, 185, 129, 0.4);">
            <div style="display: flex; align-items: center; gap: var(--space-md); margin-bottom: var(--space-md);">
              <div style="width: 32px; height: 32px; background: var(--color-success); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; font-weight: bold;">✓</div>
              <div class="text-xl" style="color: white;">Order details confirmed</div>
            </div>
            <div style="display: flex; align-items: center; gap: var(--space-md); margin-bottom: var(--space-md);">
              <div style="width: 32px; height: 32px; background: var(--color-success); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; font-weight: bold;">✓</div>
              <div class="text-xl" style="color: white;">Customer number assigned</div>
            </div>
            <div style="display: flex; align-items: center; gap: var(--space-md);">
              <div style="width: 32px; height: 32px; background: var(--color-success); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; font-weight: bold;">✓</div>
              <div class="text-xl" style="color: white;">Order submitted successfully!</div>
            </div>
          </div>
        `;
      }
      
      // Navigate to receipt after showing success
      setTimeout(() => {
        navigateTo('receipt');
      }, 1500);
      
    } catch (error) {
      // Show error state
      const statusContainer = document.getElementById('processingStatus');
      if (statusContainer) {
        statusContainer.innerHTML = `
          <div style="background: rgba(239, 68, 68, 0.2); padding: var(--space-lg); border-radius: var(--radius-lg); margin-bottom: var(--space-xl); border: 2px solid rgba(239, 68, 68, 0.4);">
            <div style="display: flex; align-items: center; gap: var(--space-md); margin-bottom: var(--space-md);">
              <div style="width: 32px; height: 32px; background: var(--color-error); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; font-weight: bold;">✕</div>
              <div class="text-xl" style="color: white; font-weight: bold;">Error Submitting Order</div>
            </div>
            <div style="color: rgba(255,255,255,0.9); font-size: 14px; margin-bottom: var(--space-md);">
              ${error.message}
            </div>
            <div style="color: rgba(255,255,255,0.7); font-size: 12px; margin-bottom: var(--space-md);">
              Please contact staff for assistance with order #${state.customerNumber}
            </div>
            <button class="btn btn--primary" onclick="window.location.reload()" style="margin-top: var(--space-md);">
              Start New Order
            </button>
          </div>
        `;
      }
      
      // Log error for debugging
      console.error('Order submission failed:', {
        customerNumber: state.customerNumber,
        error: error.message,
        stack: error.stack
      });
    }
  }, 800);

  return `
    <div class="screen bg-gradient-primary">
      <main class="screen__body">
        <div class="card card--glass" style="max-width: 800px; padding: var(--space-2xl);">
          <div class="text-center mb-2xl">
            <div class="animate-spin" style="width: 80px; height: 80px; border: 6px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; margin: 0 auto var(--space-xl);"></div>
            <h1 class="text-3xl font-bold mb-md" style="color: white;">Finalizing Your Order...</h1>
          </div>

          <div id="processingStatus">
            <div style="background: rgba(255,255,255,0.2); padding: var(--space-lg); border-radius: var(--radius-lg); margin-bottom: var(--space-xl);">
              <div style="display: flex; align-items: center; gap: var(--space-md); margin-bottom: var(--space-md);">
                <div style="width: 32px; height: 32px; background: var(--color-success); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; font-weight: bold;">✓</div>
                <div class="text-xl" style="color: white;">Order details confirmed</div>
              </div>
              <div style="display: flex; align-items: center; gap: var(--space-md); margin-bottom: var(--space-md);">
                <div style="width: 32px; height: 32px; background: var(--color-success); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; font-weight: bold;">✓</div>
                <div class="text-xl" style="color: white;">Customer number assigned</div>
              </div>
              <div style="display: flex; align-items: center; gap: var(--space-md);">
                <div class="animate-spin" style="width: 32px; height: 32px; border: 4px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%;"></div>
                <div class="text-xl" style="color: white;">Submitting to system...</div>
              </div>
            </div>
          </div>

          <div class="text-center">
            <div class="text-xl mb-sm" style="color: rgba(255,255,255,0.9);">Your customer number:</div>
            <div class="text-4xl font-bold mb-xl" style="color: white; background: rgba(255,255,255,0.2); padding: 16px 32px; border-radius: 12px; display: inline-block;">${state.customerNumber}</div>
            <div class="text-lg" style="color: rgba(255,255,255,0.9);">Please proceed to the photographer</div>
          </div>
        </div>
      </main>
    </div>
  `;
}

// ============================================
// TESTING CHECKLIST
// ============================================

/*
TESTING STEPS:

1. Start the server:
   npm start

2. Open browser to http://localhost:5000

3. Complete a full order flow:
   - Select background
   - Enter party size
   - Choose delivery method
   - Enter quantities/emails
   - Enter name
   - Review order
   - Select payment method
   - Take photo
   - Proceed to processing

4. Verify on processing screen:
   - Spinning loader appears
   - Status updates show
   - Order submits successfully
   - Receipt screen displays

5. Check operator dashboard:
   - Navigate to http://localhost:5000/operator
   - Verify order appears in queue
   - Customer number matches
   - All details are correct

6. Test error handling:
   - Stop the server
   - Try to complete an order
   - Should show error message with retry option

7. Print functionality:
   - On receipt screen, click "PRINT RECEIPTS"
   - Verify browser print dialog opens
   - Check print preview shows both receipts

8. Auto-return feature:
   - Wait 30 seconds on receipt screen
   - Should automatically return to attract screen
*/
