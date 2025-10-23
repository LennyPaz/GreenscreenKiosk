/**
 * GREENSCREEN KIOSK - Single File Version
 * No modules, no build tools, just works!
 */

// ============================================
// GLOBAL STATE
// ============================================
const state = {
  currentScreen: 'attract',        // Start with attract loop
  currentStep: 0,
  totalSteps: 11,                  // FIXED: Actual workflow steps
  screenHistory: [],               // M2: Navigation history stack for back button
  customerName: '',
  partySize: 1,
  selectedBackground: null,
  backgroundName: '',              // Name of selected background
  backgroundCategory: 'Nature',    // Current background category tab
  deliveryMethod: null,            // 'print' | 'email' | 'both'
  printQuantity: 0,
  emailAddresses: [],              // SIMPLIFIED: Array of email strings (no quantity concept)
  paymentMethod: null,
  customerPhoto: null,             // Base64 webcam image
  photoCaptured: false,            // NEW: Track if photo was captured (for confirmation)
  customerNumber: null,
  totalPrice: 0,                   // Calculated total
  reviewedOnce: false,             // Track if they saw review
  config: null,
  idleTimer: null                  // For attract loop timeout
};

// ============================================
// CONFIG PARSER
// ============================================
function parseConfig(configText) {
  const config = {};
  const lines = configText.split('\n');
  
  lines.forEach(line => {
    if (!line.trim() || line.startsWith('[') || !line.includes('=')) return;
    const [key, value] = line.split('=');
    const trimmedValue = value.trim();
    config[key.trim()] = isNaN(trimmedValue) ? trimmedValue : parseFloat(trimmedValue);
  });
  
  return {
    theme: config.THM || 'Green Screen Photos',
    eventName: config.EV || 'Special Event',
    basePrice: config.BP || 10.00,
    features: {
      freeMode: config.FR === 1,
      prints: config.PF === 1,
      email: config.EF === 1,
      creditCard: config.CC === 1,
      cash: config.CK === 1,
      check: config.CUS === 1,
    },
    printPricing: {
      1: config.BP || 10.00,
      2: config.P2P || 15.00,
      3: config.P3P || 20.00,
      4: config.P4P || 25.00,
      5: config.P5P || 30.00,
      6: config.P6P || 35.00,
      7: config.P7P || 40.00,
      8: config.P8P || 45.00,
    },
    emailPricing: {
      1: config.E1P || 10.00,
      2: (config.E1P || 10) + 1.00,
      3: (config.E1P || 10) + 2.00,
      4: (config.E1P || 10) + 2.50,
      5: (config.E1P || 10) + 3.00,
    }
  };
}

async function loadConfig() {
  try {
    const response = await fetch('./public/config.txt');
    const text = await response.text();
    return parseConfig(text);
  } catch (error) {
    console.error('Error loading config:', error);
    return {
      theme: 'Green Screen Photos',
      eventName: 'Special Event',
      basePrice: 10.00,
      features: { freeMode: false, prints: true, email: true, creditCard: true, cash: true, check: false },
      printPricing: { 1: 10, 2: 15, 3: 20, 4: 25, 5: 30, 6: 35, 7: 40, 8: 45 },
      emailPricing: { 1: 10, 2: 11, 3: 12, 4: 12.5, 5: 13 }
    };
  }
}

// ============================================
// PRICE CALCULATION (Batch 6: Live Preview)
// ============================================
/**
 * Calculate current total price based on state
 * @returns {number} Total price
 */
function calculateCurrentPrice() {
  const config = state.config;
  if (!config) return 0;

  // Free mode
  if (config.features?.freeMode) return 0;

  let total = 0;

  // Print pricing
  if (state.deliveryMethod === 'print' || state.deliveryMethod === 'both') {
    const printPrice = config.printPricing?.[state.printQuantity] || 0;
    total += printPrice;
  }

  // Email pricing (base + per recipient)
  if (state.deliveryMethod === 'email' || state.deliveryMethod === 'both') {
    const baseEmailPrice = config.emailPricing?.[1] || 10;
    const numRecipients = state.emailAddresses.filter(email => email.value && email.value.trim()).length;
    total += baseEmailPrice + (numRecipients - 1); // Base + $1 per additional recipient
  }

  return total;
}

/**
 * Update price display if it exists on current screen
 */
function updatePricePreview() {
  const pricePreview = document.getElementById('pricePreview');
  if (pricePreview) {
    const price = calculateCurrentPrice();
    pricePreview.textContent = `$${price.toFixed(2)}`;

    // Add pulse animation on price change
    pricePreview.style.animation = 'none';
    setTimeout(() => {
      pricePreview.style.animation = 'pulse 0.5s ease-out';
    }, 10);
  }
}

/**
 * Generate price preview badge HTML for screens
 * @returns {string} HTML for floating price badge
 */
function createPricePreviewBadge() {
  const config = state.config;
  if (!config || config.features?.freeMode) return '';

  const currentPrice = calculateCurrentPrice();

  // Only show if there's a selected delivery method
  if (!state.deliveryMethod) return '';

  return `
    <div id="pricePreviewContainer" style="position: fixed; bottom: 100px; right: 20px; z-index: 90;">
      <div style="background: var(--gradient-success); padding: 16px 24px; border-radius: 16px; box-shadow: var(--shadow-2xl); display: flex; flex-direction: column; align-items: center; animation: slideUp 0.3s ease-out;">
        <div style="font-size: 12px; color: rgba(255,255,255,0.9); margin-bottom: 4px; font-weight: 600; letter-spacing: 1px;">CURRENT TOTAL</div>
        <div id="pricePreview" style="font-size: 36px; font-weight: bold; color: white; line-height: 1;">$${currentPrice.toFixed(2)}</div>
      </div>
    </div>
  `;
}

// ============================================
// NAVIGATION HELPERS (M2: History Stack)
// ============================================
/**
 * Navigate to a new screen with history tracking
 * @param {string} newScreen - Screen to navigate to
 * @param {boolean} skipHistory - If true, don't add to history (for back navigation)
 */
function navigateTo(newScreen, skipHistory = false) {
  // Don't track attract or receipt screens in history
  if (!skipHistory && state.currentScreen !== 'attract' && state.currentScreen !== 'receipt') {
    state.screenHistory.push(state.currentScreen);
  }

  state.currentScreen = newScreen;
  render();
}

/**
 * Navigate back using history stack
 */
function goBack() {
  if (state.screenHistory.length > 0) {
    const previousScreen = state.screenHistory.pop();
    navigateTo(previousScreen, true); // skipHistory = true to avoid re-adding
  } else {
    // Fallback to attract if no history
    navigateTo('attract', true);
  }
}

// ============================================
// TEMPLATE UTILITIES
// ============================================
/**
 * Clone a template and return the DOM fragment
 * @param {string} templateId - ID of the template element
 * @returns {DocumentFragment} Cloned template content
 */
function cloneTemplate(templateId) {
  const template = document.getElementById(templateId);
  if (!template) {
    console.error(`Template not found: ${templateId}`);
    return document.createDocumentFragment();
  }
  return template.content.cloneNode(true);
}

/**
 * Set text content for elements with data-bind attribute
 * @param {DocumentFragment|Element} fragment - DOM fragment or element
 * @param {Object} bindings - Object with key-value pairs to bind
 */
function bindData(fragment, bindings) {
  Object.entries(bindings).forEach(([key, value]) => {
    const element = fragment.querySelector(`[data-bind="${key}"]`);
    if (element) {
      element.textContent = value;
    }
  });
}

/**
 * Insert dynamic content into placeholder
 * @param {DocumentFragment|Element} fragment - DOM fragment or element
 * @param {string} placeholderName - Name of the data-dynamic attribute
 * @param {string|Element} content - HTML string or DOM element to insert
 */
function insertDynamic(fragment, placeholderName, content) {
  const placeholder = fragment.querySelector(`[data-dynamic="${placeholderName}"]`);
  if (placeholder) {
    if (typeof content === 'string') {
      placeholder.innerHTML = content;
    } else {
      placeholder.appendChild(content);
    }
  }
}

/**
 * Insert a component template into a placeholder
 * @param {DocumentFragment|Element} fragment - DOM fragment or element
 * @param {string} componentName - Name of the data-component attribute
 * @param {DocumentFragment|Element} component - Component to insert
 */
function insertComponent(fragment, componentName, component) {
  const placeholder = fragment.querySelector(`[data-component="${componentName}"]`);
  if (placeholder) {
    placeholder.appendChild(component);
  }
}

// ============================================
// CUSTOMER NUMBER GENERATOR
// ============================================
/**
 * Generate a unique customer ID using timestamp + random string
 * Format: GS-YYYYMMDD-XXXX
 * Example: GS-20251022-A3K9
 *
 * This ensures:
 * - No collisions even if localStorage is cleared
 * - Works across multiple devices/kiosks
 * - Easy to read on receipts
 * - Sortable by date
 */
function generateCustomerNumber() {
  // Get current date in YYYYMMDD format
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // Generate random 4-character alphanumeric string
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (0, O, I, 1)
  let random = '';
  for (let i = 0; i < 4; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const customerId = `GS-${dateStr}-${random}`;

  // Store in localStorage for reference (optional - for tracking/debugging)
  try {
    const existingIds = JSON.parse(localStorage.getItem('generatedCustomerIds') || '[]');
    existingIds.push({ id: customerId, timestamp: now.toISOString() });

    // Keep only last 100 IDs to prevent localStorage bloat
    if (existingIds.length > 100) {
      existingIds.shift();
    }

    localStorage.setItem('generatedCustomerIds', JSON.stringify(existingIds));
  } catch (error) {
    console.warn('Could not store customer ID history:', error);
  }

  return customerId;
}

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
// STATE PERSISTENCE (T1)
// ============================================
function saveState() {
  // Don't save attract or receipt screens
  if (state.currentScreen === 'attract' || state.currentScreen === 'receipt') {
    return;
  }

  const stateToSave = {
    currentScreen: state.currentScreen,
    currentStep: state.currentStep,
    screenHistory: state.screenHistory,
    customerName: state.customerName,
    partySize: state.partySize,
    selectedBackground: state.selectedBackground,
    backgroundName: state.backgroundName,
    backgroundCategory: state.backgroundCategory,
    deliveryMethod: state.deliveryMethod,
    printQuantity: state.printQuantity,
    emailAddresses: state.emailAddresses,
    paymentMethod: state.paymentMethod,
    totalPrice: state.totalPrice,
    reviewedOnce: state.reviewedOnce,
    timestamp: Date.now()
  };

  localStorage.setItem('kioskState', JSON.stringify(stateToSave));
}

function loadState() {
  try {
    const saved = localStorage.getItem('kioskState');
    if (!saved) return null;

    const savedState = JSON.parse(saved);

    // Check if saved state is less than 1 hour old
    const oneHour = 60 * 60 * 1000;
    if (Date.now() - savedState.timestamp > oneHour) {
      clearSavedState();
      return null;
    }

    return savedState;
  } catch (error) {
    console.error('Error loading saved state:', error);
    return null;
  }
}

function clearSavedState() {
  localStorage.removeItem('kioskState');
}

function restoreState(savedState) {
  if (!savedState) return;

  state.currentScreen = savedState.currentScreen;
  state.currentStep = savedState.currentStep;
  state.screenHistory = savedState.screenHistory || [];
  state.customerName = savedState.customerName;
  state.partySize = savedState.partySize;
  state.selectedBackground = savedState.selectedBackground;
  state.backgroundName = savedState.backgroundName;
  state.backgroundCategory = savedState.backgroundCategory;
  state.deliveryMethod = savedState.deliveryMethod;
  state.printQuantity = savedState.printQuantity;
  // C6: Ensure email addresses are objects with IDs
  state.emailAddresses = (savedState.emailAddresses || []).map(email =>
    typeof email === 'string' ? { id: generateEmailId(), value: email } : email
  );
  state.paymentMethod = savedState.paymentMethod;
  state.totalPrice = savedState.totalPrice;
  state.reviewedOnce = savedState.reviewedOnce;
}

// ============================================
// EMAIL ID GENERATOR (C6)
// ============================================
let emailIdCounter = 0;
function generateEmailId() {
  return `email-${Date.now()}-${emailIdCounter++}`;
}

// ============================================
// ON-SCREEN KEYBOARD
// ============================================
// Track caps lock and shift state globally for keyboard
let capsLockEnabled = false;
let shiftEnabled = false;

function createKeyboard(inputId, includeEmailShortcuts = false) {
  const keys = includeEmailShortcuts ? [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '@', '.', '-', '_'],
    ['@GMAIL', '@YAHOO', '@HOTMAIL', '@OUTLOOK'],
    ['SHIFT', 'CAPS', 'SPACE', 'DELETE']
  ] : [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '-', "'", '.', 'COM'],
    ['SHIFT', 'CAPS', 'SPACE', 'DELETE']
  ];

  let html = '<div class="keyboard">';

  keys.forEach((row, rowIndex) => {
    html += '<div class="keyboard__row">';
    row.forEach(key => {
      const classes = ['keyboard__key'];
      if (key === 'SPACE') classes.push('keyboard__key--space');
      if (key === 'DELETE') classes.push('keyboard__key--delete', 'keyboard__key--wide');
      if (key === 'CAPS') classes.push('keyboard__key--caps', 'keyboard__key--wide');
      if (key === 'SHIFT') classes.push('keyboard__key--shift', 'keyboard__key--wide');
      if (key.startsWith('@')) classes.push('keyboard__key--shortcut');

      const displayText = {
        'SPACE': 'Space',
        'DELETE': '⌫ Delete',
        'CAPS': '⇪ CAPS',
        'SHIFT': '⇧ Shift',
        '@GMAIL': '@gmail.com',
        '@YAHOO': '@yahoo.com',
        '@HOTMAIL': '@hotmail.com',
        '@OUTLOOK': '@outlook.com',
        'COM': '.com'
      }[key] || key;

      html += `<button class="${classes.join(' ')}" data-key="${key}" data-input-id="${inputId}">
        ${displayText}
      </button>`;
    });
    html += '</div>';
  });

  html += '</div>';
  return html;
}

