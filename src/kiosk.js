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
  visitedSteps: [],                // Track which steps have been visited for navigation
  customerName: '',
  partySize: 1,
  photoQuantity: 1,                // NEW: How many photos to take (1-8)
  useSameBackground: false,        // NEW: Checkbox - use same background for all photos (DEFAULT: false)
  currentPhotoIndex: 0,            // NEW: Which photo is being configured/taken (0-based)
  selectedBackground: null,        // Will become array if useSameBackground=false
  selectedBackgrounds: [],         // NEW: Array of {id, name, category} per photo
  backgroundName: '',              // Name of selected background
  backgroundCategory: 'Nature',    // Current background category tab
  aiCustomSelected: false,         // NEW: Is AI Custom tab active?
  customMode: 'manual',            // NEW: 'manual' | 'ai' - which custom mode user selected
  aiPrompts: [],                   // NEW: Array of AI prompts (one per photo)
  currentAiPrompt: '',             // NEW: Current prompt being edited
  aiGeneratedImages: [],           // NEW: Array of generated images (future use)
  isGenerating: false,             // NEW: Is AI currently generating?
  generatingForPhotoIndex: null,   // NEW: Which photo index is currently generating
  deliveryMethod: null,            // 'print' | 'email' | 'both'
  printQuantity: 0,
  emailAddresses: [],              // SIMPLIFIED: Array of email strings (no quantity concept)
  paymentMethod: null,
  customerPhoto: null,             // Will become array if multiple photos
  capturedPhotos: [],              // NEW: Array of captured photo data
  photoCaptured: false,            // NEW: Track if photo was captured (for confirmation)
  customerNumber: null,
  totalPrice: 0,                   // Calculated total
  reviewedOnce: false,             // Track if they saw review
  config: null,
  idleTimer: null,                 // For attract loop timeout
  welcomeTimer: null,              // For welcome screen timeout
  focusedInputId: null,            // Track currently focused input for keyboard
  marketingOptIn: false            // Track marketing email consent
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
    // Try to load from API first (new database-driven config)
    const response = await fetch('http://localhost:5000/api/config');

    if (response.ok) {
      const config = await response.json();
      console.log('✓ Config loaded from database');
      return config;
    }

    // Fallback to config.txt if API fails
    console.warn('⚠ API unavailable, falling back to config.txt');
    const txtResponse = await fetch('./public/config.txt');
    const text = await txtResponse.text();
    return parseConfig(text);
  } catch (error) {
    console.error('Error loading config:', error);
    // Final fallback: hardcoded defaults
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
// AI BACKGROUND GENERATION
// ============================================
/**
 * Generate AI background from text prompt
 * This is a placeholder function ready for API integration
 * @param {string} prompt - The text description of the desired background
 * @returns {Promise<string>} Base64 encoded image data
 */
// ============================================
// AI GENERATION INDICATOR
// ============================================
/**
 * Render persistent generation indicator banner
 * Shows at top of screen when AI is generating
 */
function renderGenerationIndicator() {
  let existingIndicator = document.getElementById('ai-generation-indicator');

  if (state.isGenerating && state.generatingForPhotoIndex !== null) {
    const photoNum = state.generatingForPhotoIndex + 1;
    const photoText = state.photoQuantity > 1 ? ` for Photo ${photoNum}` : '';

    if (!existingIndicator) {
      // Create new indicator
      existingIndicator = document.createElement('div');
      existingIndicator.id = 'ai-generation-indicator';
      existingIndicator.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 9999;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        cursor: pointer;
        transition: all 0.3s ease;
      `;

      existingIndicator.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="font-size: 24px; animation: pulse 2s ease-in-out infinite;">✨</div>
          <div>
            <div style="font-size: 16px; font-weight: 600;">Generating AI Background${photoText}...</div>
            <div style="font-size: 13px; opacity: 0.9;">This usually takes 15-20 seconds</div>
          </div>
        </div>
        <div style="font-size: 13px; opacity: 0.8;">Click to view progress</div>
        <style>
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
        </style>
      `;

      // Click handler to return to AI Custom tab
      existingIndicator.addEventListener('click', () => {
        if (!state.aiCustomSelected) {
          // Switch to custom tab
          const customTab = document.querySelector('[data-category="Custom"]');
          if (customTab) {
            customTab.click();
          }
        }
      });

      document.body.insertBefore(existingIndicator, document.body.firstChild);
    }
  } else {
    // Remove indicator if exists
    if (existingIndicator) {
      existingIndicator.remove();
    }
  }
}

// ============================================
// AI BACKGROUND GENERATION
// ============================================
async function generateAIBackground(prompt) {
  try {
    console.log('🎨 Generating AI background for prompt:', prompt);

    // Set generation state
    state.isGenerating = true;
    state.generatingForPhotoIndex = state.currentPhotoIndex;

    // Show persistent indicator
    renderGenerationIndicator();

    // Re-render to show loading state in preview (handled by render() now)
    render();

    // Call server endpoint to generate AI background
    const response = await fetch('http://localhost:5000/api/generate-ai-background', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to generate background');
    }

    const base64 = data.imageBase64;
    const imagePath = data.imagePath;
    const tempFilename = data.tempFilename;
    console.log('✅ AI background generated:', imagePath);

    // Store the generated image info in state
    state.aiGeneratedImages[state.currentPhotoIndex] = {
      base64: base64,
      path: imagePath,
      tempFilename: tempFilename
    };

    console.log('✅ AI background generation complete');

    // Clear generation state
    state.isGenerating = false;
    state.generatingForPhotoIndex = null;
    renderGenerationIndicator();

    // Re-render to update button state (but only if we're still on the background screen)
    if (state.currentScreen === 'background') {
      render();
    }

    return base64;

  } catch (error) {
    console.error('❌ Error generating AI background:', error);

    // Clear generation state on error
    state.isGenerating = false;
    state.generatingForPhotoIndex = null;
    renderGenerationIndicator();

    // Re-render to update button state (but only if we're still on the background screen)
    if (state.currentScreen === 'background') {
      render();
    }

    // Show error in preview area
    const previewArea = document.querySelector('.background-preview-area');
    if (previewArea) {
      previewArea.innerHTML = `
        <div style="width: 100%; height: 100%; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 30px; box-shadow: var(--shadow-lg);">
          <div style="font-size: 64px; margin-bottom: 20px;">❌</div>
          <div style="font-size: 22px; font-weight: bold; color: white; margin-bottom: 12px;">Generation Failed</div>
          <div style="font-size: 15px; color: rgba(255,255,255,0.95); margin-bottom: 24px; max-width: 400px; line-height: 1.5; background: rgba(0,0,0,0.2); padding: 16px; border-radius: 8px;">
            ${error.message}
          </div>
          <button class="btn btn--outline" id="retryAIGenerationBtn" style="font-size: 14px; padding: 12px 24px; font-weight: 600; color: white; border-color: white;">
            Try Again
          </button>
        </div>
      `;

      const retryBtn = document.getElementById('retryAIGenerationBtn');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          render();
        });
      }
    }

    throw error;
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

  console.log('[calculateCurrentPrice] deliveryMethod:', state.deliveryMethod);

  // Print pricing - MULTIPLY BY PHOTO QUANTITY
  if (state.deliveryMethod === 'print' || state.deliveryMethod === 'both') {
    const basePrintPrice = config.printPricing?.[state.printQuantity] || 0;
    const printTotal = basePrintPrice * state.photoQuantity;
    console.log('[calculateCurrentPrice] Print:', {
      printQuantity: state.printQuantity,
      photoQuantity: state.photoQuantity,
      basePrintPrice,
      printTotal
    });
    total += printTotal;
  } else {
    console.log('[calculateCurrentPrice] Skipping print calculation - deliveryMethod is not print/both');
  }

  // Email pricing (base + per recipient) - Does NOT multiply by photo quantity
  // All photos go to the same recipients
  if (state.deliveryMethod === 'email' || state.deliveryMethod === 'both') {
    const baseEmailPrice = config.emailPricing?.[1] || 10;
    const numRecipients = state.emailAddresses.filter(email => email.value && email.value.trim()).length;
    // Only add email pricing if at least one email address has been entered
    if (numRecipients > 0) {
      const emailTotal = baseEmailPrice + (numRecipients - 1);
      console.log('[calculateCurrentPrice] Email:', {
        numRecipients,
        baseEmailPrice,
        emailTotal
      });
      total += emailTotal;
    } else {
      console.log('[calculateCurrentPrice] Email: No valid recipients yet, skipping email price');
    }
  }

  console.log('[calculateCurrentPrice] TOTAL:', total);
  return total;
}

/**
 * Update price display if it exists on current screen
 */
function updatePricePreview() {
  const pricePreview = document.getElementById('pricePreview');
  console.log('[updatePricePreview] Called. Element exists:', !!pricePreview);
  if (pricePreview) {
    const price = calculateCurrentPrice();
    console.log('[updatePricePreview] Updating badge to:', price);
    pricePreview.textContent = `$${price.toFixed(2)}`;

    // Add pulse animation on price change
    pricePreview.style.animation = 'none';
    setTimeout(() => {
      pricePreview.style.animation = 'pulse 0.5s ease-out';
    }, 10);
  } else {
    console.log('[updatePricePreview] No badge element found on page');
  }
}

/**
 * Generate price preview badge HTML for screens
 * @returns {string} HTML for floating price badge
 */
