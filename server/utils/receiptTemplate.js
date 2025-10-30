/**
 * Shared Receipt Template Utility
 * Used by both kiosk and operator dashboard for consistent receipt formatting
 * STANDARDIZED: Uses the kiosk receipt design as the single source of truth
 */

/**
 * Generate receipt HTML for both customer and operator
 * @param {Object} transaction - Transaction data
 * @param {string} type - 'customer' | 'operator' | 'both'
 * @returns {string} HTML receipt template
 */
function generateReceipt(transaction, type = 'both') {
  const now = new Date();
  const date = now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  // Parse email addresses if they're JSON
  const emailAddresses = typeof transaction.email_addresses === 'string'
    ? JSON.parse(transaction.email_addresses || '[]')
    : (transaction.email_addresses || []);

  const emailCount = Array.isArray(emailAddresses) ? emailAddresses.length : 0;

  // Helper to format email addresses as objects or strings
  const formatEmails = (emails) => {
    if (!Array.isArray(emails)) return [];
    return emails.map(email => {
      if (typeof email === 'object' && email.value) {
        return email.value;
      }
      return email;
    });
  };

  const formattedEmails = formatEmails(emailAddresses);

  // Parse backgrounds data for multiple backgrounds display
  const parseBackgrounds = () => {
    if (transaction.photo_quantity > 1 && !transaction.use_same_background && transaction.backgrounds_data) {
      try {
        const backgrounds = typeof transaction.backgrounds_data === 'string'
          ? JSON.parse(transaction.backgrounds_data)
          : transaction.backgrounds_data;
        return backgrounds;
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  const multipleBackgrounds = parseBackgrounds();

  const customerReceipt = `
    <div style="padding: 12px; background: white; color: black; position: relative; ${type === 'both' ? 'border-right: 3px dashed #000;' : ''}">
      <div style="position: relative; z-index: 1;">
        <div style="text-align: center; border-bottom: 2px solid black; padding-bottom: 12px; margin-bottom: 12px;">
          <div style="font-size: 22px; font-weight: bold;">CUSTOMER RECEIPT</div>
          <div style="font-size: 28px; font-weight: bold; margin: 8px 0;">#${transaction.customer_number}</div>
          <div style="font-size: 18px; font-weight: 900; color: #d00; background: #ffeb3b; padding: 6px 12px; display: inline-block; border: 2px solid #000;">⚠️ KEEP THIS RECEIPT ⚠️</div>
        </div>

        <div style="font-size: 11px; line-height: 1.4;">
          <div style="margin-bottom: 8px; font-weight: bold; font-size: 12px;">${transaction.event_name || 'Special Event'}</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
            <div><strong>Name:</strong> ${transaction.customer_name}</div>
            <div><strong>Party:</strong> ${transaction.party_size >= 10 ? '10+' : transaction.party_size}</div>
            <div><strong>Date:</strong> ${date}</div>
            <div><strong>Time:</strong> ${time}</div>
          </div>

          <div style="border-top: 1px solid #000; padding-top: 8px; margin-bottom: 8px;">
            <div style="font-weight: bold; margin-bottom: 4px;">ORDER:</div>
            ${transaction.print_quantity > 0 ? `<div>• ${transaction.print_quantity} Print${transaction.print_quantity > 1 ? 's' : ''}</div>` : ''}
            ${emailCount > 0 ? `<div>• ${emailCount} Email${emailCount > 1 ? 's' : ''}</div>` : ''}
            <div>• ${transaction.payment_method?.toUpperCase()}</div>
            <div style="font-weight: bold; margin-top: 4px;">TOTAL: $${parseFloat(transaction.total_price).toFixed(2)}</div>
          </div>

          <!-- QR Code for Order Status -->
          <div style="text-align: center; margin: 12px 0; padding: 12px; background: white; border: 2px solid #000;">
            <div style="font-weight: bold; font-size: 11px; margin-bottom: 8px;">SCAN TO CHECK ORDER STATUS</div>
            <div style="width: 120px; height: 120px; margin: 0 auto; background: white; display: flex; align-items: center; justify-content: center; border: 2px solid #000;">
              <svg viewBox="0 0 29 29" style="width: 100%; height: 100%;">
                <rect width="29" height="29" fill="white"/>
                <path d="M0,0h7v7h-7zM8,0h1v1h1v1h-1v1h-1v-1h-1v1h-1v-2h2zM10,0h3v1h-1v1h-1v1h-1zM16,0h1v3h1v-1h1v-1h3v1h-1v1h-1v1h1v1h1v-1h1v2h-1v1h1v1h1v-1h1v-2h1v-3h1v7h-1v-1h-2v2h-1v-1h-1v-1h-1v1h-1v1h1v2h-1v1h-1v-2h-1v-1h-1v1h-1v-1h-1v1h-1v1h1v1h-1v1h-2v-1h-1v1h-1v-1h-1v-1h1v-1h-1v-1h2v-1h1v-1h1v-1h-2v-1h1v-1h-1v-1h1v-1h2v-2h2v-1h1v-1h-3v-1h-1v-1h1v-1h-1v-1h1v-1h2v1h1v-2h-2v-1h-1v-1h-1v-1h-1v-2h2v1h1v-1h2v-1h-2v-2h1v-1h-1v-1h-1v2h-1v1h-1v-1h-1v1h-1v-1h-2v-1h1v-1h-1v-1h1v-1h1zM14,1h1v1h-1zM22,0h7v7h-7zM1,1v5h5v-5zM9,2h1v1h-1zM11,2v1h-1v1h1v-1h1v-1zM15,2h1v1h-1zM23,1v5h5v-5zM2,2h3v3h-3zM18,2h1v2h-1zM24,2h3v3h-3zM10,4h1v2h-1v1h-1v-1h1zM16,4v1h-1v1h1v1h-2v-1h-1v1h-1v-1h-1v-1h3v-1zM19,5h1v1h-1zM8,6h1v1h-1zM20,6h1v2h-1zM5,7h2v1h1v1h-1v1h-1v-1h-2v1h-1v-1h-1v-1h2v-1h1zM13,7h2v2h-1v-1h-1zM9,8h1v1h-1zM0,9h1v1h1v1h1v1h-2v1h1v1h-1v2h1v-1h1v1h-1v1h-2v-3h1v-2h-1zM14,9h1v1h2v1h-2v1h-1v1h1v1h-1v1h-2v-1h-1v1h-1v-1h-1v-1h1v-1h-1v-1h3v1h1v-1h1zM18,9h1v1h1v-1h1v1h-1v2h1v-1h2v2h-1v-1h-1v3h-1v-2h-1v-1h-1v-1h1v-1h-1zM4,10h2v1h-2zM22,10v1h1v1h-1v1h-1v1h1v-1h1v3h-1v1h-1v-3h-1v-1h1v-2h-2v-1zM6,11h1v1h-1zM25,11h1v1h-1zM26,12h1v2h-1zM8,13h1v1h1v1h-2zM24,13h1v2h-1v1h-1v-1h1v-1h-1zM17,14h2v1h-2zM27,14h2v1h-2zM11,15h1v1h-1zM16,15h1v1h-1zM4,16h1v2h1v-1h1v-1h2v1h-1v1h-1v1h1v1h-1v1h-2v-1h-1v-1h1v-1h-1zM20,16h1v1h-1zM26,16h1v1h-1zM9,17h1v1h-1zM15,17h1v1h1v-1h1v1h-1v1h-1v1h-1v-1h1zM28,17h1v2h-1zM19,18h1v1h1v-1h3v1h-1v1h-1v-1h-2v1h-1v1h1v1h-2v-1h1v-1h-1v-1h1zM25,18h1v1h1v2h-1v-1h-1zM10,19h2v1h-1v1h-1zM27,19h1v2h-1zM13,20h2v1h-1v1h-1zM23,20h1v1h-1zM9,21h1v1h-1zM0,22h7v7h-7zM16,22h1v1h-1zM18,22h1v2h-1zM20,22h2v1h-2zM24,22h1v1h-1zM1,23v5h5v-5zM11,23h1v1h-1zM26,23h1v1h-1zM2,24h3v3h-3zM10,24h1v2h-1zM13,24h2v1h1v1h-1v1h-1v1h-1v-1h-1v-1h1zM21,24h1v1h-1zM23,24h2v1h1v1h-3v1h2v1h-3v1h4v-2h1v-1h-1v-1h1v-1h-1v-1h-3zM8,25h1v1h-1zM17,25v1h1v1h-2v-1h1zM20,25h1v3h-1zM28,25h1v4h-1zM9,26v1h-1v1h2v-2zM11,27h1v1h-1zM16,27h1v1h-1zM22,27h1v1h-1zM25,28h2v1h-2z" fill="black"/>
              </svg>
            </div>
            <div style="font-size: 9px; margin-top: 6px; color: #666;">ID: ${transaction.customer_number}</div>
          </div>

          ${transaction.print_quantity > 0 ? `
            <div style="border-top: 1px solid #000; padding-top: 8px; margin-bottom: 8px; font-size: 10px;">
              <div style="font-weight: bold; margin-bottom: 4px;">PRINT PICKUP:</div>
              <div>Return at end of event</div>
            </div>

            <div style="border: 2px solid #000; width: 65px; height: 65px; background: white; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 8px 0;">
              <div style="font-size: 16px; font-weight: bold;">☐</div>
              <div style="font-size: 9px; color: #666; margin-top: 2px;">RCVD</div>
            </div>
          ` : ''}

          ${emailCount > 0 ? `
            <div style="border-top: 1px solid #000; padding-top: 8px; margin-bottom: 8px; font-size: 10px;">
              <div style="font-weight: bold;">EMAIL DELIVERY:</div>
              <div>If not received in 2 days:</div>
              <div style="font-weight: bold;">support@greenscreenphotos.com</div>
            </div>
          ` : ''}

          <div style="border-top: 1px solid #000; padding-top: 8px; font-size: 10px;">
            <div style="font-weight: bold;">QUESTIONS? Call: 1-800-PHOTO-HELP</div>
            <div style="border: 1px solid #000; padding: 6px; margin-top: 4px; min-height: 25px; background: #f9f9f9;">
              <div style="color: #999; font-size: 8px;">Notes:</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const operatorReceipt = `
    <div style="padding: 12px; background: #f8f8f8; color: black;">
      <div style="text-align: center; border-bottom: 2px solid black; padding-bottom: 8px; margin-bottom: 8px;">
        <div style="font-size: 16px; font-weight: bold;">OPERATOR COPY</div>
        <div style="font-size: 28px; font-weight: bold; margin: 6px 0; letter-spacing: 3px; line-height: 1;">${transaction.customer_number}</div>
      </div>

      ${transaction.customer_photo_path ? `
        <div style="text-align: center; margin-bottom: 8px;">
          <div style="font-weight: bold; font-size: 11px; margin-bottom: 6px;">CUSTOMER ID:</div>
          <img src="${transaction.customer_photo_path}" alt="Customer ID" width="200" height="200" style="max-width: 200px !important; max-height: 200px !important; width: 200px !important; height: auto !important; border: 3px solid #000; display: block; margin: 0 auto; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
        </div>
      ` : ''}

      <div style="font-size: 9px; line-height: 1.4; background: white; padding: 8px; border: 1px solid #000; margin-bottom: 8px;">
        <div style="font-weight: bold; margin-bottom: 4px;">QUICK DATA:</div>
        <div style="font-family: monospace; font-size: 8px;">N: ${transaction.customer_name} | ${transaction.payment_method?.toUpperCase()}</div>
        ${multipleBackgrounds ? `
          <div style="font-family: monospace; font-size: 8px; margin-top: 4px; margin-bottom: 4px;">PHOTOS: ${transaction.photo_quantity} | Different BGs</div>
          ${multipleBackgrounds.map((bg, i) => `<div style="font-family: monospace; font-size: 7px; margin-left: 8px;">P${i+1}: BG#${bg.id === 'custom' ? 'CUSTOM' : bg.id} ${bg.name}</div>`).join('')}
        ` : `
          <div style="font-family: monospace; font-size: 8px;">BG#${transaction.background_id === 'custom' ? 'CUSTOM' : transaction.background_id}: ${transaction.background_name}</div>
        `}
        <div style="font-family: monospace; font-size: 8px;">Party: ${transaction.party_size >= 10 ? '10+' : transaction.party_size} | $${parseFloat(transaction.total_price).toFixed(2)} | ${transaction.print_quantity}P ${emailCount}E</div>
        <div style="font-family: monospace; font-size: 8px;">${date} ${time}</div>
      </div>

      ${emailCount > 0 ? `
        <div style="border: 1px solid #000; padding: 6px; margin-bottom: 8px; font-size: 8px; background: white;">
          <div style="font-weight: bold;">Emails:</div>
          ${formattedEmails.map((email, i) => `<div>${i + 1}. ${email || '(blank)'}</div>`).join('')}
        </div>
      ` : ''}

      <div style="border: 2px solid #000; padding: 12px; margin-bottom: 12px; min-height: 100px; background: white;">
        <div style="font-weight: bold; font-size: 12px; margin-bottom: 10px; text-align: center;">NOTES:</div>
        <div style="height: 70px;"></div>
      </div>

      <!-- QR Code for Operator Dashboard -->
      <div style="text-align: center; padding: 12px; background: white; border: 2px solid #000;">
        <div style="font-weight: bold; font-size: 11px; margin-bottom: 8px;">OPERATOR: SCAN TO VIEW/UPDATE</div>
        <div style="width: 140px; height: 140px; margin: 0 auto; background: white; display: flex; align-items: center; justify-content: center;">
          <svg viewBox="0 0 29 29" style="width: 100%; height: 100%;">
            <rect width="29" height="29" fill="white"/>
            <path d="M0,0h7v7h-7zM8,0h1v1h1v1h-1v1h-1v-1h-1v1h-1v-2h2zM10,0h3v1h-1v1h-1v1h-1zM16,0h1v3h1v-1h1v-1h3v1h-1v1h-1v1h1v1h1v-1h1v2h-1v1h1v1h1v-1h1v-2h1v-3h1v7h-1v-1h-2v2h-1v-1h-1v-1h-1v1h-1v1h1v2h-1v1h-1v-2h-1v-1h-1v1h-1v-1h-1v1h-1v1h1v1h-1v1h-2v-1h-1v1h-1v-1h-1v-1h1v-1h-1v-1h2v-1h1v-1h1v-1h-2v-1h1v-1h-1v-1h1v-1h2v-2h2v-1h1v-1h-3v-1h-1v-1h1v-1h-1v-1h1v-1h2v1h1v-2h-2v-1h-1v-1h-1v-1h-1v-2h2v1h1v-1h2v-1h-2v-2h1v-1h-1v-1h-1v2h-1v1h-1v-1h-1v1h-1v-1h-2v-1h1v-1h-1v-1h1v-1h1zM14,1h1v1h-1zM22,0h7v7h-7zM1,1v5h5v-5zM9,2h1v1h-1zM11,2v1h-1v1h1v-1h1v-1zM15,2h1v1h-1zM23,1v5h5v-5zM2,2h3v3h-3zM18,2h1v2h-1zM24,2h3v3h-3zM10,4h1v2h-1v1h-1v-1h1zM16,4v1h-1v1h1v1h-2v-1h-1v1h-1v-1h-1v-1h3v-1zM19,5h1v1h-1zM8,6h1v1h-1zM20,6h1v2h-1zM5,7h2v1h1v1h-1v1h-1v-1h-2v1h-1v-1h-1v-1h2v-1h1zM13,7h2v2h-1v-1h-1zM9,8h1v1h-1zM0,9h1v1h1v1h1v1h-2v1h1v1h-1v2h1v-1h1v1h-1v1h-2v-3h1v-2h-1zM14,9h1v1h2v1h-2v1h-1v1h1v1h-1v1h-2v-1h-1v1h-1v-1h-1v-1h1v-1h-1v-1h3v1h1v-1h1zM18,9h1v1h1v-1h1v1h-1v2h1v-1h2v2h-1v-1h-1v3h-1v-2h-1v-1h-1v-1h1v-1h-1zM4,10h2v1h-2zM22,10v1h1v1h-1v1h-1v1h1v-1h1v3h-1v1h-1v-3h-1v-1h1v-2h-2v-1zM6,11h1v1h-1zM25,11h1v1h-1zM26,12h1v2h-1zM8,13h1v1h1v1h-2zM24,13h1v2h-1v1h-1v-1h1v-1h-1zM17,14h2v1h-2zM27,14h2v1h-2zM11,15h1v1h-1zM16,15h1v1h-1zM4,16h1v2h1v-1h1v-1h2v1h-1v1h-1v1h1v1h-1v1h-2v-1h-1v-1h1v-1h-1zM20,16h1v1h-1zM26,16h1v1h-1zM9,17h1v1h-1zM15,17h1v1h1v-1h1v1h-1v1h-1v1h-1v-1h1zM28,17h1v2h-1zM19,18h1v1h1v-1h3v1h-1v1h-1v-1h-2v1h-1v1h1v1h-2v-1h1v-1h-1v-1h1zM25,18h1v1h1v2h-1v-1h-1zM10,19h2v1h-1v1h-1zM27,19h1v2h-1zM13,20h2v1h-1v1h-1zM23,20h1v1h-1zM9,21h1v1h-1zM0,22h7v7h-7zM16,22h1v1h-1zM18,22h1v2h-1zM20,22h2v1h-2zM24,22h1v1h-1zM1,23v5h5v-5zM11,23h1v1h-1zM26,23h1v1h-1zM2,24h3v3h-3zM10,24h1v2h-1zM13,24h2v1h1v1h-1v1h-1v1h-1v-1h-1v-1h1zM21,24h1v1h-1zM23,24h2v1h1v1h-3v1h2v1h-3v1h4v-2h1v-1h-1v-1h1v-1h-1v-1h-3zM8,25h1v1h-1zM17,25v1h1v1h-2v-1h1zM20,25h1v3h-1zM28,25h1v4h-1zM9,26v1h-1v1h2v-2zM11,27h1v1h-1zM16,27h1v1h-1zM22,27h1v1h-1zM25,28h2v1h-2z" fill="black"/>
          </svg>
        </div>
        <div style="font-size: 10px; margin-top: 6px; color: #666;">localhost:5000/operator<br>Order #${transaction.customer_number}</div>
      </div>
    </div>
  `;

  if (type === 'customer') {
    return customerReceipt;
  } else if (type === 'operator') {
    return operatorReceipt;
  } else {
    // Both receipts side-by-side
    return `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0; background: white; border: 2px solid #000;">
        ${customerReceipt}
        ${operatorReceipt}
      </div>
    `;
  }
}

module.exports = { generateReceipt };