function attachKeyboardListeners() {
  const keyboardKeys = document.querySelectorAll('.keyboard__key');
  keyboardKeys.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const key = btn.dataset.key;
      const inputId = btn.dataset.inputId;
      const input = document.getElementById(inputId);

      if (!input) return;

      if (key === 'SHIFT') {
        // Enable shift for next letter only
        shiftEnabled = true;
        // Update visual state of SHIFT button
        const shiftButtons = document.querySelectorAll('.keyboard__key--shift');
        shiftButtons.forEach(shiftBtn => {
          shiftBtn.style.background = 'var(--color-warning)';
          shiftBtn.style.color = 'white';
          shiftBtn.style.fontWeight = 'bold';
        });
        return;
      } else if (key === 'CAPS') {
        // Toggle caps lock (disable shift if active)
        capsLockEnabled = !capsLockEnabled;
        if (capsLockEnabled) {
          shiftEnabled = false;
          // Clear shift visual state
          const shiftButtons = document.querySelectorAll('.keyboard__key--shift');
          shiftButtons.forEach(shiftBtn => {
            shiftBtn.style.background = '';
            shiftBtn.style.color = '';
            shiftBtn.style.fontWeight = '';
          });
        }
        // Update visual state of CAPS button
        const capsButtons = document.querySelectorAll('.keyboard__key--caps');
        capsButtons.forEach(capsBtn => {
          if (capsLockEnabled) {
            capsBtn.style.background = 'var(--color-primary)';
            capsBtn.style.color = 'white';
            capsBtn.style.fontWeight = 'bold';
          } else {
            capsBtn.style.background = '';
            capsBtn.style.color = '';
            capsBtn.style.fontWeight = '';
          }
        });
        return;
      } else if (key === 'DELETE') {
        input.value = input.value.slice(0, -1);
      } else if (key === 'SPACE') {
        input.value += ' ';
      } else if (key === 'COM') {
        input.value += '.com';
      } else if (key === '@GMAIL') {
        input.value += '@gmail.com';
      } else if (key === '@YAHOO') {
        input.value += '@yahoo.com';
      } else if (key === '@HOTMAIL') {
        input.value += '@hotmail.com';
      } else if (key === '@OUTLOOK') {
        input.value += '@outlook.com';
      } else if (key) {
        // Keep numbers and symbols as-is, apply caps lock or shift to letters
        const isNumber = /^[0-9]$/.test(key);
        const isSymbol = /^[-_'@.]$/.test(key);
        if (isNumber || isSymbol) {
          input.value += key;
        } else {
          // Use uppercase if either shift or caps lock is enabled
          const shouldCapitalize = shiftEnabled || capsLockEnabled;
          input.value += shouldCapitalize ? key.toUpperCase() : key.toLowerCase();

          // Clear shift after using it (single-use)
          if (shiftEnabled) {
            shiftEnabled = false;
            const shiftButtons = document.querySelectorAll('.keyboard__key--shift');
            shiftButtons.forEach(shiftBtn => {
              shiftBtn.style.background = '';
              shiftBtn.style.color = '';
              shiftBtn.style.fontWeight = '';
            });
          }
        }
      }

      // Update state for email inputs (C6: Using unique IDs)
      if (input.classList.contains('email-input')) {
        const emailId = input.dataset.emailId;
        const emailObj = state.emailAddresses.find(email => email.id === emailId);
        if (emailObj) {
          emailObj.value = input.value;
        }
      }

      // Update state for name input
      if (input.id === 'nameInput') {
        state.customerName = input.value;
      }

      // Trigger input event to update state
      input.dispatchEvent(new Event('input'));
    });
  });
}

// ============================================
// PRICE TRACKER
// ============================================
function calculateCurrentPrice() {
  const printPrice = state.printQuantity > 0 ? (state.config?.printPricing?.[state.printQuantity] || 0) : 0;
  // SIMPLIFIED: Email pricing is per recipient (base + $1 per additional)
  const emailCount = state.emailAddresses.length;
  const baseEmailPrice = state.config?.emailPricing?.[1] || 10;
  const emailPrice = emailCount > 0 ? baseEmailPrice + (emailCount - 1) : 0;
  return printPrice + emailPrice;
}

function createPriceTracker() {
  const total = calculateCurrentPrice();
  if (total === 0 && !state.deliveryMethod) return '';

  return `
    <div class="price-tracker">
      <div class="price-tracker__label">Current Total</div>
      <div class="price-tracker__amount">$${total.toFixed(2)}</div>
    </div>
  `;
}

// ============================================
// PROGRESS BAR
// ============================================
function createProgressBar(currentStep, totalSteps) {
  // Step labels for navigation
  const stepLabels = [
    { step: 1, label: 'Background', screen: 'background' },
    { step: 2, label: 'Party Size', screen: 'partySize' },
    { step: 3, label: 'Delivery', screen: 'delivery' },
    { step: 4, label: 'Quantity', screen: 'quantity' },
    { step: 5, label: 'Quantity', screen: 'quantity' },     // Duplicate step for quantity (print/email)
    { step: 6, label: 'Email', screen: 'email' },
    { step: 7, label: 'Name', screen: 'name' },
    { step: 8, label: 'Review', screen: 'review' },
    { step: 9, label: 'Payment', screen: 'payment' },
    { step: 10, label: 'Photo', screen: 'photo' },
    { step: 11, label: 'Complete', screen: 'receipt' }
  ];

  let dots = '';
  for (let i = 1; i <= totalSteps; i++) {
    let className = 'progress__dot';
    // FIX: Make all visited steps clickable (after background page which is step 1)
    // On background page (currentStep === 1), nothing is clickable
    // After background (currentStep >= 2), all visited steps including current are clickable
    let isClickable = currentStep >= 2 && i <= currentStep;

    if (i < currentStep) className += ' progress__dot--complete';
    else if (i === currentStep) className += ' progress__dot--current';

    const stepInfo = stepLabels.find(s => s.step === i);
    const label = stepInfo ? stepInfo.label : `Step ${i}`;
    const targetScreen = stepInfo ? stepInfo.screen : '';

    // Make all visited steps clickable after background page
    if (isClickable) {
      dots += `
        <div class="progress__step" data-screen="${targetScreen}" style="display: flex; flex-direction: column; align-items: center; cursor: pointer; padding: 0 4px;">
          <div class="${className}" title="${label}"></div>
          <div style="font-size: 9px; margin-top: 2px; color: var(--color-gray-600); font-weight: 500; white-space: nowrap;">${label}</div>
        </div>
      `;
    } else {
      dots += `
        <div class="progress__step" style="display: flex; flex-direction: column; align-items: center; padding: 0 4px;">
          <div class="${className}" title="${label}"></div>
          <div style="font-size: 9px; margin-top: 2px; color: ${i === currentStep ? 'var(--color-primary)' : 'var(--color-gray-400)'}; font-weight: ${i === currentStep ? '700' : '500'}; white-space: nowrap;">${label}</div>
        </div>
      `;
    }
  }

  return `<footer class="progress" style="padding: 10px 16px;">
    <div style="display: flex; justify-content: center; align-items: flex-start; gap: 16px; flex-wrap: wrap;">
      ${dots}
    </div>
  </footer>`;
}

// ============================================
// SCREEN 1: ATTRACT LOOP - USES TEMPLATE
// ============================================
function createAttractScreen() {
  const config = state.config;

  // Clone template
  const fragment = cloneTemplate('attract-screen-template');

  // Bind data
  bindData(fragment, {
    theme: config?.theme || 'Green Screen Photos',
    eventName: config?.eventName || 'Professional Photo Experience'
  });

  // Insert dynamic pricing
  const pricingHTML = config?.features?.freeMode
    ? `<div style="background: var(--gradient-success); padding: 40px 80px; border-radius: 24px; display: inline-block; box-shadow: var(--shadow-2xl); animation: bounce 2s ease-in-out infinite;">
        <p style="font-size: 72px; font-weight: bold; color: white; margin: 0;">🎉 FREE TODAY! 🎉</p>
      </div>`
    : `<div style="background: linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.15) 100%); backdrop-filter: blur(20px); padding: 48px 80px; border-radius: 28px; box-shadow: 0 12px 48px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.4); border: 2px solid rgba(255,255,255,0.3); max-width: 1100px; margin: 0 auto;">
        <div style="font-size: 36px; font-weight: 800; color: white; margin-bottom: 32px; letter-spacing: 3px; text-shadow: 0 2px 10px rgba(0,0,0,0.3);">💰 PRICING 💰</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 60px; max-width: 1000px; margin: 0 auto;">
          <div style="text-align: center; animation: fadeInUp 0.8s ease-out;">
            <div style="font-size: 32px; color: rgba(255,255,255,0.95); margin-bottom: 16px; font-weight: 600; text-shadow: 0 2px 8px rgba(0,0,0,0.2); white-space: nowrap;">📸 Prints Start At</div>
            <div style="font-size: 96px; font-weight: 900; color: white; text-shadow: 0 4px 20px rgba(0,0,0,0.4), 0 0 40px rgba(255,255,255,0.3); animation: priceGlow 3s ease-in-out infinite;">$${config?.basePrice?.toFixed(2) || '10.00'}</div>
          </div>
          <div style="text-align: center; animation: fadeInUp 0.8s ease-out 0.2s; animation-fill-mode: both;">
            <div style="font-size: 32px; color: rgba(255,255,255,0.95); margin-bottom: 16px; font-weight: 600; text-shadow: 0 2px 8px rgba(0,0,0,0.2); white-space: nowrap;">📧 Email Delivery</div>
            <div style="font-size: 96px; font-weight: 900; color: white; text-shadow: 0 4px 20px rgba(0,0,0,0.4), 0 0 40px rgba(255,255,255,0.3); animation: priceGlow 3s ease-in-out infinite 1.5s;">$${config?.emailPricing?.[1]?.toFixed(2) || '10.00'}</div>
          </div>
        </div>
      </div>
      <style>
        @keyframes priceGlow {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); filter: brightness(1.1); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      </style>`;

  insertDynamic(fragment, 'pricing', pricingHTML);

  // Convert fragment to HTML string for consistency with current render system
  const div = document.createElement('div');
  div.appendChild(fragment);
  return div.innerHTML;
}

// ============================================
// SCREEN 2: WELCOME - USES TEMPLATE
// ============================================
function createWelcomeScreen() {
  const config = state.config;

  // Clone template
  const fragment = cloneTemplate('welcome-screen-template');

  // Bind data
  bindData(fragment, {
    theme: config?.theme || 'Green Screen Photos',
    eventName: config?.eventName || 'Professional Photo Experience'
  });

  // Convert fragment to HTML string
  const div = document.createElement('div');
  div.appendChild(fragment);
  return div.innerHTML;
}