function createPricePreviewBadge() {
  const config = state.config;
  if (!config) return '';

  const isFree = config?.features?.freeMode === true || config?.features?.freeMode === 1;
  const currentPrice = isFree ? 0 : calculateCurrentPrice();

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
// NAVIGATION HELPERS (Sequential Navigation)
// ============================================
/**
 * Navigate to a new screen with step tracking
 * @param {string} newScreen - Screen to navigate to
 * @param {boolean} skipHistory - If true, don't add to history (for back navigation)
 */
function navigateTo(newScreen, skipHistory = false) {
  // IMPORTANT: Reset all state when going to attract/welcome screen
  if (newScreen === 'attract' || newScreen === 'welcome') {
    // Reset entire state to defaults
    state.currentStep = 0;
    state.screenHistory = [];
    state.visitedSteps = [];
    state.customerName = '';
    state.partySize = 1;
    state.photoQuantity = 1;
    state.useSameBackground = false;  // DEFAULT: unchecked - user can choose different background per photo
    state.currentPhotoIndex = 0;
    state.selectedBackground = null;
    state.selectedBackgrounds = [];
    state.backgroundName = '';
    state.backgroundCategory = 'Nature';
    state.aiCustomSelected = false;
    state.customMode = 'manual';
    state.aiPrompts = [];
    state.currentAiPrompt = '';
    state.aiGeneratedImages = [];
    state.deliveryMethod = null;
    state.printQuantity = 0;
    state.emailAddresses = [];
    state.paymentMethod = null;
    state.customerPhoto = null;
    state.capturedPhotos = [];
    state.photoCaptured = false;
    state.customerNumber = null;
    state.totalPrice = 0;
    state.reviewedOnce = false;
    state.focusedInputId = null;
    state.welcomeTimer = null;

    // Clear localStorage
    clearSavedState();

    // Set current screen and render
    state.currentScreen = newScreen;
    render();
    return;
  }

  // Clear welcome timer when leaving welcome screen
  if (state.currentScreen === 'welcome' && state.welcomeTimer) {
    clearTimeout(state.welcomeTimer);
    state.welcomeTimer = null;
  }

  // Clear focused input when leaving email or name screens
  if (state.currentScreen === 'email' || state.currentScreen === 'name') {
    state.focusedInputId = null;
  }

  // Don't track attract or receipt screens in history
  if (!skipHistory && state.currentScreen !== 'attract' && state.currentScreen !== 'receipt') {
    state.screenHistory.push(state.currentScreen);
  }

  // Track visited steps
  const stepNumber = SCREEN_TO_STEP[newScreen];
  if (stepNumber && !state.visitedSteps.includes(stepNumber)) {
    state.visitedSteps.push(stepNumber);
  }

  // Reset photo index when returning to background screen
  if (newScreen === 'background') {
    state.currentPhotoIndex = 0;
  }

  state.currentScreen = newScreen;
  render();
}

/**
 * Navigate back using sequential step order (not history)
 */
function goBack() {
  const currentStep = SCREEN_TO_STEP[state.currentScreen];

  if (!currentStep) {
    // If not in a numbered step, go to attract
    navigateTo('attract', true);
    return;
  }

  // Find the previous step in sequence (only from defined steps)
  const stepNumbers = Object.keys(STEP_TO_SCREEN).map(Number).sort((a, b) => a - b);
  const currentIndex = stepNumbers.indexOf(currentStep);

  if (currentIndex > 0) {
    const previousStep = stepNumbers[currentIndex - 1];
    let previousScreen = STEP_TO_SCREEN[previousStep];

    const config = state.config;
    const printsEnabled = config?.features?.prints !== false;
    const emailEnabled = config?.features?.email !== false;
    const webcamEnabled = config?.features?.webcam !== false;

    // Special case: If going back from email screen
    if (state.currentScreen === 'email') {
      // If prints are disabled, skip delivery and quantity screens, go to party size
      if (!printsEnabled) {
        previousScreen = 'partySize';
      }
      // If prints enabled but delivery is email-only, skip quantity screen, go to delivery
      else if (state.deliveryMethod === 'email' && previousScreen === 'quantity') {
        previousScreen = 'delivery';
      }
    }

    // Special case: If going back from quantity screen
    if (state.currentScreen === 'quantity' && previousScreen === 'delivery') {
      // If email is disabled, skip delivery screen, go to party size
      if (!emailEnabled) {
        previousScreen = 'partySize';
      }
    }

    // Special case: If going back from review screen
    if (state.currentScreen === 'review' && previousScreen === 'photo') {
      // If webcam is disabled, skip photo screen, go to name
      if (!webcamEnabled) {
        previousScreen = 'name';
      }
    }

    // Additional validation: ensure previousScreen is defined
    if (previousScreen) {
      navigateTo(previousScreen, true);
    } else {
      // Fallback: go to attract if screen is undefined
      navigateTo('attract', true);
    }
  } else {
    // At first step, go to attract
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
      photoQuantity: state.photoQuantity,
      useSameBackground: state.useSameBackground,
      customerPhoto: state.customerPhoto, // Base64 image
      selectedBackground: state.selectedBackground,
      selectedBackgrounds: state.selectedBackgrounds, // Array of backgrounds per photo
      backgroundId: state.selectedBackground || 'none', // Ensure backgroundId is always present
      backgroundName: state.backgroundName || 'None',
      aiCustomSelected: state.aiCustomSelected, // NEW: Is custom background mode active
      aiPrompts: state.aiPrompts, // NEW: Array of custom prompts (one per photo)
      aiGeneratedImages: state.aiGeneratedImages, // NEW: Array of AI generated image info (with temp filenames)
      deliveryMethod: state.deliveryMethod,
      printQuantity: state.printQuantity,
      emailAddresses: state.emailAddresses.map(e => typeof e === 'object' ? e.value : e), // Extract values
      paymentMethod: state.paymentMethod,
      totalPrice: state.totalPrice,
      marketingOptIn: state.marketingOptIn,
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
    visitedSteps: state.visitedSteps,
    customerName: state.customerName,
    partySize: state.partySize,
    photoQuantity: state.photoQuantity,
    useSameBackground: state.useSameBackground,
    currentPhotoIndex: state.currentPhotoIndex,
    selectedBackground: state.selectedBackground,
    selectedBackgrounds: state.selectedBackgrounds,
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
  state.visitedSteps = savedState.visitedSteps || [];
  state.customerName = savedState.customerName;
  state.partySize = savedState.partySize;
  state.photoQuantity = savedState.photoQuantity || 1;
  state.useSameBackground = savedState.useSameBackground !== undefined ? savedState.useSameBackground : false;
  state.currentPhotoIndex = savedState.currentPhotoIndex || 0;
  state.selectedBackground = savedState.selectedBackground;
  state.selectedBackgrounds = savedState.selectedBackgrounds || [];
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
      // Use focused input from state if available, otherwise fall back to data attribute
      const inputId = state.focusedInputId || btn.dataset.inputId;
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
// REMOVED: Duplicate calculateCurrentPrice function - using the one at line 108 instead

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
// Map screens to step numbers for sequential navigation
const SCREEN_TO_STEP = {
  'photoQuantity': 1,
  'background': 2,
  'partySize': 3,
  'delivery': 4,
  'quantity': 5,
  'email': 7,
  'name': 8,
  'photo': 9,
  'photoConfirm': 9,
  'review': 10,
  'payment': 11
};

// Map step numbers to screens for back navigation
const STEP_TO_SCREEN = {
  1: 'photoQuantity',
  2: 'background',
  3: 'partySize',
  4: 'delivery',
  5: 'quantity',
  7: 'email',
  8: 'name',
  9: 'photo',
  10: 'review',
  11: 'payment'
};

function createProgressBar(currentStep, totalSteps) {
  // Check which features are enabled
  const printsEnabled = state.config?.features?.prints === true || state.config?.features?.prints === 1;
  const emailEnabled = state.config?.features?.email === true || state.config?.features?.email === 1;
  const webcamEnabled = state.config?.features?.webcam === true || state.config?.features?.webcam === 1;

  // Step labels for navigation - filter based on enabled features
  let stepLabels = [
    { step: 1, label: '# Photos', screen: 'photoQuantity' },
    { step: 2, label: 'Background', screen: 'background' },
    { step: 3, label: 'Party Size', screen: 'partySize' },
    { step: 4, label: 'Delivery', screen: 'delivery', showIf: printsEnabled && emailEnabled }, // Only show if both enabled
    { step: 5, label: 'Quantity', screen: 'quantity', showIf: printsEnabled }, // Only show if prints enabled
    { step: 7, label: 'Email', screen: 'email', showIf: emailEnabled }, // Only show if email enabled
    { step: 8, label: 'Name', screen: 'name' },
    { step: 9, label: 'ID Photo', screen: 'photo', showIf: webcamEnabled }, // Only show if webcam enabled
    { step: 10, label: 'Review', screen: 'review' },
    { step: 11, label: 'Payment', screen: 'payment' },
    { step: 12, label: 'Complete', screen: 'receipt' }
  ];

  // Filter out steps that shouldn't be shown
  stepLabels = stepLabels.filter(s => s.showIf === undefined || s.showIf === true);

  let dots = '';
  for (let i = 1; i <= totalSteps; i++) {
    // Skip step 6 (not used in workflow)
    if (i === 6) continue;

    // Skip steps that have been filtered out
    const stepInfo = stepLabels.find(s => s.step === i);
    if (!stepInfo) continue;

    let className = 'progress__dot';
    const isVisited = state.visitedSteps.includes(i);
    const isCurrent = i === currentStep;

    // Mark completed steps (visited and before current)
    if (isVisited && i < currentStep) className += ' progress__dot--complete';
    else if (isCurrent) className += ' progress__dot--current';

    const label = stepInfo.label;
    const targetScreen = stepInfo.screen;

    // Make all visited steps clickable (including current)
    const isClickable = isVisited || isCurrent;

    if (isClickable) {
      dots += `
        <div class="progress__step" data-screen="${targetScreen}" style="display: flex; flex-direction: column; align-items: center; cursor: pointer; padding: 0 4px; opacity: 1;">
          <div class="${className}" title="${label}" style="cursor: pointer;"></div>
          <div style="font-size: 9px; margin-top: 2px; color: ${isCurrent ? 'var(--color-primary)' : 'var(--color-gray-600)'}; font-weight: ${isCurrent ? '700' : '600'}; white-space: nowrap; cursor: pointer;">${label}</div>
        </div>
      `;
    } else {
      dots += `
        <div class="progress__step" style="display: flex; flex-direction: column; align-items: center; padding: 0 4px; opacity: 0.4;">
          <div class="${className}" title="${label}"></div>
          <div style="font-size: 9px; margin-top: 2px; color: var(--color-gray-400); font-weight: 500; white-space: nowrap;">${label}</div>
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
// SCREEN 3: PHOTO QUANTITY SELECTION
// ============================================
function createPhotoQuantityScreen() {
  return `
    <div class="screen">
      <header style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(0,0,0,0.02); border-bottom: 1px solid var(--color-border); min-height: 80px; max-height: 80px; position: relative;">
        <button class="btn btn--ghost btn--small" id="backBtn" style="min-height: 60px; min-width: 140px; font-size: 20px; padding: 12px 20px; font-weight: 600;">← Back</button>
        <div style="position: absolute; left: 50%; transform: translateX(-50%); font-size: 24px; font-weight: 700;">Number of Photos</div>
        <button class="btn btn--danger btn--small" id="startOverBtn" style="min-height: 60px; min-width: 180px; font-size: 18px; padding: 12px 20px; font-weight: 600;">Start Over ✕</button>
      </header>

      <main style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 12px; max-height: calc(100vh - 80px - 50px);">
        <h1 style="font-size: 36px; font-weight: 900; margin-bottom: 24px; text-align: center; color: var(--color-gray-900);">How many photos would you like?</h1>

        <div style="width: 100%; max-width: 900px;">
          <!-- Number Grid (show only 1 photo if multi-print disabled) -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;">
            ${(state.config?.features?.multiPrint ? [1,2,3,4,5,6,7,8] : [1]).map(num => `
              <button class="photo-quantity-btn" data-quantity="${num}"
                      style="height: 100px; border-radius: 12px; border: 3px solid ${state.photoQuantity === num ? 'var(--color-success)' : 'var(--color-border)'};
                      background: ${state.photoQuantity === num ? 'var(--gradient-success)' : 'white'}; color: ${state.photoQuantity === num ? 'white' : 'var(--color-gray-700)'};
                      font-size: 40px; font-weight: bold; cursor: pointer; transition: all 0.2s; box-shadow: ${state.photoQuantity === num ? '0 0 0 4px rgba(16,185,129,0.3), var(--shadow-lg)' : 'var(--shadow-sm)'};
                      display: flex; align-items: center; justify-content: center;">
                ${num}
              </button>
            `).join('')}
          </div>

          <!-- Continue Button -->
          <button class="btn btn--gradient-primary btn--large" id="nextBtn" style="width: 100%; height: 60px; font-size: 18px; font-weight: bold; box-shadow: var(--shadow-lg);">
            CONTINUE →
          </button>
        </div>
      </main>

      ${createProgressBar(1, state.totalSteps)}
    </div>
  `;
}

// ============================================
// SCREEN 4: BACKGROUND SELECTION - STILL USES STRING TEMPLATES
// (Complex dynamic content - can be refactored incrementally)
// ============================================
async function createBackgroundScreen() {
  // Load themes and backgrounds from database
  let themes = [];
  let backgrounds = [];
  let useFilesystemFallback = false;

  try {
    // Fetch themes
    const themesResponse = await fetch('http://localhost:5000/api/themes/enabled');
    if (themesResponse.ok) {
      const themesData = await themesResponse.json();
      themes = themesData.themes || [];
    }

    // Fetch all backgrounds
    const backgroundsResponse = await fetch('http://localhost:5000/api/backgrounds');
    if (backgroundsResponse.ok) {
      const backgroundsData = await backgroundsResponse.json();
      backgrounds = backgroundsData.backgrounds || [];
    }

    // If no backgrounds from database, fallback to filesystem scan
    if (backgrounds.length === 0) {
      console.log('[BACKGROUNDS] No backgrounds in database, scanning filesystem...');
      useFilesystemFallback = true;

      // Try to fetch list of files from backgrounds directory via API
      const filesResponse = await fetch('http://localhost:5000/api/backgrounds/scan-directory');
      if (filesResponse.ok) {
        const filesData = await filesResponse.json();
        backgrounds = filesData.backgrounds || [];
        console.log(`[BACKGROUNDS] Found ${backgrounds.length} backgrounds in filesystem`);
      }
    }
  } catch (error) {
    console.error('Error loading backgrounds:', error);
    useFilesystemFallback = true;
  }

  // If still no themes, use fallback
  if (themes.length === 0) {
    themes = [{ id: 1, name: 'Nature', tab_name: 'Nature' }];
  }

  // If still no backgrounds after all attempts, set empty array (will show empty state)
  if (backgrounds.length === 0) {
    console.warn('[BACKGROUNDS] No backgrounds available - user needs to upload via settings');
  }

  // Get selected theme (default to first theme)
  const selectedTheme = state.backgroundCategory || themes[0]?.tab_name;
  const currentTheme = themes.find(t => t.tab_name === selectedTheme) || themes[0];

  // Filter backgrounds by selected theme
  const filteredBackgrounds = backgrounds.filter(bg => bg.theme_id === currentTheme.id);

  // Determine current background based on mode (including AI custom prompts)
  let currentBackgroundId;
  if (state.aiCustomSelected) {
    // In custom mode, check if prompt exists for current photo
    currentBackgroundId = state.aiPrompts[state.currentPhotoIndex] ? 'ai-custom' : null;
  } else if (state.useSameBackground) {
    currentBackgroundId = state.selectedBackground;
  } else {
    // Get background for current photo index
    currentBackgroundId = state.selectedBackgrounds[state.currentPhotoIndex]?.id || null;
  }

  // Helper function for comparing IDs (handles string/number comparison)
  const isSelectedBg = (bgId) => {
    if (currentBackgroundId == null || bgId == null) return false;
    return String(currentBackgroundId) === String(bgId);
  };

  // Check if all photos have backgrounds selected (for multi-photo mode)
  // ONLY count backgrounds that have been selected via "Use This", NOT prompts that are just entered
  const totalSelected = state.selectedBackgrounds.length;
  const allBackgroundsSelected = state.useSameBackground || totalSelected === state.photoQuantity;

  // Title varies based on whether selecting for one photo or multiple
  let headerTitle = 'Choose Background';
  if (!state.useSameBackground && state.photoQuantity > 1) {
    headerTitle = `Photo ${state.currentPhotoIndex + 1} of ${state.photoQuantity}`;
  }

  return `
    <div class="screen">
      <!-- IMPROVED HEADER: Larger touch targets (MO1) -->
      <header style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(0,0,0,0.02); border-bottom: 1px solid var(--color-border); min-height: 80px; max-height: 80px; position: relative;">
        <button class="btn btn--ghost btn--small" id="backBtn" style="min-height: 60px; min-width: 140px; font-size: 20px; padding: 12px 20px; font-weight: 600;">← Back</button>
        <div style="position: absolute; left: 50%; transform: translateX(-50%); text-align: center;">
          <div style="font-size: 24px; font-weight: 700;">${headerTitle}</div>
          ${!state.useSameBackground && state.photoQuantity > 1 ? `<div style="font-size: 14px; color: var(--color-gray-600); margin-top: 4px;">Choose background for this photo</div>` : ''}
        </div>
        <button class="btn btn--danger btn--small" id="startOverBtn" style="min-height: 60px; min-width: 180px; font-size: 18px; padding: 12px 20px; font-weight: 600;">Start Over ✕</button>
      </header>

      <main style="flex: 1; display: flex; flex-direction: column; padding: 0; overflow: hidden; max-height: calc(100vh - 80px - 50px);">
        <!-- TABS - DYNAMIC FROM DATABASE + AI CUSTOM -->
        <div style="display: flex; gap: 8px; padding: 10px 12px; background: var(--color-gray-100); border-bottom: 2px solid var(--color-border); overflow-x: auto;">
          ${themes.map(theme => `
            <button class="category-tab ${!state.aiCustomSelected && selectedTheme === theme.tab_name ? 'category-tab--active' : ''}" data-category="${theme.tab_name}"
                    style="flex: 1; padding: 16px 20px; border-radius: 10px; font-size: 18px; font-weight: 700; border: none; cursor: pointer; transition: all 0.2s;
                    background: ${!state.aiCustomSelected && selectedTheme === theme.tab_name ? 'var(--gradient-primary)' : 'white'};
                    color: ${!state.aiCustomSelected && selectedTheme === theme.tab_name ? 'white' : 'var(--color-gray-700)'};
                    box-shadow: ${!state.aiCustomSelected && selectedTheme === theme.tab_name ? 'var(--shadow-md)' : 'var(--shadow-sm)'}; min-height: 60px; min-width: 120px;">
              ${theme.tab_name}
            </button>
          `).join('')}
          <!-- CUSTOM TAB (show if EITHER customBackground OR aiCustom is enabled) -->
          ${(state.config?.features?.customBackground || state.config?.features?.aiCustom) ? `
            <button class="category-tab ${state.aiCustomSelected ? 'category-tab--active' : ''}" data-category="ai-custom"
                    style="flex: 1; padding: 16px 20px; border-radius: 10px; font-size: 18px; font-weight: 700; border: none; cursor: pointer; transition: all 0.2s;
                    background: ${state.aiCustomSelected ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white'};
                    color: ${state.aiCustomSelected ? 'white' : 'var(--color-gray-700)'};
                    box-shadow: ${state.aiCustomSelected ? 'var(--shadow-md)' : 'var(--shadow-sm)'}; min-height: 60px; min-width: 120px;">
              Custom
            </button>
          ` : ''}
        </div>

        <!-- MAIN CONTENT AREA - LARGER PREVIEW, SMALLER GRID -->
        <div style="flex: 1; display: grid; grid-template-columns: 1fr 700px; gap: 16px; padding: 12px; overflow: hidden;">
          ${state.aiCustomSelected ? `
            <!-- CUSTOM MODE: LEFT = Mode Selector + Textarea + Keyboard/Generate Button -->
            <div style="display: flex; flex-direction: column; gap: 8px; overflow: hidden; padding-bottom: 20px;">
              <!-- Scrollable top section -->
              <div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding-right: 8px; padding-left: 6px; min-height: 0;">
                ${(() => {
                  const hasCustom = state.config?.features?.customBackground;
                  const hasAI = state.config?.features?.aiCustom;

                  // ALWAYS show header section with consistent height (60px)
                  if (hasCustom && hasAI) {
                    // Both enabled: show mode selector buttons
                    return `
                      <div style="background: white; border: 2px solid var(--color-border); border-radius: 8px; padding: 12px; display: flex; gap: 8px; min-height: 60px;">
                        <button id="customModeManual"
                                style="flex: 1; padding: 12px; border-radius: 6px; border: 2px solid ${state.customMode === 'manual' ? 'var(--color-primary)' : 'var(--color-border)'};
                                background: ${state.customMode === 'manual' ? 'var(--color-primary)' : 'white'};
                                color: ${state.customMode === 'manual' ? 'white' : 'var(--color-gray-700)'};
                                font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                          👤 Manual Custom<br><span style="font-size: 11px; opacity: 0.8;">Photographer creates</span>
                        </button>
                        <button id="customModeAI"
                                style="flex: 1; padding: 12px; border-radius: 6px; border: 2px solid ${state.customMode === 'ai' ? 'var(--color-primary)' : 'var(--color-border)'};
                                background: ${state.customMode === 'ai' ? 'var(--color-primary)' : 'white'};
                                color: ${state.customMode === 'ai' ? 'white' : 'var(--color-gray-700)'};
                                font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                          ✨ AI Generated<br><span style="font-size: 11px; opacity: 0.8;">Automatic creation</span>
                        </button>
                      </div>
                    `;
                  } else {
                    // Only one feature enabled: show title banner
                    const isAIMode = hasAI && !hasCustom;
                    const icon = isAIMode ? '✨' : '👤';
                    const title = isAIMode ? 'AI Generated Background' : 'Manual Custom Background';
                    const subtitle = isAIMode ? 'Describe what you want AI to create' : 'Describe for photographer to create';

                    return `
                      <div style="background: linear-gradient(135deg, ${isAIMode ? '#667eea 0%, #764ba2 100%' : '#10b981 0%, #059669 100%'});
                                  border-radius: 8px; padding: 16px; text-align: center; min-height: 60px; display: flex; flex-direction: column; justify-content: center;">
                        <div style="font-size: 18px; font-weight: 700; color: white; margin-bottom: 4px;">
                          ${icon} ${title}
                        </div>
                        <div style="font-size: 12px; color: rgba(255,255,255,0.9);">
                          ${subtitle}
                        </div>
                      </div>
                    `;
                  }
                })()}

                <!-- Textarea -->
                <textarea
                  id="aiPromptInput"
                  placeholder="${(() => {
                    const hasCustom = state.config?.features?.customBackground;
                    const hasAI = state.config?.features?.aiCustom;
                    if (!hasCustom && hasAI) return 'Describe what you want AI to generate... (e.g., sunset beach, mountain landscape, city skyline at night)';
                    if (hasCustom && !hasAI) return 'Describe your desired background for the photographer... (e.g., sunset beach, mountain landscape, city skyline at night)';
                    if (state.customMode === 'ai') return 'Describe what you want AI to generate... (e.g., sunset beach, mountain landscape, city skyline at night)';
                    return 'Describe your desired background for the photographer... (e.g., sunset beach, mountain landscape, city skyline at night)';
                  })()}"
                  style="width: 100%; flex: 1; min-height: 80px; max-height: 160px; padding: 16px; font-size: 16px; border: 2px solid var(--color-border); border-radius: 8px; resize: none; font-family: inherit; line-height: 1.5;"
                >${state.aiPrompts[state.currentPhotoIndex] || ''}</textarea>

                ${!state.useSameBackground && state.photoQuantity > 1 ? `
                  <div style="background: white; border: 2px solid var(--color-primary); border-radius: 8px; padding: 12px; text-align: center;">
                    <div style="font-size: 16px; font-weight: 700; color: var(--color-primary);">
                      Photo ${state.currentPhotoIndex + 1} of ${state.photoQuantity}
                    </div>
                    <div style="font-size: 12px; color: var(--color-gray-600); margin-top: 4px;">
                      Describe the custom background for this photo
                    </div>
                  </div>
                ` : ''}
              </div>

              <!-- Keyboard (always show for typing, at bottom) -->
              <div style="flex-shrink: 0;">
                ${createKeyboard('aiPromptInput')}
              </div>
            </div>
          ` : `
            <!-- REGULAR MODE: LEFT = Background Grid (4 columns, smaller thumbnails) -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; overflow-y: auto; align-content: start; padding-right: 8px;">
              ${filteredBackgrounds.length > 0 ? filteredBackgrounds.map(bg => `
              <button class="background-btn ${isSelectedBg(bg.id) ? 'bg-selected' : ''}"
                      data-id="${bg.id}" data-name="${bg.display_name || bg.filename}"
                      style="position: relative; border-radius: 8px; overflow: hidden; cursor: pointer;
                      aspect-ratio: 4/3; min-height: 110px;
                      border: ${isSelectedBg(bg.id) ? '4px solid var(--color-success)' : '3px solid var(--color-border)'};
                      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 2s infinite;
                      transition: all 0.2s;
                      box-shadow: ${isSelectedBg(bg.id) ? '0 0 0 4px rgba(16,185,129,0.3), var(--shadow-lg)' : 'var(--shadow-md)'};">
                <!-- Background Image (loads on top of shimmer) -->
                <div style="position: absolute; inset: 0; background: url('/public/backgrounds/${bg.filename}') center/cover; opacity: 0; transition: opacity 0.3s;" onload="this.style.opacity='1'"></div>
                <img src="/public/backgrounds/${bg.filename}" style="display: none;" onload="this.previousElementSibling.style.opacity='1'">
                ${isSelectedBg(bg.id) ? '<div style="position: absolute; top: 4px; right: 4px; width: 24px; height: 24px; background: var(--color-success); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; color: white; font-weight: bold; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">✓</div>' : ''}
                <!-- Background Name Label (inside, at bottom) -->
                <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 8px 6px; font-size: 14px; font-weight: 600; color: white; text-align: center; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 4px rgba(0,0,0,0.5); filter: drop-shadow(0 2px 3px rgba(0,0,0,0.6)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${bg.display_name || bg.filename}
                </div>
              </button>
              `).join('') : `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--color-gray-600);">
                  <div style="font-size: 48px; margin-bottom: 16px;">📷</div>
                  <div style="font-size: 18px; font-weight: 600;">No backgrounds available</div>
                  <div style="font-size: 14px; margin-top: 8px;">Go to Operator Settings to upload backgrounds for this theme</div>
                </div>
              `}
            </div>
          `}

          <!-- RIGHT: Preview & Actions (LARGER) -->
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <!-- Extra Large Preview - Dynamically sized based on if checkbox/progress is shown -->
            <div class="background-preview-area" style="flex: 1; min-height: 380px; max-height: ${state.photoQuantity > 1 ? '600px' : '720px'};">
              ${(() => {
                // PRIORITY: Show loading state if AI is currently generating (across ALL tabs)
                if (state.isGenerating) {
                  const currentPrompt = state.aiPrompts[state.generatingForPhotoIndex] || 'your background';
                  return `
                    <div style="width: 100%; height: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 30px; box-shadow: var(--shadow-lg);">
                      <div style="font-size: 64px; margin-bottom: 20px; animation: pulse 2s ease-in-out infinite;">✨</div>
                      <div style="font-size: 24px; font-weight: bold; color: white; margin-bottom: 16px;">Generating Your AI Background...</div>
                      <div style="font-size: 16px; color: rgba(255,255,255,0.9); margin-bottom: 24px; max-width: 400px; line-height: 1.5;">
                        Creating: "${currentPrompt}"
                      </div>
                      <div style="width: 60%; height: 6px; background: rgba(255,255,255,0.3); border-radius: 3px; overflow: hidden;">
                        <div style="width: 100%; height: 100%; background: white; border-radius: 3px; animation: loading 2s ease-in-out infinite;"></div>
                      </div>
                      <div style="font-size: 13px; color: rgba(255,255,255,0.7); margin-top: 16px;">This usually takes 15-20 seconds</div>
                    </div>
                    <style>
                      @keyframes pulse {
                        0%, 100% { transform: scale(1); opacity: 1; }
                        50% { transform: scale(1.1); opacity: 0.8; }
                      }
                      @keyframes loading {
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(100%); }
                      }
                    </style>
                  `;
                }

                // If not generating, show content based on current tab
                return state.aiCustomSelected ? (() => {
                  // Check if AI image already generated for this photo
                  const aiImage = state.aiGeneratedImages[state.currentPhotoIndex];
                  if (aiImage && aiImage.base64) {
                  // Show generated image (buttons are now at the bottom, not in preview)
                  return `
                    <div style="width: 100%; height: 100%; position: relative; border-radius: 10px; overflow: hidden; box-shadow: var(--shadow-lg);">
                      <img src="${aiImage.base64}" style="width: 100%; height: 100%; object-fit: cover;" alt="Generated background">
                      <div style="position: absolute; top: 12px; right: 12px; background: rgba(0,0,0,0.7); color: white; padding: 8px 12px; border-radius: 8px; font-size: 13px; font-weight: 600;">
                        ✨ AI Generated
                      </div>
                    </div>
                  `;
                }

                // No generated image yet - show placeholder
                return `<div style="width: 100%; height: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center; text-align: center; padding: 30px; box-shadow: var(--shadow-lg);">
                  <div>
                    ${(() => {
                      const hasCustom = state.config?.features?.customBackground;
                      const hasAI = state.config?.features?.aiCustom;
                      const isAIMode = (hasAI && !hasCustom) || (hasAI && state.customMode === 'ai');
                      const icon = isAIMode ? '✨' : '👤';
                      const title = isAIMode ? 'AI Generated Background' : 'Custom Background Request';

                      if (state.aiPrompts[state.currentPhotoIndex]) {
                        return `
                          <div style="font-size: 48px; margin-bottom: 16px;">${icon}</div>
                          <div style="font-size: 22px; font-weight: bold; color: white; margin-bottom: 12px;">${title}</div>
                          <div style="font-size: 16px; color: rgba(255,255,255,0.95); line-height: 1.6; max-width: 500px; margin-bottom: 12px; padding: 16px; background: rgba(0,0,0,0.2); border-radius: 8px;">
                            "${state.aiPrompts[state.currentPhotoIndex]}"
                          </div>
                          <div style="font-size: 13px; color: rgba(255,255,255,0.8); line-height: 1.4;">
                            ${isAIMode ?
                              'Click "Generate AI Background" to create this image automatically' :
                              'Your custom background will be created by our photographer based on this description'}
                          </div>
                        `;
                      } else {
                        return `
                          <div style="font-size: 48px; margin-bottom: 16px;">${icon}</div>
                          <div style="font-size: 22px; font-weight: bold; color: white; margin-bottom: 12px;">${title}</div>
                          <div style="font-size: 14px; color: rgba(255,255,255,0.9); line-height: 1.5; max-width: 500px;">
                            ${isAIMode ?
                              'Describe what you want AI to generate in the text box below.<br>Images will be created automatically!' :
                              'Describe your desired background in the text box below.<br>Our photographer will create it for your photos.'}
                          </div>
                        `;
                      }
                    })()}
                  </div>
                </div>`;
              })() : currentBackgroundId && currentBackgroundId !== 'custom' ? (() => {
                const selectedBg = backgrounds.find(bg => String(bg.id) === String(currentBackgroundId));
                return selectedBg ? `
                  <div style="width: 100%; height: 100%; position: relative; border-radius: 10px; overflow: hidden; box-shadow: var(--shadow-lg);">
                    <img src="/public/backgrounds/${selectedBg.filename}" style="width: 100%; height: 100%; object-fit: cover;">
                  </div>
                ` : '';
              })() : currentBackgroundId === 'custom' ? `
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
              `;
              })()}
            </div>

            <!-- Checkbox OR Progress Indicator (Combined Component for Multi-Photo) -->
            ${state.photoQuantity > 1 ? `
              <div style="background: white; border: 2px solid var(--color-border); border-radius: 12px; padding: 16px; min-height: 110px; display: flex; align-items: center;">
                ${state.useSameBackground ? `
                  <!-- Checkbox Mode: Same background for all -->
                  <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; width: 100%;">
                    <input type="checkbox" id="sameBackgroundCheckbox" checked
                           style="width: 28px; height: 28px; cursor: pointer; flex-shrink: 0;">
                    <div style="flex: 1;">
                      <div style="font-size: 16px; font-weight: 700; color: var(--color-gray-900); margin-bottom: 4px;">Use same background for all photos</div>
                      <div style="font-size: 12px; color: var(--color-gray-600);">Uncheck to choose a different background for each photo</div>
                    </div>
                  </label>
                ` : `
                  <!-- Progress Mode: Different background per photo -->
                  <div style="display: flex; align-items: center; gap: 12px; width: 100%;">
                    <div style="flex: 1;">
                      <!-- Checkbox (unchecked) -->
                      <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; margin-bottom: 12px;">
                        <input type="checkbox" id="sameBackgroundCheckbox"
                               style="width: 22px; height: 22px; cursor: pointer; flex-shrink: 0;">
                        <div style="font-size: 13px; font-weight: 600; color: var(--color-gray-700);">
                          Use same background for all
                        </div>
                      </label>

                      <!-- Progress Dots -->
                      <div style="display: flex; gap: 6px; margin-bottom: 8px;">
                        ${Array.from({length: state.photoQuantity}, (_, i) => {
                          const hasBackground = state.selectedBackgrounds[i] !== undefined;
                          const isCurrent = i === state.currentPhotoIndex;
                          return `<div style="flex: 1; height: 8px; background: ${hasBackground ? 'var(--color-success)' : (isCurrent ? 'var(--color-primary)' : 'var(--color-gray-300)')}; border-radius: 4px; ${isCurrent ? 'box-shadow: 0 0 0 2px var(--color-primary-light);' : ''}"></div>`;
                        }).join('')}
                      </div>
                      <div style="font-size: 13px; color: var(--color-gray-600);">
                        ${state.selectedBackgrounds.length} of ${state.photoQuantity} backgrounds selected
                      </div>
                    </div>

                    <!-- Undo Button -->
                    <button class="btn btn--outline btn--small" id="clearBackgroundBtn" ${state.currentPhotoIndex === 0 ? 'disabled' : ''}
                            style="flex-shrink: 0; height: 70px; padding: 0 16px; font-size: 14px; font-weight: 600; border: 2px solid var(--color-error); color: var(--color-error); white-space: nowrap; ${state.currentPhotoIndex === 0 ? 'opacity: 0.4; cursor: not-allowed;' : ''}">
                      ↺ Undo
                    </button>
                  </div>
                `}
              </div>
            ` : ''}

            <!-- Continue Button OR Use This/Regenerate Buttons -->
            ${(() => {
              const hasAI = state.config?.features?.aiCustom;
              const hasCustom = state.config?.features?.customBackground;
              const isAIMode = state.aiCustomSelected && ((hasAI && !hasCustom) || (hasAI && state.customMode === 'ai'));
              const aiImageGenerated = isAIMode && state.aiGeneratedImages[state.currentPhotoIndex];

              // If AI image is generated, show "Use This", "Regenerate", and "Try Different Prompt" buttons
              if (aiImageGenerated) {
                return `
                  <div style="display: flex; flex-direction: column; gap: 12px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                      <button class="btn btn--outline" id="regenerateMainBtn" style="height: 85px; font-size: 18px; font-weight: bold; border: 3px solid var(--color-primary); box-shadow: var(--shadow-lg);">
                        🔄 Regenerate
                      </button>
                      <button class="btn btn--gradient-success btn--large" id="useThisMainBtn" style="height: 85px; font-size: 18px; font-weight: bold; box-shadow: var(--shadow-lg);">
                        ✓ Use This
                      </button>
                    </div>
                    <button class="btn btn--outline" id="tryDifferentPromptMainBtn" style="height: 50px; font-size: 14px; font-weight: 600; border: 2px solid var(--color-gray-400); color: var(--color-gray-700); background: white;">
                      ← Try Different Prompt
                    </button>
                  </div>
                `;
              }

              // Otherwise, show the regular Continue button
              return `
                <button class="btn btn--gradient-success btn--large" id="nextBtn" ${!currentBackgroundId || state.isGenerating ? 'disabled' : ''}
                        style="width: 100%; height: 85px; font-size: 18px; font-weight: bold; box-shadow: var(--shadow-lg); ${state.isGenerating ? 'opacity: 0.7; cursor: wait;' : ''}">
                  ${(() => {
                    // Show loading state if currently generating
                    if (state.isGenerating) {
                      return '⏳ GENERATING...';
                    }

                    if (isAIMode) {
                      // AI mode - show Generate text
                      if (!state.useSameBackground && state.photoQuantity > 1 && state.currentPhotoIndex < state.photoQuantity - 1) {
                        return '✨ GENERATE NEXT PHOTO →';
                      } else {
                        return allBackgroundsSelected ? '✨ GENERATE & CONTINUE →' : 'ENTER PROMPT';
                      }
                    } else {
                      // Regular or manual custom mode
                      if (!state.useSameBackground && state.photoQuantity > 1 && state.currentPhotoIndex < state.photoQuantity - 1) {
                        return 'NEXT PHOTO →';
                      } else {
                        return allBackgroundsSelected ? 'CONTINUE →' : 'SELECT BACKGROUND';
                      }
                    }
                  })()}
                </button>
              `;
            })()}
          </div>
        </div>
      </main>

      ${createProgressBar(2, state.totalSteps)}
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
        <h1 style="font-size: 36px; font-weight: 900; margin-bottom: 24px; text-align: center; color: var(--color-gray-900);">How many people?</h1>

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

      ${createProgressBar(3, state.totalSteps)}
    </div>
  `;
}

// ============================================
// SCREEN 5: DELIVERY METHOD - REDESIGNED
// ============================================
function createDeliveryScreen() {
  const config = state.config;
  const isFree = config?.features?.freeMode === true || config?.features?.freeMode === 1;

  // Check which delivery methods are enabled
  const printsEnabled = config?.features?.prints === true || config?.features?.prints === 1;
  const emailEnabled = config?.features?.email === true || config?.features?.email === 1;

  // Auto-select if only one option is available
  if (printsEnabled && !emailEnabled && !state.deliveryMethod) {
    state.deliveryMethod = 'print';
  } else if (!printsEnabled && emailEnabled && !state.deliveryMethod) {
    state.deliveryMethod = 'email';
  }

  // Calculate pricing ranges for display (MO6) - MULTIPLY print prices by photo quantity
  const basePrintMin = isFree ? 0 : (config?.printPricing?.[1] || 10);
  const basePrintMax = isFree ? 0 : (config?.printPricing?.[8] || 45);
  const printMin = basePrintMin * state.photoQuantity;
  const printMax = basePrintMax * state.photoQuantity;
  const emailBase = isFree ? 0 : (config?.emailPricing?.[1] || 10);
  const emailMax = isFree ? 0 : (emailBase + 7); // Base + 7 additional emails (max 8 total) (email doesn't multiply)
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
        <h1 style="font-size: 36px; font-weight: 900; margin-bottom: 24px; text-align: center; color: var(--color-gray-900);">How would you like your photos?</h1>

        <div style="display: grid; grid-template-columns: repeat(${(printsEnabled && emailEnabled) ? 3 : ((printsEnabled || emailEnabled) ? 1 : 2)}, 1fr); gap: 20px; width: 100%; max-width: 1200px; margin-bottom: 20px;">
          ${printsEnabled ? `
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
          ` : ''}

          ${emailEnabled ? `
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
          ` : ''}

          ${(printsEnabled && emailEnabled) ? `
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
          ` : ''}
        </div>

        <!-- Continue Button -->
        <button class="btn btn--gradient-primary btn--large" id="nextBtn" ${!state.deliveryMethod ? 'disabled' : ''}
                style="width: 100%; max-width: 600px; height: 64px; font-size: 19px; font-weight: bold; box-shadow: var(--shadow-lg);">
          CONTINUE →
        </button>
      </main>

      ${createProgressBar(4, state.totalSteps)}
    </div>
  `;
}

// ============================================
// SCREEN 6: QUANTITY SELECTION - REDESIGNED
// ============================================
function createQuantityScreen() {
  const config = state.config;
  const isFree = config?.features?.freeMode === true || config?.features?.freeMode === 1;
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
          <h1 style="font-size: 36px; font-weight: 900; margin-bottom: 24px; text-align: center; color: var(--color-gray-900);">How many prints?</h1>
          ${state.photoQuantity > 1 ? `
            <div style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); border-radius: 12px; padding: 20px; margin-bottom: 20px; text-align: center; max-width: 900px; width: 100%;">
              <div style="font-size: 22px; font-weight: 700; color: var(--color-gray-800); margin-bottom: 8px;">
                📸 You're taking <span style="color: var(--color-primary); font-weight: 900;">${state.photoQuantity} photos</span>
              </div>
              <div style="font-size: 18px; font-weight: 600; color: var(--color-gray-600);">
                ${isFree ? 'Select your quantity' : `Prices shown below will be multiplied by ${state.photoQuantity}`}
              </div>
            </div>
          ` : ''}

          <!-- Quantity Grid (With Value Indicators) -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; width: 100%; max-width: 900px; margin-bottom: 20px;">
            ${[1,2,3,4,5,6,7,8].map((num) => {
              const basePriceForQty = isFree ? 0 : (config?.printPricing?.[num] || (10 + (num-1) * 5));
              const price = isFree ? 0 : (basePriceForQty * state.photoQuantity);
              const perPrintPrice = isFree ? '0.00' : (basePriceForQty / num).toFixed(2);
              const isSelected = state.printQuantity === num;
              const basePrice = isFree ? 0 : (config?.printPricing?.[1] || 10);
              const savings = isFree ? '0.00' : ((basePrice * num * state.photoQuantity) - price).toFixed(2);
              const isBestValue = !isFree && num >= 5; // 5+ prints is best value (but not in free mode)

              return `
                <button class="quantity-btn" data-quantity="${num}" data-type="print"
                        style="position: relative; height: ${state.photoQuantity > 1 ? '170px' : '140px'}; border-radius: 12px; border: 4px solid ${isSelected ? 'var(--color-success)' : 'var(--color-border)'};
                        background: ${isSelected ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'white'}; padding: 16px; cursor: pointer; transition: all 0.2s;
                        box-shadow: ${isSelected ? '0 0 0 6px rgba(16,185,129,0.3), var(--shadow-xl)' : 'var(--shadow-md)'};
                        display: flex; flex-direction: column; align-items: center; justify-content: center;">
                  ${isBestValue ? '<div style="position: absolute; top: -8px; left: 50%; transform: translateX(-50%); background: var(--color-accent); color: white; padding: 4px 12px; border-radius: 12px; font-size: 10px; font-weight: bold; box-shadow: var(--shadow-md); white-space: nowrap;">SAVE $' + savings + '</div>' : ''}
                  <div style="font-size: 48px; font-weight: bold; line-height: 1; color: ${isSelected ? 'white' : 'var(--color-gray-900)'}; margin-bottom: 8px; text-shadow: ${isSelected ? '0 2px 8px rgba(0,0,0,0.3)' : 'none'};">${num}</div>
                  <div style="width: 60%; height: 2px; background: ${isSelected ? 'rgba(255,255,255,0.5)' : 'var(--color-border)'}; margin-bottom: 8px;"></div>
                  <div style="font-size: 28px; font-weight: 900; color: ${isSelected ? 'white' : 'var(--color-success)'}; line-height: 1; margin-bottom: 4px; text-shadow: ${isSelected ? '0 2px 10px rgba(0,0,0,0.4)' : 'none'};">$${(typeof price === 'number' ? price : 0).toFixed(2)}</div>
                  <div style="font-size: 12px; font-weight: 600; color: ${isSelected ? 'white' : 'var(--color-gray-500)'}; text-shadow: ${isSelected ? '0 1px 4px rgba(0,0,0,0.3)' : 'none'};">$${perPrintPrice} each</div>
                  ${state.photoQuantity > 1 ? `
                    <div style="font-size: 11px; font-weight: 800; color: ${isSelected ? 'white' : 'var(--color-gray-400)'}; margin-top: 6px; text-align: center; line-height: 1.2; text-shadow: ${isSelected ? '0 1px 4px rgba(0,0,0,0.4)' : 'none'};">
                      $${(typeof basePriceForQty === 'number' ? basePriceForQty : 0).toFixed(2)} × ${state.photoQuantity} photos
                    </div>
                  ` : ''}
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

        ${createProgressBar(5, state.totalSteps)}
        ${createPricePreviewBadge()}
      </div>
    `;
  }

  // Email-only delivery - this screen should never be shown in normal flow
  // The goBack() function now skips this screen for email-only delivery
  return `
    <div class="screen">
      <main class="screen__body" style="display: flex; align-items: center; justify-content: center; min-height: 60vh;">
        <div style="text-align: center;">
          <div style="font-size: 48px; margin-bottom: 20px;">📧</div>
          <h1 style="font-size: 28px; font-weight: bold;">Email delivery selected</h1>
          <p style="font-size: 16px; color: var(--color-gray-600); margin-top: 12px;">No print quantity needed</p>
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
  const isFree = config?.features?.freeMode === true || config?.features?.freeMode === 1;
  const maxEmails = 8;
  const canAddMore = state.emailAddresses.length < maxEmails;

  // SIMPLIFIED: Email pricing is per recipient (base + $1 per additional)
  const baseEmailPrice = isFree ? 0 : (config?.emailPricing?.[1] || 10);
  const emailCount = state.emailAddresses.length;
  const emailOnlyPrice = isFree ? 0 : (emailCount > 0 ? baseEmailPrice + (emailCount - 1) : 0);

  // Calculate total including print cost if delivery is 'both'
  const basePrintPrice = isFree ? 0 : (state.deliveryMethod === 'both' && state.printQuantity > 0 ? (config?.printPricing?.[state.printQuantity] || 0) : 0);
  const printPrice = basePrintPrice * state.photoQuantity;
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
        <div style="display: grid; grid-template-rows: 1fr auto auto; gap: 12px; min-height: 0;">
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
          </div>

          <!-- Add Email Button (FIXED POSITION above keyboard) -->
          <div style="padding: 0 8px;">
            ${canAddMore ? `
              <button class="btn btn--outline" id="addEmailBtn" style="width: 100%; height: 50px; font-size: 16px; font-weight: 700;">
                + ADD ANOTHER EMAIL ${isFree ? '' : '(+$1)'}
              </button>
            ` : `
              <div style="text-align: center; color: var(--color-warning); font-size: 14px; padding: 10px; background: rgba(255,193,7,0.15); border-radius: 8px; font-weight: 700;">
                Maximum ${maxEmails} email addresses
              </div>
            `}
          </div>

          <!-- Keyboard (FIXED IN REMAINING SPACE) -->
          <div style="display: flex; flex-direction: column; min-height: 0;">
            ${createKeyboard(state.focusedInputId || state.emailAddresses[0]?.id || 'email-0', true)}
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
                  <span style="font-size: 20px;">${state.printQuantity} Print${state.printQuantity > 1 ? 's' : ''}${state.photoQuantity > 1 ? ` × ${state.photoQuantity} photos` : ''}</span>
                  <span style="font-size: 22px; font-weight: bold;">$${printPrice.toFixed(2)}</span>
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
                  <span style="font-size: 22px; font-weight: bold;">+$${isFree ? '0.00' : (state.emailAddresses.length - 1).toFixed(2)}</span>
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

      ${createProgressBar(7, state.totalSteps)}
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

      ${createProgressBar(8, state.totalSteps)}
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

  const isFree = state.config?.features?.freeMode === true || state.config?.features?.freeMode === 1;

  // Calculate component prices for display - printPrice INCLUDES photo quantity multiplier
  const basePrintPrice = isFree ? 0 : (state.printQuantity > 0 ? (state.config?.printPricing?.[state.printQuantity] || 0) : 0);
  const printPrice = isFree ? 0 : (basePrintPrice * state.photoQuantity);
  const emailCount = state.emailAddresses.filter(e => e.value && e.value.trim()).length;
  const baseEmailPrice = isFree ? 0 : (state.config?.emailPricing?.[1] || 10);
  const emailPrice = isFree ? 0 : (emailCount > 0 ? baseEmailPrice + (emailCount - 1) : 0);

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
            <!-- Photo Quantity -->
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px; background: var(--color-gray-50); border-radius: 12px;">
              <div style="flex: 1;">
                <div style="font-size: 20px; font-weight: 700; color: var(--color-gray-800); margin-bottom: 6px;">Photos</div>
                <div style="font-size: 18px; color: var(--color-gray-600);">${state.photoQuantity} photo${state.photoQuantity > 1 ? 's' : ''}</div>
              </div>
              <button class="btn btn--outline btn--small edit-btn" data-screen="photoQuantity" style="font-size: 16px; padding: 10px 20px; min-height: 50px;">Edit</button>
            </div>

            <!-- Background(s) -->
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px; background: var(--color-gray-50); border-radius: 12px;">
              <div style="flex: 1;">
                <div style="font-size: 20px; font-weight: 700; color: var(--color-gray-800); margin-bottom: 6px;">Background${state.photoQuantity > 1 && !state.useSameBackground ? 's' : ''}</div>
                ${(() => {
                  // For single photo or "use same background"
                  if (state.useSameBackground || state.photoQuantity === 1) {
                    const validPrompts = state.aiPrompts.filter(p => p && p.trim());
                    if (validPrompts.length > 0) {
                      const bgName = state.selectedBackground === 'ai-custom' ? '✨ AI Custom' : '👤 Manual Custom';
                      return `<div style="font-size: 18px; color: var(--color-gray-600);">${bgName}: "${validPrompts[0].substring(0, 50)}${validPrompts[0].length > 50 ? '...' : ''}"</div>`;
                    }
                    return `<div style="font-size: 18px; color: var(--color-gray-600);">${state.backgroundName || 'Not selected'}</div>`;
                  }

                  // Multi-photo with different backgrounds - need to categorize each
                  const regularBgs = [];
                  const manualCustom = [];
                  const aiCustom = [];

                  state.selectedBackgrounds.forEach((bg, i) => {
                    if (bg.id === 'ai-custom') {
                      aiCustom.push(i + 1);
                    } else if (bg.id === 'custom') {
                      manualCustom.push(i + 1);
                    } else {
                      regularBgs.push(bg.name);
                    }
                  });

                  const parts = [];

                  // Regular backgrounds
                  if (regularBgs.length > 0) {
                    const bgCounts = {};
                    regularBgs.forEach(name => {
                      bgCounts[name] = (bgCounts[name] || 0) + 1;
                    });
                    const bgList = Object.entries(bgCounts)
                      .map(([name, count]) => count > 1 ? `${name} ×${count}` : name)
                      .join(', ');
                    parts.push(bgList);
                  }

                  // Manual custom
                  if (manualCustom.length > 0) {
                    parts.push(`👤 Manual Custom (${manualCustom.length} photo${manualCustom.length > 1 ? 's' : ''})`);
                  }

                  // AI custom
                  if (aiCustom.length > 0) {
                    parts.push(`✨ AI Custom (${aiCustom.length} photo${aiCustom.length > 1 ? 's' : ''})`);
                  }

                  return `<div style="font-size: 16px; color: var(--color-gray-600);">${parts.join(', ')}</div>`;
                })()}
              </div>
              <button class="btn btn--outline btn--small edit-btn" data-screen="background" style="font-size: 16px; padding: 10px 20px; min-height: 50px;">Edit</button>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px; background: var(--color-gray-50); border-radius: 12px;">
              <div style="flex: 1;">
                <div style="font-size: 20px; font-weight: 700; color: var(--color-gray-800); margin-bottom: 6px;">Party Size</div>
                <div style="font-size: 18px; color: var(--color-gray-600);">${state.partySize >= 10 ? '10+' : state.partySize} ${state.partySize === 1 ? 'person' : 'people'}</div>
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
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px; background: var(--color-gray-50); border-radius: 12px;">
                <div style="flex: 1;">
                  <div style="font-size: 20px; font-weight: 700; color: var(--color-gray-800); margin-bottom: 6px;">Prints</div>
                  <div style="font-size: 18px; color: var(--color-gray-600);">${state.printQuantity} ${state.printQuantity === 1 ? 'copy' : 'copies'}${state.photoQuantity > 1 ? ` × ${state.photoQuantity} photos` : ''} • $${printPrice.toFixed(2)}</div>
                </div>
                <button class="btn btn--outline btn--small edit-btn" data-screen="quantity" style="font-size: 16px; padding: 10px 20px; min-height: 50px;">Edit</button>
              </div>
            ` : ''}

            ${emailCount > 0 ? `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px; background: var(--color-gray-50); border-radius: 12px;">
                <div style="flex: 1;">
                  <div style="font-size: 20px; font-weight: 700; color: var(--color-gray-800); margin-bottom: 6px;">Emails</div>
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

          ${state.customerPhoto ? `
            <!-- Photo Preview -->
            <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: var(--shadow-md); text-align: center;">
              <div style="font-size: 16px; font-weight: 700; color: var(--color-gray-800); margin-bottom: 12px;">Your Photo</div>
              <div style="display: flex; justify-content: center; margin-bottom: 12px;">
                <img src="${state.customerPhoto}" alt="Customer photo" style="max-width: 100%; max-height: 250px; border-radius: 8px; box-shadow: var(--shadow-sm);">
              </div>
              <button class="btn btn--outline btn--small edit-btn" data-screen="photo" style="font-size: 14px; padding: 8px 16px; width: 100%;">Retake Photo</button>
            </div>
          ` : ''}

          ${(state.deliveryMethod === 'email' || state.deliveryMethod === 'both') ? `
            <!-- Marketing Opt-in Checkbox -->
            <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: var(--shadow-md);">
              <label style="display: flex; align-items: flex-start; cursor: pointer; gap: 12px;">
                <input
                  type="checkbox"
                  id="marketingOptIn"
                  ${state.marketingOptIn ? 'checked' : ''}
                  style="width: 24px; height: 24px; min-width: 24px; cursor: pointer; margin-top: 2px;"
                >
                <span style="font-size: 15px; color: var(--color-gray-700); line-height: 1.5; font-weight: 500;">
                  I'd like to receive marketing emails about upcoming events and special offers
                </span>
              </label>
            </div>
          ` : ''}
        </div>
      </main>

      ${createProgressBar(10, state.totalSteps)}
      ${createPricePreviewBadge()}
    </div>
  `;
}

// ============================================
// SCREEN 11: PAYMENT METHOD - REDESIGNED
// ============================================
function createPaymentScreen() {
  const config = state.config;

  // Ensure totalPrice is up to date
  state.totalPrice = calculateCurrentPrice();

  // Filter payment methods by config (D5) + NEW DIGITAL OPTIONS
  const paymentMethods = [
    { id: 'cash', label: 'CASH', emoji: '💵', enabled: config?.features?.cash === true },
    { id: 'debit', label: 'DEBIT CARD', emoji: '💳', enabled: config?.features?.debitCard === true },
    { id: 'credit', label: 'CREDIT CARD', emoji: '💳', enabled: config?.features?.creditCard === true },
    { id: 'venmo', label: 'VENMO', emoji: '💸', enabled: config?.features?.venmo === true },
    { id: 'zelle', label: 'ZELLE', emoji: '⚡', enabled: config?.features?.zelle === true },
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

      ${createProgressBar(11, state.totalSteps)}
    </div>
  `;
}

// ============================================
// SCREEN 9: CUSTOMER ID PHOTO - REDESIGNED
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

      ${createProgressBar(9, state.totalSteps)}
    </div>
  `;
}

// ============================================
// SCREEN 9B: PHOTO CONFIRMATION - NEW (C5)
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

      ${createProgressBar(9, state.totalSteps)}
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

      // Attach event listeners to the dynamically created buttons
      setTimeout(() => {
        const retryBtn = document.getElementById('retryCamera');
        const skipBtn = document.getElementById('skipCamera');

        if (retryBtn) {
          retryBtn.addEventListener('click', () => {
            render(); // Re-render photo screen to retry camera
          });
        }

        if (skipBtn) {
          skipBtn.addEventListener('click', () => {
            state.customerPhoto = null;
            stopWebcam();
            navigateTo('review');
          });
        }
      }, 100);
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
    <style>
      @media print {
        .no-print {
          display: none !important;
        }
      }
    </style>
    <div class="screen" style="background: var(--color-gray-100); overflow: hidden;">
      <main style="display: flex; flex-direction: column; height: 100vh; padding: 8px; overflow: hidden;">
        <div class="no-print" style="text-align: center; margin-bottom: 8px;">
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
                  <div><strong>Party:</strong> ${state.partySize >= 10 ? '10+' : state.partySize}</div>
                  <div><strong>Date:</strong> ${date}</div>
                  <div><strong>Time:</strong> ${time}</div>
                </div>

                ${!state.useSameBackground && state.photoQuantity > 1 ? `
                  <div style="font-size: 10px; padding: 6px; background: #f0f0f0; border: 1px solid #000; margin-bottom: 8px; text-align: center; font-weight: bold;">
                    PHOTOS: ${state.photoQuantity} | Different BGs
                  </div>
                ` : ''}

                <div style="border-top: 1px solid #000; padding-top: 8px; margin-bottom: 8px;">
                  <div style="font-weight: bold; margin-bottom: 4px;">ORDER:</div>
                  <div>• ${state.photoQuantity} Photo${state.photoQuantity > 1 ? 's' : ''}</div>
                  ${(() => {
                    // For single photo or "use same background"
                    if (state.useSameBackground || state.photoQuantity === 1) {
                      return `<div>• BG: ${state.backgroundName || 'None'}</div>`;
                    }

                    // Multi-photo with different backgrounds - categorize
                    const regularBgs = [];
                    let manualCustomCount = 0;
                    let aiCustomCount = 0;

                    state.selectedBackgrounds.forEach(bg => {
                      if (bg.id === 'ai-custom') {
                        aiCustomCount++;
                      } else if (bg.id === 'custom') {
                        manualCustomCount++;
                      } else {
                        regularBgs.push(bg.name);
                      }
                    });

                    const parts = [];

                    // Regular backgrounds
                    if (regularBgs.length > 0) {
                      const bgCounts = {};
                      regularBgs.forEach(name => {
                        bgCounts[name] = (bgCounts[name] || 0) + 1;
                      });
                      const bgList = Object.entries(bgCounts)
                        .map(([name, count]) => count > 1 ? `${name} ×${count}` : name)
                        .join(', ');
                      parts.push(bgList);
                    }

                    // Custom counts
                    if (manualCustomCount > 0) {
                      parts.push(`Manual Custom ×${manualCustomCount}`);
                    }
                    if (aiCustomCount > 0) {
                      parts.push(`AI Custom ×${aiCustomCount}`);
                    }

                    return `<div>• BG: ${parts.join(', ')}</div>`;
                  })()}
                  ${state.printQuantity > 0 ? `<div>• ${state.printQuantity} Print${state.printQuantity > 1 ? 's' : ''}</div>` : ''}
                  ${state.emailAddresses.length > 0 ? `<div>• ${state.emailAddresses.length} Email${state.emailAddresses.length > 1 ? 's' : ''}</div>` : ''}
                  <div>• ${state.paymentMethod?.toUpperCase()}</div>
                  <div style="font-weight: bold; margin-top: 4px;">TOTAL: $${state.totalPrice.toFixed(2)}</div>
                </div>

                <!-- QR Code for Order Status (Mobile-Friendly) -->
                <div style="text-align: center; margin: 8px 0; padding: 8px; background: white; border: 2px solid #000;">
                  <div style="font-weight: bold; font-size: 10px; margin-bottom: 6px;">SCAN TO CHECK ORDER STATUS</div>
                  <div style="width: 80px; height: 80px; margin: 0 auto; background: white; display: flex; align-items: center; justify-content: center; border: 2px solid #000;">
                    <svg viewBox="0 0 29 29" style="width: 100%; height: 100%;">
                      <rect width="29" height="29" fill="white"/>
                      <path d="M0,0h7v7h-7zM8,0h1v1h1v1h-1v1h-1v-1h-1v1h-1v-2h2zM10,0h3v1h-1v1h-1v1h-1zM16,0h1v3h1v-1h1v-1h3v1h-1v1h-1v1h1v1h1v-1h1v2h-1v1h1v1h1v-1h1v-2h1v-3h1v7h-1v-1h-2v2h-1v-1h-1v-1h-1v1h-1v1h1v2h-1v1h-1v-2h-1v-1h-1v1h-1v-1h-1v1h-1v1h1v1h-1v1h-2v-1h-1v1h-1v-1h-1v-1h1v-1h-1v-1h2v-1h1v-1h1v-1h-2v-1h1v-1h-1v-1h1v-1h2v-2h2v-1h1v-1h-3v-1h-1v-1h1v-1h-1v-1h1v-1h2v1h1v-2h-2v-1h-1v-1h-1v-1h-1v-2h2v1h1v-1h2v-1h-2v-2h1v-1h-1v-1h-1v2h-1v1h-1v-1h-1v1h-1v-1h-2v-1h1v-1h-1v-1h1v-1h1zM14,1h1v1h-1zM22,0h7v7h-7zM1,1v5h5v-5zM9,2h1v1h-1zM11,2v1h-1v1h1v-1h1v-1zM15,2h1v1h-1zM23,1v5h5v-5zM2,2h3v3h-3zM18,2h1v2h-1zM24,2h3v3h-3zM10,4h1v2h-1v1h-1v-1h1zM16,4v1h-1v1h1v1h-2v-1h-1v1h-1v-1h-1v-1h3v-1zM19,5h1v1h-1zM8,6h1v1h-1zM20,6h1v2h-1zM5,7h2v1h1v1h-1v1h-1v-1h-2v1h-1v-1h-1v-1h2v-1h1zM13,7h2v2h-1v-1h-1zM9,8h1v1h-1zM0,9h1v1h1v1h1v1h-2v1h1v1h-1v2h1v-1h1v1h-1v1h-2v-3h1v-2h-1zM14,9h1v1h2v1h-2v1h-1v1h1v1h-1v1h-2v-1h-1v1h-1v-1h-1v-1h1v-1h-1v-1h3v1h1v-1h1zM18,9h1v1h1v-1h1v1h-1v2h1v-1h2v2h-1v-1h-1v3h-1v-2h-1v-1h-1v-1h1v-1h-1zM4,10h2v1h-2zM22,10v1h1v1h-1v1h-1v1h1v-1h1v3h-1v1h-1v-3h-1v-1h1v-2h-2v-1zM6,11h1v1h-1zM25,11h1v1h-1zM26,12h1v2h-1zM8,13h1v1h1v1h-2zM24,13h1v2h-1v1h-1v-1h1v-1h-1zM17,14h2v1h-2zM27,14h2v1h-2zM11,15h1v1h-1zM16,15h1v1h-1zM4,16h1v2h1v-1h1v-1h2v1h-1v1h-1v1h1v1h-1v1h-2v-1h-1v-1h1v-1h-1zM20,16h1v1h-1zM26,16h1v1h-1zM9,17h1v1h-1zM15,17h1v1h1v-1h1v1h-1v1h-1v1h-1v-1h1zM28,17h1v2h-1zM19,18h1v1h1v-1h3v1h-1v1h-1v-1h-2v1h-1v1h1v1h-2v-1h1v-1h-1v-1h1zM25,18h1v1h1v2h-1v-1h-1zM10,19h2v1h-1v1h-1zM27,19h1v2h-1zM13,20h2v1h-1v1h-1zM23,20h1v1h-1zM9,21h1v1h-1zM0,22h7v7h-7zM16,22h1v1h-1zM18,22h1v2h-1zM20,22h2v1h-2zM24,22h1v1h-1zM1,23v5h5v-5zM11,23h1v1h-1zM26,23h1v1h-1zM2,24h3v3h-3zM10,24h1v2h-1zM13,24h2v1h1v1h-1v1h-1v1h-1v-1h-1v-1h1zM21,24h1v1h-1zM23,24h2v1h1v1h-3v1h2v1h-3v1h4v-2h1v-1h-1v-1h1v-1h-1v-1h-3zM8,25h1v1h-1zM17,25v1h1v1h-2v-1h1zM20,25h1v3h-1zM28,25h1v4h-1zM9,26v1h-1v1h2v-2zM11,27h1v1h-1zM16,27h1v1h-1zM22,27h1v1h-1zM25,28h2v1h-2z" fill="black"/>
                    </svg>
                  </div>
                  <div style="font-size: 8px; margin-top: 4px; color: #666;">ID: ${state.customerNumber}</div>
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
                    ${(() => {
                      const promptEntries = state.aiPrompts
                        .map((prompt, index) => ({ prompt, index }))
                        .filter(entry => entry.prompt && entry.prompt.trim());

                      if (promptEntries.length > 0) {
                        // Separate prompts into manual and AI
                        const manualPrompts = [];
                        const aiPrompts = [];

                        promptEntries.forEach(entry => {
                          const bg = state.selectedBackgrounds[entry.index];
                          const isAI = bg && bg.id === 'ai-custom';
                          const photoInfo = { photoNum: entry.index + 1, prompt: entry.prompt };

                          if (isAI) {
                            aiPrompts.push(photoInfo);
                          } else {
                            manualPrompts.push(photoInfo);
                          }
                        });

                        let html = '';

                        // Manual Custom box (if any)
                        if (manualPrompts.length > 0) {
                          html += `<div style="font-size: 8px; margin-top: 4px; padding: 4px; background: #fffacd; border: 1px solid #000;">
                            <strong>MANUAL CUSTOM:</strong><br>
                            ${manualPrompts.map(p => `Photo ${p.photoNum}: ${p.prompt}`).join('<br>')}
                          </div>`;
                        }

                        // AI Custom box (if any)
                        if (aiPrompts.length > 0) {
                          html += `<div style="font-size: 8px; margin-top: 4px; padding: 4px; background: #e6f3ff; border: 1px solid #000;">
                            <strong>AI CUSTOM:</strong><br>
                            ${aiPrompts.map(p => `Photo ${p.photoNum}: ${p.prompt}`).join('<br>')}
                          </div>`;
                        }

                        return html;
                      }
                      return '';
                    })()}
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
              <div style="font-family: monospace; font-size: 8px;">
                BG#${state.selectedBackground === 'custom' || state.selectedBackground === 'ai-custom' || state.selectedBackground === 'mixed-custom' ? 'CUSTOM' : state.selectedBackground}: ${state.backgroundName}
                ${(() => {
                  // Show per-photo backgrounds summary if multiple different backgrounds
                  if (!state.useSameBackground && state.photoQuantity > 1 && state.selectedBackgrounds.length > 1) {
                    // Count regular backgrounds
                    const regularBgs = [];
                    let manualCustomCount = 0;
                    let aiCustomCount = 0;

                    state.selectedBackgrounds.forEach((bg, index) => {
                      if (bg.id === 'custom') {
                        manualCustomCount++;
                      } else if (bg.id === 'ai-custom') {
                        aiCustomCount++;
                      } else {
                        regularBgs.push(bg.name);
                      }
                    });

                    const parts = [];

                    // Regular backgrounds with counts
                    if (regularBgs.length > 0) {
                      const bgCounts = {};
                      regularBgs.forEach(name => {
                        bgCounts[name] = (bgCounts[name] || 0) + 1;
                      });
                      const bgList = Object.entries(bgCounts)
                        .map(([name, count]) => count > 1 ? `${name} ×${count}` : name)
                        .join(', ');
                      parts.push(bgList);
                    }

                    // Custom counts
                    if (manualCustomCount > 0) {
                      parts.push(`Manual Custom ×${manualCustomCount}`);
                    }
                    if (aiCustomCount > 0) {
                      parts.push(`AI Custom ×${aiCustomCount}`);
                    }

                    return '<br>' + parts.join(', ');
                  }
                  return '';
                })()}
              </div>
              <div style="font-family: monospace; font-size: 8px;">Party: ${state.partySize >= 10 ? '10+' : state.partySize} | $${state.totalPrice.toFixed(2)} | ${state.printQuantity}P ${state.emailAddresses.length}E</div>
              <div style="font-family: monospace; font-size: 8px;">${date} ${time}</div>
            </div>

            ${state.emailAddresses.length > 0 ? `
              <div style="border: 1px solid #000; padding: 6px; margin-bottom: 8px; font-size: 8px; background: white;">
                <div style="font-weight: bold; margin-bottom: 4px;">Emails:</div>
                ${(() => {
                  // Split into two columns if more than 4 emails
                  if (state.emailAddresses.length > 4) {
                    const midpoint = Math.ceil(state.emailAddresses.length / 2);
                    const leftColumn = state.emailAddresses.slice(0, midpoint);
                    const rightColumn = state.emailAddresses.slice(midpoint);

                    return `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                      <div>${leftColumn.map((emailObj, i) => `<div>${i + 1}. ${emailObj.value || '(blank)'}</div>`).join('')}</div>
                      <div>${rightColumn.map((emailObj, i) => `<div>${midpoint + i + 1}. ${emailObj.value || '(blank)'}</div>`).join('')}</div>
                    </div>`;
                  } else {
                    return state.emailAddresses.map((emailObj, i) => `<div>${i + 1}. ${emailObj.value || '(blank)'}</div>`).join('');
                  }
                })()}
              </div>
            ` : ''}

            <div style="border: 2px solid #000; padding: 12px; margin-bottom: 12px; min-height: 100px; background: white;">
              <div style="font-weight: bold; font-size: 12px; margin-bottom: 10px; text-align: center;">NOTES:</div>
              ${(() => {
                const promptEntries = state.aiPrompts
                  .map((prompt, index) => ({ prompt, index }))
                  .filter(entry => entry.prompt && entry.prompt.trim());

                if (promptEntries.length > 0) {
                  // Separate prompts into manual and AI
                  const manualPrompts = [];
                  const aiPrompts = [];

                  promptEntries.forEach(entry => {
                    const bg = state.selectedBackgrounds[entry.index];
                    const isAI = bg && bg.id === 'ai-custom';
                    const photoInfo = { photoNum: entry.index + 1, prompt: entry.prompt };

                    if (isAI) {
                      aiPrompts.push(photoInfo);
                    } else {
                      manualPrompts.push(photoInfo);
                    }
                  });

                  let html = '';

                  // Manual Custom box (if any)
                  if (manualPrompts.length > 0) {
                    html += `<div style="font-size: 9px; margin-bottom: 8px; padding: 6px; background: #fffacd; border: 1px solid #000;">
                      <strong>MANUAL CUSTOM:</strong><br>
                      ${manualPrompts.map(p => `Photo ${p.photoNum}: ${p.prompt}`).join('<br>')}
                    </div>`;
                  }

                  // AI Custom box (if any)
                  if (aiPrompts.length > 0) {
                    html += `<div style="font-size: 9px; margin-bottom: 8px; padding: 6px; background: #e6f3ff; border: 1px solid #000;">
                      <strong>AI CUSTOM:</strong><br>
                      ${aiPrompts.map(p => `Photo ${p.photoNum}: ${p.prompt}`).join('<br>')}
                    </div>`;
                  }

                  return html;
                }
                return '<div style="height: 70px;"></div>';
              })()}
            </div>

            <!-- QR Code for Operator Dashboard -->
            <div style="text-align: center; padding: 8px; background: white; border: 2px solid #000;">
              <div style="font-weight: bold; font-size: 10px; margin-bottom: 6px;">OPERATOR: SCAN TO VIEW/UPDATE</div>
              <div style="width: 90px; height: 90px; margin: 0 auto; background: white; display: flex; align-items: center; justify-content: center;">
                <svg viewBox="0 0 29 29" style="width: 100%; height: 100%;">
                  <rect width="29" height="29" fill="white"/>
                  <path d="M0,0h7v7h-7zM8,0h1v1h1v1h-1v1h-1v-1h-1v1h-1v-2h2zM10,0h3v1h-1v1h-1v1h-1zM16,0h1v3h1v-1h1v-1h3v1h-1v1h-1v1h1v1h1v-1h1v2h-1v1h1v1h1v-1h1v-2h1v-3h1v7h-1v-1h-2v2h-1v-1h-1v-1h-1v1h-1v1h1v2h-1v1h-1v-2h-1v-1h-1v1h-1v-1h-1v1h-1v1h1v1h-1v1h-2v-1h-1v1h-1v-1h-1v-1h1v-1h-1v-1h2v-1h1v-1h1v-1h-2v-1h1v-1h-1v-1h1v-1h2v-2h2v-1h1v-1h-3v-1h-1v-1h1v-1h-1v-1h1v-1h2v1h1v-2h-2v-1h-1v-1h-1v-1h-1v-2h2v1h1v-1h2v-1h-2v-2h1v-1h-1v-1h-1v2h-1v1h-1v-1h-1v1h-1v-1h-2v-1h1v-1h-1v-1h1v-1h1zM14,1h1v1h-1zM22,0h7v7h-7zM1,1v5h5v-5zM9,2h1v1h-1zM11,2v1h-1v1h1v-1h1v-1zM15,2h1v1h-1zM23,1v5h5v-5zM2,2h3v3h-3zM18,2h1v2h-1zM24,2h3v3h-3zM10,4h1v2h-1v1h-1v-1h1zM16,4v1h-1v1h1v1h-2v-1h-1v1h-1v-1h-1v-1h3v-1zM19,5h1v1h-1zM8,6h1v1h-1zM20,6h1v2h-1zM5,7h2v1h1v1h-1v1h-1v-1h-2v1h-1v-1h-1v-1h2v-1h1zM13,7h2v2h-1v-1h-1zM9,8h1v1h-1zM0,9h1v1h1v1h1v1h-2v1h1v1h-1v2h1v-1h1v1h-1v1h-2v-3h1v-2h-1zM14,9h1v1h2v1h-2v1h-1v1h1v1h-1v1h-2v-1h-1v1h-1v-1h-1v-1h1v-1h-1v-1h3v1h1v-1h1zM18,9h1v1h1v-1h1v1h-1v2h1v-1h2v2h-1v-1h-1v3h-1v-2h-1v-1h-1v-1h1v-1h-1zM4,10h2v1h-2zM22,10v1h1v1h-1v1h-1v1h1v-1h1v3h-1v1h-1v-3h-1v-1h1v-2h-2v-1zM6,11h1v1h-1zM25,11h1v1h-1zM26,12h1v2h-1zM8,13h1v1h1v1h-2zM24,13h1v2h-1v1h-1v-1h1v-1h-1zM17,14h2v1h-2zM27,14h2v1h-2zM11,15h1v1h-1zM16,15h1v1h-1zM4,16h1v2h1v-1h1v-1h2v1h-1v1h-1v1h1v1h-1v1h-2v-1h-1v-1h1v-1h-1zM20,16h1v1h-1zM26,16h1v1h-1zM9,17h1v1h-1zM15,17h1v1h1v-1h1v1h-1v1h-1v1h-1v-1h1zM28,17h1v2h-1zM19,18h1v1h1v-1h3v1h-1v1h-1v-1h-2v1h-1v1h1v1h-2v-1h1v-1h-1v-1h1zM25,18h1v1h1v2h-1v-1h-1zM10,19h2v1h-1v1h-1zM27,19h1v2h-1zM13,20h2v1h-1v1h-1zM23,20h1v1h-1zM9,21h1v1h-1zM0,22h7v7h-7zM16,22h1v1h-1zM18,22h1v2h-1zM20,22h2v1h-2zM24,22h1v1h-1zM1,23v5h5v-5zM11,23h1v1h-1zM26,23h1v1h-1zM2,24h3v3h-3zM10,24h1v2h-1zM13,24h2v1h1v1h-1v1h-1v1h-1v-1h-1v-1h1zM21,24h1v1h-1zM23,24h2v1h1v1h-3v1h2v1h-3v1h4v-2h1v-1h-1v-1h1v-1h-1v-1h-3zM8,25h1v1h-1zM17,25v1h1v1h-2v-1h1zM20,25h1v3h-1zM28,25h1v4h-1zM9,26v1h-1v1h2v-2zM11,27h1v1h-1zM16,27h1v1h-1zM22,27h1v1h-1zM25,28h2v1h-2z" fill="black"/>
                </svg>
              </div>
              <div style="font-size: 8px; margin-top: 4px; color: #666;">localhost:5000/operator<br>Order #${state.customerNumber}</div>
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
        <div class="no-print" style="text-align: center; margin-top: 8px; font-size: 13px; color: var(--color-gray-600);">Auto-return in <span id="countdown">30</span>s</div>
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
    // navigateTo('attract') will reset ALL state automatically
    navigateTo('attract', true);
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
async function render() {
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
    case 'photoQuantity':
      html = createPhotoQuantityScreen();
      break;
    case 'background':
      html = await createBackgroundScreen();
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

  // DISABLED: No state persistence for kiosk mode - each customer starts fresh
  // saveState();
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
      // Clear welcome timer when user interacts
      if (state.welcomeTimer) {
        clearTimeout(state.welcomeTimer);
        state.welcomeTimer = null;
      }
      navigateTo('photoQuantity');
    });

    // Start 30-second timeout timer to return to attract screen
    if (state.welcomeTimer) {
      clearTimeout(state.welcomeTimer);
    }
    state.welcomeTimer = setTimeout(() => {
      navigateTo('attract', true);
    }, 30000); // 30 seconds
  }

  // ==================== BACKGROUND SELECTION ====================
  // Category tabs
  const categoryTabs = document.querySelectorAll('.category-tab');
  categoryTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const category = tab.dataset.category;

      // Check if clicking the Custom tab
      if (category === 'ai-custom') {
        state.aiCustomSelected = true;
        // Clear any regular background selection when switching to custom
        state.selectedBackground = null;

        // Set default mode based on which features are enabled
        const hasCustom = state.config?.features?.customBackground;
        const hasAI = state.config?.features?.aiCustom;
        if (!hasCustom && hasAI) {
          state.customMode = 'ai'; // AI only
        } else if (hasCustom && !hasAI) {
          state.customMode = 'manual'; // Manual only
        }
        // If both enabled, keep current mode (defaults to 'manual' from state init)
      } else {
        state.aiCustomSelected = false;
        state.backgroundCategory = category;
      }

      render(); // Re-render to show new category or custom mode
    });
  });

  // AI Custom textarea input handler
  const aiPromptInput = document.getElementById('aiPromptInput');
  if (aiPromptInput) {
    // Auto-focus on page load
    setTimeout(() => aiPromptInput.focus(), 100);

    aiPromptInput.addEventListener('input', (e) => {
      // Save the current prompt to the appropriate index
      state.aiPrompts[state.currentPhotoIndex] = e.target.value;

      // Don't re-render on every keystroke - just update the preview text directly
      // This prevents losing focus
      const previewArea = document.querySelector('.background-preview-area');
      if (previewArea && state.aiCustomSelected) {
        // Only update if we're showing the custom preview
        const hasAI = state.config?.features?.aiCustom;
        const hasCustom = state.config?.features?.customBackground;
        const isAIMode = (hasAI && !hasCustom) || (hasAI && state.customMode === 'ai');
        const icon = isAIMode ? '✨' : '👤';
        const title = isAIMode ? 'AI Generated Background' : 'Custom Background Request';

        if (e.target.value.trim()) {
          previewArea.innerHTML = `
            <div style="width: 100%; height: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center; text-align: center; padding: 30px; box-shadow: var(--shadow-lg);">
              <div>
                <div style="font-size: 48px; margin-bottom: 16px;">${icon}</div>
                <div style="font-size: 22px; font-weight: bold; color: white; margin-bottom: 12px;">${title}</div>
                <div style="font-size: 16px; color: rgba(255,255,255,0.95); line-height: 1.6; max-width: 500px; margin-bottom: 12px; padding: 16px; background: rgba(0,0,0,0.2); border-radius: 8px;">
                  "${e.target.value}"
                </div>
                <div style="font-size: 13px; color: rgba(255,255,255,0.8); line-height: 1.4;">
                  ${isAIMode ?
                    'Click "Generate & Continue" to create this image automatically and proceed' :
                    'Your custom background will be created by our photographer based on this description'}
                </div>
              </div>
            </div>
          `;
        }
      }

      // Update Continue/Next Photo button state
      const nextBtn = document.getElementById('nextBtn');
      if (nextBtn && state.aiCustomSelected) {
        const hasPrompt = e.target.value && e.target.value.trim();
        const hasAI = state.config?.features?.aiCustom;
        const hasCustom = state.config?.features?.customBackground;
        const isAIMode = (hasAI && !hasCustom) || (hasAI && state.customMode === 'ai');

        if (hasPrompt) {
          nextBtn.disabled = false;
          nextBtn.style.opacity = '1';
          nextBtn.style.cursor = 'pointer';

          // Update button text based on context
          const allBackgroundsSelected = state.useSameBackground ||
            state.selectedBackgrounds.length === state.photoQuantity;

          if (isAIMode) {
            // AI mode text
            if (!state.useSameBackground && state.photoQuantity > 1 && state.currentPhotoIndex < state.photoQuantity - 1) {
              nextBtn.textContent = '✨ GENERATE NEXT PHOTO →';
            } else if (allBackgroundsSelected) {
              nextBtn.textContent = '✨ GENERATE & CONTINUE →';
            }
          } else {
            // Manual custom mode text
            if (!state.useSameBackground && state.photoQuantity > 1 && state.currentPhotoIndex < state.photoQuantity - 1) {
              nextBtn.textContent = 'NEXT PHOTO →';
            } else if (allBackgroundsSelected) {
              nextBtn.textContent = 'CONTINUE →';
            }
          }
        } else {
          nextBtn.disabled = true;
          nextBtn.style.opacity = '0.5';
          nextBtn.style.cursor = 'not-allowed';
          nextBtn.textContent = isAIMode ? 'ENTER PROMPT' : 'SELECT BACKGROUND';
        }
      }
    });
  }

  // Custom mode selector buttons (Manual vs AI)
  const customModeManual = document.getElementById('customModeManual');
  if (customModeManual) {
    customModeManual.addEventListener('click', () => {
      state.customMode = 'manual';
      render();
    });
  }

  const customModeAI = document.getElementById('customModeAI');
  if (customModeAI) {
    customModeAI.addEventListener('click', () => {
      state.customMode = 'ai';
      render();
    });
  }

  // Main action buttons (shown instead of Continue when AI image is generated)
  const regenerateMainBtn = document.getElementById('regenerateMainBtn');
  if (regenerateMainBtn) {
    regenerateMainBtn.addEventListener('click', async () => {
      const prompt = state.aiPrompts[state.currentPhotoIndex];
      if (prompt && prompt.trim()) {
        await generateAIBackground(prompt);
      }
    });
  }

  const useThisMainBtn = document.getElementById('useThisMainBtn');
  if (useThisMainBtn) {
    useThisMainBtn.addEventListener('click', async () => {
      // Set the AI background for this photo
      const hasAI = state.config?.features?.aiCustom;
      const hasCustom = state.config?.features?.customBackground;
      const isAIMode = (hasAI && !hasCustom) || (hasAI && state.customMode === 'ai');

      if (isAIMode) {
        // Store as AI custom background
        if (!state.useSameBackground && state.photoQuantity > 1) {
          state.selectedBackgrounds[state.currentPhotoIndex] = {
            id: 'ai-custom',
            name: 'AI Custom Background',
            category: 'Custom',
            customText: state.aiPrompts[state.currentPhotoIndex]
          };
        } else {
          state.selectedBackground = 'ai-custom';
          state.backgroundName = 'AI Custom Background';
        }

        // Handle multi-photo mode - check if we need to go to next photo
        if (!state.useSameBackground && state.photoQuantity > 1) {
          if (state.currentPhotoIndex < state.photoQuantity - 1) {
            // Move to next photo for background selection
            state.currentPhotoIndex++;
            render();
            return;
          }
        }

        // All photos configured - proceed to party size
        navigateTo('partySize');
      }
    });
  }

  // Try Different Prompt button (main button area)
  const tryDifferentPromptMainBtn = document.getElementById('tryDifferentPromptMainBtn');
  if (tryDifferentPromptMainBtn) {
    tryDifferentPromptMainBtn.addEventListener('click', () => {
      // Clear the generated image and go back to prompt entry
      delete state.aiGeneratedImages[state.currentPhotoIndex];
      render();
    });
  }

  // Generate AI Background button
  const generateAIBtn = document.getElementById('generateAIBackground');
  if (generateAIBtn) {
    generateAIBtn.addEventListener('click', async () => {
      const prompt = state.aiPrompts[state.currentPhotoIndex];
      if (!prompt || !prompt.trim()) return;

      // TODO: Call AI generation API when ready
      await generateAIBackground(prompt);
    });
  }

  // Background selection buttons
  const backgroundBtns = document.querySelectorAll('.background-btn');
  backgroundBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      // Keep ID as string if it's not a pure number (filesystem IDs like "file-0")
      const bgId = id === 'custom' ? 'custom' : (isNaN(parseInt(id)) ? id : parseInt(id));
      const bgName = btn.dataset.name;

      // Handle based on mode
      if (state.useSameBackground) {
        // Single background for all photos - allow deselect
        if (state.selectedBackground === bgId) {
          // Deselect
          state.selectedBackground = null;
          state.backgroundName = '';
        } else {
          // Select
          state.selectedBackground = bgId;
          state.backgroundName = bgName;
        }
      } else {
        // Different background per photo
        const currentBg = state.selectedBackgrounds[state.currentPhotoIndex];

        // Check if clicking same background (deselect)
        if (currentBg && currentBg.id === bgId) {
          // Deselect - remove from array
          state.selectedBackgrounds.splice(state.currentPhotoIndex, 1);
          state.selectedBackground = null;
          state.backgroundName = '';
        } else {
          // Select new background
          const bgData = { id: bgId, name: bgName, category: state.backgroundCategory };
          state.selectedBackgrounds[state.currentPhotoIndex] = bgData;
          state.selectedBackground = bgId;
          state.backgroundName = bgName;
        }
      }

      // Re-render to update UI including undo button, progress bars, etc.
      render();
    });
  });

  // ==================== PHOTO QUANTITY ====================
  const photoQuantityBtns = document.querySelectorAll('.photo-quantity-btn');
  photoQuantityBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const newQuantity = parseInt(btn.dataset.quantity);

      // If quantity changed, reset backgrounds
      if (newQuantity !== state.photoQuantity) {
        state.selectedBackground = null;
        state.selectedBackgrounds = [];
        state.backgroundName = '';
        state.currentPhotoIndex = 0;
      }

      // Update state
      state.photoQuantity = newQuantity;

      // Re-render to update button highlighting and preview text
      render();
    });
  });

  // Clear background button
  const clearBackgroundBtn = document.getElementById('clearBackgroundBtn');
  if (clearBackgroundBtn) {
    clearBackgroundBtn.addEventListener('click', () => {
      // In multi-photo mode, go back to previous photo
      if (!state.useSameBackground && state.photoQuantity > 1) {
        if (state.currentPhotoIndex > 0) {
          // Remove all backgrounds from current index onwards (going backwards)
          state.selectedBackgrounds.splice(state.currentPhotoIndex);

          // Go back to previous photo
          state.currentPhotoIndex--;

          // Remove the background at the previous photo index (unselect it)
          if (state.selectedBackgrounds[state.currentPhotoIndex]) {
            state.selectedBackgrounds.splice(state.currentPhotoIndex, 1);
          }

          // Clear the current selection
          state.selectedBackground = null;
          state.backgroundName = '';
        }
      }
      render();
    });
  }

  // Same background checkbox
  const sameBackgroundCheckbox = document.getElementById('sameBackgroundCheckbox');
  if (sameBackgroundCheckbox) {
    sameBackgroundCheckbox.addEventListener('change', () => {
      state.useSameBackground = sameBackgroundCheckbox.checked;

      // Reset backgrounds if switching modes
      if (state.useSameBackground) {
        // Keep only the first background if we have one selected
        if (state.selectedBackgrounds.length > 0) {
          state.selectedBackground = state.selectedBackgrounds[0].id;
          state.backgroundName = state.selectedBackgrounds[0].name;
        }
        state.selectedBackgrounds = [];
        state.currentPhotoIndex = 0;
      } else {
        // Initialize array for multiple backgrounds
        state.selectedBackgrounds = [];
        state.currentPhotoIndex = 0;
      }

      // Re-render to update preview text
      render();
    });
  }

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
  console.log('[Event Listeners] Found', quantityBtns.length, 'quantity buttons');
  quantityBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const quantity = parseInt(btn.dataset.quantity);
      const type = btn.dataset.type;
      console.log('[Quantity Button Click]', type, quantity);

      // Update state
      if (type === 'print') {
        state.printQuantity = quantity;
        console.log('[State Update] printQuantity set to:', quantity, 'photoQuantity:', state.photoQuantity);
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
            div.style.color = isSelected ? 'white' : 'var(--color-gray-500)';
            div.style.textShadow = isSelected ? '0 1px 4px rgba(0,0,0,0.3)' : 'none';
          }
          // The calculation text (11px font)
          else if (fontSize === 11) {
            div.style.color = isSelected ? 'white' : 'var(--color-gray-400)';
            div.style.textShadow = isSelected ? '0 1px 4px rgba(0,0,0,0.4)' : 'none';
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
    // Track focused input for keyboard targeting
    input.addEventListener('focus', (e) => {
      state.focusedInputId = e.target.id;
    });

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
      // Before adding, save all current input values to state (in case they weren't saved yet)
      const allEmailInputs = document.querySelectorAll('.email-input');
      allEmailInputs.forEach(input => {
        const emailId = input.dataset.emailId;
        const emailObj = state.emailAddresses.find(email => email.id === emailId);
        if (emailObj) {
          emailObj.value = input.value;
        }
      });

      // Now find first empty input in state
      let targetEmailId = null;
      for (let emailObj of state.emailAddresses) {
        if (!emailObj.value || !emailObj.value.trim()) {
          targetEmailId = emailObj.id;
          break;
        }
      }

      // Add new email
      const newEmailId = generateEmailId();
      state.emailAddresses.push({ id: newEmailId, value: '' });

      // If no empty input was found, focus the new one. Otherwise focus the first empty one.
      state.focusedInputId = targetEmailId || newEmailId;

      render();

      // After render, focus the target input
      setTimeout(() => {
        const targetInput = document.getElementById(state.focusedInputId);
        if (targetInput) {
          targetInput.focus();
          targetInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
    setTimeout(() => {
      state.focusedInputId = nameInput.id;
      nameInput.focus();
    }, 100);

    nameInput.addEventListener('focus', (e) => {
      state.focusedInputId = e.target.id;
    });

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
  // Only auto-focus if we haven't already set a specific focus target
  if (!state.focusedInputId) {
    const firstEmailInput = document.getElementById(state.emailAddresses[0]?.id);
    if (firstEmailInput) {
      setTimeout(() => {
        state.focusedInputId = firstEmailInput.id;
        firstEmailInput.focus();
      }, 100);
    }
  } else {
    // We have a specific focus target, focus it
    const targetInput = document.getElementById(state.focusedInputId);
    if (targetInput) {
      setTimeout(() => {
        targetInput.focus();
      }, 100);
    }
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

  // Marketing opt-in checkbox
  const marketingOptInCheckbox = document.getElementById('marketingOptIn');
  if (marketingOptInCheckbox) {
    marketingOptInCheckbox.addEventListener('change', (e) => {
      state.marketingOptIn = e.target.checked;
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

  // Camera retry and skip buttons are now handled directly in startWebcam() error handler

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
      // Advance to review
      navigateTo('review');
    });
  }

  // Skip camera button - also goes to review
  const skipCameraFromError = document.getElementById('skipCamera');
  if (skipCameraFromError) {
    skipCameraFromError.addEventListener('click', () => {
      state.customerPhoto = null;
      stopWebcam();
      navigateTo('review');
    });
  }

  // Old processing code (now unused here but kept for reference)
  if (false) {
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
      // navigateTo('attract') will reset ALL state automatically
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
        // navigateTo('attract') will reset ALL state automatically
        navigateTo('attract', true);
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
    nextBtn.addEventListener('click', async () => {
      // Navigate forward through the flow
      if (state.currentScreen === 'photoQuantity') {
        navigateTo('background');
      } else if (state.currentScreen === 'background') {
        // Set background data for custom mode
        if (state.aiCustomSelected) {
          const hasCustom = state.config?.features?.customBackground;
          const hasAI = state.config?.features?.aiCustom;

          // Determine if AI or manual mode
          const isAIMode = (hasAI && !hasCustom) || (hasAI && state.customMode === 'ai');

          if (isAIMode) {
            state.selectedBackground = 'ai-custom';
            state.backgroundName = 'AI Custom Background';

            // Trigger AI generation for current photo's prompt
            const currentPrompt = state.aiPrompts[state.currentPhotoIndex];
            if (currentPrompt && currentPrompt.trim()) {
              // Check if AI background already generated for this photo
              if (!state.aiGeneratedImages[state.currentPhotoIndex]) {
                // Generate and wait for user to review
                await generateAIBackground(currentPrompt);
                return; // Don't proceed - let user review the generated image
              }
              // If already generated, user clicked "Use This" - proceed normally
            }
          } else {
            state.selectedBackground = 'custom';
            state.backgroundName = 'Custom Background';
          }

          // For multi-photo mode, add to selectedBackgrounds array
          if (!state.useSameBackground && state.photoQuantity > 1) {
            state.selectedBackgrounds[state.currentPhotoIndex] = {
              id: state.selectedBackground,
              name: state.backgroundName,
              category: 'Custom'
            };
          }
        }

        // Handle multi-photo background selection
        if (!state.useSameBackground && state.photoQuantity > 1) {
          // Check if we need to go to next photo
          if (state.currentPhotoIndex < state.photoQuantity - 1) {
            // Move to next photo for background selection
            state.currentPhotoIndex++;
            render(); // Re-render background screen for next photo
            return; // Don't navigate away
          }
        }
        // Continue to party size
        navigateTo('partySize');
      } else if (state.currentScreen === 'partySize') {
        // Check if we need to show delivery screen or skip it
        const printsEnabled = state.config?.features?.prints === true || state.config?.features?.prints === 1;
        const emailEnabled = state.config?.features?.email === true || state.config?.features?.email === 1;

        // If both are enabled, show delivery screen
        if (printsEnabled && emailEnabled) {
          navigateTo('delivery');
        }
        // If only prints enabled, auto-select and skip to quantity
        else if (printsEnabled && !emailEnabled) {
          state.deliveryMethod = 'print';
          navigateTo('quantity');
        }
        // If only email enabled, auto-select and skip to email
        else if (!printsEnabled && emailEnabled) {
          state.deliveryMethod = 'email';
          navigateTo('email');
        }
        // If neither enabled (shouldn't happen), default to delivery screen
        else {
          navigateTo('delivery');
        }
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

        // Skip photo screen if webcam is disabled
        const webcamEnabled = state.config?.features?.webcam !== false;
        if (webcamEnabled) {
          navigateTo('photo');
        } else {
          navigateTo('review');
        }
      } else if (state.currentScreen === 'payment') {
        navigateTo('processing');
      }
    });
  }

  // ==================== AUTO-FOCUS FOR TEXT INPUTS ====================
  // Auto-focus the main input field for screens with keyboards
  setTimeout(() => {
    let inputToFocus = null;

    // Priority order: find the primary input for each screen
    if (state.currentScreen === 'name') {
      inputToFocus = document.getElementById('nameInput');
    } else if (state.currentScreen === 'email') {
      // Focus first email input or first empty one
      const emailInputs = document.querySelectorAll('.email-input');
      if (emailInputs.length > 0) {
        // Find first empty input, or use first input
        inputToFocus = Array.from(emailInputs).find(input => !input.value.trim()) || emailInputs[0];
      }
    } else if (state.currentScreen === 'background' && state.aiCustomSelected) {
      // Already handled in the aiPromptInput event listener setup
      inputToFocus = null;
    }

    if (inputToFocus) {
      inputToFocus.focus();
    }
  }, 100);
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
      // Reset ALL state - no persistence between customers
      Object.assign(state, {
        currentScreen: 'attract',
        currentStep: 1,
        photoQuantity: 1,
        useSameBackground: false,
        currentPhotoIndex: 0,
        selectedBackground: null,
        selectedBackgrounds: [],
        backgroundName: '',
        backgroundCategory: 'Nature',
        backgroundId: null,
        partySize: 1,
        deliveryMethod: null,
        printQuantity: 0,
        emailAddresses: [],
        emailQuantity: 0,
        customerName: '',
        paymentMethod: null,
        visitedSteps: [],
        screenHistory: [],
        customerPhoto: null,
        capturedPhotos: [],
        photoCaptured: false,
        totalPrice: 0,
        reviewedOnce: false,
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

  // Setup config polling (check for updates every 30 seconds)
  setupConfigPolling();

  // DISABLED: No saved state for kiosk mode - always start fresh
  // Clear any existing saved state
  clearSavedState();

  // Initial render - always start at attract screen
  render();
}

/**
 * Poll for config changes every 30 seconds
 * Allows operator to update settings without restarting kiosk
 */
function setupConfigPolling() {
  setInterval(async () => {
    try {
      const newConfig = await loadConfig();

      // Compare configs (simple JSON stringify comparison)
      if (JSON.stringify(newConfig) !== JSON.stringify(state.config)) {
        console.log('[CONFIG] Settings changed, updating...');
        state.config = newConfig;

        // Show toast notification if not on attract screen
        if (state.currentScreen !== 'attract') {
          showConfigUpdateToast();
        }
      }
    } catch (error) {
      console.error('[CONFIG] Error polling for updates:', error);
    }
  }, 30000); // Poll every 30 seconds
}

/**
 * Show toast notification when config updates
 */
function showConfigUpdateToast() {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    font-size: 16px;
    font-weight: 600;
    animation: slideInRight 0.3s ease;
  `;
  toast.textContent = '⚙️ Settings updated';

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
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
