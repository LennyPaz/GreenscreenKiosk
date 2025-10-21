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

      <main class="screen__body" style="padding: 12px;">
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 12px;">
          ${backgrounds.map((bg, idx) => `
            <button class="card card--interactive ${state.selectedBackground === bg.id ? 'card--selected' : ''} background-btn"
                    data-id="${bg.id}" data-name="${bg.name}"
                    style="height: 140px; position: relative; padding: 0; overflow: hidden; background-image: url('${bg.img}'); background-size: cover; background-position: center;">
              <div style="position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7));"></div>
              <div style="position: absolute; top: 6px; left: 6px; background: rgba(0,0,0,0.85); padding: 3px 10px; border-radius: 4px;">
                <span style="color: white; font-size: 11px; font-weight: 600;">${bg.category}</span>
              </div>
              <div style="position: absolute; bottom: 10px; left: 10px; right: 10px;">
                <div style="color: white; font-size: 15px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.7);">${bg.name}</div>
              </div>
            </button>
          `).join('')}

          <button class="card card--gradient-secondary card--interactive ${state.selectedBackground === 'custom' ? 'card--selected' : ''} background-btn"
                  data-id="custom" data-name="Custom"
                  style="height: 140px; grid-column: span 4; padding: 16px;">
            <div class="text-center">
              <div style="margin-bottom: 10px; display: flex; justify-content: center;">
                <div class="icon-star" style="color: white;"></div>
              </div>
              <div style="font-size: 18px; font-weight: bold; color: white;">CUSTOM BACKGROUND</div>
              <div style="font-size: 13px; color: rgba(255,255,255,0.9); margin-top: 6px;">Tell the photographer</div>
            </div>
          </button>
        </div>

        <div class="flex-center">
          <button class="btn btn--gradient-primary btn--large" id="nextBtn" ${!state.selectedBackground ? 'disabled' : ''}>
            CONTINUE →
          </button>
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

      <main class="screen__body" style="padding: 16px;">
        <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 16px; margin-bottom: 16px;">
          ${[1,2,3,4,5,6,7,8,9,10].map((num, idx) => `
            <button class="btn ${state.partySize === num ? 'btn--gradient-success' : 'btn--outline'} party-size-btn" data-size="${num}"
                    style="height: 100px; font-size: 36px; font-weight: bold;">
              ${num}
            </button>
          `).join('')}
          <button class="btn ${state.partySize > 10 ? 'btn--gradient-success' : 'btn--outline'} party-size-btn" data-size="11"
                  style="height: 100px; font-size: 28px; grid-column: span 2; font-weight: bold;">
            10+
          </button>
        </div>

        <div class="flex-center">
          <button class="btn btn--gradient-primary btn--large" id="nextBtn">CONTINUE →</button>
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

      <main class="screen__body">
        <div class="text-center mb-2xl">
          <h1 class="text-3xl font-bold mb-md">Choose Delivery Method</h1>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-lg); max-width: 900px; margin-bottom: var(--space-xl);">
          <button class="card card--glass card--interactive card--elevated ${state.deliveryMethod === 'print' ? 'card--selected' : ''} delivery-btn"
                  data-method="print"
                  style="min-height: 200px; padding: var(--space-xl);">
            <div class="text-center">
              <div style="margin-bottom: var(--space-lg); display: flex; justify-content: center;">
                <div class="icon-printer" style="color: var(--color-primary); transform: scale(1.3);"></div>
              </div>
              <div class="text-2xl font-bold mb-sm">PRINTED</div>
              <div class="text-base text-gray">Physical prints to keep</div>
            </div>
          </button>

          <button class="card card--glass card--interactive card--elevated ${state.deliveryMethod === 'email' ? 'card--selected' : ''} delivery-btn"
                  data-method="email"
                  style="min-height: 200px; padding: var(--space-xl);">
            <div class="text-center">
              <div style="margin-bottom: var(--space-lg); display: flex; justify-content: center;">
                <div class="icon-envelope" style="color: var(--color-error); transform: scale(1.3);"></div>
              </div>
              <div class="text-2xl font-bold mb-sm">EMAIL</div>
              <div class="text-base text-gray">Digital delivery</div>
            </div>
          </button>
        </div>

        <div style="max-width: 900px; margin-bottom: var(--space-xl);">
          <button class="card card--gradient-purple card--interactive card--elevated ${state.deliveryMethod === 'both' ? 'card--selected' : ''} delivery-btn"
                  data-method="both"
                  style="min-height: 200px; padding: var(--space-xl);">
            <div class="text-center">
              <div style="margin-bottom: var(--space-lg); display: flex; justify-content: center; gap: var(--space-md);">
                <div class="icon-printer" style="color: white; transform: scale(1.2);"></div>
                <div style="color: white; font-size: var(--text-2xl); font-weight: var(--font-bold);">+</div>
                <div class="icon-envelope" style="color: white; transform: scale(1.2);"></div>
              </div>
              <div class="text-2xl font-bold mb-sm" style="color: white;">BOTH</div>
              <div class="text-lg" style="color: rgba(255,255,255,0.9);">Printed copies AND email delivery</div>
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

        <main class="screen__body" style="padding: 16px;">
          <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 16px; margin-bottom: 16px;">
            ${[1,2,3,4,5,6].map((num) => {
              const price = config?.printPricing?.[num] || (10 + (num-1) * 5);
              return `
                <button class="card card--glass card--interactive ${state.printQuantity === num ? 'card--selected' : ''} quantity-btn"
                        data-quantity="${num}" data-type="print"
                        style="height: 140px; padding: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                  <div style="font-size: 48px; font-weight: bold; line-height: 1;">${num}</div>
                  <div style="width: 70%; height: 2px; background: var(--color-border); margin: 10px 0;"></div>
                  <div style="font-size: 26px; font-weight: bold; color: var(--color-success); line-height: 1;">$${price.toFixed(2)}</div>
                  <div style="font-size: 13px; color: var(--color-gray-500); margin-top: 6px;">${num === 1 ? 'print' : 'prints'}</div>
                </button>
              `;
            }).join('')}
          </div>

          ${createPriceTracker()}

          <div class="flex-center">
            <button class="btn btn--gradient-primary btn--large" id="nextBtn" ${!state.printQuantity ? 'disabled' : ''}>
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

  // Calculate price per email
  const emailPrices = state.emailAddresses.map((_, i) => {
    const num = i + 1;
    return config?.emailPricing?.[num] || (10 + num - 1);
  });

  const totalEmailPrice = emailPrices.reduce((sum, price) => sum + price, 0);

  return `
    <div class="screen">
      <header class="screen__header">
        <button class="btn btn--outline btn--small" id="backBtn">◀ Back</button>
        <div>Email Addresses</div>
        <button class="btn btn--danger btn--small" id="startOverBtn">✕ Start Over</button>
      </header>

      <main class="screen__body" style="padding: 12px; overflow-y: auto;">
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 16px;">
          <div>
            <div id="emailContainer" style="display: grid; gap: 10px; margin-bottom: 12px;">
              ${state.emailAddresses.map((email, i) => {
                const price = emailPrices[i];
                return `
                <div class="card card--glass" style="padding: 12px; display: flex; gap: 12px; align-items: center;">
                  <span style="font-size: 20px; font-weight: bold; color: var(--color-primary); min-width: 40px;">${i + 1}.</span>
                  <input
                    type="text"
                    class="input email-input"
                    id="email-${i}"
                    data-index="${i}"
                    placeholder="email@example.com"
                    value="${email || ''}"
                    style="flex: 1; font-size: 18px; padding: 12px;"
                  >
                  <div style="font-size: 20px; font-weight: bold; color: var(--color-success); min-width: 80px; text-align: right;">$${price.toFixed(2)}</div>
                  ${state.emailAddresses.length > 1 ? `
                    <button class="btn btn--danger btn--small remove-email-btn" data-index="${i}" style="min-width: 50px; padding: 10px;">
                      ✕
                    </button>
                  ` : ''}
                </div>
              `;
              }).join('')}
            </div>

            ${canAddMore ? `
              <button class="btn btn--outline btn--large" id="addEmailBtn" style="width: 100%; margin-bottom: 12px; font-size: 18px; padding: 16px;">
                <span style="font-size: 24px; margin-right: 8px;">+</span>
                ADD ANOTHER EMAIL ${state.emailAddresses.length < maxEmails ? `(+$${emailPrices.length > 0 ? (config?.emailPricing?.[state.emailAddresses.length + 1] || 11).toFixed(2) : '10.00'})` : ''}
              </button>
            ` : `
              <div class="text-center" style="color: var(--color-warning); margin-bottom: 12px; font-size: 16px; padding: 12px; background: rgba(255,193,7,0.1); border-radius: 8px;">
                Maximum ${maxEmails} emails reached
              </div>
            `}

            ${createKeyboard('email-0')}
          </div>

          <div class="card card--glass" style="padding: 20px; height: fit-content; position: sticky; top: 0;">
            <div style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Email Summary</div>
            <div style="display: grid; gap: 12px; margin-bottom: 20px;">
              ${state.emailAddresses.map((email, i) => `
                <div style="display: flex; justify-content: space-between; padding: 8px; background: rgba(99,102,241,0.1); border-radius: 6px;">
                  <span style="font-size: 14px;">Email ${i + 1}</span>
                  <span style="font-size: 14px; font-weight: 600; color: var(--color-success);">$${emailPrices[i].toFixed(2)}</span>
                </div>
              `).join('')}
            </div>
            <div style="border-top: 2px solid var(--color-border); padding-top: 16px; margin-bottom: 20px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 20px; font-weight: bold;">Total:</span>
                <span style="font-size: 28px; font-weight: bold; color: var(--color-success);">$${totalEmailPrice.toFixed(2)}</span>
              </div>
            </div>
            <button class="btn btn--gradient-primary btn--large" id="nextBtn" style="width: 100%; font-size: 18px;">
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

      <main class="screen__body" style="padding: var(--space-sm) var(--space-md);">
        <div class="text-center mb-sm">
          <h1 style="font-size: 22px; font-weight: bold; margin-bottom: 4px;">Your Name</h1>
          <p style="font-size: 14px; color: var(--color-gray-500);">This will appear on your receipt</p>
        </div>

        <div style="margin: 0 auto var(--space-sm);">
          <input
            type="text"
            id="nameInput"
            class="input"
            placeholder="Enter your name..."
            value="${state.customerName || ''}"
            style="font-size: 20px; text-align: center; padding: 12px; margin-bottom: 8px;"
          >

          <div class="flex-center" style="margin-bottom: 8px;">
            <button class="btn btn--gradient-primary btn--large" id="nextBtn">
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

      <main class="screen__body" style="padding: 16px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
          <div class="card card--glass" style="padding: 20px;">
          <div style="display: grid; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 2px solid var(--color-border);">
              <div>
                <div style="font-size: 16px; font-weight: 600;">Background</div>
                <div style="font-size: 14px; color: var(--color-gray-500);">${state.backgroundName || 'Not selected'}</div>
              </div>
              <button class="btn btn--outline btn--small edit-btn" data-screen="background">Edit</button>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-md); border-bottom: 2px solid var(--color-border);">
              <div>
                <div class="text-lg font-semibold">Party Size</div>
                <div class="text-base text-gray">${state.partySize} ${state.partySize === 1 ? 'person' : 'people'}</div>
              </div>
              <button class="btn btn--outline btn--small edit-btn" data-screen="partySize">Edit</button>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-md); border-bottom: 2px solid var(--color-border);">
              <div>
                <div class="text-lg font-semibold">Delivery</div>
                <div class="text-base text-gray">${state.deliveryMethod === 'print' ? 'Printed' : state.deliveryMethod === 'email' ? 'Email' : 'Both'}</div>
              </div>
              <button class="btn btn--outline btn--small edit-btn" data-screen="delivery">Edit</button>
            </div>

            ${state.printQuantity > 0 ? `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-md); border-bottom: 2px solid var(--color-border);">
                <div>
                  <div class="text-lg font-semibold">Prints</div>
                  <div class="text-base text-gray">${state.printQuantity} ${state.printQuantity === 1 ? 'copy' : 'copies'} - $${printPrice.toFixed(2)}</div>
                </div>
                <button class="btn btn--outline btn--small edit-btn" data-screen="quantity">Edit</button>
              </div>
            ` : ''}

            ${state.emailQuantity > 0 ? `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-md); border-bottom: 2px solid var(--color-border);">
                <div>
                  <div class="text-lg font-semibold">Emails</div>
                  <div class="text-base text-gray">${state.emailQuantity} ${state.emailQuantity === 1 ? 'address' : 'addresses'} - $${emailPrice.toFixed(2)}</div>
                </div>
                <button class="btn btn--outline btn--small edit-btn" data-screen="email">Edit</button>
              </div>
            ` : ''}

            <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-md);">
              <div>
                <div class="text-lg font-semibold">Name</div>
                <div class="text-base text-gray">${state.customerName || 'Not entered'}</div>
              </div>
              <button class="btn btn--outline btn--small edit-btn" data-screen="name">Edit</button>
            </div>
          </div>

            <div style="margin-top: 20px; padding-top: 20px; border-top: 3px solid var(--color-border);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 24px; font-weight: bold;">Total:</div>
                <div style="font-size: 36px; font-weight: bold; color: var(--color-success);">$${total.toFixed(2)}</div>
              </div>
            </div>
          </div>

          <div class="card card--glass" style="padding: 20px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
            <div style="font-size: 20px; font-weight: 600; margin-bottom: 24px; text-align: center;">Ready to proceed?</div>
            <button class="btn btn--gradient-success" id="confirmBtn" style="width: 100%; padding: 24px; font-size: 22px;">
              LOOKS GOOD - CONTINUE →
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

      <main class="screen__body" style="padding: 16px;">
        <div class="card card--glass" style="padding: 20px; margin-bottom: 20px; text-align: center;">
          <div style="font-size: 18px; margin-bottom: 8px;">Total Amount</div>
          <div style="font-size: 48px; font-weight: bold; color: var(--color-success);">$${state.totalPrice.toFixed(2)}</div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 20px;">
          <button class="card card--glass card--interactive ${state.paymentMethod === 'cash' ? 'card--selected' : ''} payment-btn"
                  data-method="cash"
                  style="height: 160px; padding: 24px;">
            <div class="text-center">
              <div class="icon-document" style="color: var(--color-success); margin: 0 auto 16px; transform: scale(1.3);"></div>
              <div style="font-size: 24px; font-weight: bold;">CASH</div>
            </div>
          </button>

          <button class="card card--glass card--interactive ${state.paymentMethod === 'debit' ? 'card--selected' : ''} payment-btn"
                  data-method="debit"
                  style="height: 160px; padding: 24px;">
            <div class="text-center">
              <div class="icon-document" style="color: var(--color-primary); margin: 0 auto 16px; transform: scale(1.3);"></div>
              <div style="font-size: 24px; font-weight: bold;">DEBIT CARD</div>
            </div>
          </button>

          <button class="card card--glass card--interactive ${state.paymentMethod === 'credit' ? 'card--selected' : ''} payment-btn"
                  data-method="credit"
                  style="height: 160px; padding: 24px;">
            <div class="text-center">
              <div class="icon-document" style="color: var(--color-info); margin: 0 auto 16px; transform: scale(1.3);"></div>
              <div style="font-size: 24px; font-weight: bold;">CREDIT CARD</div>
            </div>
          </button>

          <button class="card card--glass card--interactive ${state.paymentMethod === 'check' ? 'card--selected' : ''} payment-btn"
                  data-method="check"
                  style="height: 160px; padding: 24px;">
            <div class="text-center">
              <div class="icon-check" style="color: var(--color-secondary); margin: 0 auto 16px; transform: scale(1.3);"></div>
              <div style="font-size: 24px; font-weight: bold;">CHECK</div>
            </div>
          </button>
        </div>

        <div class="flex-center">
          <button class="btn btn--gradient-primary btn--large" id="nextBtn" ${!state.paymentMethod ? 'disabled' : ''} style="font-size: 20px; padding: 20px 48px;">
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
  return `
    <div class="screen bg-gradient-success">
      <main class="screen__body" style="padding: var(--space-lg);">
        <div class="text-center mb-lg">
          <h1 class="text-4xl font-bold" style="color: white;">All Set!</h1>
          <p class="text-xl" style="color: rgba(255,255,255,0.9);">Receipts printing now...</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); max-width: 1000px; margin-bottom: var(--space-md);">
          <div class="card card--glass" style="padding: var(--space-lg);">
            <div class="text-center">
              <div class="text-xl font-bold mb-sm">Customer</div>
              <div class="icon-document" style="color: var(--color-primary); margin: var(--space-md) auto; transform: scale(1.5);"></div>
              <div class="text-3xl font-bold" style="color: var(--color-primary);">#${state.customerNumber}</div>
              <div class="text-sm text-gray">Keep this!</div>
            </div>
          </div>

          <div class="card card--glass" style="padding: var(--space-lg);">
            <div class="text-center">
              <div class="text-xl font-bold mb-sm">Camera Operator</div>
              <div class="icon-document" style="color: var(--color-secondary); margin: var(--space-md) auto; transform: scale(1.5);"></div>
              <div class="text-3xl font-bold" style="color: var(--color-secondary);">#${state.customerNumber}</div>
              <div class="text-sm text-gray">For records</div>
            </div>
          </div>
        </div>

        <div class="card card--glass" style="max-width: 1000px; padding: var(--space-lg); margin-bottom: var(--space-md);">
          <div class="text-2xl font-bold mb-md" style="color: var(--color-primary);">Next Steps:</div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-md);">
            <div style="text-align: center;">
              <div class="text-3xl font-bold mb-xs" style="color: var(--color-primary);">1</div>
              <div class="text-base">Take both receipts</div>
            </div>
            <div style="text-align: center;">
              <div class="text-3xl font-bold mb-xs" style="color: var(--color-primary);">2</div>
              <div class="text-base">Visit the photographer</div>
            </div>
            <div style="text-align: center;">
              <div class="text-3xl font-bold mb-xs" style="color: var(--color-primary);">3</div>
              <div class="text-base">Pick up prints later</div>
            </div>
          </div>
        </div>

        <div class="text-center">
          <div class="text-2xl font-bold" style="color: white;">Starting over in <span id="countdown">10</span> seconds...</div>
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