// ============================================
// SCREEN 3: BACKGROUND SELECTION - STILL USES STRING TEMPLATES
// (Complex dynamic content - can be refactored incrementally)
// ============================================
function createBackgroundScreen() {
  // Expanded background library with categories
  const backgrounds = [
    // Nature
    { id: 1, name: 'Beach Sunset', category: 'Nature', img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop' },
    { id: 3, name: 'Mountain Vista', category: 'Nature', img: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop' },
    { id: 4, name: 'Tropical Paradise', category: 'Nature', img: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=300&fit=crop' },
    { id: 7, name: 'Desert Dunes', category: 'Nature', img: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=400&h=300&fit=crop' },
    { id: 8, name: 'Forest Path', category: 'Nature', img: 'https://images.unsplash.com/photo-1511497584788-876760111969?w=400&h=300&fit=crop' },
    { id: 9, name: 'Waterfall', category: 'Nature', img: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=400&h=300&fit=crop' },

    // Urban
    { id: 2, name: 'City Skyline', category: 'Urban', img: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=400&h=300&fit=crop' },
    { id: 10, name: 'Brooklyn Bridge', category: 'Urban', img: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=300&fit=crop' },
    { id: 11, name: 'Tokyo Neon', category: 'Urban', img: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=300&fit=crop' },
    { id: 12, name: 'Paris Streets', category: 'Urban', img: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=300&fit=crop' },

    // Sky & Space
    { id: 5, name: 'Northern Lights', category: 'Sky', img: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=400&h=300&fit=crop' },
    { id: 6, name: 'Starry Night', category: 'Sky', img: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400&h=300&fit=crop' },
    { id: 13, name: 'Galaxy', category: 'Sky', img: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=400&h=300&fit=crop' },
    { id: 14, name: 'Sunset Clouds', category: 'Sky', img: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&h=300&fit=crop' },

    // Abstract
    { id: 15, name: 'Blue Gradient', category: 'Abstract', img: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=400&h=300&fit=crop' },
    { id: 16, name: 'Pink Gradient', category: 'Abstract', img: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=400&h=300&fit=crop' },
    { id: 17, name: 'Bokeh Lights', category: 'Abstract', img: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&h=300&fit=crop' },
  ];

  // Get selected category (default to first category)
  const selectedCategory = state.backgroundCategory || 'Nature';
  const categories = ['Nature', 'Urban', 'Sky', 'Abstract'];
  const filteredBackgrounds = backgrounds.filter(bg => bg.category === selectedCategory);

  return `
    <div class="screen">
      <!-- IMPROVED HEADER: Larger touch targets (MO1) -->
      <header style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(0,0,0,0.02); border-bottom: 1px solid var(--color-border); min-height: 80px; max-height: 80px; position: relative;">
        <button class="btn btn--ghost btn--small" id="backBtn" style="min-height: 60px; min-width: 140px; font-size: 20px; padding: 12px 20px; font-weight: 600;">← Back</button>
        <div style="position: absolute; left: 50%; transform: translateX(-50%); font-size: 24px; font-weight: 700;">Choose Background</div>
        <button class="btn btn--danger btn--small" id="startOverBtn" style="min-height: 60px; min-width: 180px; font-size: 18px; padding: 12px 20px; font-weight: 600;">Start Over ✕</button>
      </header>

      <main style="flex: 1; display: flex; flex-direction: column; padding: 0; overflow: hidden; max-height: calc(100vh - 80px - 50px);">
        <!-- TABS - LARGER FOR TOUCH -->
        <div style="display: flex; gap: 8px; padding: 10px 12px; background: var(--color-gray-100); border-bottom: 2px solid var(--color-border);">
          ${categories.map(cat => `
            <button class="category-tab ${selectedCategory === cat ? 'category-tab--active' : ''}" data-category="${cat}"
                    style="flex: 1; padding: 16px 20px; border-radius: 10px; font-size: 18px; font-weight: 700; border: none; cursor: pointer; transition: all 0.2s;
                    background: ${selectedCategory === cat ? 'var(--gradient-primary)' : 'white'};
                    color: ${selectedCategory === cat ? 'white' : 'var(--color-gray-700)'};
                    box-shadow: ${selectedCategory === cat ? 'var(--shadow-md)' : 'var(--shadow-sm)'}; min-height: 60px;">
              ${cat}
            </button>
          `).join('')}
        </div>

        <!-- MAIN CONTENT AREA - LARGER PREVIEW, SMALLER GRID -->
        <div style="flex: 1; display: grid; grid-template-columns: 1fr 700px; gap: 16px; padding: 12px; overflow: hidden;">
          <!-- LEFT: Background Grid (4 columns, smaller thumbnails) -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; overflow-y: auto; align-content: start; padding-right: 8px;">
            ${filteredBackgrounds.map(bg => `
              <button class="background-btn ${state.selectedBackground === bg.id ? 'bg-selected' : ''}"
                      data-id="${bg.id}" data-name="${bg.name}"
                      style="position: relative; border-radius: 8px; overflow: hidden; cursor: pointer;
                      aspect-ratio: 4/3; min-height: 110px;
                      border: ${state.selectedBackground === bg.id ? '4px solid var(--color-success)' : '3px solid var(--color-border)'};
                      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 2s infinite;
                      transition: all 0.2s;
                      box-shadow: ${state.selectedBackground === bg.id ? '0 0 0 4px rgba(16,185,129,0.3), var(--shadow-lg)' : 'var(--shadow-md)'};">
                <!-- Background Image (loads on top of shimmer) -->
                <div style="position: absolute; inset: 0; background: url('${bg.img}') center/cover; opacity: 0; transition: opacity 0.3s;" onload="this.style.opacity='1'"></div>
                <img src="${bg.img}" style="display: none;" onload="this.previousElementSibling.style.opacity='1'">

                <div style="position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.6));">
                  <div style="position: absolute; bottom: 6px; left: 6px; right: 6px;">
                    <div style="color: white; font-size: 11px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.8);">${bg.name}</div>
                  </div>
                </div>
                ${state.selectedBackground === bg.id ? '<div style="position: absolute; top: 4px; right: 4px; width: 24px; height: 24px; background: var(--color-success); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; color: white; font-weight: bold; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">✓</div>' : ''}
              </button>
            `).join('')}
          </div>

          <!-- RIGHT: Preview & Actions (LARGER) -->
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <!-- Extra Large Preview - FIX: Reduced height to prevent footer overlap -->
            <div class="background-preview-area" style="flex: 1; min-height: 320px; max-height: 630px;">
              ${state.selectedBackground && state.selectedBackground !== 'custom' ? (() => {
                const selectedBg = backgrounds.find(bg => bg.id === state.selectedBackground);
                return selectedBg ? `
                  <div style="width: 100%; height: 100%; position: relative; border-radius: 10px; overflow: hidden; box-shadow: var(--shadow-lg);">
                    <img src="${selectedBg.img}" style="width: 100%; height: 100%; object-fit: cover;">
                    <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); padding: 12px;">
                      <div style="color: white; font-size: 18px; font-weight: bold;">${selectedBg.name}</div>
                    </div>
                  </div>
                ` : '';
              })() : state.selectedBackground === 'custom' ? `
                <div style="width: 100%; height: 100%; background: var(--gradient-secondary); border-radius: 10px; display: flex; align-items: center; justify-content: center; text-align: center; padding: 20px; box-shadow: var(--shadow-lg);">
                  <div>
                    <div style="font-size: 40px; margin-bottom: 8px;">★</div>
                    <div style="font-size: 18px; font-weight: bold; color: white; margin-bottom: 4px;">CUSTOM</div>
                    <div style="font-size: 12px; color: rgba(255,255,255,0.9);">Tell photographer</div>
                  </div>
                </div>
              ` : `
                <div style="width: 100%; height: 100%; background: var(--color-gray-100); border-radius: 10px; display: flex; align-items: center; justify-content: center; border: 2px dashed var(--color-border);">
                  <div style="color: var(--color-gray-400); font-size: 14px; text-align: center;">
                    Select a<br>background
                  </div>
                </div>
              `}
            </div>

            <!-- Custom Background Option - FIX: Better outline -->
            <button class="background-btn ${state.selectedBackground === 'custom' ? 'bg-selected' : ''}"
                    data-id="custom" data-name="Custom"
                    style="height: 80px; background: var(--gradient-secondary); border-radius: 8px; border: ${state.selectedBackground === 'custom' ? '4px solid var(--color-success)' : '4px solid rgba(255,255,255,0.3)'}; cursor: pointer; transition: none; box-shadow: ${state.selectedBackground === 'custom' ? '0 0 0 4px rgba(16,185,129,0.3), var(--shadow-lg)' : 'var(--shadow-md)'}; padding: 14px 16px; display: flex; align-items: center; justify-content: center; transform: none;">
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; color: white; width: 100%;">
                <div style="display: flex; align-items: center; gap: 8px; font-weight: bold; font-size: 17px;">
                  <span style="font-size: 22px;">★</span>
                  CUSTOM BACKGROUND
                </div>
                <div style="font-size: 12px; opacity: 0.95; text-align: center; line-height: 1.3;">Request a specific background from the photographer</div>
              </div>
            </button>

            <!-- Continue Button - FIX: Match Custom button height -->
            <button class="btn btn--gradient-success btn--large" id="nextBtn" ${!state.selectedBackground ? 'disabled' : ''}
                    style="width: 100%; height: 80px; font-size: 17px; font-weight: bold; box-shadow: var(--shadow-lg);">
              CONTINUE →
            </button>
          </div>
        </div>
      </main>

      ${createProgressBar(1, state.totalSteps)}
    </div>
  `;
}

// ============================================
// SCREEN 4: PARTY SIZE - REDESIGNED
// ============================================
function createPartySizeScreen() {
  return `
    <div class="screen">
      <header style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(0,0,0,0.02); border-bottom: 1px solid var(--color-border); min-height: 80px; max-height: 80px; position: relative;">
        <button class="btn btn--ghost btn--small" id="backBtn" style="min-height: 60px; min-width: 140px; font-size: 20px; padding: 12px 20px; font-weight: 600;">← Back</button>
        <div style="position: absolute; left: 50%; transform: translateX(-50%); font-size: 24px; font-weight: 700;">Party Size</div>
        <button class="btn btn--danger btn--small" id="startOverBtn" style="min-height: 60px; min-width: 180px; font-size: 18px; padding: 12px 20px; font-weight: 600;">Start Over ✕</button>
      </header>

      <main style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 12px; max-height: calc(100vh - 80px - 50px);">
        <h1 style="font-size: 26px; font-weight: bold; margin-bottom: 20px; text-align: center;">How many people?</h1>

        <div style="width: 100%; max-width: 900px;">
          <!-- Number Grid -->
          <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 16px;">
            ${[1,2,3,4,5,6,7,8,9,10].map(num => `
              <button class="party-size-btn" data-size="${num}"
                      style="height: 100px; border-radius: 12px; border: 3px solid ${state.partySize === num ? 'var(--color-success)' : 'var(--color-border)'};
                      background: ${state.partySize === num ? 'var(--gradient-success)' : 'white'}; color: ${state.partySize === num ? 'white' : 'var(--color-gray-700)'};
                      font-size: 40px; font-weight: bold; cursor: pointer; transition: all 0.2s; box-shadow: ${state.partySize === num ? '0 0 0 4px rgba(16,185,129,0.3), var(--shadow-lg)' : 'var(--shadow-sm)'};
                      display: flex; align-items: center; justify-content: center;">
                ${num}
              </button>
            `).join('')}
          </div>

          <!-- 10+ Button -->
          <button class="party-size-btn" data-size="11"
                  style="width: 100%; height: 80px; border-radius: 12px; margin-bottom: 16px; border: 3px solid ${state.partySize > 10 ? 'var(--color-success)' : 'var(--color-border)'};
                  background: ${state.partySize > 10 ? 'var(--gradient-success)' : 'white'}; color: ${state.partySize > 10 ? 'white' : 'var(--color-gray-700)'};
                  font-size: 28px; font-weight: bold; cursor: pointer; transition: all 0.2s; box-shadow: ${state.partySize > 10 ? '0 0 0 4px rgba(16,185,129,0.3), var(--shadow-lg)' : 'var(--shadow-sm)'};">
            10+ People
          </button>

          <!-- Continue Button -->
          <button class="btn btn--gradient-primary btn--large" id="nextBtn" style="width: 100%; height: 60px; font-size: 18px; font-weight: bold; box-shadow: var(--shadow-lg);">
            CONTINUE →
          </button>
        </div>
      </main>

      ${createProgressBar(2, state.totalSteps)}
    </div>
  `;
}

// ============================================
// SCREEN 5: DELIVERY METHOD - REDESIGNED
// ============================================
function createDeliveryScreen() {
  const config = state.config;

  // Calculate pricing ranges for display (MO6)
  const printMin = config?.printPricing?.[1] || 10;
  const printMax = config?.printPricing?.[8] || 45;
  const emailBase = config?.emailPricing?.[1] || 10;
  const emailMax = emailBase + 4; // Base + 4 additional emails
  const bothMin = printMin + emailBase;
  const bothMax = printMax + emailMax;

  return `
    <div class="screen">
      <header style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(0,0,0,0.02); border-bottom: 1px solid var(--color-border); min-height: 80px; max-height: 80px; position: relative;">
        <button class="btn btn--ghost btn--small" id="backBtn" style="min-height: 60px; min-width: 140px; font-size: 20px; padding: 12px 20px; font-weight: 600;">← Back</button>
        <div style="position: absolute; left: 50%; transform: translateX(-50%); font-size: 24px; font-weight: 700;">Delivery Method</div>
        <button class="btn btn--danger btn--small" id="startOverBtn" style="min-height: 60px; min-width: 180px; font-size: 18px; padding: 12px 20px; font-weight: 600;">Start Over ✕</button>
      </header>

      <main style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px; max-height: calc(100vh - 80px - 50px);">
        <h1 style="font-size: 28px; font-weight: bold; margin-bottom: 24px;">How would you like your photos?</h1>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; width: 100%; max-width: 1200px; margin-bottom: 20px;">
          <!-- PRINT OPTION -->
          <button class="delivery-btn" data-method="print"
                  style="height: 360px; border-radius: 16px; border: 4px solid ${state.deliveryMethod === 'print' ? 'var(--color-success)' : 'var(--color-border)'};
                  background: ${state.deliveryMethod === 'print' ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' : 'white'}; padding: 24px; cursor: pointer; transition: all 0.2s;
                  box-shadow: ${state.deliveryMethod === 'print' ? '0 0 0 6px rgba(16,185,129,0.3), var(--shadow-xl)' : 'var(--shadow-md)'};
                  display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
            <div class="icon-printer" style="color: ${state.deliveryMethod === 'print' ? 'white' : 'var(--color-primary)'}; transform: scale(1.5); margin-bottom: 24px;"></div>
            <div style="font-size: 32px; font-weight: 900; margin-bottom: 8px; color: ${state.deliveryMethod === 'print' ? 'white' : 'var(--color-gray-900)'};">PRINTED</div>
            <div style="font-size: 16px; line-height: 1.6; color: ${state.deliveryMethod === 'print' ? 'rgba(255,255,255,0.92)' : 'var(--color-gray-600)'}; margin-bottom: 20px; font-weight: 500; max-width: 280px;">
              Professional 4x6 glossy prints ready to take home tonight
            </div>
            <div style="font-size: 22px; font-weight: bold; color: ${state.deliveryMethod === 'print' ? 'white' : 'var(--color-success)'};">
              $${printMin.toFixed(2)} - $${printMax.toFixed(2)}
            </div>
          </button>

          <!-- EMAIL OPTION -->
          <button class="delivery-btn" data-method="email"
                  style="height: 360px; border-radius: 16px; border: 4px solid ${state.deliveryMethod === 'email' ? 'var(--color-success)' : 'var(--color-border)'};
                  background: ${state.deliveryMethod === 'email' ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' : 'white'}; padding: 24px; cursor: pointer; transition: all 0.2s;
                  box-shadow: ${state.deliveryMethod === 'email' ? '0 0 0 6px rgba(16,185,129,0.3), var(--shadow-xl)' : 'var(--shadow-md)'};
                  display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
            <div class="icon-envelope" style="color: ${state.deliveryMethod === 'email' ? 'white' : 'var(--color-info)'}; transform: scale(1.8); margin-bottom: 20px;"></div>
            <div style="font-size: 32px; font-weight: 900; margin-bottom: 8px; color: ${state.deliveryMethod === 'email' ? 'white' : 'var(--color-gray-900)'};">EMAIL</div>
            <div style="font-size: 16px; line-height: 1.6; color: ${state.deliveryMethod === 'email' ? 'rgba(255,255,255,0.92)' : 'var(--color-gray-600)'}; margin-bottom: 20px; font-weight: 500; max-width: 280px;">
              High-resolution digital photos delivered instantly to your inbox. Easy to share!
            </div>
            <div style="font-size: 22px; font-weight: bold; color: ${state.deliveryMethod === 'email' ? 'white' : 'var(--color-success)'};">
              $${emailBase.toFixed(2)} - $${emailMax.toFixed(2)}
            </div>
          </button>

          <!-- BOTH OPTION (BEST VALUE) -->
          <button class="delivery-btn" data-method="both"
                  style="height: 360px; border-radius: 16px; border: 4px solid ${state.deliveryMethod === 'both' ? 'var(--color-success)' : 'var(--color-border)'};
                  background: ${state.deliveryMethod === 'both' ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' : 'white'}; padding: 24px; cursor: pointer; transition: all 0.2s; position: relative;
                  box-shadow: ${state.deliveryMethod === 'both' ? '0 0 0 6px rgba(16,185,129,0.3), var(--shadow-2xl)' : 'var(--shadow-md)'};
                  display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
            <div style="position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--color-accent); color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; box-shadow: var(--shadow-lg);">⭐ BEST VALUE</div>
            <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 16px;">
              <div class="icon-printer" style="color: ${state.deliveryMethod === 'both' ? 'white' : 'var(--color-primary)'}; transform: scale(1.3);"></div>
              <div style="font-size: 24px; font-weight: bold; color: ${state.deliveryMethod === 'both' ? 'white' : 'var(--color-gray-700)'};">+</div>
              <div class="icon-envelope" style="color: ${state.deliveryMethod === 'both' ? 'white' : 'var(--color-info)'}; transform: scale(1.3);"></div>
            </div>
            <div style="font-size: 32px; font-weight: 900; margin-bottom: 8px; color: ${state.deliveryMethod === 'both' ? 'white' : 'var(--color-gray-900)'};">BOTH</div>
            <div style="font-size: 16px; line-height: 1.6; color: ${state.deliveryMethod === 'both' ? 'rgba(255,255,255,0.92)' : 'var(--color-gray-600)'}; margin-bottom: 20px; font-weight: 500; max-width: 280px;">
              Get the best of both worlds with physical prints and digital copies. Maximum value!
            </div>
            <div style="font-size: 22px; font-weight: bold; color: ${state.deliveryMethod === 'both' ? 'white' : 'var(--color-success)'};">
              $${bothMin.toFixed(2)} - $${bothMax.toFixed(2)}
            </div>
          </button>
        </div>

        <!-- Continue Button -->
        <button class="btn btn--gradient-primary btn--large" id="nextBtn" ${!state.deliveryMethod ? 'disabled' : ''}
                style="width: 100%; max-width: 600px; height: 64px; font-size: 19px; font-weight: bold; box-shadow: var(--shadow-lg);">
          CONTINUE →
        </button>
      </main>

      ${createProgressBar(3, state.totalSteps)}
    </div>
  `;
}

// ============================================
// SCREEN 6: QUANTITY SELECTION - REDESIGNED
// ============================================
function createQuantityScreen() {
  const config = state.config;
  const isPrintSelected = state.deliveryMethod === 'print' || state.deliveryMethod === 'both';
  const isEmailSelected = state.deliveryMethod === 'email' || state.deliveryMethod === 'both';

  // Show prints quantity selection (allow re-selection even if already chosen)
  if (isPrintSelected) {
    return `
      <div class="screen">
        <header style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(0,0,0,0.02); border-bottom: 1px solid var(--color-border); min-height: 80px; max-height: 80px;">
          <button class="btn btn--ghost btn--small" id="backBtn" style="min-height: 60px; min-width: 140px; font-size: 20px; padding: 12px 20px; font-weight: 600;">← Back</button>
          <div style="font-size: 24px; font-weight: 700;">Print Quantity</div>
          <button class="btn btn--danger btn--small" id="startOverBtn" style="min-height: 60px; min-width: 180px; font-size: 18px; padding: 12px 20px; font-weight: 600;">Start Over ✕</button>
        </header>

        <main style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px; max-height: calc(100vh - 80px - 50px);">
          <h1 style="font-size: 28px; font-weight: bold; margin-bottom: 20px;">How many prints?</h1>

          <!-- Quantity Grid (With Value Indicators) -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; width: 100%; max-width: 900px; margin-bottom: 20px;">
            ${[1,2,3,4,5,6,7,8].map((num) => {
              const price = config?.printPricing?.[num] || (10 + (num-1) * 5);
              const perPrintPrice = (price / num).toFixed(2);
              const isSelected = state.printQuantity === num;
              const basePrice = config?.printPricing?.[1] || 10;
              const savings = ((basePrice * num) - price).toFixed(2);
              const isBestValue = num >= 5; // 5+ prints is best value

              return `
                <button class="quantity-btn" data-quantity="${num}" data-type="print"
                        style="position: relative; height: 140px; border-radius: 12px; border: 4px solid ${isSelected ? 'var(--color-success)' : 'var(--color-border)'};
                        background: ${isSelected ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'white'}; padding: 16px; cursor: pointer; transition: all 0.2s;
                        box-shadow: ${isSelected ? '0 0 0 6px rgba(16,185,129,0.3), var(--shadow-xl)' : 'var(--shadow-md)'};
                        display: flex; flex-direction: column; align-items: center; justify-content: center;">
                  ${isBestValue ? '<div style="position: absolute; top: -8px; left: 50%; transform: translateX(-50%); background: var(--color-accent); color: white; padding: 4px 12px; border-radius: 12px; font-size: 10px; font-weight: bold; box-shadow: var(--shadow-md); white-space: nowrap;">SAVE $' + savings + '</div>' : ''}
                  <div style="font-size: 48px; font-weight: bold; line-height: 1; color: ${isSelected ? 'white' : 'var(--color-gray-900)'}; margin-bottom: 8px; text-shadow: ${isSelected ? '0 2px 8px rgba(0,0,0,0.3)' : 'none'};">${num}</div>
                  <div style="width: 60%; height: 2px; background: ${isSelected ? 'rgba(255,255,255,0.5)' : 'var(--color-border)'}; margin-bottom: 8px;"></div>
                  <div style="font-size: 28px; font-weight: 900; color: ${isSelected ? 'white' : 'var(--color-success)'}; line-height: 1; margin-bottom: 4px; text-shadow: ${isSelected ? '0 2px 10px rgba(0,0,0,0.4)' : 'none'};">$${price.toFixed(2)}</div>
                  <div style="font-size: 12px; font-weight: 600; color: ${isSelected ? 'rgba(255,255,255,0.95)' : 'var(--color-gray-500)'}; text-shadow: ${isSelected ? '0 1px 4px rgba(0,0,0,0.3)' : 'none'};">$${perPrintPrice} each</div>
                </button>
              `;
            }).join('')}
          </div>

          <!-- Continue Button -->
          <button class="btn btn--gradient-primary btn--large" id="nextBtn" ${!state.printQuantity ? 'disabled' : ''}
                  style="width: 100%; max-width: 600px; height: 64px; font-size: 19px; font-weight: bold; box-shadow: var(--shadow-lg);">
            CONTINUE →
          </button>
        </main>

        ${createProgressBar(4, state.totalSteps)}
        ${createPricePreviewBadge()}
      </div>
    `;
  }

  // Email-only delivery - skip to email screen (this shouldn't normally be rendered)
  // The forward navigation skips this screen, but it might be in history
  navigateTo('email');
  return `
    <div class="screen">
      <main class="screen__body" style="display: flex; align-items: center; justify-content: center; min-height: 60vh;">
        <div style="text-align: center;">
          <div style="font-size: 48px; margin-bottom: 20px;">📧</div>
          <h1 style="font-size: 28px; font-weight: bold;">Going to email entry...</h1>
        </div>
      </main>
    </div>
  `;
}

// ============================================
// SCREEN 7: EMAIL ENTRY - REDESIGNED
// ============================================
function createEmailScreen() {
  // Ensure we have at least one email slot (C6: With unique ID)
  if (state.emailAddresses.length === 0) {
    state.emailAddresses = [{ id: generateEmailId(), value: '' }];
  }

  const config = state.config;
  const maxEmails = 8;
  const canAddMore = state.emailAddresses.length < maxEmails;

  // SIMPLIFIED: Email pricing is per recipient (base + $1 per additional)
  const baseEmailPrice = config?.emailPricing?.[1] || 10;
  const emailCount = state.emailAddresses.length;
  const emailOnlyPrice = emailCount > 0 ? baseEmailPrice + (emailCount - 1) : 0;

  // Calculate total including print cost if delivery is 'both'
  const printPrice = state.deliveryMethod === 'both' && state.printQuantity > 0 ? (config?.printPricing?.[state.printQuantity] || 0) : 0;
  const totalEmailPrice = emailOnlyPrice + printPrice;

  return `
    <div class="screen">
      <header style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(0,0,0,0.02); border-bottom: 1px solid var(--color-border); min-height: 80px; max-height: 80px; position: relative;">
        <button class="btn btn--ghost btn--small" id="backBtn" style="min-height: 60px; min-width: 140px; font-size: 20px; padding: 12px 20px; font-weight: 600;">← Back</button>
        <div style="position: absolute; left: 50%; transform: translateX(-50%); font-size: 24px; font-weight: 700;">Email Addresses</div>
        <button class="btn btn--danger btn--small" id="startOverBtn" style="min-height: 60px; min-width: 180px; font-size: 18px; padding: 12px 20px; font-weight: 600;">Start Over ✕</button>
      </header>

      <main style="flex: 1; display: grid; grid-template-columns: 60% 40%; gap: 14px; padding: 12px; overflow: hidden; max-height: calc(100vh - 80px - 80px);">
        <!-- LEFT: Keyboard & Inputs (KEYBOARD AT BOTTOM) -->
        <div style="display: grid; grid-template-rows: 1fr auto; gap: 12px; min-height: 0;">
          <!-- Email Inputs (2-COLUMN LAYOUT) -->
          <div class="email-list-container" style="overflow-y: auto; padding: 8px; background: var(--color-gray-50); border-radius: 10px; min-height: 200px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              ${state.emailAddresses.map((emailObj, i) => `
                <div style="display: flex; gap: 8px; align-items: center;">
                  <span style="font-size: 18px; font-weight: bold; color: var(--color-primary); min-width: 32px;">${i + 1}.</span>
                  <input
                    type="text"
                    class="input email-input"
                    id="${emailObj.id}"
                    data-email-id="${emailObj.id}"
                    placeholder="email@example.com"
                    value="${emailObj.value || ''}"
                    style="flex: 1; font-size: 16px; padding: 12px; border: 3px solid var(--color-border); border-radius: 8px;"
                  >
                  ${state.emailAddresses.length > 1 ? `
                    <button class="btn btn--danger btn--small remove-email-btn" data-email-id="${emailObj.id}" style="min-width: 40px; min-height: 40px; padding: 6px; font-size: 16px; border-radius: 8px;">
                      ✕
                    </button>
                  ` : ''}
                </div>
              `).join('')}
            </div>

            <!-- Add Email Button (moved inside scroll container for more space) -->
            ${canAddMore ? `
              <button class="btn btn--outline" id="addEmailBtn" style="width: 100%; height: 50px; font-size: 16px; font-weight: 700; margin-top: 10px;">
                + ADD ANOTHER EMAIL (+$1)
              </button>
            ` : `
              <div style="text-align: center; color: var(--color-warning); font-size: 14px; padding: 10px; background: rgba(255,193,7,0.15); border-radius: 8px; font-weight: 700; margin-top: 10px;">
                Maximum ${maxEmails} email addresses
              </div>
            `}
          </div>

          <!-- Keyboard (FIXED IN REMAINING SPACE) -->
          <div style="display: flex; flex-direction: column; min-height: 0;">
            ${createKeyboard(state.emailAddresses[0]?.id || 'email-0', true)}
          </div>
        </div>

        <!-- RIGHT: Summary & Continue (FIXED LAYOUT) -->
        <div style="display: grid; grid-template-rows: auto auto 1fr auto; gap: 12px; padding-right: 12px;">
          <!-- Summary Card -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; color: white; box-shadow: var(--shadow-lg);">
            <div style="font-size: 22px; font-weight: bold; margin-bottom: 16px;">Order Summary</div>

            ${state.deliveryMethod === 'both' && state.printQuantity > 0 ? `
              <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="font-size: 20px;">${state.printQuantity} Print${state.printQuantity > 1 ? 's' : ''}</span>
                  <span style="font-size: 22px; font-weight: bold;">$${(config?.printPricing?.[state.printQuantity] || 0).toFixed(2)}</span>
                </div>
              </div>
            ` : ''}

            <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="font-size: 20px;">${state.deliveryMethod === 'both' ? 'Email: ' : ''}Base price (1 email)</span>
                <span style="font-size: 22px; font-weight: bold;">$${baseEmailPrice.toFixed(2)}</span>
              </div>
              ${state.emailAddresses.length > 1 ? `
                <div style="display: flex; justify-content: space-between; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2);">
                  <span style="font-size: 20px;">+${state.emailAddresses.length - 1} additional</span>
                  <span style="font-size: 22px; font-weight: bold;">+$${(state.emailAddresses.length - 1).toFixed(2)}</span>
                </div>
              ` : ''}
            </div>

            <div style="border-top: 2px solid rgba(255,255,255,0.3); padding-top: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 22px; font-weight: 600;">${state.deliveryMethod === 'both' ? 'Grand Total:' : 'Total:'}</span>
                <span style="font-size: 42px; font-weight: bold;">$${totalEmailPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <!-- Email Count -->
          <div style="background: var(--color-gray-50); padding: 16px; border-radius: 10px; text-align: center;">
            <div style="font-size: 14px; color: var(--color-gray-600); margin-bottom: 4px;">Email Addresses</div>
            <div style="font-size: 36px; font-weight: bold; color: var(--color-primary);">${state.emailAddresses.length}</div>
            <div style="font-size: 12px; color: var(--color-gray-500);">of ${maxEmails} maximum</div>
          </div>

          <!-- Spacer to push button to bottom -->
          <div></div>

          <!-- Continue Button (FIXED AT BOTTOM) -->
          <button class="btn btn--gradient-success btn--large" id="nextBtn" style="width: 100%; height: 70px; font-size: 17px; font-weight: bold; box-shadow: var(--shadow-lg);">
            CONTINUE →
          </button>
        </div>
      </main>

      ${createProgressBar(6, state.totalSteps)}
    </div>
  `;
}

// ============================================
// SCREEN 8: NAME ENTRY - REDESIGNED
// ============================================
function createNameScreen() {
  return `
    <div class="screen">
      <header style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(0,0,0,0.02); border-bottom: 1px solid var(--color-border); min-height: 80px; max-height: 80px;">
        <button class="btn btn--ghost btn--small" id="backBtn" style="min-height: 60px; min-width: 140px; font-size: 20px; padding: 12px 20px; font-weight: 600;">← Back</button>
        <div style="position: absolute; left: 50%; transform: translateX(-50%); font-size: 24px; font-weight: 700;">Your Name</div>
        <button class="btn btn--danger btn--small" id="startOverBtn" style="min-height: 60px; min-width: 180px; font-size: 18px; padding: 12px 20px; font-weight: 600;">Start Over ✕</button>
      </header>

      <main style="flex: 1; display: flex; flex-direction: column; align-items: center; padding: 16px; max-height: calc(100vh - 80px - 80px); overflow: hidden;">
        <div style="width: 100%; max-width: 900px; display: flex; flex-direction: column; height: 100%; gap: 12px;">
          <!-- Header Section -->
          <div style="text-align: center;">
            <h1 style="font-size: 32px; font-weight: bold; margin-bottom: 8px;">What's your name?</h1>
            <p style="font-size: 16px; color: var(--color-gray-600);">This will appear on your receipt</p>
          </div>

          <!-- Name Input -->
          <div>
            <input
              type="text"
              id="nameInput"
              class="input"
              placeholder="Enter your name..."
              value="${state.customerName || ''}"
              style="width: 100%; font-size: 20px; text-align: center; padding: 16px; border: 3px solid var(--color-border); border-radius: 12px; font-weight: 500; box-shadow: var(--shadow-md);"
            >
          </div>

          <!-- Keyboard (TAKES AVAILABLE SPACE) -->
          <div style="flex: 1; display: flex; flex-direction: column; min-height: 0;">
            ${createKeyboard('nameInput')}
          </div>

          <!-- Continue Button -->
          <div>
            <button class="btn btn--gradient-primary btn--large" id="nextBtn" style="width: 100%; height: 68px; font-size: 20px; font-weight: bold; box-shadow: var(--shadow-lg);">
              CONTINUE →
            </button>
          </div>
        </div>
      </main>

      ${createProgressBar(7, state.totalSteps)}
      ${createPricePreviewBadge()}
    </div>
  `;
}

// ============================================
// SCREEN 9: REVIEW & EDIT - REDESIGNED
// ============================================
function createReviewScreen() {
  // Batch 6: Use centralized price calculation
  state.totalPrice = calculateCurrentPrice();
  const total = state.totalPrice;

  // Calculate component prices for display
  const printPrice = state.printQuantity > 0 ? (state.config?.printPricing?.[state.printQuantity] || 0) : 0;
  const emailCount = state.emailAddresses.filter(e => e.value && e.value.trim()).length;
  const baseEmailPrice = state.config?.emailPricing?.[1] || 10;
  const emailPrice = emailCount > 0 ? baseEmailPrice + (emailCount - 1) : 0;

  return `
    <div class="screen">
      <header style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(0,0,0,0.02); border-bottom: 1px solid var(--color-border); min-height: 80px; max-height: 80px;">
        <button class="btn btn--ghost btn--small" id="backBtn" style="min-height: 60px; min-width: 140px; font-size: 20px; padding: 12px 20px; font-weight: 600;">← Back</button>
        <div style="position: absolute; left: 50%; transform: translateX(-50%); font-size: 24px; font-weight: 700;">Review Order</div>
        <button class="btn btn--danger btn--small" id="startOverBtn" style="min-height: 60px; min-width: 180px; font-size: 18px; padding: 12px 20px; font-weight: 600;">Start Over ✕</button>
      </header>

      <main style="flex: 1; display: grid; grid-template-columns: 1fr 400px; gap: 16px; padding: 16px; max-height: calc(100vh - 80px - 50px);">
        <!-- LEFT: Order Details -->
        <div style="background: white; border-radius: 12px; padding: 24px; box-shadow: var(--shadow-md); overflow-y: auto;">
          <h2 style="font-size: 36px; font-weight: 900; margin-bottom: 12px; color: var(--color-gray-900);">Review your order carefully</h2>
          <p style="font-size: 18px; color: var(--color-gray-600); margin-bottom: 24px;">You can edit any item below</p>

          <!-- Review Items -->
          <div style="display: grid; gap: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px; background: var(--color-gray-50); border-radius: 12px;">
              <div style="flex: 1;">
                <div style="font-size: 20px; font-weight: 700; color: var(--color-gray-800); margin-bottom: 6px;">Background</div>
                <div style="font-size: 18px; color: var(--color-gray-600);">${state.backgroundName || 'Not selected'}</div>
              </div>
              <button class="btn btn--outline btn--small edit-btn" data-screen="background" style="font-size: 16px; padding: 10px 20px; min-height: 50px;">Edit</button>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px; background: var(--color-gray-50); border-radius: 12px;">
              <div style="flex: 1;">
                <div style="font-size: 20px; font-weight: 700; color: var(--color-gray-800); margin-bottom: 6px;">Party Size</div>
                <div style="font-size: 18px; color: var(--color-gray-600);">${state.partySize} ${state.partySize === 1 ? 'person' : 'people'}</div>
              </div>
              <button class="btn btn--outline btn--small edit-btn" data-screen="partySize" style="font-size: 16px; padding: 10px 20px; min-height: 50px;">Edit</button>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px; background: var(--color-gray-50); border-radius: 12px;">
              <div style="flex: 1;">
                <div style="font-size: 20px; font-weight: 700; color: var(--color-gray-800); margin-bottom: 6px;">Delivery</div>
                <div style="font-size: 18px; color: var(--color-gray-600);">${state.deliveryMethod === 'print' ? 'Printed' : state.deliveryMethod === 'email' ? 'Email' : 'Both'}</div>
              </div>
              <button class="btn btn--outline btn--small edit-btn" data-screen="delivery" style="font-size: 16px; padding: 10px 20px; min-height: 50px;">Edit</button>
            </div>

            ${state.printQuantity > 0 ? `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: var(--color-gray-50); border-radius: 10px;">
                <div style="flex: 1;">
                  <div style="font-size: 15px; font-weight: 600; color: var(--color-gray-700); margin-bottom: 4px;">Prints</div>
                  <div style="font-size: 18px; color: var(--color-gray-600);">${state.printQuantity} ${state.printQuantity === 1 ? 'copy' : 'copies'} • $${printPrice.toFixed(2)}</div>
                </div>
                <button class="btn btn--outline btn--small edit-btn" data-screen="quantity" style="font-size: 16px; padding: 10px 20px; min-height: 50px;">Edit</button>
              </div>
            ` : ''}

            ${emailCount > 0 ? `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: var(--color-gray-50); border-radius: 10px;">
                <div style="flex: 1;">
                  <div style="font-size: 15px; font-weight: 600; color: var(--color-gray-700); margin-bottom: 4px;">Emails</div>
                  <div style="font-size: 18px; color: var(--color-gray-600);">${emailCount} ${emailCount === 1 ? 'recipient' : 'recipients'} • $${emailPrice.toFixed(2)}</div>
                </div>
                <button class="btn btn--outline btn--small edit-btn" data-screen="email" style="font-size: 16px; padding: 10px 20px; min-height: 50px;">Edit</button>
              </div>
            ` : ''}

            <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px; background: var(--color-gray-50); border-radius: 12px;">
              <div style="flex: 1;">
                <div style="font-size: 20px; font-weight: 700; color: var(--color-gray-800); margin-bottom: 6px;">Name</div>
                <div style="font-size: 18px; color: var(--color-gray-600);">${state.customerName || 'Not entered'}</div>
              </div>
              <button class="btn btn--outline btn--small edit-btn" data-screen="name" style="font-size: 16px; padding: 10px 20px; min-height: 50px;">Edit</button>
            </div>
          </div>
        </div>

        <!-- RIGHT: Total & Confirm -->
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <!-- Total Card -->
          <div style="background: var(--gradient-success); padding: 28px; border-radius: 16px; box-shadow: var(--shadow-xl); color: white; text-align: center;">
            <div style="font-size: 18px; margin-bottom: 12px; opacity: 0.95;">Order Total</div>
            <div style="font-size: 64px; font-weight: bold; line-height: 1; margin-bottom: 8px;">$${total.toFixed(2)}</div>
            <div style="font-size: 14px; opacity: 0.9;">All prices include tax</div>
          </div>

          <!-- Confirm Button -->
          <button class="btn btn--gradient-primary" id="confirmBtn" style="width: 100%; height: 80px; font-size: 22px; font-weight: bold; box-shadow: var(--shadow-lg);">
            LOOKS GOOD →
          </button>

          <!-- Info Card - Simple text without button styling -->
          <div style="background: transparent; padding: 16px; text-align: center;">
            <div style="font-size: 14px; color: var(--color-gray-600); line-height: 1.6; font-weight: 500;">
              💡 Click "Edit" next to any item to make changes
            </div>
          </div>
        </div>
      </main>

      ${createProgressBar(8, state.totalSteps)}
    </div>
  `;
}

// ============================================
// SCREEN 10: PAYMENT METHOD - REDESIGNED
// ============================================
function createPaymentScreen() {
  const config = state.config;

  // Filter payment methods by config (D5) + NEW DIGITAL OPTIONS
  const paymentMethods = [
    { id: 'cash', label: 'CASH', emoji: '💵', enabled: config?.features?.cash !== false },
    { id: 'debit', label: 'DEBIT CARD', emoji: '💳', enabled: true }, // Always available
    { id: 'credit', label: 'CREDIT CARD', emoji: '💳', enabled: config?.features?.creditCard !== false },
    { id: 'venmo', label: 'VENMO', emoji: '💸', enabled: true }, // Digital payment
    { id: 'zelle', label: 'ZELLE', emoji: '⚡', enabled: true }, // Digital payment
    { id: 'tap', label: 'TAP TO PAY', emoji: '📱', enabled: true }, // Contactless
    { id: 'check', label: 'CHECK', emoji: '🏦', enabled: config?.features?.check === true }
  ].filter(method => method.enabled);

  return `
    <div class="screen">
      <header style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(0,0,0,0.02); border-bottom: 1px solid var(--color-border); min-height: 80px; max-height: 80px;">
        <button class="btn btn--ghost btn--small" id="backBtn" style="min-height: 60px; min-width: 140px; font-size: 20px; padding: 12px 20px; font-weight: 600;">← Back</button>
        <div style="position: absolute; left: 50%; transform: translateX(-50%); font-size: 24px; font-weight: 700;">Payment Method</div>
        <button class="btn btn--danger btn--small" id="startOverBtn" style="min-height: 60px; min-width: 180px; font-size: 18px; padding: 12px 20px; font-weight: 600;">Start Over ✕</button>
      </header>

      <main style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; max-height: calc(100vh - 80px - 50px);">
        <h1 style="font-size: 48px; font-weight: 900; margin-bottom: 32px; text-align: center; color: var(--color-gray-900);">How will you pay?</h1>

        <!-- Payment Options Grid (Multiple rows for more options) -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; width: 100%; max-width: 1100px; margin-bottom: 30px;">
          ${paymentMethods.map((method, index) => {
            const gradients = ['var(--gradient-success)', 'var(--gradient-primary)', 'var(--gradient-ocean)', 'var(--gradient-secondary)'];
            const gradient = gradients[index % gradients.length];
            const isSelected = state.paymentMethod === method.id;

            return `
              <button class="payment-btn" data-method="${method.id}"
                      style="height: 200px; border-radius: 16px; border: 4px solid ${isSelected ? 'var(--color-success)' : 'var(--color-border)'};
                      background: ${isSelected ? gradient : 'white'}; padding: 24px; cursor: pointer; transition: all 0.2s;
                      box-shadow: ${isSelected ? '0 0 0 6px rgba(16,185,129,0.3), var(--shadow-xl)' : 'var(--shadow-md)'};
                      display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <div style="font-size: 64px; margin-bottom: 16px;">${method.emoji}</div>
                <div style="font-size: 22px; font-weight: bold; color: ${isSelected ? 'white' : 'var(--color-gray-900)'};">${method.label}</div>
              </button>
            `;
          }).join('')}
        </div>

        <!-- Total and Continue Section -->
        <div style="display: flex; align-items: center; gap: 24px; width: 100%; max-width: 900px;">
          <!-- Total Amount (Repositioned) -->
          <div style="background: var(--gradient-success); padding: 20px 40px; border-radius: 16px; text-align: center; box-shadow: var(--shadow-lg);">
            <div style="font-size: 16px; color: rgba(255,255,255,0.9); margin-bottom: 4px; font-weight: 600;">TOTAL</div>
            <div style="font-size: 44px; font-weight: 900; color: white; line-height: 1;">$${state.totalPrice.toFixed(2)}</div>
          </div>

          <!-- Continue Button -->
          <button class="btn btn--gradient-primary btn--large" id="nextBtn" ${!state.paymentMethod ? 'disabled' : ''}
                  style="flex: 1; height: 80px; font-size: 22px; font-weight: 900; box-shadow: var(--shadow-lg);">
            CONTINUE →
          </button>
        </div>
      </main>

      ${createProgressBar(9, state.totalSteps)}
    </div>
  `;
}

// ============================================
// SCREEN 11: CUSTOMER ID PHOTO - REDESIGNED
// ============================================
function createPhotoScreen() {
  return `
    <div class="screen">
      <header style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(0,0,0,0.02); border-bottom: 1px solid var(--color-border); min-height: 80px; max-height: 80px;">
        <button class="btn btn--ghost btn--small" id="backBtn" style="min-height: 60px; min-width: 140px; font-size: 20px; padding: 12px 20px; font-weight: 600;">← Back</button>
        <div style="position: absolute; left: 50%; transform: translateX(-50%); font-size: 24px; font-weight: 700;">Customer ID Photo</div>
        <button class="btn btn--danger btn--small" id="startOverBtn" style="min-height: 60px; min-width: 180px; font-size: 18px; padding: 12px 20px; font-weight: 600;">Start Over ✕</button>
      </header>

      <main style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; max-height: calc(100vh - 80px - 80px);">
        <div style="text-align: center; margin-bottom: 16px;">
          <h1 style="font-size: 38px; font-weight: bold; margin-bottom: 10px;">📸 Smile!</h1>
          <p style="font-size: 18px; color: var(--color-gray-600);">This helps us match you to your final photo</p>
        </div>

        <!-- Camera Preview -->
        <div style="position: relative; width: 100%; max-width: 900px; aspect-ratio: 4/3; background: var(--color-gray-900); border-radius: 20px; overflow: hidden; box-shadow: var(--shadow-2xl); margin-bottom: 16px;">
          <video id="webcamVideo" autoplay playsinline style="width: 100%; height: 100%; object-fit: cover; display: block;"></video>
          <canvas id="photoCanvas" style="display: none;"></canvas>
          <div id="webcamPlaceholder" style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <div class="icon-camera" style="color: white; transform: scale(3); margin-bottom: 24px; animation: pulse 2s infinite;"></div>
            <div style="font-size: 20px; color: white; font-weight: 600;">Initializing camera...</div>
          </div>
        </div>

        <!-- Capture Button -->
        <button class="btn btn--gradient-success" id="captureBtn" style="width: 100%; max-width: 500px; height: 80px; font-size: 24px; font-weight: bold; box-shadow: var(--shadow-xl); border-radius: 16px;">
          <span style="font-size: 32px; margin-right: 12px;">📷</span>
          CAPTURE PHOTO
        </button>
      </main>

      ${createProgressBar(10, state.totalSteps)}
    </div>
  `;
}

// ============================================
// SCREEN 11B: PHOTO CONFIRMATION - NEW (C5)
// ============================================
function createPhotoConfirmScreen() {
  return `
    <div class="screen">
      <header style="display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; background: rgba(0,0,0,0.02); border-bottom: 1px solid var(--color-border); min-height: 50px; max-height: 50px;">
        <div style="min-width: 80px;"></div>
        <div style="font-size: 16px; font-weight: 600;">Review Photo</div>
        <button class="btn btn--danger btn--small" id="startOverBtn" style="min-height: 60px; min-width: 180px; font-size: 18px; padding: 12px 20px; font-weight: 600;">Start Over ✕</button>
      </header>

      <main style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; max-height: calc(100vh - 80px - 50px); gap: 20px;">
        <div style="text-align: center;">
          <h1 style="font-size: 32px; font-weight: bold; margin-bottom: 12px;">How does this look?</h1>
          <p style="font-size: 16px; color: var(--color-gray-600);">This photo helps us match you to your final photo</p>
        </div>

        <!-- Photo Preview -->
        <div style="position: relative; width: 100%; max-width: 600px; aspect-ratio: 4/3; background: var(--color-gray-900); border-radius: 20px; overflow: hidden; box-shadow: var(--shadow-2xl);">
          <img src="${state.customerPhoto}" alt="Captured Photo" style="width: 100%; height: 100%; object-fit: cover; display: block;">
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; gap: 16px; width: 100%; max-width: 600px;">
          <button class="btn btn--outline btn--large" id="retakeBtn" style="flex: 1; height: 70px; font-size: 18px; font-weight: bold;">
            <span style="font-size: 24px; margin-right: 8px;">↻</span>
            RETAKE PHOTO
          </button>
          <button class="btn btn--gradient-success btn--large" id="usePhotoBtn" style="flex: 1; height: 70px; font-size: 18px; font-weight: bold;">
            <span style="font-size: 24px; margin-right: 8px;">✓</span>
            USE THIS PHOTO
          </button>
        </div>
      </main>

      ${createProgressBar(10, state.totalSteps)}
    </div>
  `;
}

// ============================================
// WEBCAM FUNCTIONS
// ============================================
let webcamStream = null;

async function startWebcam() {
  const video = document.getElementById('webcamVideo');
  const placeholder = document.getElementById('webcamPlaceholder');

  if (!video) return;

  try {
    // Request webcam access
    webcamStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      },
      audio: false
    });

    // Set video source
    video.srcObject = webcamStream;

    // Hide placeholder once video starts playing
    video.addEventListener('loadedmetadata', () => {
      if (placeholder) placeholder.style.display = 'none';
    });
  } catch (error) {
    console.error('Error accessing webcam:', error);
    if (placeholder) {
      // IMPROVED: Show error with retry and skip options
      placeholder.innerHTML = `
        <div class="icon-camera" style="color: white; transform: scale(2); margin-bottom: 16px; opacity: 0.6;"></div>
        <div style="font-size: 18px; color: white; text-align: center; padding: 0 20px; margin-bottom: 24px; font-weight: 600;">
          Camera Unavailable
        </div>
        <div style="font-size: 14px; color: rgba(255,255,255,0.9); text-align: center; padding: 0 20px; margin-bottom: 32px;">
          ${error.name === 'NotAllowedError' ? 'Camera access was denied' : 'Could not access camera'}<br>
          <small style="font-size: 12px; opacity: 0.8;">Please allow camera permissions or try again</small>
        </div>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button id="retryCamera" class="btn btn--primary" style="padding: 12px 24px; font-size: 14px; min-height: 44px;">
            ↻ Retry
          </button>
          <button id="skipCamera" class="btn btn--outline" style="padding: 12px 24px; font-size: 14px; background: rgba(255,255,255,0.2); color: white; border-color: rgba(255,255,255,0.4); min-height: 44px;">
            Skip Photo
          </button>
        </div>
      `;
    }
  }
}

function stopWebcam() {
  if (webcamStream) {
    webcamStream.getTracks().forEach(track => track.stop());
    webcamStream = null;
  }
}

function capturePhoto() {
  const video = document.getElementById('webcamVideo');
  const canvas = document.getElementById('photoCanvas');

  if (!video || !canvas) return null;

  // Set canvas dimensions to match video
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;

  // Draw video frame to canvas
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Convert to base64
  return canvas.toDataURL('image/jpeg', 0.8);
}

// ============================================
// CELEBRATION EFFECTS (Batch 7)
// ============================================
/**
 * Create confetti celebration effect
 */
function createConfetti() {
  const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];
  const confettiContainer = document.createElement('div');
  confettiContainer.id = 'confettiContainer';
  confettiContainer.style.cssText = 'position: fixed; inset: 0; pointer-events: none; z-index: 9999; overflow: hidden;';
  document.body.appendChild(confettiContainer);

  // Create 50 confetti pieces
  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100;
    const animationDuration = 2 + Math.random() * 3; // 2-5 seconds
    const size = 8 + Math.random() * 8; // 8-16px
    const delay = Math.random() * 0.5; // 0-0.5s delay

    confetti.style.cssText = `
      position: absolute;
      left: ${left}%;
      top: -20px;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      animation: confettiFall ${animationDuration}s ease-in-out ${delay}s forwards;
      transform: rotate(${Math.random() * 360}deg);
      opacity: 0.8;
    `;

    confettiContainer.appendChild(confetti);
  }

  // Remove confetti after animation completes
  setTimeout(() => {
    confettiContainer.remove();
  }, 5500);
}

// ============================================
// SCREEN 12: PROCESSING - IMPROVED (MO11)
// ============================================
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
              <div style="width: 32px; height: 32px; background: var(--color-success); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; font-weight: bold;">?</div>
              <div class="text-xl" style="color: white;">Order details confirmed</div>
            </div>
            <div style="display: flex; align-items: center; gap: var(--space-md); margin-bottom: var(--space-md);">
              <div style="width: 32px; height: 32px; background: var(--color-success); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; font-weight: bold;">?</div>
              <div class="text-xl" style="color: white;">Customer number assigned</div>
            </div>
            <div style="display: flex; align-items: center; gap: var(--space-md);">
              <div style="width: 32px; height: 32px; background: var(--color-success); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; font-weight: bold;">?</div>
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
              <div style="width: 32px; height: 32px; background: var(--color-error); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; font-weight: bold;">?</div>
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
                <div style="width: 32px; height: 32px; background: var(--color-success); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; font-weight: bold;">?</div>
                <div class="text-xl" style="color: white;">Order details confirmed</div>
              </div>
              <div style="display: flex; align-items: center; gap: var(--space-md); margin-bottom: var(--space-md);">
                <div style="width: 32px; height: 32px; background: var(--color-success); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; font-weight: bold;">?</div>
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
// SCREEN 13: RECEIPT DISPLAY
// ============================================
function createReceiptScreen() {
  // Ensure customer number is generated (defensive programming)
  if (!state.customerNumber) {
    state.customerNumber = generateCustomerNumber();
  }

  const now = new Date();
  const date = now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const eventName = state.config?.eventName || 'Special Event';

  return `
    <div class="screen" style="background: var(--color-gray-100); overflow: hidden;">
      <main style="display: flex; flex-direction: column; height: 100vh; padding: 8px; overflow: hidden;">
        <div style="text-align: center; margin-bottom: 8px;">
          <h1 style="font-size: 18px; font-weight: bold; color: var(--color-success);">Receipts Ready - Cut Along Dashed Line</h1>
        </div>

        <div style="flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 0; background: white; border: 2px solid #000; overflow: auto; max-height: calc(100vh - 100px);">
          <!-- CUSTOMER RECEIPT (LEFT SIDE) - FIX: Removed watermark, standardized customer ID size -->
          <div style="padding: 12px; background: white; color: black; position: relative; border-right: 3px dashed #000;">
            <div style="position: relative; z-index: 1;">
              <div style="text-align: center; border-bottom: 2px solid black; padding-bottom: 12px; margin-bottom: 12px;">
                <div style="font-size: 22px; font-weight: bold;">CUSTOMER RECEIPT</div>
                <div style="font-size: 28px; font-weight: bold; margin: 8px 0;">#${state.customerNumber}</div>
                <div style="font-size: 18px; font-weight: 900; color: #d00; background: #ffeb3b; padding: 6px 12px; display: inline-block; border: 2px solid #000;">⚠️ KEEP THIS RECEIPT ⚠️</div>
              </div>

              <div style="font-size: 11px; line-height: 1.4;">
                <div style="margin-bottom: 8px; font-weight: bold; font-size: 12px;">${eventName}</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
                  <div><strong>Name:</strong> ${state.customerName}</div>
                  <div><strong>Party:</strong> ${state.partySize}</div>
                  <div><strong>Date:</strong> ${date}</div>
                  <div><strong>Time:</strong> ${time}</div>
                </div>

                <div style="border-top: 1px solid #000; padding-top: 8px; margin-bottom: 8px;">
                  <div style="font-weight: bold; margin-bottom: 4px;">ORDER:</div>
                  ${state.printQuantity > 0 ? `<div>• ${state.printQuantity} Print${state.printQuantity > 1 ? 's' : ''}</div>` : ''}
                  ${state.emailAddresses.length > 0 ? `<div>• ${state.emailAddresses.length} Email${state.emailAddresses.length > 1 ? 's' : ''}</div>` : ''}
                  <div>• ${state.paymentMethod?.toUpperCase()}</div>
                  <div style="font-weight: bold; margin-top: 4px;">TOTAL: $${state.totalPrice.toFixed(2)}</div>
                </div>

                <!-- QR Code for Order Status (Mobile-Friendly) -->
                <div style="text-align: center; margin: 12px 0; padding: 12px; background: white; border: 2px solid #000;">
                  <div style="font-weight: bold; font-size: 11px; margin-bottom: 8px;">SCAN TO CHECK ORDER STATUS</div>
                  <div style="width: 120px; height: 120px; margin: 0 auto; background: white; display: flex; align-items: center; justify-content: center; border: 2px solid #000;">
                    <svg viewBox="0 0 29 29" style="width: 100%; height: 100%;">
                      <rect width="29" height="29" fill="white"/>
                      <path d="M0,0h7v7h-7zM8,0h1v1h1v1h-1v1h-1v-1h-1v1h-1v-2h2zM10,0h3v1h-1v1h-1v1h-1zM16,0h1v3h1v-1h1v-1h3v1h-1v1h-1v1h1v1h1v-1h1v2h-1v1h1v1h1v-1h1v-2h1v-3h1v7h-1v-1h-2v2h-1v-1h-1v-1h-1v1h-1v1h1v2h-1v1h-1v-2h-1v-1h-1v1h-1v-1h-1v1h-1v1h1v1h-1v1h-2v-1h-1v1h-1v-1h-1v-1h1v-1h-1v-1h2v-1h1v-1h1v-1h-2v-1h1v-1h-1v-1h1v-1h2v-2h2v-1h1v-1h-3v-1h-1v-1h1v-1h-1v-1h1v-1h2v1h1v-2h-2v-1h-1v-1h-1v-1h-1v-2h2v1h1v-1h2v-1h-2v-2h1v-1h-1v-1h-1v2h-1v1h-1v-1h-1v1h-1v-1h-2v-1h1v-1h-1v-1h1v-1h1zM14,1h1v1h-1zM22,0h7v7h-7zM1,1v5h5v-5zM9,2h1v1h-1zM11,2v1h-1v1h1v-1h1v-1zM15,2h1v1h-1zM23,1v5h5v-5zM2,2h3v3h-3zM18,2h1v2h-1zM24,2h3v3h-3zM10,4h1v2h-1v1h-1v-1h1zM16,4v1h-1v1h1v1h-2v-1h-1v1h-1v-1h-1v-1h3v-1zM19,5h1v1h-1zM8,6h1v1h-1zM20,6h1v2h-1zM5,7h2v1h1v1h-1v1h-1v-1h-2v1h-1v-1h-1v-1h2v-1h1zM13,7h2v2h-1v-1h-1zM9,8h1v1h-1zM0,9h1v1h1v1h1v1h-2v1h1v1h-1v2h1v-1h1v1h-1v1h-2v-3h1v-2h-1zM14,9h1v1h2v1h-2v1h-1v1h1v1h-1v1h-2v-1h-1v1h-1v-1h-1v-1h1v-1h-1v-1h3v1h1v-1h1zM18,9h1v1h1v-1h1v1h-1v2h1v-1h2v2h-1v-1h-1v3h-1v-2h-1v-1h-1v-1h1v-1h-1zM4,10h2v1h-2zM22,10v1h1v1h-1v1h-1v1h1v-1h1v3h-1v1h-1v-3h-1v-1h1v-2h-2v-1zM6,11h1v1h-1zM25,11h1v1h-1zM26,12h1v2h-1zM8,13h1v1h1v1h-2zM24,13h1v2h-1v1h-1v-1h1v-1h-1zM17,14h2v1h-2zM27,14h2v1h-2zM11,15h1v1h-1zM16,15h1v1h-1zM4,16h1v2h1v-1h1v-1h2v1h-1v1h-1v1h1v1h-1v1h-2v-1h-1v-1h1v-1h-1zM20,16h1v1h-1zM26,16h1v1h-1zM9,17h1v1h-1zM15,17h1v1h1v-1h1v1h-1v1h-1v1h-1v-1h1zM28,17h1v2h-1zM19,18h1v1h1v-1h3v1h-1v1h-1v-1h-2v1h-1v1h1v1h-2v-1h1v-1h-1v-1h1zM25,18h1v1h1v2h-1v-1h-1zM10,19h2v1h-1v1h-1zM27,19h1v2h-1zM13,20h2v1h-1v1h-1zM23,20h1v1h-1zM9,21h1v1h-1zM0,22h7v7h-7zM16,22h1v1h-1zM18,22h1v2h-1zM20,22h2v1h-2zM24,22h1v1h-1zM1,23v5h5v-5zM11,23h1v1h-1zM26,23h1v1h-1zM2,24h3v3h-3zM10,24h1v2h-1zM13,24h2v1h1v1h-1v1h-1v1h-1v-1h-1v-1h1zM21,24h1v1h-1zM23,24h2v1h1v1h-3v1h2v1h-3v1h4v-2h1v-1h-1v-1h1v-1h-1v-1h-3zM8,25h1v1h-1zM17,25v1h1v1h-2v-1h1zM20,25h1v3h-1zM28,25h1v4h-1zM9,26v1h-1v1h2v-2zM11,27h1v1h-1zM16,27h1v1h-1zM22,27h1v1h-1zM25,28h2v1h-2z" fill="black"/>
                    </svg>
                  </div>
                  <div style="font-size: 9px; margin-top: 6px; color: #666;">ID: ${state.customerNumber}</div>
                </div>

                ${state.printQuantity > 0 ? `
                  <div style="border-top: 1px solid #000; padding-top: 8px; margin-bottom: 8px; font-size: 10px;">
                    <div style="font-weight: bold; margin-bottom: 4px;">PRINT PICKUP:</div>
                    <div>Return at end of event</div>
                  </div>

                  <div style="border: 2px solid #000; width: 65px; height: 65px; background: white; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 8px 0;">
                    <div style="font-size: 16px; font-weight: bold;">☐</div>
                    <div style="font-size: 9px; color: #666; margin-top: 2px;">RCVD</div>
                  </div>
                ` : ''}

                ${state.emailAddresses.length > 0 ? `
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

          <!-- OPERATOR RECEIPT (RIGHT SIDE) - FIX: Matched customer ID size, reorganized layout -->
          <div style="padding: 12px; background: #f8f8f8; color: black;">
            <div style="text-align: center; border-bottom: 2px solid black; padding-bottom: 8px; margin-bottom: 8px;">
              <div style="font-size: 16px; font-weight: bold;">OPERATOR COPY</div>
              <div style="font-size: 28px; font-weight: bold; margin: 6px 0; letter-spacing: 3px; line-height: 1;">${state.customerNumber}</div>
            </div>

            ${state.customerPhoto ? `
              <div style="text-align: center; margin-bottom: 8px;">
                <div style="font-weight: bold; font-size: 11px; margin-bottom: 6px;">CUSTOMER ID:</div>
                <img src="${state.customerPhoto}" alt="Customer ID" width="200" height="200" style="max-width: 200px !important; max-height: 200px !important; width: 200px !important; height: auto !important; border: 3px solid #000; display: block; margin: 0 auto; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
              </div>
            ` : ''}

            <div style="font-size: 9px; line-height: 1.4; background: white; padding: 8px; border: 1px solid #000; margin-bottom: 8px;">
              <div style="font-weight: bold; margin-bottom: 4px;">QUICK DATA:</div>
              <div style="font-family: monospace; font-size: 8px;">N: ${state.customerName} | ${state.paymentMethod?.toUpperCase()}</div>
              <div style="font-family: monospace; font-size: 8px;">BG#${state.selectedBackground === 'custom' ? 'CUSTOM' : state.selectedBackground}: ${state.backgroundName}</div>
              <div style="font-family: monospace; font-size: 8px;">Party: ${state.partySize} | $${state.totalPrice.toFixed(2)} | ${state.printQuantity}P ${state.emailAddresses.length}E</div>
              <div style="font-family: monospace; font-size: 8px;">${date} ${time}</div>
            </div>

            ${state.emailAddresses.length > 0 ? `
              <div style="border: 1px solid #000; padding: 6px; margin-bottom: 8px; font-size: 8px; background: white;">
                <div style="font-weight: bold;">Emails:</div>
                ${state.emailAddresses.map((emailObj, i) => `<div>${i + 1}. ${emailObj.value || '(blank)'}</div>`).join('')}
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
              <div style="font-size: 10px; margin-top: 6px; color: #666;">localhost:5000/operator<br>Order #${state.customerNumber}</div>
            </div>
          </div>
        </div>

        <div style="text-align: center; margin-top: 12px; display: flex; gap: 24px; justify-content: center; align-items: center;">
          <button class="btn btn--gradient-primary btn--large" id="printBtn" style="font-size: 18px; padding: 14px 32px; min-height: 64px;">
            <span style="font-size: 24px; margin-right: 8px;">🖨️</span>
            <span>PRINT RECEIPTS</span>
          </button>
          <button class="btn btn--secondary btn--large" id="returnStartBtn" style="font-size: 18px; padding: 14px 32px; min-height: 64px;">
            <span style="font-size: 24px; margin-right: 8px;">🏠</span>
            <span>RETURN TO START</span>
          </button>
        </div>
        <div style="text-align: center; margin-top: 8px; font-size: 13px; color: var(--color-gray-600);">Auto-return in <span id="countdown">30</span>s</div>
        <script>
          // Auto-print receipt on page load
          setTimeout(() => {
            const printBtn = document.getElementById('printBtn');
            if (printBtn) printBtn.click();
          }, 500);
        </script>
      </main>
    </div>
  `;
}

// ============================================
// CUSTOM START OVER MODAL (MO10)
// ============================================
function showStartOverModal() {
  // Create modal overlay
  const modal = document.createElement('div');
  modal.id = 'startOverModal';
  modal.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    animation: fadeIn 0.2s ease-out;
  `;

  modal.innerHTML = `
    <div class="card card--glass" style="max-width: 500px; padding: 40px; text-align: center; animation: slideUp 0.3s ease-out;">
      <div style="font-size: 56px; margin-bottom: 20px;">⚠️</div>
      <h2 style="font-size: 28px; font-weight: bold; margin-bottom: 16px; color: white;">Start Over?</h2>
      <p style="font-size: 16px; color: rgba(255,255,255,0.9); margin-bottom: 32px; line-height: 1.6;">
        This will cancel your current session and you'll lose all progress.
      </p>

      <div style="display: flex; gap: 12px; justify-content: center;">
        <button id="cancelStartOver" class="btn btn--outline" style="flex: 1; max-width: 200px; height: 60px; font-size: 16px; font-weight: bold; background: rgba(255,255,255,0.2); color: white; border-color: rgba(255,255,255,0.4);">
          ← GO BACK
        </button>
        <button id="confirmStartOver" class="btn btn--danger btn--large" style="flex: 1; max-width: 200px; height: 60px; font-size: 16px; font-weight: bold; background: var(--color-error);">
          ✕ START OVER
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Add click event to overlay (close on click outside)
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeStartOverModal();
    }
  });

  // Attach button listeners
  document.getElementById('cancelStartOver')?.addEventListener('click', closeStartOverModal);
  document.getElementById('confirmStartOver')?.addEventListener('click', () => {
    closeStartOverModal();
    // Reset all state
    state.currentStep = 0;
    state.screenHistory = [];
    state.customerName = '';
    state.partySize = 1;
    state.selectedBackground = null;
    state.backgroundName = '';
    state.deliveryMethod = null;
    state.printQuantity = 0;
    state.emailAddresses = [];
    state.paymentMethod = null;
    state.customerPhoto = null;
    state.photoCaptured = false;
    state.totalPrice = 0;
    state.reviewedOnce = false;
    clearSavedState();
    navigateTo('attract', true); // skipHistory = true for attract screen
  });
}

function closeStartOverModal() {
  const modal = document.getElementById('startOverModal');
  if (modal) {
    modal.style.animation = 'fadeOut 0.2s ease-out';
    setTimeout(() => modal.remove(), 200);
  }
}

// ============================================
// RENDER FUNCTION
// ============================================
function render() {
  const app = document.getElementById('app');
  if (!app) return;

  // Reset caps lock and shift when navigating to new screen
  capsLockEnabled = false;
  shiftEnabled = false;

  let html = '';

  switch(state.currentScreen) {
    case 'attract':
      html = createAttractScreen();
      break;
    case 'welcome':
      html = createWelcomeScreen();
      break;
    case 'background':
      html = createBackgroundScreen();
      break;
    case 'partySize':
      html = createPartySizeScreen();
      break;
    case 'delivery':
      html = createDeliveryScreen();
      break;
    case 'quantity':
      html = createQuantityScreen();
      break;
    case 'email':
      html = createEmailScreen();
      break;
    case 'name':
      html = createNameScreen();
      break;
    case 'review':
      html = createReviewScreen();
      break;
    case 'payment':
      html = createPaymentScreen();
      break;
    case 'photo':
      html = createPhotoScreen();
      break;
    case 'photoConfirm':
      html = createPhotoConfirmScreen();
      break;
    case 'processing':
      html = createProcessingScreen();
      break;
    case 'receipt':
      html = createReceiptScreen();
      break;
    default:
      html = createAttractScreen();
  }

  // NO ANIMATION - instant screen updates (user requested removal of white flash)
  app.innerHTML = html;
  attachEventListeners();

  // Batch 7: Trigger confetti on receipt screen
  if (state.currentScreen === 'receipt') {
    setTimeout(() => createConfetti(), 500);
  }

  // Reset inactivity timer on screen change
  resetInactivityTimer();

  // AUTO-SAVE: Persist state after render (T1)
  saveState();
}

// ============================================
// EVENT LISTENERS
// ============================================
function attachEventListeners() {
  // ==================== START OVER BUTTON (All Screens) - CUSTOM MODAL (MO10) ====================
  const startOverBtn = document.getElementById('startOverBtn');
  if (startOverBtn) {
    startOverBtn.addEventListener('click', () => {
      showStartOverModal();
    });
  }

  // ==================== ATTRACT SCREEN ====================
  const attractScreen = document.getElementById('attractScreen');
  if (attractScreen) {
    attractScreen.addEventListener('click', () => {
      navigateTo('welcome');
    });
  }

  // ==================== WELCOME SCREEN ====================
  const startBtn = document.getElementById('startBtn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      navigateTo('background');
    });
  }

  // ==================== BACKGROUND SELECTION ====================
  // Category tabs
  const categoryTabs = document.querySelectorAll('.category-tab');
  categoryTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      state.backgroundCategory = tab.dataset.category;
      render(); // Re-render to show new category
    });
  });

  // Background selection buttons
  const backgroundBtns = document.querySelectorAll('.background-btn');
  backgroundBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      state.selectedBackground = id === 'custom' ? 'custom' : parseInt(id);
      state.backgroundName = btn.dataset.name;

      // FIX: Update UI without re-rendering - update borders, shadows, and checkmarks
      backgroundBtns.forEach(b => {
        b.classList.remove('bg-selected');
        // Reset to unselected styling - FIX: Use appropriate border based on button type
        if (b.dataset.id === 'custom') {
          b.style.border = '3px solid rgba(255,255,255,0.2)';
        } else {
          b.style.border = '3px solid var(--color-border)';
        }
        b.style.boxShadow = 'var(--shadow-md)';
        // Remove checkmark if exists
        const checkmark = b.querySelector('div[style*="position: absolute"][style*="top: 4px"]');
        if (checkmark) checkmark.remove();
      });
      btn.classList.add('bg-selected');
      // Add selected styling
      btn.style.border = '4px solid var(--color-success)';
      btn.style.boxShadow = '0 0 0 4px rgba(16,185,129,0.3), var(--shadow-lg)';
      // Add checkmark if not custom button
      if (id !== 'custom') {
        const checkmark = document.createElement('div');
        checkmark.style.cssText = 'position: absolute; top: 4px; right: 4px; width: 24px; height: 24px; background: var(--color-success); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; color: white; font-weight: bold; box-shadow: 0 2px 8px rgba(0,0,0,0.4);';
        checkmark.textContent = '✓';
        btn.appendChild(checkmark);
      }

      // FIX: Update the preview for all selections including custom
      const preview = document.querySelector('.background-preview-area');
      if (preview) {
        if (state.selectedBackground === 'custom') {
          // Show custom background preview
          preview.innerHTML = `
            <div style="width: 100%; height: 100%; background: var(--gradient-secondary); border-radius: 10px; display: flex; align-items: center; justify-content: center; text-align: center; padding: 20px; box-shadow: var(--shadow-lg);">
              <div>
                <div style="font-size: 40px; margin-bottom: 8px;">★</div>
                <div style="font-size: 18px; font-weight: bold; color: white; margin-bottom: 4px;">CUSTOM</div>
                <div style="font-size: 12px; color: rgba(255,255,255,0.9);">Tell photographer</div>
              </div>
            </div>
          `;
        } else if (state.selectedBackground) {
          // Show regular background preview
          const backgrounds = [
            { id: 1, name: 'Beach Sunset', category: 'Nature', img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop' },
            { id: 3, name: 'Mountain Vista', category: 'Nature', img: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop' },
            { id: 4, name: 'Tropical Paradise', category: 'Nature', img: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=300&fit=crop' },
            { id: 7, name: 'Desert Dunes', category: 'Nature', img: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=400&h=300&fit=crop' },
            { id: 8, name: 'Forest Path', category: 'Nature', img: 'https://images.unsplash.com/photo-1511497584788-876760111969?w=400&h=300&fit=crop' },
            { id: 9, name: 'Waterfall', category: 'Nature', img: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=400&h=300&fit=crop' },
            { id: 2, name: 'City Skyline', category: 'Urban', img: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=400&h=300&fit=crop' },
            { id: 10, name: 'Brooklyn Bridge', category: 'Urban', img: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=300&fit=crop' },
            { id: 11, name: 'Tokyo Neon', category: 'Urban', img: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=300&fit=crop' },
            { id: 12, name: 'Paris Streets', category: 'Urban', img: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=300&fit=crop' },
            { id: 5, name: 'Northern Lights', category: 'Sky', img: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=400&h=300&fit=crop' },
            { id: 6, name: 'Starry Night', category: 'Sky', img: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400&h=300&fit=crop' },
            { id: 13, name: 'Galaxy', category: 'Sky', img: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=400&h=300&fit=crop' },
            { id: 14, name: 'Sunset Clouds', category: 'Sky', img: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&h=300&fit=crop' },
            { id: 15, name: 'Blue Gradient', category: 'Abstract', img: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=400&h=300&fit=crop' },
            { id: 16, name: 'Pink Gradient', category: 'Abstract', img: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=400&h=300&fit=crop' },
            { id: 17, name: 'Bokeh Lights', category: 'Abstract', img: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&h=300&fit=crop' },
          ];
          const selectedBg = backgrounds.find(bg => bg.id === state.selectedBackground);
          if (selectedBg) {
            preview.innerHTML = `
              <div style="position: relative; width: 100%; height: 100%; border-radius: 10px; overflow: hidden; box-shadow: var(--shadow-lg);">
                <img src="${selectedBg.img}" style="width: 100%; height: 100%; object-fit: cover;">
                <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); padding: 12px;">
                  <div style="color: white; font-size: 18px; font-weight: bold;">${selectedBg.name}</div>
                </div>
              </div>
            `;
          }
        }
      }

      // Enable next button
      const nextBtn = document.getElementById('nextBtn');
      if (nextBtn) nextBtn.disabled = false;
    });
  });

  // ==================== PARTY SIZE ====================
  const partySizeBtns = document.querySelectorAll('.party-size-btn');
  partySizeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update state
      state.partySize = parseInt(btn.dataset.size);

      // Re-render to update button highlighting (no flashbang since we removed it)
      render();
    });
  });

  // ==================== DELIVERY METHOD ====================
  const deliveryBtns = document.querySelectorAll('.delivery-btn');
  deliveryBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update state
      state.deliveryMethod = btn.dataset.method;

      // Reset quantities when delivery method changes (C6: Clear email objects)
      if (state.deliveryMethod === 'print') {
        state.emailAddresses = [];
      } else if (state.deliveryMethod === 'email') {
        state.printQuantity = 0;
      }

      // FIX: Re-render to update active states (no image flicker on this page)
      render();
    });
  });

  // ==================== QUANTITY SELECTION ====================
  const quantityBtns = document.querySelectorAll('.quantity-btn');
  quantityBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const quantity = parseInt(btn.dataset.quantity);
      const type = btn.dataset.type;

      // Update state
      if (type === 'print') {
        state.printQuantity = quantity;
      } else if (type === 'email') {
        state.emailQuantity = quantity;
      }

      // Update button styles without re-rendering entire screen
      quantityBtns.forEach(otherBtn => {
        const otherQuantity = parseInt(otherBtn.dataset.quantity);
        const isSelected = otherQuantity === quantity && otherBtn.dataset.type === type;

        // Update border
        otherBtn.style.border = isSelected ? '4px solid var(--color-success)' : '4px solid var(--color-border)';

        // Update background
        otherBtn.style.background = isSelected ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'white';

        // Update box-shadow
        otherBtn.style.boxShadow = isSelected ? '0 0 0 6px rgba(16,185,129,0.3), var(--shadow-xl)' : 'var(--shadow-md)';

        // Update all child divs by getting them as an array
        const allDivs = Array.from(otherBtn.querySelectorAll('div'));

        allDivs.forEach(div => {
          const fontSize = parseInt(window.getComputedStyle(div).fontSize);

          // The number (48px font)
          if (fontSize === 48) {
            div.style.color = isSelected ? 'white' : 'var(--color-gray-900)';
            div.style.textShadow = isSelected ? '0 2px 8px rgba(0,0,0,0.3)' : 'none';
          }
          // The divider (2px height)
          else if (div.style.height === '2px') {
            div.style.background = isSelected ? 'rgba(255,255,255,0.5)' : 'var(--color-border)';
          }
          // The price (28px font)
          else if (fontSize === 28) {
            div.style.color = isSelected ? 'white' : 'var(--color-success)';
            div.style.textShadow = isSelected ? '0 2px 10px rgba(0,0,0,0.4)' : 'none';
          }
          // The "per print" text (12px font)
          else if (fontSize === 12) {
            div.style.color = isSelected ? 'rgba(255,255,255,0.95)' : 'var(--color-gray-500)';
            div.style.textShadow = isSelected ? '0 1px 4px rgba(0,0,0,0.3)' : 'none';
          }
        });
      });

      // Update price preview badge
      updatePricePreview();

      // Enable continue button
      const nextBtn = document.getElementById('nextBtn');
      if (nextBtn) {
        nextBtn.disabled = false;
      }
    });
  });

  // ==================== EMAIL ENTRY (C6: Updated for unique IDs) ====================
  const emailInputs = document.querySelectorAll('.email-input');
  emailInputs.forEach(input => {
    input.addEventListener('input', (e) => {
      const emailId = e.target.dataset.emailId;
      const emailObj = state.emailAddresses.find(email => email.id === emailId);
      if (emailObj) {
        emailObj.value = e.target.value;
      }
      // Batch 6: Update price preview on email input change
      updatePricePreview();
    });
  });

  // Add email button (with real-time pricing and duplicate prevention - T3)
  const addEmailBtn = document.getElementById('addEmailBtn');
  if (addEmailBtn) {
    addEmailBtn.addEventListener('click', () => {
      // FIX: Save scroll position before re-render
      const emailContainer = document.querySelector('.email-list-container, main');
      const scrollTop = emailContainer ? emailContainer.scrollTop : 0;

      state.emailAddresses.push({ id: generateEmailId(), value: '' });
      render();

      // FIX: Restore scroll position after re-render, focus new input
      setTimeout(() => {
        const newEmailContainer = document.querySelector('.email-list-container, main');
        if (newEmailContainer) {
          // Scroll to bottom to show new email input
          newEmailContainer.scrollTop = newEmailContainer.scrollHeight;
        }

        // Focus the newly added email input
        const emailInputs = document.querySelectorAll('.email-input');
        if (emailInputs.length > 0) {
          emailInputs[emailInputs.length - 1].focus();
        }
      }, 50);
    });
  }

  // Validate for duplicates on blur (T3)
  emailInputs.forEach(input => {
    input.addEventListener('blur', (e) => {
      const currentEmail = e.target.value.trim().toLowerCase();
      if (!currentEmail) return;

      const currentEmailId = e.target.dataset.emailId;
      const hasDuplicate = state.emailAddresses.some(emailObj =>
        emailObj.id !== currentEmailId && emailObj.value.trim().toLowerCase() === currentEmail
      );

      if (hasDuplicate) {
        // Show warning styling
        e.target.style.borderColor = 'var(--color-warning)';
        e.target.style.background = 'rgba(255, 193, 7, 0.1)';

        // Show temporary message
        const warning = document.createElement('div');
        warning.textContent = 'This email is already added';
        warning.style.cssText = 'color: var(--color-warning); font-size: 12px; margin-top: 4px;';
        e.target.parentElement.appendChild(warning);

        setTimeout(() => {
          warning.remove();
          e.target.style.borderColor = '';
          e.target.style.background = '';
        }, 3000);
      }
    });
  });

  // Remove email buttons (with real-time pricing)
  const removeEmailBtns = document.querySelectorAll('.remove-email-btn');
  removeEmailBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const emailId = btn.dataset.emailId;
      state.emailAddresses = state.emailAddresses.filter(email => email.id !== emailId);
      render();
    });
  });

  // On-screen keyboard
  attachKeyboardListeners();

  // ==================== NAME ENTRY ====================
  const nameInput = document.getElementById('nameInput');
  if (nameInput) {
    // AUTO-FOCUS: Focus input after render (M7)
    setTimeout(() => nameInput.focus(), 100);

    nameInput.addEventListener('input', (e) => {
      state.customerName = e.target.value;
    });
    nameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const nextBtn = document.getElementById('nextBtn');
        nextBtn?.click();
      }
    });
  }

  // AUTO-FOCUS: Email inputs (M7) (C6: Using unique ID)
  const firstEmailInput = document.getElementById(state.emailAddresses[0]?.id);
  if (firstEmailInput) {
    setTimeout(() => firstEmailInput.focus(), 100);
  }

  // ==================== BACK BUTTON (M2: Using History Stack) ====================
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      // Stop webcam if on photo screen
      if (state.currentScreen === 'photo') {
        stopWebcam();
      }
      goBack();
    });
  }

  // ==================== REVIEW SCREEN ====================
  const editBtns = document.querySelectorAll('.edit-btn');
  editBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetScreen = btn.dataset.screen;
      navigateTo(targetScreen);
    });
  });

  // ==================== PROGRESS BAR NAVIGATION ====================
  const progressSteps = document.querySelectorAll('.progress__step[data-screen]');
  progressSteps.forEach(step => {
    step.addEventListener('click', () => {
      const targetScreen = step.dataset.screen;
      navigateTo(targetScreen);
    });
  });

  const confirmBtn = document.getElementById('confirmBtn');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      state.reviewedOnce = true;
      navigateTo('payment');
    });
  }

  // ==================== PAYMENT SCREEN ====================
  const paymentBtns = document.querySelectorAll('.payment-btn');
  paymentBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update state
      state.paymentMethod = btn.dataset.method;

      // Update UI without re-rendering
      paymentBtns.forEach(b => b.classList.remove('card--selected'));
      btn.classList.add('card--selected');

      // Enable next button
      const nextBtn = document.getElementById('nextBtn');
      if (nextBtn) nextBtn.disabled = false;
    });
  });

  // ==================== PHOTO SCREEN ====================
  const captureBtn = document.getElementById('captureBtn');
  if (captureBtn) {
    // Start webcam when photo screen loads
    startWebcam();

    captureBtn.addEventListener('click', () => {
      // Capture photo from webcam
      const photoData = capturePhoto();

      if (photoData) {
        state.customerPhoto = photoData;
        state.photoCaptured = true;

        // Stop webcam
        stopWebcam();

        // IMPROVED: Show confirmation screen instead of auto-advancing
        navigateTo('photoConfirm');
      } else {
        alert('Failed to capture photo. Please try again.');
      }
    });
  }

  // Camera retry button (error recovery)
  const retryCamera = document.getElementById('retryCamera');
  if (retryCamera) {
    retryCamera.addEventListener('click', () => {
      render(); // Re-render photo screen to retry camera
    });
  }

  // Camera skip button (error recovery)
  const skipCamera = document.getElementById('skipCamera');
  if (skipCamera) {
    skipCamera.addEventListener('click', () => {
      state.customerPhoto = null;
      stopWebcam();
      navigateTo('processing');
      setTimeout(() => {
        navigateTo('receipt');
      }, 3000);
    });
  }

  // ==================== PHOTO CONFIRMATION SCREEN ====================
  const retakeBtn = document.getElementById('retakeBtn');
  if (retakeBtn) {
    retakeBtn.addEventListener('click', () => {
      state.customerPhoto = null;
      state.photoCaptured = false;
      navigateTo('photo');
    });
  }

  const usePhotoBtn = document.getElementById('usePhotoBtn');
  if (usePhotoBtn) {
    usePhotoBtn.addEventListener('click', () => {
      // Advance to processing
      navigateTo('processing');

      // Auto-advance to receipt after 3 seconds
      setTimeout(() => {
        navigateTo('receipt');
      }, 3000);
    });
  }

  // ==================== RECEIPT SCREEN ====================
  const printBtn = document.getElementById('printBtn');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }

  // FIX: Add event listener for Return to Start button
  const returnStartBtn = document.getElementById('returnStartBtn');
  if (returnStartBtn) {
    returnStartBtn.addEventListener('click', () => {
      // Reset state and navigate back to attract screen
      Object.assign(state, {
        currentScreen: 'attract',
        currentStep: 1,
        backgroundId: null,
        backgroundName: '',
        partySize: 1,
        deliveryMethod: '',
        printQuantity: 0,
        emailAddresses: [],
        customerName: '',
        paymentMethod: '',
        customerPhoto: null,
        totalPrice: 0,
        screenHistory: []
      });
      clearSavedState();
      navigateTo('attract', true);
    });
  }

  const countdownEl = document.getElementById('countdown');
  if (countdownEl) {
    let timeLeft = 60; // IMPROVED: Increased from 30 to 60 seconds (MO7)
    const countdownInterval = setInterval(() => {
      timeLeft--;
      if (countdownEl) countdownEl.textContent = timeLeft.toString();

      if (timeLeft <= 0) {
        clearInterval(countdownInterval);
        // Reset state and return to attract
        state.currentStep = 0;
        state.screenHistory = [];
        state.customerName = '';
        state.partySize = 1;
        state.selectedBackground = null;
        state.backgroundName = '';
        state.deliveryMethod = null;
        state.printQuantity = 0;
        state.emailAddresses = [];
        state.paymentMethod = null;
        state.customerPhoto = null;
        state.photoCaptured = false;
        state.customerNumber = null;
        state.totalPrice = 0;
        state.reviewedOnce = false;
        clearSavedState(); // Clear saved session on completion (T1)
        navigateTo('attract', true); // skipHistory = true for attract screen
      }
    }, 1000);

    // IMPROVED: Reset timer on user interaction (MO7)
    const resetTimer = () => {
      timeLeft = 60;
    };

    // Reset on any interaction
    document.addEventListener('mousemove', resetTimer, { once: false, passive: true });
    document.addEventListener('touchstart', resetTimer, { once: false, passive: true });
    document.addEventListener('click', resetTimer, { once: false, passive: true });

    // Clean up event listeners when countdown finishes
    setTimeout(() => {
      document.removeEventListener('mousemove', resetTimer);
      document.removeEventListener('touchstart', resetTimer);
      document.removeEventListener('click', resetTimer);
    }, 60000);
  }

  // ==================== NEXT BUTTON ====================
  const nextBtn = document.getElementById('nextBtn');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      // Navigate forward through the flow
      if (state.currentScreen === 'background') {
        navigateTo('partySize');
      } else if (state.currentScreen === 'partySize') {
        navigateTo('delivery');
      } else if (state.currentScreen === 'delivery') {
        // If email only, skip quantity and go straight to email
        if (state.deliveryMethod === 'email') {
          navigateTo('email');
        } else {
          navigateTo('quantity');
        }
      } else if (state.currentScreen === 'quantity') {
        // Go to email entry directly (no quantity selection)
        if (state.deliveryMethod === 'email' || state.deliveryMethod === 'both') {
          navigateTo('email');
        } else {
          navigateTo('name');
        }
      } else if (state.currentScreen === 'email') {
        navigateTo('name');
      } else if (state.currentScreen === 'name') {
        const nameInput = document.getElementById('nameInput');
        state.customerName = nameInput?.value || 'Guest';
        navigateTo('review');
      } else if (state.currentScreen === 'payment') {
        navigateTo('photo');
      }
    });
  }
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ignore if typing in an input field
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }

    // ESC: Go back
    if (e.key === 'Escape') {
      e.preventDefault();
      const backBtn = document.getElementById('backBtn');
      if (backBtn && !backBtn.disabled) {
        backBtn.click();
      }
    }

    // ENTER: Continue/Next
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextBtn = document.getElementById('nextBtn');
      const confirmBtn = document.getElementById('confirmBtn');
      const usePhotoBtn = document.getElementById('usePhotoBtn');

      if (nextBtn && !nextBtn.disabled) {
        nextBtn.click();
      } else if (confirmBtn && !confirmBtn.disabled) {
        confirmBtn.click();
      } else if (usePhotoBtn && !usePhotoBtn.disabled) {
        usePhotoBtn.click();
      }
    }

    // CTRL/CMD + R: Refresh warning (override default)
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
      e.preventDefault();
      showStartOverModal();
    }
  });
}

