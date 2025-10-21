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
  totalSteps: 10,                  // Updated to 10 steps
  customerName: '',
  partySize: 1,
  selectedBackground: null,
  backgroundName: '',              // NEW: Name of selected background
  deliveryMethod: null,            // 'print' | 'email' | 'both'
  printQuantity: 0,
  emailQuantity: 0,
  emailAddresses: [],
  paymentMethod: null,
  customerPhoto: null,             // Base64 webcam image
  customerNumber: null,
  totalPrice: 0,                   // NEW: Calculated total
  reviewedOnce: false,             // NEW: Track if they saw review
  config: null,
  idleTimer: null                  // NEW: For attract loop timeout
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
// CUSTOMER NUMBER GENERATOR
// ============================================
function generateCustomerNumber() {
  const stored = localStorage.getItem('customerNumberCounter');
  let counter = stored ? parseInt(stored) : 600;
  counter++;
  localStorage.setItem('customerNumberCounter', counter.toString());
  return counter;
}

// ============================================
// ON-SCREEN KEYBOARD
// ============================================
function createKeyboard(inputId) {
  const keys = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '@', '.', 'COM'],
    ['SPACE', 'DELETE']
  ];

  let html = '<div class="keyboard">';

  keys.forEach((row, rowIndex) => {
    html += '<div class="keyboard__row">';
    row.forEach(key => {
      const classes = ['keyboard__key'];
      if (key === 'SPACE') classes.push('keyboard__key--space');
      if (key === 'DELETE') classes.push('keyboard__key--delete', 'keyboard__key--wide');

      html += `<button class="${classes.join(' ')}" data-key="${key}" data-input-id="${inputId}">
        ${key === 'SPACE' ? 'Space' : key === 'DELETE' ? '⌫ Delete' : key}
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

      if (key === 'DELETE') {
        input.value = input.value.slice(0, -1);
      } else if (key === 'SPACE') {
        input.value += ' ';
      } else if (key === 'COM') {
        input.value += '.com';
      } else {
        input.value += key.toLowerCase();
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
  const emailPrice = state.emailQuantity > 0 ? (state.config?.emailPricing?.[state.emailQuantity] || 0) : 0;
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
  let dots = '';
  for (let i = 1; i <= totalSteps; i++) {
    let className = 'progress__dot';
    if (i < currentStep) className += ' progress__dot--complete';
    else if (i === currentStep) className += ' progress__dot--current';
    dots += `<div class="${className}"></div>`;
  }
  return `<footer class="progress">${dots}</footer>`;
}

// ============================================
// SCREEN 1: ATTRACT LOOP (Idle State)
// ============================================
function createAttractScreen() {
  const config = state.config;

  return `
    <div class="screen bg-gradient-primary" id="attractScreen" style="cursor: pointer;">
      <main class="screen__body">
        <div class="text-center">
          <div class="card card--glass card--elevated" style="max-width: 1000px; padding: var(--space-2xl);">
            <div class="animate-float mb-2xl">
              <h1 class="text-4xl font-bold mb-md" style="color: var(--color-white);">
                ${config?.theme || 'Green Screen Photos'}
              </h1>
              <p class="text-2xl mb-md" style="color: rgba(255,255,255,0.9);">
                ${config?.eventName || 'Professional Photo Experience'}
              </p>
            </div>

            <div class="mb-2xl animate-pulse">
              <p class="text-3xl font-bold" style="color: var(--color-white);">
                Tap Anywhere to Start
              </p>
            </div>

            ${config?.features?.freeMode
              ? '<div class="text-3xl font-bold" style="color: var(--color-success); margin-top: var(--space-lg);">FREE TODAY!</div>'
              : `<div style="background: rgba(255,255,255,0.2); padding: var(--space-xl); border-radius: var(--radius-lg); margin-top: var(--space-xl);">
                  <div class="text-xl mb-md" style="color: rgba(255,255,255,0.9);">PRICING</div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-lg); max-width: 700px; margin: 0 auto;">
                    <div>
                      <div class="text-lg" style="color: rgba(255,255,255,0.8);">Prints Start At</div>
                      <div class="text-3xl font-bold" style="color: white;">$${config?.basePrice?.toFixed(2) || '10.00'}</div>
                    </div>
                    <div>
                      <div class="text-lg" style="color: rgba(255,255,255,0.8);">Email Delivery</div>
                      <div class="text-3xl font-bold" style="color: white;">$${config?.emailPricing?.[1]?.toFixed(2) || '10.00'}</div>
                    </div>
                  </div>
                </div>`
            }
          </div>
        </div>
      </main>
    </div>
  `;
}

// ============================================
// SCREEN 2: WELCOME (Clean Start)
// ============================================
function createWelcomeScreen() {
  const config = state.config;

  return `
    <div class="screen">
      <header class="screen__header">
        <div></div>
        <div></div>
      </header>

      <main class="screen__body">
        <div class="text-center mb-xl">
          <h1 class="text-3xl font-bold mb-md animate-slideUp" style="background: var(--gradient-primary); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
            ${config?.theme || 'Green Screen Photos'}
          </h1>
          <p class="text-xl text-gray mb-2xl animate-slideUp" style="animation-delay: 0.1s;">
            ${config?.eventName || 'Professional Photo Experience'}
          </p>
        </div>

        <div class="card card--glass card--elevated animate-slideUp mb-2xl" style="max-width: 700px; animation-delay: 0.2s;">
          <div style="padding: var(--space-xl);">
            <div class="text-center">
              <p class="text-xl mb-md">Professional greenscreen photography</p>
              <div style="display: flex; justify-content: center; gap: var(--space-lg); margin-top: var(--space-lg);">
                <div>
                  <div class="text-lg font-semibold">Quick</div>
                  <div class="text-sm text-gray">5 minutes</div>
                </div>
                <div style="border-left: 2px solid var(--color-border);"></div>
                <div>
                  <div class="text-lg font-semibold">Easy</div>
                  <div class="text-sm text-gray">Touch only</div>
                </div>
                <div style="border-left: 2px solid var(--color-border);"></div>
                <div>
                  <div class="text-lg font-semibold">Pro</div>
                  <div class="text-sm text-gray">High quality</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex-center">
          <button class="btn btn--gradient-primary btn--huge animate-slideUp" id="startBtn" style="animation-delay: 0.3s;">
            <span style="font-size: var(--text-xl);">START SESSION</span>
          </button>
        </div>
      </main>
    </div>
  `;
}

// ============================================
// SCREEN 3: BACKGROUND SELECTION (Hero Moment)
// ============================================
function createBackgroundScreen() {
  // Real backgrounds with Unsplash images
  const backgrounds = [
    { id: 1, name: 'Beach Sunset', category: 'Nature', img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop' },
    { id: 2, name: 'City Skyline', category: 'Urban', img: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=400&h=300&fit=crop' },
    { id: 3, name: 'Mountain Vista', category: 'Nature', img: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop' },
    { id: 4, name: 'Tropical Paradise', category: 'Nature', img: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=300&fit=crop' },
    { id: 5, name: 'Northern Lights', category: 'Sky', img: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=400&h=300&fit=crop' },
    { id: 6, name: 'Starry Night', category: 'Space', img: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400&h=300&fit=crop' },
    { id: 7, name: 'Desert Dunes', category: 'Nature', img: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=400&h=300&fit=crop' },
    { id: 8, name: 'Forest Path', category: 'Nature', img: 'https://images.unsplash.com/photo-1511497584788-876760111969?w=400&h=300&fit=crop' }
  ];

  return `
    <div class="screen">
      <header class="screen__header">
        <button class="btn btn--outline btn--small" id="backBtn">◀ Back</button>
        <div class="text-lg font-semibold">Select Your Background</div>
        <button class="btn btn--danger btn--small" id="startOverBtn">✕ Start Over</button>
      </header>

      <main class="screen__body" style="padding: 8px;">
        <div style="display: grid; grid-template-columns: 60% 40%; gap: 12px; height: 100%;">
          <!-- LEFT: Background thumbnails in 3 columns -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; align-content: start;">
            ${backgrounds.map((bg, idx) => `
              <button class="card card--interactive ${state.selectedBackground === bg.id ? 'card--selected' : ''} background-btn"
                      data-id="${bg.id}" data-name="${bg.name}"
                      style="height: 120px; position: relative; padding: 0; overflow: hidden; background-image: url('${bg.img}'); background-size: cover; background-position: center;">
                <div style="position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.6));"></div>
                <div style="position: absolute; top: 4px; left: 4px; background: rgba(0,0,0,0.85); padding: 2px 8px; border-radius: 3px;">
                  <span style="color: white; font-size: 10px; font-weight: 600;">${bg.category}</span>
                </div>
                <div style="position: absolute; bottom: 6px; left: 6px; right: 6px;">
                  <div style="color: white; font-size: 13px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.7);">${bg.name}</div>
                </div>
              </button>
            `).join('')}
          </div>

          <!-- RIGHT: Preview panel -->
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${state.selectedBackground && state.selectedBackground !== 'custom' ? (() => {
              const selectedBg = backgrounds.find(bg => bg.id === state.selectedBackground);
              return `
                <div style="flex: 1; position: relative; border-radius: 12px; overflow: hidden; background-image: url('${selectedBg.img}'); background-size: cover; background-position: center; min-height: 300px;">
                  <div style="position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.5));"></div>
                  <div style="position: absolute; bottom: 16px; left: 16px; right: 16px;">
                    <div style="background: rgba(0,0,0,0.85); padding: 6px 12px; border-radius: 6px; margin-bottom: 8px; display: inline-block;">
                      <span style="color: white; font-size: 12px; font-weight: 600;">${selectedBg.category}</span>
                    </div>
                    <div style="color: white; font-size: 24px; font-weight: bold; text-shadow: 0 2px 8px rgba(0,0,0,0.9); margin-bottom: 4px;">${selectedBg.name}</div>
                    <div style="color: rgba(255,255,255,0.9); font-size: 14px; text-shadow: 0 2px 4px rgba(0,0,0,0.8);">Selected Background</div>
                  </div>
                </div>
              `;
            })() : state.selectedBackground === 'custom' ? `
              <div class="card card--gradient-secondary" style="flex: 1; display: flex; align-items: center; justify-content: center; text-align: center; padding: 24px;">
                <div>
                  <div style="margin-bottom: 16px; display: flex; justify-content: center;">
                    <div class="icon-star" style="color: white; transform: scale(1.5);"></div>
                  </div>
                  <div style="font-size: 24px; font-weight: bold; color: white; margin-bottom: 8px;">CUSTOM BACKGROUND</div>
                  <div style="font-size: 14px; color: rgba(255,255,255,0.9);">Tell the photographer your background preference</div>
                </div>
              </div>
            ` : `
              <div class="card card--glass" style="flex: 1; display: flex; align-items: center; justify-content: center; text-align: center; padding: 24px;">
                <div style="color: var(--color-text-secondary); font-size: 16px;">
                  Select a background to preview
                </div>
              </div>
            `}

            <!-- Custom Background Button -->
            <button class="card card--gradient-secondary card--interactive ${state.selectedBackground === 'custom' ? 'card--selected' : ''} background-btn"
                    data-id="custom" data-name="Custom"
                    style="height: 80px; padding: 12px;">
              <div class="text-center">
                <div style="margin-bottom: 6px; display: flex; justify-content: center;">
                  <div class="icon-star" style="color: white;"></div>
                </div>
                <div style="font-size: 16px; font-weight: bold; color: white;">CUSTOM BACKGROUND</div>
                <div style="font-size: 11px; color: rgba(255,255,255,0.9); margin-top: 3px;">Tell photographer</div>
              </div>
            </button>

            <!-- Continue Button -->
            <button class="btn btn--gradient-primary btn--large" id="nextBtn" ${!state.selectedBackground ? 'disabled' : ''} style="height: 60px; font-size: 18px;">
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
// SCREEN 4: PARTY SIZE
// ============================================
function createPartySizeScreen() {
  return `
    <div class="screen">
      <header class="screen__header">
        <button class="btn btn--outline btn--small" id="backBtn">◀ Back</button>
        <div class="text-lg font-semibold">How many people?</div>
        <button class="btn btn--danger btn--small" id="startOverBtn">✕ Start Over</button>
      </header>

      <main class="screen__body" style="padding: 8px;">
        <div style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 8px; margin-bottom: 8px;">
          ${[1,2,3,4,5,6,7,8].map((num, idx) => `
            <button class="btn ${state.partySize === num ? 'btn--gradient-success' : 'btn--outline'} party-size-btn" data-size="${num}"
                    style="height: 80px; font-size: 28px; font-weight: bold;">
              ${num}
            </button>
          `).join('')}
          ${[9, 10].map((num) => `
            <button class="btn ${state.partySize === num ? 'btn--gradient-success' : 'btn--outline'} party-size-btn" data-size="${num}"
                    style="height: 80px; font-size: 28px; grid-column: span 2; font-weight: bold;">
              ${num}
            </button>
          `).join('')}
          <button class="btn ${state.partySize > 10 ? 'btn--gradient-success' : 'btn--outline'} party-size-btn" data-size="11"
                  style="height: 80px; font-size: 24px; grid-column: span 4; font-weight: bold;">
            10+
          </button>
        </div>

        <div class="flex-center">
          <button class="btn btn--gradient-primary btn--large" id="nextBtn" style="font-size: 16px;">CONTINUE →</button>
        </div>
      </main>

      ${createProgressBar(2, state.totalSteps)}
    </div>
  `;
}

// ============================================
// SCREEN 5: DELIVERY METHOD
// ============================================
function createDeliveryScreen() {
  return `
    <div class="screen">
      <header class="screen__header">
        <button class="btn btn--outline btn--small" id="backBtn">◀ Back</button>
        <div class="text-lg font-semibold">How would you like your photos?</div>
        <button class="btn btn--danger btn--small" id="startOverBtn">✕ Start Over</button>
      </header>

      <main class="screen__body" style="padding: 8px;">
        <div class="text-center" style="margin-bottom: 12px;">
          <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 6px;">Choose Delivery Method</h1>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; max-width: 100%; margin-bottom: 12px;">
          <button class="card card--glass card--interactive card--elevated ${state.deliveryMethod === 'print' ? 'card--selected' : ''} delivery-btn"
                  data-method="print"
                  style="min-height: 140px; padding: 16px;">
            <div class="text-center">
              <div style="margin-bottom: 10px; display: flex; justify-content: center;">
                <div class="icon-printer" style="color: var(--color-primary); transform: scale(1.1);"></div>
              </div>
              <div style="font-size: 20px; font-weight: bold; margin-bottom: 6px;">PRINTED</div>
              <div style="font-size: 13px; color: var(--color-text-light);">Physical prints to keep</div>
            </div>
          </button>

          <button class="card card--glass card--interactive card--elevated ${state.deliveryMethod === 'email' ? 'card--selected' : ''} delivery-btn"
                  data-method="email"
                  style="min-height: 140px; padding: 16px;">
            <div class="text-center">
              <div style="margin-bottom: 10px; display: flex; justify-content: center;">
                <div class="icon-envelope" style="color: var(--color-error); transform: scale(1.1);"></div>
              </div>
              <div style="font-size: 20px; font-weight: bold; margin-bottom: 6px;">EMAIL</div>
              <div style="font-size: 13px; color: var(--color-text-light);">Digital delivery</div>
            </div>
          </button>

          <button class="card card--gradient-purple card--interactive card--elevated ${state.deliveryMethod === 'both' ? 'card--selected' : ''} delivery-btn"
                  data-method="both"
                  style="min-height: 140px; padding: 16px;">
            <div class="text-center">
              <div style="margin-bottom: 10px; display: flex; justify-content: center; gap: 8px;">
                <div class="icon-printer" style="color: white; transform: scale(1.0);"></div>
                <div style="color: white; font-size: 18px; font-weight: bold;">+</div>
                <div class="icon-envelope" style="color: white; transform: scale(1.0);"></div>
              </div>
              <div style="font-size: 20px; font-weight: bold; margin-bottom: 6px; color: white;">BOTH</div>
              <div style="font-size: 13px; color: rgba(255,255,255,0.9);">Prints AND email</div>
            </div>
          </button>
        </div>

        <div class="flex-center">
          <button class="btn btn--gradient-primary btn--large" id="nextBtn" ${!state.deliveryMethod ? 'disabled' : ''}>
            CONTINUE →
          </button>
        </div>
      </main>

      ${createProgressBar(3, state.totalSteps)}
    </div>
  `;
}

// ============================================
// SCREEN 6: QUANTITY SELECTION
// ============================================
function createQuantityScreen() {
  const config = state.config;
  const isPrintSelected = state.deliveryMethod === 'print' || state.deliveryMethod === 'both';
  const isEmailSelected = state.deliveryMethod === 'email' || state.deliveryMethod === 'both';

  // Show prints quantity (but only if we haven't selected print quantity yet, OR if we haven't selected email but need to)
  if (isPrintSelected && state.printQuantity === 0) {
    return `
      <div class="screen">
        <header class="screen__header">
          <button class="btn btn--outline btn--small" id="backBtn">◀ Back</button>
          <div class="text-lg font-semibold">How many prints?</div>
          <button class="btn btn--danger btn--small" id="startOverBtn">✕ Start Over</button>
        </header>

        <main class="screen__body" style="padding: 8px;">
          <div style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 8px; margin-bottom: 10px;">
            ${[1,2,3,4,5,6,7,8].map((num) => {
              const price = config?.printPricing?.[num] || (10 + (num-1) * 5);
              return `
                <button class="card card--glass card--interactive ${state.printQuantity === num ? 'card--selected' : ''} quantity-btn"
                        data-quantity="${num}" data-type="print"
                        style="height: 110px; padding: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                  <div style="font-size: 32px; font-weight: bold; line-height: 1;">${num}</div>
                  <div style="width: 60%; height: 2px; background: var(--color-border); margin: 6px 0;"></div>
                  <div style="font-size: 18px; font-weight: bold; color: var(--color-success); line-height: 1;">$${price.toFixed(2)}</div>
                  <div style="font-size: 11px; color: var(--color-gray-500); margin-top: 4px;">${num === 1 ? 'print' : 'prints'}</div>
                </button>
              `;
            }).join('')}
          </div>

          ${createPriceTracker()}

          <div class="flex-center">
            <button class="btn btn--gradient-primary btn--large" id="nextBtn" ${!state.printQuantity ? 'disabled' : ''} style="font-size: 16px;">
              CONTINUE →
            </button>
          </div>
        </main>

        ${createProgressBar(4, state.totalSteps)}
      </div>
    `;
  }

  // No email quantity screen - go straight to email entry
}

// ============================================
// SCREEN 7: EMAIL ENTRY (Conditional)
// ============================================
function createEmailScreen() {
  // Ensure we have at least one email slot
  if (state.emailAddresses.length === 0) {
    state.emailAddresses = [''];
  }

  const config = state.config;
  const maxEmails = 5;
  const canAddMore = state.emailAddresses.length < maxEmails;

  // Calculate price per email: BASE $10 + $1 per additional email
  // 1 email = $10, 2 emails = $11, 3 emails = $12, etc.
  const baseEmailPrice = config?.emailPricing?.[1] || 10;
  const totalEmailPrice = state.emailAddresses.length > 0 ? baseEmailPrice + (state.emailAddresses.length - 1) : 0;

  // Individual email costs for display
  const emailPrices = state.emailAddresses.map((_, i) => {
    if (i === 0) return baseEmailPrice; // First email is base price
    return 1; // Each additional email is +$1
  });

  return `
    <div class="screen">
      <header class="screen__header">
        <button class="btn btn--outline btn--small" id="backBtn">◀ Back</button>
        <div>Email Addresses</div>
        <button class="btn btn--danger btn--small" id="startOverBtn">✕ Start Over</button>
      </header>

      <main class="screen__body" style="padding: 6px; overflow-y: auto;">
        <div style="display: grid; grid-template-columns: 35% 40% 25%; gap: 8px;">
          <!-- LEFT: Email inputs -->
          <div>
            <div id="emailContainer" style="display: grid; gap: 6px; margin-bottom: 8px;">
              ${state.emailAddresses.map((email, i) => {
                const price = emailPrices[i];
                return `
                <div class="card card--glass" style="padding: 8px; display: flex; gap: 6px; align-items: center;">
                  <span style="font-size: 16px; font-weight: bold; color: var(--color-primary); min-width: 28px;">${i + 1}.</span>
                  <input
                    type="text"
                    class="input email-input"
                    id="email-${i}"
                    data-index="${i}"
                    placeholder="email@example.com"
                    value="${email || ''}"
                    style="flex: 1; font-size: 13px; padding: 8px;"
                  >
                  <div style="font-size: 14px; font-weight: bold; color: var(--color-success); min-width: 55px; text-align: right;">${i === 0 ? `$${price.toFixed(2)}` : '+$1'}</div>
                  ${state.emailAddresses.length > 1 ? `
                    <button class="btn btn--danger btn--small remove-email-btn" data-index="${i}" style="min-width: 35px; padding: 6px; font-size: 14px;">
                      ✕
                    </button>
                  ` : ''}
                </div>
              `;
              }).join('')}
            </div>

            ${canAddMore ? `
              <button class="btn btn--outline" id="addEmailBtn" style="width: 100%; margin-bottom: 8px; font-size: 13px; padding: 10px;">
                <span style="font-size: 16px; margin-right: 4px;">+</span>
                ADD ANOTHER (+$1)
              </button>
            ` : `
              <div class="text-center" style="color: var(--color-warning); margin-bottom: 8px; font-size: 12px; padding: 8px; background: rgba(255,193,7,0.1); border-radius: 6px;">
                Max ${maxEmails} emails
              </div>
            `}
          </div>

          <!-- CENTER: Keyboard -->
          <div>
            ${createKeyboard('email-0')}
          </div>

          <!-- RIGHT: Summary -->
          <div class="card card--glass" style="padding: 12px; height: fit-content; position: sticky; top: 0;">
            <div style="font-size: 14px; font-weight: 600; margin-bottom: 10px;">Summary</div>
            <div style="display: grid; gap: 6px; margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; padding: 6px; background: rgba(99,102,241,0.1); border-radius: 4px;">
                <span style="font-size: 11px;">Base</span>
                <span style="font-size: 11px; font-weight: 600; color: var(--color-success);">$${baseEmailPrice.toFixed(2)}</span>
              </div>
              ${state.emailAddresses.length > 1 ? `
                <div style="display: flex; justify-content: space-between; padding: 6px; background: rgba(99,102,241,0.1); border-radius: 4px;">
                  <span style="font-size: 11px;">+${state.emailAddresses.length - 1}</span>
                  <span style="font-size: 11px; font-weight: 600; color: var(--color-success);">+$${(state.emailAddresses.length - 1).toFixed(2)}</span>
                </div>
              ` : ''}
            </div>
            <div style="border-top: 2px solid var(--color-border); padding-top: 10px; margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 14px; font-weight: bold;">Total:</span>
                <span style="font-size: 20px; font-weight: bold; color: var(--color-success);">$${totalEmailPrice.toFixed(2)}</span>
              </div>
            </div>
            <button class="btn btn--gradient-primary btn--large" id="nextBtn" style="width: 100%; font-size: 14px; padding: 12px;">
              CONTINUE →
            </button>
          </div>
        </div>
      </main>

      ${createProgressBar(6, state.totalSteps)}
    </div>
  `;
}

// ============================================
// SCREEN 8: NAME ENTRY
// ============================================
function createNameScreen() {
  return `
    <div class="screen">
      <header class="screen__header">
        <button class="btn btn--outline btn--small" id="backBtn">◀ Back</button>
        <div class="text-lg font-semibold">Name for Receipt</div>
        <button class="btn btn--danger btn--small" id="startOverBtn">✕ Start Over</button>
      </header>

      <main class="screen__body" style="padding: 8px;">
        <div class="text-center" style="margin-bottom: 8px;">
          <h1 style="font-size: 18px; font-weight: bold; margin-bottom: 4px;">Your Name</h1>
          <p style="font-size: 12px; color: var(--color-gray-500);">This will appear on your receipt</p>
        </div>

        <div style="margin: 0 auto; max-width: 600px;">
          <input
            type="text"
            id="nameInput"
            class="input"
            placeholder="Enter your name..."
            value="${state.customerName || ''}"
            style="font-size: 16px; text-align: center; padding: 10px; margin-bottom: 8px;"
          >

          <div class="flex-center" style="margin-bottom: 8px;">
            <button class="btn btn--gradient-primary btn--large" id="nextBtn" style="font-size: 16px; padding: 12px 24px;">
              CONTINUE →
            </button>
          </div>

          ${createKeyboard('nameInput')}
        </div>
      </main>

      ${createProgressBar(7, state.totalSteps)}
    </div>
  `;
}

// ============================================
// SCREEN 9: REVIEW & EDIT
// ============================================
function createReviewScreen() {
  // Calculate total price
  const printPrice = state.config?.printPricing?.[state.printQuantity] || 0;
  const emailPrice = state.config?.emailPricing?.[state.emailQuantity] || 0;
  const total = printPrice + emailPrice;
  state.totalPrice = total;

  return `
    <div class="screen">
      <header class="screen__header">
        <button class="btn btn--outline btn--small" id="backBtn">◀ Back</button>
        <div class="text-lg font-semibold">Review Your Order</div>
        <button class="btn btn--danger btn--small" id="startOverBtn">✕ Start Over</button>
      </header>

      <main class="screen__body" style="padding: 8px;">
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 12px;">
          <div class="card card--glass" style="padding: 12px;">
          <div style="display: grid; gap: 6px;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid var(--color-border);">
              <div>
                <div style="font-size: 13px; font-weight: 600;">Background</div>
                <div style="font-size: 12px; color: var(--color-gray-500);">${state.backgroundName || 'Not selected'}</div>
              </div>
              <button class="btn btn--outline btn--small edit-btn" data-screen="background" style="font-size: 11px; padding: 4px 8px;">Edit</button>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid var(--color-border);">
              <div>
                <div style="font-size: 13px; font-weight: 600;">Party Size</div>
                <div style="font-size: 12px; color: var(--color-gray-500);">${state.partySize} ${state.partySize === 1 ? 'person' : 'people'}</div>
              </div>
              <button class="btn btn--outline btn--small edit-btn" data-screen="partySize" style="font-size: 11px; padding: 4px 8px;">Edit</button>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid var(--color-border);">
              <div>
                <div style="font-size: 13px; font-weight: 600;">Delivery</div>
                <div style="font-size: 12px; color: var(--color-gray-500);">${state.deliveryMethod === 'print' ? 'Printed' : state.deliveryMethod === 'email' ? 'Email' : 'Both'}</div>
              </div>
              <button class="btn btn--outline btn--small edit-btn" data-screen="delivery" style="font-size: 11px; padding: 4px 8px;">Edit</button>
            </div>

            ${state.printQuantity > 0 ? `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid var(--color-border);">
                <div>
                  <div style="font-size: 13px; font-weight: 600;">Prints</div>
                  <div style="font-size: 12px; color: var(--color-gray-500);">${state.printQuantity} ${state.printQuantity === 1 ? 'copy' : 'copies'} - $${printPrice.toFixed(2)}</div>
                </div>
                <button class="btn btn--outline btn--small edit-btn" data-screen="quantity" style="font-size: 11px; padding: 4px 8px;">Edit</button>
              </div>
            ` : ''}

            ${state.emailQuantity > 0 ? `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid var(--color-border);">
                <div>
                  <div style="font-size: 13px; font-weight: 600;">Emails</div>
                  <div style="font-size: 12px; color: var(--color-gray-500);">${state.emailQuantity} ${state.emailQuantity === 1 ? 'address' : 'addresses'} - $${emailPrice.toFixed(2)}</div>
                </div>
                <button class="btn btn--outline btn--small edit-btn" data-screen="email" style="font-size: 11px; padding: 4px 8px;">Edit</button>
              </div>
            ` : ''}

            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px;">
              <div>
                <div style="font-size: 13px; font-weight: 600;">Name</div>
                <div style="font-size: 12px; color: var(--color-gray-500);">${state.customerName || 'Not entered'}</div>
              </div>
              <button class="btn btn--outline btn--small edit-btn" data-screen="name" style="font-size: 11px; padding: 4px 8px;">Edit</button>
            </div>
          </div>

            <div style="margin-top: 12px; padding-top: 12px; border-top: 2px solid var(--color-border);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 16px; font-weight: bold;">Total:</div>
                <div style="font-size: 24px; font-weight: bold; color: var(--color-success);">$${total.toFixed(2)}</div>
              </div>
            </div>
          </div>

          <div class="card card--glass" style="padding: 16px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
            <div style="font-size: 16px; font-weight: 600; margin-bottom: 16px; text-align: center;">Ready to proceed?</div>
            <button class="btn btn--gradient-success" id="confirmBtn" style="width: 100%; padding: 18px; font-size: 16px;">
              LOOKS GOOD →
            </button>
          </div>
        </div>
      </main>

      ${createProgressBar(8, state.totalSteps)}
    </div>
  `;
}

// ============================================
// SCREEN 10: PAYMENT METHOD
// ============================================
function createPaymentScreen() {
  return `
    <div class="screen">
      <header class="screen__header">
        <button class="btn btn--outline btn--small" id="backBtn">◀ Back</button>
        <div>How will you pay?</div>
        <button class="btn btn--danger btn--small" id="startOverBtn">✕ Start Over</button>
      </header>

      <main class="screen__body" style="padding: 8px;">
        <div class="card card--glass" style="padding: 12px; margin-bottom: 12px; text-align: center;">
          <div style="font-size: 14px; margin-bottom: 6px;">Total Amount</div>
          <div style="font-size: 32px; font-weight: bold; color: var(--color-success);">$${state.totalPrice.toFixed(2)}</div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 12px;">
          <button class="card card--glass card--interactive ${state.paymentMethod === 'cash' ? 'card--selected' : ''} payment-btn"
                  data-method="cash"
                  style="height: 120px; padding: 16px;">
            <div class="text-center">
              <div class="icon-document" style="color: var(--color-success); margin: 0 auto 12px; transform: scale(1.1);"></div>
              <div style="font-size: 16px; font-weight: bold;">CASH</div>
            </div>
          </button>

          <button class="card card--glass card--interactive ${state.paymentMethod === 'debit' ? 'card--selected' : ''} payment-btn"
                  data-method="debit"
                  style="height: 120px; padding: 16px;">
            <div class="text-center">
              <div class="icon-document" style="color: var(--color-primary); margin: 0 auto 12px; transform: scale(1.1);"></div>
              <div style="font-size: 16px; font-weight: bold;">DEBIT</div>
            </div>
          </button>

          <button class="card card--glass card--interactive ${state.paymentMethod === 'credit' ? 'card--selected' : ''} payment-btn"
                  data-method="credit"
                  style="height: 120px; padding: 16px;">
            <div class="text-center">
              <div class="icon-document" style="color: var(--color-info); margin: 0 auto 12px; transform: scale(1.1);"></div>
              <div style="font-size: 16px; font-weight: bold;">CREDIT</div>
            </div>
          </button>

          <button class="card card--glass card--interactive ${state.paymentMethod === 'check' ? 'card--selected' : ''} payment-btn"
                  data-method="check"
                  style="height: 120px; padding: 16px;">
            <div class="text-center">
              <div class="icon-check" style="color: var(--color-secondary); margin: 0 auto 12px; transform: scale(1.1);"></div>
              <div style="font-size: 16px; font-weight: bold;">CHECK</div>
            </div>
          </button>
        </div>

        <div class="flex-center">
          <button class="btn btn--gradient-primary btn--large" id="nextBtn" ${!state.paymentMethod ? 'disabled' : ''} style="font-size: 16px; padding: 14px 32px;">
            CONTINUE →
          </button>
        </div>
      </main>

      ${createProgressBar(9, state.totalSteps)}
    </div>
  `;
}

// ============================================
// SCREEN 11: CUSTOMER ID PHOTO
// ============================================
function createPhotoScreen() {
  return `
    <div class="screen">
      <header class="screen__header">
        <div></div>
        <div class="text-lg font-semibold">Smile for ID Photo!</div>
        <button class="btn btn--danger btn--small" id="startOverBtn">✕ Start Over</button>
      </header>

      <main class="screen__body">
        <div class="text-center mb-xl">
          <h1 class="text-3xl font-bold mb-md">Quick ID Photo</h1>
          <p class="text-xl text-gray">This helps us match you to your final photo</p>
        </div>

        <div class="card card--glass" style="max-width: 700px; padding: var(--space-xl); margin-bottom: var(--space-xl);">
          <div style="width: 100%; aspect-ratio: 4/3; background: var(--color-gray-800); border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; margin-bottom: var(--space-lg);">
            <div class="icon-camera" style="color: var(--color-gray-400); transform: scale(3);"></div>
            <div class="text-xl" style="position: absolute; margin-top: 200px; color: var(--color-gray-400);">Webcam feed will appear here</div>
          </div>
        </div>

        <div class="flex-center">
          <button class="btn btn--gradient-success btn--huge" id="captureBtn">
            <span class="icon-camera" style="transform: scale(1.5);"></span>
            <span>CAPTURE PHOTO</span>
          </button>
        </div>
      </main>

      ${createProgressBar(10, state.totalSteps)}
    </div>
  `;
}

// ============================================
// SCREEN 12: PROCESSING
// ============================================
function createProcessingScreen() {
  // Generate customer number if not already generated
  if (!state.customerNumber) {
    state.customerNumber = generateCustomerNumber();
  }

  return `
    <div class="screen bg-gradient-primary">
      <main class="screen__body">
        <div class="card card--glass" style="max-width: 800px; padding: var(--space-2xl);">
          <div class="text-center mb-2xl">
            <div class="animate-spin" style="width: 80px; height: 80px; border: 6px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; margin: 0 auto var(--space-xl);"></div>
            <h1 class="text-3xl font-bold mb-md" style="color: white;">Processing...</h1>
          </div>

          <div style="background: rgba(255,255,255,0.2); padding: var(--space-lg); border-radius: var(--radius-lg); margin-bottom: var(--space-xl);">
            <div style="display: flex; align-items: center; gap: var(--space-md); margin-bottom: var(--space-md);">
              <div class="icon-check" style="color: var(--color-success);"></div>
              <div class="text-xl" style="color: white;">Payment confirmed</div>
            </div>
            <div style="display: flex; align-items: center; gap: var(--space-md); margin-bottom: var(--space-md);">
              <div class="icon-check" style="color: var(--color-success);"></div>
              <div class="text-xl" style="color: white;">Information saved</div>
            </div>
            <div style="display: flex; align-items: center; gap: var(--space-md);">
              <div class="animate-spin" style="width: 32px; height: 32px; border: 4px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%;"></div>
              <div class="text-xl" style="color: white;">Printing receipt...</div>
            </div>
          </div>

          <div class="text-center">
            <div class="text-xl mb-sm" style="color: rgba(255,255,255,0.9);">Your customer number:</div>
            <div class="text-4xl font-bold mb-xl" style="color: white;">${state.customerNumber}</div>
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
  const now = new Date();
  const date = now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const eventName = state.config?.eventName || 'Special Event';

  return `
    <div class="screen">
      <main class="screen__body" style="padding: 12px; overflow-y: auto;">
        <div style="text-align: center; margin-bottom: 12px;">
          <h1 style="font-size: 22px; font-weight: bold; color: var(--color-success);">Receipts Printing...</h1>
          <p style="font-size: 13px;">Please take both receipts below</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <!-- CUSTOMER RECEIPT -->
          <div class="card card--glass" style="padding: 16px; background: white; color: black;">
            <div style="text-align: center; border-bottom: 2px solid black; padding-bottom: 10px; margin-bottom: 10px;">
              <div style="font-size: 18px; font-weight: bold;">CUSTOMER RECEIPT</div>
              <div style="font-size: 24px; font-weight: bold; margin: 8px 0;">#{state.customerNumber}</div>
              <div style="font-size: 11px;">KEEP THIS RECEIPT</div>
            </div>

            <div style="font-size: 11px; line-height: 1.4;">
              <div style="margin-bottom: 8px;"><strong>${eventName}</strong></div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
                <div><strong>Name:</strong> ${state.customerName}</div>
                <div><strong>Party Size:</strong> ${state.partySize}</div>
                <div><strong>Date:</strong> ${date}</div>
                <div><strong>Time:</strong> ${time}</div>
              </div>

              <div style="border-top: 1px solid #ccc; padding-top: 8px; margin-bottom: 8px;">
                <div><strong>Order Details:</strong></div>
                ${state.printQuantity > 0 ? `<div>• ${state.printQuantity} Print${state.printQuantity > 1 ? 's' : ''}</div>` : ''}
                ${state.emailAddresses.length > 0 ? `<div>• ${state.emailAddresses.length} Email${state.emailAddresses.length > 1 ? 's' : ''}</div>` : ''}
                <div>• Payment: ${state.paymentMethod?.toUpperCase()}</div>
                <div><strong>Total: $${state.totalPrice.toFixed(2)}</strong></div>
              </div>

              <div style="border: 2px dashed #666; padding: 8px; margin: 8px 0; min-height: 40px;">
                <div style="font-size: 10px; text-align: center; color: #666;">PAID STAMP</div>
              </div>

              <div style="border-top: 1px solid #ccc; padding-top: 8px; margin-bottom: 8px; font-size: 10px;">
                <div style="font-weight: bold; margin-bottom: 4px;">PRINT PICKUP:</div>
                <div>Return at end of event to collect your printed photos</div>
              </div>

              <div style="border: 2px dashed #666; padding: 8px; margin: 8px 0; min-height: 40px;">
                <div style="font-size: 10px; text-align: center; color: #666;">PRINTS RECEIVED STAMP</div>
              </div>

              ${state.emailAddresses.length > 0 ? `
                <div style="border-top: 1px solid #ccc; padding-top: 8px; margin-bottom: 8px; font-size: 10px;">
                  <div style="font-weight: bold;">EMAIL DELIVERY:</div>
                  <div>If not received within 2 business days, email:</div>
                  <div style="font-weight: bold;">support@greenscreenphotos.com</div>
                </div>
              ` : ''}

              <div style="border-top: 1px solid #ccc; padding-top: 8px; font-size: 9px;">
                <div style="font-weight: bold;">QUESTIONS?</div>
                <div>Call: 1-800-PHOTO-HELP</div>
                <div style="border: 1px solid #ccc; padding: 6px; margin-top: 4px; min-height: 30px; background: #f9f9f9;">
                  <div style="color: #999;">Notes:</div>
                </div>
              </div>
            </div>
          </div>

          <!-- CAMERAMAN RECEIPT -->
          <div class="card card--glass" style="padding: 16px; background: #f5f5f5; color: black;">
            <div style="text-align: center; border-bottom: 2px solid black; padding-bottom: 10px; margin-bottom: 10px;">
              <div style="font-size: 16px; font-weight: bold;">CAMERA OPERATOR</div>
              <div style="font-size: 48px; font-weight: bold; margin: 8px 0; letter-spacing: 4px;">${state.customerNumber}</div>
            </div>

            <div style="font-size: 11px; line-height: 1.3;">
              <div style="display: grid; gap: 4px; margin-bottom: 12px;">
                <div><strong>Name:</strong> ${state.customerName}</div>
                <div><strong>Date:</strong> ${date} <strong>Time:</strong> ${time}</div>
                <div><strong>Party Size:</strong> ${state.partySize} people</div>
                <div><strong>Background:</strong> ${state.backgroundName}</div>
                <div><strong>Delivery:</strong> ${state.deliveryMethod === 'both' ? 'Print + Email' : state.deliveryMethod === 'print' ? 'Print Only' : 'Email Only'}</div>
                ${state.printQuantity > 0 ? `<div><strong>Prints:</strong> ${state.printQuantity}</div>` : ''}
                ${state.emailAddresses.length > 0 ? `<div><strong>Emails:</strong> ${state.emailAddresses.length}</div>` : ''}
              </div>

              ${state.emailAddresses.length > 0 ? `
                <div style="border: 1px solid #999; padding: 6px; margin-bottom: 10px; font-size: 9px;">
                  <div style="font-weight: bold;">Email Addresses:</div>
                  ${state.emailAddresses.map((email, i) => `<div>${i + 1}. ${email || '(blank)'}</div>`).join('')}
                </div>
              ` : ''}

              <div style="border: 1px solid #999; padding: 6px; margin-bottom: 10px; min-height: 50px;">
                <div style="font-weight: bold; font-size: 10px;">NOTES:</div>
                <div style="border-bottom: 1px dotted #ccc; margin: 4px 0;"></div>
                <div style="border-bottom: 1px dotted #ccc; margin: 4px 0;"></div>
                <div style="border-bottom: 1px dotted #ccc; margin: 4px 0;"></div>
              </div>

              <div style="font-weight: bold; margin-bottom: 6px; font-size: 10px;">VERIFICATION STAMPS:</div>
              <div style="display: grid; gap: 4px;">
                ${['PAID', 'PHOTO TAKEN', 'EMAILS SENT', 'PRINTS MADE', 'PICKED UP'].map(label => `
                  <div style="border: 2px solid #666; padding: 6px; text-align: center; font-size: 9px; min-height: 32px;">
                    <div style="color: #999;">${label}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>

        <div style="text-align: center; margin-top: 12px;">
          <div style="font-size: 16px; font-weight: bold;">Returning to start in <span id="countdown">10</span> seconds...</div>
        </div>
      </main>
    </div>
  `;
}

// ============================================
// RENDER FUNCTION
// ============================================
function render() {
  const app = document.getElementById('app');
  if (!app) return;

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
    case 'processing':
      html = createProcessingScreen();
      break;
    case 'receipt':
      html = createReceiptScreen();
      break;
    default:
      html = createAttractScreen();
  }

  app.style.transition = 'opacity 0.3s ease-in-out';
  app.style.opacity = '0';
  setTimeout(() => {
    app.innerHTML = html;
    attachEventListeners();
    setTimeout(() => {
      app.style.opacity = '1';
    }, 50);
  }, 300);
}

// ============================================
// EVENT LISTENERS
// ============================================
function attachEventListeners() {
  // ==================== START OVER BUTTON (All Screens) ====================
  const startOverBtn = document.getElementById('startOverBtn');
  if (startOverBtn) {
    startOverBtn.addEventListener('click', () => {
      if (confirm('Start over? All progress will be lost.')) {
        // Reset all state
        state.currentScreen = 'attract';
        state.currentStep = 0;
        state.customerName = '';
        state.partySize = 1;
        state.selectedBackground = null;
        state.backgroundName = '';
        state.deliveryMethod = null;
        state.printQuantity = 0;
        state.emailQuantity = 0;
        state.emailAddresses = [];
        state.paymentMethod = null;
        state.customerPhoto = null;
        state.totalPrice = 0;
        state.reviewedOnce = false;
        render();
      }
    });
  }

  // ==================== ATTRACT SCREEN ====================
  const attractScreen = document.getElementById('attractScreen');
  if (attractScreen) {
    attractScreen.addEventListener('click', () => {
      state.currentScreen = 'welcome';
      render();
    });
  }

  // ==================== WELCOME SCREEN ====================
  const startBtn = document.getElementById('startBtn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      state.currentScreen = 'background';
      render();
    });
  }

  // ==================== BACKGROUND SELECTION ====================
  const backgroundBtns = document.querySelectorAll('.background-btn');
  backgroundBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update state
      state.selectedBackground = btn.dataset.id;
      state.backgroundName = btn.dataset.name;

      // Update UI without re-rendering (avoid animation re-trigger)
      backgroundBtns.forEach(b => b.classList.remove('card--selected'));
      btn.classList.add('card--selected');

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

      // Update UI without re-rendering
      partySizeBtns.forEach(b => {
        b.classList.remove('btn--gradient-success');
        b.classList.add('btn--outline');
      });
      btn.classList.remove('btn--outline');
      btn.classList.add('btn--gradient-success');
    });
  });

  // ==================== DELIVERY METHOD ====================
  const deliveryBtns = document.querySelectorAll('.delivery-btn');
  deliveryBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update state
      state.deliveryMethod = btn.dataset.method;

      // Reset quantities when delivery method changes
      if (state.deliveryMethod === 'print') {
        state.emailQuantity = 0;
        state.emailAddresses = [];
      } else if (state.deliveryMethod === 'email') {
        state.printQuantity = 0;
      }

      // Update UI without re-rendering
      deliveryBtns.forEach(b => b.classList.remove('card--selected'));
      btn.classList.add('card--selected');

      // Enable next button
      const nextBtn = document.getElementById('nextBtn');
      if (nextBtn) nextBtn.disabled = false;
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

      // Update UI without re-rendering
      quantityBtns.forEach(b => b.classList.remove('card--selected'));
      btn.classList.add('card--selected');

      // Update price tracker in real-time
      const priceTrackerAmount = document.querySelector('.price-tracker__amount');
      if (priceTrackerAmount) {
        const newTotal = calculateCurrentPrice();
        priceTrackerAmount.textContent = '$' + newTotal.toFixed(2);
      }

      // Enable next button
      const nextBtn = document.getElementById('nextBtn');
      if (nextBtn) nextBtn.disabled = false;
    });
  });

  // ==================== EMAIL ENTRY ====================
  const emailInputs = document.querySelectorAll('.email-input');
  emailInputs.forEach(input => {
    input.addEventListener('input', (e) => {
      const index = parseInt(e.target.dataset.index);
      state.emailAddresses[index] = e.target.value;
    });
  });

  // Add email button (with real-time pricing)
  const addEmailBtn = document.getElementById('addEmailBtn');
  if (addEmailBtn) {
    addEmailBtn.addEventListener('click', () => {
      state.emailAddresses.push('');
      state.emailQuantity = state.emailAddresses.length; // Update count
      render();
    });
  }

  // Remove email buttons (with real-time pricing)
  const removeEmailBtns = document.querySelectorAll('.remove-email-btn');
  removeEmailBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index);
      state.emailAddresses.splice(index, 1);
      state.emailQuantity = state.emailAddresses.length; // Update count
      render();
    });
  });

  // On-screen keyboard
  attachKeyboardListeners();

  // ==================== NAME ENTRY ====================
  const nameInput = document.getElementById('nameInput');
  if (nameInput) {
    nameInput.focus();
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

  // ==================== BACK BUTTON ====================
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      // Navigate backwards through the flow
      if (state.currentScreen === 'background') {
        state.currentScreen = 'welcome';
      } else if (state.currentScreen === 'partySize') {
        state.currentScreen = 'background';
      } else if (state.currentScreen === 'delivery') {
        state.currentScreen = 'partySize';
      } else if (state.currentScreen === 'quantity') {
        state.currentScreen = 'delivery';
      } else if (state.currentScreen === 'email') {
        // If we came from quantity (both selected), go back to quantity
        if (state.deliveryMethod === 'both' && state.printQuantity > 0) {
          state.emailQuantity = 0; // Reset email quantity
          state.currentScreen = 'quantity';
        } else {
          state.currentScreen = 'quantity';
        }
      } else if (state.currentScreen === 'name') {
        // If email was selected, go back to email
        if (state.deliveryMethod === 'email' || state.deliveryMethod === 'both') {
          state.currentScreen = 'email';
        } else {
          state.currentScreen = 'quantity';
        }
      } else if (state.currentScreen === 'review') {
        state.currentScreen = 'name';
      } else if (state.currentScreen === 'payment') {
        state.currentScreen = 'review';
      }
      render();
    });
  }

  // ==================== REVIEW SCREEN ====================
  const editBtns = document.querySelectorAll('.edit-btn');
  editBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetScreen = btn.dataset.screen;
      state.currentScreen = targetScreen;
      render();
    });
  });

  const confirmBtn = document.getElementById('confirmBtn');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      state.reviewedOnce = true;
      state.currentScreen = 'payment';
      render();
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
    captureBtn.addEventListener('click', () => {
      // TODO: Add webcam integration here
      // For now, just simulate capture
      state.customerPhoto = 'captured'; // Placeholder
      state.currentScreen = 'processing';
      render();

      // Auto-advance to receipt after 3 seconds
      setTimeout(() => {
        state.currentScreen = 'receipt';
        render();
      }, 3000);
    });
  }

  // ==================== RECEIPT SCREEN ====================
  const countdownEl = document.getElementById('countdown');
  if (countdownEl) {
    let timeLeft = 10;
    const countdownInterval = setInterval(() => {
      timeLeft--;
      if (countdownEl) countdownEl.textContent = timeLeft.toString();

      if (timeLeft <= 0) {
        clearInterval(countdownInterval);
        // Reset state and return to attract
        state.currentScreen = 'attract';
        state.currentStep = 0;
        state.customerName = '';
        state.partySize = 1;
        state.selectedBackground = null;
        state.backgroundName = '';
        state.deliveryMethod = null;
        state.printQuantity = 0;
        state.emailQuantity = 0;
        state.emailAddresses = [];
        state.paymentMethod = null;
        state.customerPhoto = null;
        state.customerNumber = null;
        state.totalPrice = 0;
        state.reviewedOnce = false;
        render();
      }
    }, 1000);
  }

  // ==================== NEXT BUTTON ====================
  const nextBtn = document.getElementById('nextBtn');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      // Navigate forward through the flow
      if (state.currentScreen === 'background') {
        state.currentScreen = 'partySize';
      } else if (state.currentScreen === 'partySize') {
        state.currentScreen = 'delivery';
      } else if (state.currentScreen === 'delivery') {
        state.currentScreen = 'quantity';
      } else if (state.currentScreen === 'quantity') {
        // Go to email entry directly (no quantity selection)
        if (state.deliveryMethod === 'email' || state.deliveryMethod === 'both') {
          state.currentScreen = 'email';
        } else {
          state.currentScreen = 'name';
        }
      } else if (state.currentScreen === 'email') {
        state.currentScreen = 'name';
      } else if (state.currentScreen === 'name') {
        const nameInput = document.getElementById('nameInput');
        state.customerName = nameInput?.value || 'Guest';
        state.currentScreen = 'review';
      } else if (state.currentScreen === 'payment') {
        state.currentScreen = 'photo';
      }
      render();
    });
  }
}

// ============================================
// INITIALIZATION
// ============================================
async function init() {
  console.log('[INIT] Initializing Greenscreen Kiosk...');
  
  // Load config
  state.config = await loadConfig();
  console.log('[CONFIG] Loaded successfully:', state.config);
  
  // Initial render
  render();
}

// Start when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Expose for debugging
window.state = state;
window.render = render;