// ============================================
// INACTIVITY TIMEOUT
// ============================================
let inactivityTimer = null;
let warningTimer = null;
let countdownInterval = null;
let warningModal = null;

function resetInactivityTimer() {
  // Clear existing timers
  if (inactivityTimer) clearTimeout(inactivityTimer);
  if (warningTimer) clearTimeout(warningTimer);
  if (countdownInterval) clearInterval(countdownInterval);

  // Close warning modal if open
  if (warningModal) {
    warningModal.remove();
    warningModal = null;
  }

  // Don't set timer on attract or welcome screens
  if (state.currentScreen === 'attract' || state.currentScreen === 'welcome') {
    return;
  }

  // Start 30-second inactivity timer
  inactivityTimer = setTimeout(() => {
    showInactivityWarning();
  }, 30000); // 30 seconds
}

function showInactivityWarning() {
  // Don't show on attract or welcome
  if (state.currentScreen === 'attract' || state.currentScreen === 'welcome') {
    return;
  }

  let countdown = 10;

  // Create warning modal
  warningModal = document.createElement('div');
  warningModal.id = 'inactivityWarning';
  warningModal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.3s ease-out;
  `;

  warningModal.innerHTML = `
    <div style="
      background: white;
      padding: 60px;
      border-radius: 24px;
      text-align: center;
      max-width: 600px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.4);
      animation: scaleIn 0.3s ease-out;
    ">
      <div style="font-size: 80px; margin-bottom: 20px;">⏰</div>
      <h2 style="font-size: 36px; font-weight: 900; margin-bottom: 16px; color: #d00;">
        Are you still there?
      </h2>
      <p style="font-size: 22px; color: #666; margin-bottom: 32px;">
        Your session will end in:
      </p>
      <div id="countdownDisplay" style="
        font-size: 120px;
        font-weight: 900;
        color: #d00;
        margin-bottom: 40px;
        line-height: 1;
        text-shadow: 0 4px 20px rgba(221, 0, 0, 0.3);
      ">${countdown}</div>
      <button id="continueSessionBtn" style="
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        border: none;
        padding: 20px 60px;
        font-size: 28px;
        font-weight: 900;
        border-radius: 16px;
        cursor: pointer;
        box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4);
        transition: all 0.2s;
      " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
        👆 TAP TO CONTINUE
      </button>
    </div>
  `;

  document.body.appendChild(warningModal);

  // Update countdown every second
  countdownInterval = setInterval(() => {
    countdown--;
    const display = document.getElementById('countdownDisplay');
    if (display) {
      display.textContent = countdown;

      // Pulse animation on countdown
      display.style.animation = 'none';
      setTimeout(() => {
        display.style.animation = 'pulse 0.5s ease-out';
      }, 10);
    }

    if (countdown <= 0) {
      clearInterval(countdownInterval);
      // Reset to attract screen
      if (warningModal) {
        warningModal.remove();
        warningModal = null;
      }
      Object.assign(state, {
        currentScreen: 'attract',
        currentStep: 1,
        backgroundId: null,
        backgroundName: '',
        partySize: 1,
        deliveryMethod: '',
        printQuantity: 0,
        emailAddresses: [],
        customerName: '',
        paymentMethod: '',
        customerPhoto: null,
        totalPrice: 0,
        screenHistory: []
      });
      clearSavedState();
      navigateTo('attract', true);
    }
  }, 1000);

  // Continue button
  const continueBtn = document.getElementById('continueSessionBtn');
  if (continueBtn) {
    continueBtn.addEventListener('click', () => {
      if (warningModal) {
        warningModal.remove();
        warningModal = null;
      }
      if (countdownInterval) clearInterval(countdownInterval);
      resetInactivityTimer();
    });
  }
}

function setupInactivityTracking() {
  // Track all user interactions
  const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];

  events.forEach(event => {
    document.addEventListener(event, () => {
      resetInactivityTimer();
    }, { passive: true });
  });

  // Start initial timer
  resetInactivityTimer();
}

// ============================================
// INITIALIZATION
// ============================================
async function init() {
  console.log('[INIT] Initializing Greenscreen Kiosk...');

  // Load config
  state.config = await loadConfig();
  console.log('[CONFIG] Loaded successfully:', state.config);

  // Setup keyboard shortcuts
  setupKeyboardShortcuts();

  // Setup inactivity tracking
  setupInactivityTracking();

  // CHECK FOR SAVED STATE (T1)
  const savedState = loadState();
  if (savedState) {
    // Show resume prompt
    showResumePrompt(savedState);
  } else {
    // Initial render
    render();
  }
}

function showResumePrompt(savedState) {
  const app = document.getElementById('app');
  if (!app) return;

  const resumeHTML = `
    <div class="screen" style="background: var(--gradient-primary);">
      <main style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 20px;">
        <div class="card card--glass" style="max-width: 600px; padding: 40px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 20px;">🔄</div>
          <h1 style="font-size: 32px; font-weight: bold; margin-bottom: 16px; color: white;">Resume Session?</h1>
          <p style="font-size: 18px; color: rgba(255,255,255,0.9); margin-bottom: 32px;">
            We found an incomplete session. Would you like to continue where you left off?
          </p>

          <div style="display: flex; gap: 16px; justify-content: center;">
            <button id="resumeYes" class="btn btn--gradient-success btn--large" style="flex: 1; max-width: 250px; height: 70px; font-size: 18px; font-weight: bold;">
              ✓ RESUME SESSION
            </button>
            <button id="resumeNo" class="btn btn--outline" style="flex: 1; max-width: 250px; height: 70px; font-size: 18px; font-weight: bold; background: rgba(255,255,255,0.2); color: white; border-color: rgba(255,255,255,0.4);">
              ✕ START NEW
            </button>
          </div>
        </div>
      </main>
    </div>
  `;

  app.innerHTML = resumeHTML;

  // Attach event listeners
  document.getElementById('resumeYes')?.addEventListener('click', () => {
    restoreState(savedState);
    render();
  });

  document.getElementById('resumeNo')?.addEventListener('click', () => {
    clearSavedState();
    render();
  });
}

// Start when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Expose for debugging and onclick handlers
window.state = state;
window.render = render;
window.navigateToStep = navigateToStep;
