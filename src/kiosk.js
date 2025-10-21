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
  screenHistory: [],               // NEW: Navigation history stack for back button
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
function createKeyboard(inputId, includeEmailShortcuts = false) {
  const keys = includeEmailShortcuts ? [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '@', '.'],
    ['@GMAIL', '@YAHOO', '@HOTMAIL', '@OUTLOOK'],
    ['SPACE', 'DELETE', 'DONE']
  ] : [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '@', '.', 'COM'],
    ['SPACE', 'DELETE', 'DONE']
  ];

  let html = '<div class="keyboard">';

  keys.forEach((row, rowIndex) => {
    html += '<div class="keyboard__row">';
    row.forEach(key => {
      const classes = ['keyboard__key'];
      if (key === 'SPACE') classes.push('keyboard__key--space');
      if (key === 'DELETE') classes.push('keyboard__key--delete', 'keyboard__key--wide');
      if (key === 'DONE') classes.push('keyboard__key--wide');
      if (key.startsWith('@')) classes.push('keyboard__key--shortcut');

      const displayText = {
        'SPACE': 'Space',
        'DELETE': '⌫ Delete',
        'DONE': '✓ Done',
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

      if (key === 'DONE') {
        // Trigger the next button click (simulates Enter key)
        const nextBtn = document.getElementById('nextBtn');
        if (nextBtn && !nextBtn.disabled) {
          nextBtn.click();
        }
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
        input.value += key.toLowerCase();
      }

      // Update state for email inputs
      if (input.classList.contains('email-input')) {
        const index = parseInt(input.dataset.index);
        if (!isNaN(index)) {
          state.emailAddresses[index] = input.value;
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
    ? `<div style="background: var(--gradient-success); padding: 24px 48px; border-radius: 16px; display: inline-block; box-shadow: var(--shadow-2xl);">
        <p style="font-size: 42px; font-weight: bold; color: white; margin: 0;">🎉 FREE TODAY! 🎉</p>
      </div>`
    : `<div style="background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); padding: 32px; border-radius: 20px; box-shadow: 0 8px 32px rgba(0,0,0,0.2);">
        <div style="font-size: 24px; font-weight: 600; color: white; margin-bottom: 20px;">PRICING</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px; max-width: 700px; margin: 0 auto;">
          <div>
            <div style="font-size: 18px; color: rgba(255,255,255,0.9); margin-bottom: 8px;">Prints Start At</div>
            <div style="font-size: 52px; font-weight: bold; color: white;">$${config?.basePrice?.toFixed(2) || '10.00'}</div>
          </div>
          <div>
            <div style="font-size: 18px; color: rgba(255,255,255,0.9); margin-bottom: 8px;">Email Delivery</div>
            <div style="font-size: 52px; font-weight: bold; color: white;">$${config?.emailPricing?.[1]?.toFixed(2) || '10.00'}</div>
          </div>
        </div>
      </div>`;

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
      <header style="display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; background: rgba(0,0,0,0.02); border-bottom: 1px solid var(--color-border); min-height: 50px; max-height: 50px;">
        <button class="btn btn--ghost btn--small" id="backBtn" style="min-height: 50px; font-size: 14px; padding: 8px 12px;">← Back</button>
        <div style="font-size: 16px; font-weight: 600;">Choose Background</div>
        <button class="btn btn--danger btn--small" id="startOverBtn" style="min-height: 50px; font-size: 14px; padding: 8px 12px;">✕</button>
      </header>

      <main style="flex: 1; display: flex; flex-direction: column; padding: 0; overflow: hidden; max-height: calc(100vh - 36px - 40px);">
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

        <!-- MAIN CONTENT AREA - LARGER PREVIEW -->
        <div style="flex: 1; display: grid; grid-template-columns: 1fr 550px; gap: 12px; padding: 12px; overflow: hidden;">
          <!-- LEFT: Background Grid (4 columns with proper sizing) -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; overflow-y: auto; align-content: start; padding-right: 8px;">
            ${filteredBackgrounds.map(bg => `
              <button class="background-btn ${state.selectedBackground === bg.id ? 'bg-selected' : ''}"
                      data-id="${bg.id}" data-name="${bg.name}"
                      style="position: relative; border-radius: 10px; overflow: hidden; cursor: pointer;
                      aspect-ratio: 4/3; min-height: 140px;
                      border: ${state.selectedBackground === bg.id ? '4px solid var(--color-success)' : '3px solid var(--color-border)'};
                      background: url('${bg.img}') center/cover; transition: all 0.2s;
                      box-shadow: ${state.selectedBackground === bg.id ? '0 0 0 4px rgba(16,185,129,0.3), var(--shadow-lg)' : 'var(--shadow-md)'};">
                <div style="position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.5));">
                  <div style="position: absolute; bottom: 8px; left: 8px; right: 8px;">
                    <div style="color: white; font-size: 14px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.8);">${bg.name}</div>
                  </div>
                </div>
                ${state.selectedBackground === bg.id ? '<div style="position: absolute; top: 6px; right: 6px; width: 28px; height: 28px; background: var(--color-success); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; color: white; font-weight: bold;">✓</div>' : ''}
              </button>
            `).join('')}
          </div>

          <!-- RIGHT: Preview & Actions -->
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <!-- Large Preview -->
            ${state.selectedBackground && state.selectedBackground !== 'custom' ? (() => {
              const selectedBg = backgrounds.find(bg => bg.id === state.selectedBackground);
              return selectedBg ? `
                <div style="flex: 1; position: relative; border-radius: 12px; overflow: hidden; background: url('${selectedBg.img}') center/cover; min-height: 400px; box-shadow: var(--shadow-xl); border: 3px solid var(--color-success);">
                  <div style="position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.6));">
                    <div style="position: absolute; bottom: 16px; left: 16px; right: 16px;">
                      <div style="color: white; font-size: 26px; font-weight: bold; text-shadow: 0 2px 8px rgba(0,0,0,0.9); margin-bottom: 6px;">${selectedBg.name}</div>
                      <div style="color: rgba(255,255,255,0.9); font-size: 16px; text-shadow: 0 2px 4px rgba(0,0,0,0.8);">✓ Selected</div>
                    </div>
                  </div>
                </div>
              ` : '';
            })() : state.selectedBackground === 'custom' ? `
              <div style="flex: 1; background: var(--gradient-secondary); border-radius: 10px; display: flex; align-items: center; justify-content: center; text-align: center; padding: 20px; box-shadow: var(--shadow-lg);">
                <div>
                  <div style="font-size: 40px; margin-bottom: 8px;">★</div>
                  <div style="font-size: 18px; font-weight: bold; color: white; margin-bottom: 4px;">CUSTOM</div>
                  <div style="font-size: 12px; color: rgba(255,255,255,0.9);">Tell photographer</div>
                </div>
              </div>
            ` : `
              <div style="flex: 1; background: var(--color-gray-100); border-radius: 10px; display: flex; align-items: center; justify-content: center; border: 2px dashed var(--color-border);">
                <div style="color: var(--color-gray-400); font-size: 14px; text-align: center;">
                  Select a<br>background
                </div>
              </div>
            `}

            <!-- Custom Background Option (D1: Improved explanation) -->
            <button class="background-btn ${state.selectedBackground === 'custom' ? 'bg-selected' : ''}"
                    data-id="custom" data-name="Custom"
                    style="height: 80px; background: var(--gradient-secondary); border-radius: 8px; border: ${state.selectedBackground === 'custom' ? '4px solid var(--color-success)' : '3px solid transparent'}; cursor: pointer; transition: all 0.2s; box-shadow: ${state.selectedBackground === 'custom' ? '0 0 0 4px rgba(16,185,129,0.3), var(--shadow-lg)' : 'var(--shadow-md)'}; padding: 12px;">
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; color: white;">
                <div style="display: flex; align-items: center; gap: 8px; font-weight: bold; font-size: 16px;">
                  <span style="font-size: 20px;">★</span>
                  CUSTOM BACKGROUND
                </div>
                <div style="font-size: 11px; opacity: 0.9; text-align: center;">Request a specific background from the photographer</div>
              </div>
            </button>

            <!-- Continue Button -->
            <button class="btn btn--gradient-success btn--large" id="nextBtn" ${!state.selectedBackground ? 'disabled' : ''}
                    style="height: 56px; font-size: 17px; font-weight: bold; box-shadow: var(--shadow-lg);">
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
      <header style="display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; background: rgba(0,0,0,0.02); border-bottom: 1px solid var(--color-border); min-height: 50px; max-height: 50px;">
        <button class="btn btn--ghost btn--small" id="backBtn" style="min-height: 50px; font-size: 14px; padding: 8px 12px;">← Back</button>
        <div style="font-size: 16px; font-weight: 600;">Party Size</div>
        <button class="btn btn--danger btn--small" id="startOverBtn" style="min-height: 50px; font-size: 14px; padding: 8px 12px;">✕</button>
      </header>

      <main style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 12px; max-height: calc(100vh - 36px - 40px);">
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
      <header style="display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; background: rgba(0,0,0,0.02); border-bottom: 1px solid var(--color-border); min-height: 50px; max-height: 50px;">
        <button class="btn btn--ghost btn--small" id="backBtn" style="min-height: 50px; font-size: 14px; padding: 8px 12px;">← Back</button>
        <div style="font-size: 16px; font-weight: 600;">Delivery Method</div>
        <button class="btn btn--danger btn--small" id="startOverBtn" style="min-height: 50px; font-size: 14px; padding: 8px 12px;">✕</button>
      </header>

      <main style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px; max-height: calc(100vh - 36px - 40px);">
        <h1 style="font-size: 28px; font-weight: bold; margin-bottom: 24px;">How would you like your photos?</h1>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; width: 100%; max-width: 1200px; margin-bottom: 20px;">
          <!-- PRINT OPTION -->
          <button class="delivery-btn" data-method="print"
                  style="height: 360px; border-radius: 16px; border: 4px solid ${state.deliveryMethod === 'print' ? 'var(--color-success)' : 'var(--color-border)'};
                  background: ${state.deliveryMethod === 'print' ? 'var(--gradient-primary)' : 'white'}; padding: 24px; cursor: pointer; transition: all 0.2s;
                  box-shadow: ${state.deliveryMethod === 'print' ? '0 0 0 6px rgba(16,185,129,0.3), var(--shadow-xl)' : 'var(--shadow-md)'};
                  display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
            <div class="icon-printer" style="color: ${state.deliveryMethod === 'print' ? 'white' : 'var(--color-primary)'}; transform: scale(1.5); margin-bottom: 16px;"></div>
            <div style="font-size: 26px; font-weight: bold; margin-bottom: 12px; color: ${state.deliveryMethod === 'print' ? 'white' : 'var(--color-gray-900)'};">PRINTED</div>
            <div style="font-size: 14px; line-height: 1.5; color: ${state.deliveryMethod === 'print' ? 'rgba(255,255,255,0.95)' : 'var(--color-gray-600)'}; margin-bottom: 16px;">
              • Physical 4x6 prints<br>
              • Glossy finish<br>
              • Take home tonight
            </div>
            <div style="font-size: 22px; font-weight: bold; color: ${state.deliveryMethod === 'print' ? 'white' : 'var(--color-success)'};">
              $${printMin.toFixed(2)} - $${printMax.toFixed(2)}
            </div>
          </button>

          <!-- EMAIL OPTION -->
          <button class="delivery-btn" data-method="email"
                  style="height: 360px; border-radius: 16px; border: 4px solid ${state.deliveryMethod === 'email' ? 'var(--color-success)' : 'var(--color-border)'};
                  background: ${state.deliveryMethod === 'email' ? 'var(--gradient-ocean)' : 'white'}; padding: 24px; cursor: pointer; transition: all 0.2s;
                  box-shadow: ${state.deliveryMethod === 'email' ? '0 0 0 6px rgba(16,185,129,0.3), var(--shadow-xl)' : 'var(--shadow-md)'};
                  display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
            <div class="icon-envelope" style="color: ${state.deliveryMethod === 'email' ? 'white' : 'var(--color-info)'}; transform: scale(1.5); margin-bottom: 16px;"></div>
            <div style="font-size: 26px; font-weight: bold; margin-bottom: 12px; color: ${state.deliveryMethod === 'email' ? 'white' : 'var(--color-gray-900)'};">EMAIL</div>
            <div style="font-size: 14px; line-height: 1.5; color: ${state.deliveryMethod === 'email' ? 'rgba(255,255,255,0.95)' : 'var(--color-gray-600)'}; margin-bottom: 16px;">
              • High-res digital copy<br>
              • Instant delivery<br>
              • Easy sharing
            </div>
            <div style="font-size: 22px; font-weight: bold; color: ${state.deliveryMethod === 'email' ? 'white' : 'var(--color-success)'};">
              $${emailBase.toFixed(2)} - $${emailMax.toFixed(2)}
            </div>
          </button>

          <!-- BOTH OPTION (BEST VALUE) -->
          <button class="delivery-btn" data-method="both"
                  style="height: 360px; border-radius: 16px; border: 4px solid ${state.deliveryMethod === 'both' ? 'var(--color-success)' : 'var(--color-border)'};
                  background: ${state.deliveryMethod === 'both' ? 'var(--gradient-purple)' : 'white'}; padding: 24px; cursor: pointer; transition: all 0.2s; position: relative;
                  box-shadow: ${state.deliveryMethod === 'both' ? '0 0 0 6px rgba(16,185,129,0.3), var(--shadow-2xl)' : 'var(--shadow-md)'};
                  display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
            ${state.deliveryMethod !== 'both' ? '<div style="position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--color-accent); color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; box-shadow: var(--shadow-lg);">⭐ BEST VALUE</div>' : ''}
            <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 16px;">
              <div class="icon-printer" style="color: ${state.deliveryMethod === 'both' ? 'white' : 'var(--color-primary)'}; transform: scale(1.3);"></div>
              <div style="font-size: 24px; font-weight: bold; color: ${state.deliveryMethod === 'both' ? 'white' : 'var(--color-gray-700)'};">+</div>
              <div class="icon-envelope" style="color: ${state.deliveryMethod === 'both' ? 'white' : 'var(--color-info)'}; transform: scale(1.3);"></div>
            </div>
            <div style="font-size: 26px; font-weight: bold; margin-bottom: 12px; color: ${state.deliveryMethod === 'both' ? 'white' : 'var(--color-gray-900)'};">BOTH</div>
            <div style="font-size: 14px; line-height: 1.5; color: ${state.deliveryMethod === 'both' ? 'rgba(255,255,255,0.95)' : 'var(--color-gray-600)'}; margin-bottom: 16px;">
              • Everything included<br>
              • Physical + Digital<br>
              • Best deal!
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

  // Show prints quantity (but only if we haven't selected print quantity yet, OR if we haven't selected email but need to)
  if (isPrintSelected && state.printQuantity === 0) {
    return `
      <div class="screen">
        <header style="display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; background: rgba(0,0,0,0.02); border-bottom: 1px solid var(--color-border); min-height: 50px; max-height: 50px;">
          <button class="btn btn--ghost btn--small" id="backBtn" style="min-height: 50px; font-size: 14px; padding: 8px 12px;">← Back</button>
          <div style="font-size: 16px; font-weight: 600;">Print Quantity</div>
          <button class="btn btn--danger btn--small" id="startOverBtn" style="min-height: 50px; font-size: 14px; padding: 8px 12px;">✕</button>
        </header>

        <main style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px; max-height: calc(100vh - 36px - 40px);">
          <h1 style="font-size: 28px; font-weight: bold; margin-bottom: 20px;">How many prints?</h1>

          <!-- Quantity Grid -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; width: 100%; max-width: 900px; margin-bottom: 20px;">
            ${[1,2,3,4,5,6,7,8].map((num) => {
              const price = config?.printPricing?.[num] || (10 + (num-1) * 5);
              const perPrintPrice = (price / num).toFixed(2);
              const isSelected = state.printQuantity === num;
              return `
                <button class="quantity-btn" data-quantity="${num}" data-type="print"
                        style="height: 140px; border-radius: 12px; border: 4px solid ${isSelected ? 'var(--color-success)' : 'var(--color-border)'};
                        background: ${isSelected ? 'var(--gradient-success)' : 'white'}; padding: 16px; cursor: pointer; transition: all 0.2s;
                        box-shadow: ${isSelected ? '0 0 0 6px rgba(16,185,129,0.3), var(--shadow-xl)' : 'var(--shadow-md)'};
                        display: flex; flex-direction: column; align-items: center; justify-content: center;">
                  <div style="font-size: 48px; font-weight: bold; line-height: 1; color: ${isSelected ? 'white' : 'var(--color-gray-900)'}; margin-bottom: 8px;">${num}</div>
                  <div style="width: 60%; height: 2px; background: ${isSelected ? 'rgba(255,255,255,0.4)' : 'var(--color-border)'}; margin-bottom: 8px;"></div>
                  <div style="font-size: 24px; font-weight: bold; color: ${isSelected ? 'white' : 'var(--color-success)'}; line-height: 1; margin-bottom: 4px;">$${price.toFixed(2)}</div>
                  <div style="font-size: 11px; color: ${isSelected ? 'rgba(255,255,255,0.8)' : 'var(--color-gray-500)'};">$${perPrintPrice} each</div>
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
      </div>
    `;
  }

  // For email-only delivery, skip quantity screen and go to email entry
  // This shouldn't render but if it does, show a simple transition screen
  return `
    <div class="screen">
      <main class="screen__body">
        <div class="text-center">
          <h1 class="text-3xl font-bold">Redirecting to email entry...</h1>
        </div>
      </main>
    </div>
  `;
}

// ============================================
// SCREEN 7: EMAIL ENTRY - REDESIGNED
// ============================================
function createEmailScreen() {
  // Ensure we have at least one email slot
  if (state.emailAddresses.length === 0) {
    state.emailAddresses = [''];
  }

  const config = state.config;
  const maxEmails = 8;
  const canAddMore = state.emailAddresses.length < maxEmails;

  // SIMPLIFIED: Email pricing is per recipient (base + $1 per additional)
  const baseEmailPrice = config?.emailPricing?.[1] || 10;
  const emailCount = state.emailAddresses.length;
  const totalEmailPrice = emailCount > 0 ? baseEmailPrice + (emailCount - 1) : 0;

  return `
    <div class="screen">
      <header style="display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; background: rgba(0,0,0,0.02); border-bottom: 1px solid var(--color-border); min-height: 50px; max-height: 50px;">
        <button class="btn btn--ghost btn--small" id="backBtn" style="min-height: 50px; font-size: 14px; padding: 8px 12px;">← Back</button>
        <div style="font-size: 16px; font-weight: 600;">Email Addresses</div>
        <button class="btn btn--danger btn--small" id="startOverBtn" style="min-height: 50px; font-size: 14px; padding: 8px 12px;">✕</button>
      </header>

      <main style="flex: 1; display: grid; grid-template-columns: 65% 35%; gap: 16px; padding: 12px; overflow: hidden; max-height: calc(100vh - 36px - 40px);">
        <!-- LEFT: Keyboard & Inputs (KEYBOARD AT BOTTOM) -->
        <div style="display: grid; grid-template-rows: 1fr auto; gap: 12px; min-height: 0;">
          <!-- Email Inputs (TAKES AVAILABLE SPACE - scrollable) -->
          <div style="overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding: 8px; background: var(--color-gray-50); border-radius: 10px; min-height: 200px;">
            ${state.emailAddresses.map((email, i) => `
              <div style="display: flex; gap: 8px; align-items: center;">
                <span style="font-size: 22px; font-weight: bold; color: var(--color-primary); min-width: 40px;">${i + 1}.</span>
                <input
                  type="text"
                  class="input email-input"
                  id="email-${i}"
                  data-index="${i}"
                  placeholder="email@example.com"
                  value="${email || ''}"
                  style="flex: 1; font-size: 18px; padding: 14px; border: 3px solid var(--color-border); border-radius: 10px;"
                >
                ${state.emailAddresses.length > 1 ? `
                  <button class="btn btn--danger btn--small remove-email-btn" data-index="${i}" style="min-width: 44px; min-height: 44px; padding: 8px; font-size: 18px; border-radius: 10px;">
                    ✕
                  </button>
                ` : ''}
              </div>
            `).join('')}

            ${canAddMore ? `
              <button class="btn btn--outline" id="addEmailBtn" style="width: 100%; height: 54px; font-size: 17px; font-weight: 700;">
                + ADD ANOTHER EMAIL (+$1)
              </button>
            ` : `
              <div style="text-align: center; color: var(--color-warning); font-size: 15px; padding: 12px; background: rgba(255,193,7,0.15); border-radius: 10px; font-weight: 700;">
                Maximum ${maxEmails} email addresses
              </div>
            `}
          </div>

          <!-- Keyboard (FIXED IN REMAINING SPACE) -->
          <div style="display: flex; flex-direction: column; min-height: 0;">
            ${createKeyboard('email-0', true)}
          </div>
        </div>

        <!-- RIGHT: Summary & Continue (FIXED LAYOUT) -->
        <div style="display: grid; grid-template-rows: auto auto 1fr auto; gap: 12px;">
          <!-- Summary Card -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; color: white; box-shadow: var(--shadow-lg);">
            <div style="font-size: 18px; font-weight: bold; margin-bottom: 16px;">Order Summary</div>

            <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="font-size: 14px;">Base price (1 email)</span>
                <span style="font-size: 16px; font-weight: bold;">$${baseEmailPrice.toFixed(2)}</span>
              </div>
              ${state.emailAddresses.length > 1 ? `
                <div style="display: flex; justify-content: space-between; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2);">
                  <span style="font-size: 14px;">+${state.emailAddresses.length - 1} additional</span>
                  <span style="font-size: 16px; font-weight: bold;">+$${(state.emailAddresses.length - 1).toFixed(2)}</span>
                </div>
              ` : ''}
            </div>

            <div style="border-top: 2px solid rgba(255,255,255,0.3); padding-top: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 16px; font-weight: 600;">Total:</span>
                <span style="font-size: 32px; font-weight: bold;">$${totalEmailPrice.toFixed(2)}</span>
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
          <button class="btn btn--gradient-success btn--large" id="nextBtn" style="width: 100%; height: 64px; font-size: 18px; font-weight: bold; box-shadow: var(--shadow-lg);">
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
      <header style="display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; background: rgba(0,0,0,0.02); border-bottom: 1px solid var(--color-border); min-height: 50px; max-height: 50px;">
        <button class="btn btn--ghost btn--small" id="backBtn" style="min-height: 50px; font-size: 14px; padding: 8px 12px;">← Back</button>
        <div style="font-size: 16px; font-weight: 600;">Your Name</div>
        <button class="btn btn--danger btn--small" id="startOverBtn" style="min-height: 50px; font-size: 14px; padding: 8px 12px;">✕</button>
      </header>

      <main style="flex: 1; display: flex; flex-direction: column; align-items: center; padding: 16px; max-height: calc(100vh - 36px - 40px); overflow: hidden;">
        <div style="width: 100%; max-width: 900px; display: flex; flex-direction: column; height: 100%; gap: 16px;">
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
    </div>
  `;
}

// ============================================
// SCREEN 9: REVIEW & EDIT - REDESIGNED
// ============================================
function createReviewScreen() {
  // Calculate total price (FIXED: use simplified email pricing)
  const printPrice = state.config?.printPricing?.[state.printQuantity] || 0;
  const emailCount = state.emailAddresses.length;
  const baseEmailPrice = state.config?.emailPricing?.[1] || 10;
  const emailPrice = emailCount > 0 ? baseEmailPrice + (emailCount - 1) : 0;
  const total = printPrice + emailPrice;
  state.totalPrice = total;

  return `
    <div class="screen">
      <header style="display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; background: rgba(0,0,0,0.02); border-bottom: 1px solid var(--color-border); min-height: 50px; max-height: 50px;">
        <button class="btn btn--ghost btn--small" id="backBtn" style="min-height: 50px; font-size: 14px; padding: 8px 12px;">← Back</button>
        <div style="font-size: 16px; font-weight: 600;">Review Order</div>
        <button class="btn btn--danger btn--small" id="startOverBtn" style="min-height: 50px; font-size: 14px; padding: 8px 12px;">✕</button>
      </header>

      <main style="flex: 1; display: grid; grid-template-columns: 1fr 400px; gap: 16px; padding: 16px; max-height: calc(100vh - 36px - 40px);">
        <!-- LEFT: Order Details -->
        <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: var(--shadow-md); overflow-y: auto;">
          <h2 style="font-size: 22px; font-weight: bold; margin-bottom: 20px; color: var(--color-gray-900);">Order Details</h2>

          <!-- Review Items -->
          <div style="display: grid; gap: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: var(--color-gray-50); border-radius: 10px;">
              <div style="flex: 1;">
                <div style="font-size: 15px; font-weight: 600; color: var(--color-gray-700); margin-bottom: 4px;">Background</div>
                <div style="font-size: 14px; color: var(--color-gray-600);">${state.backgroundName || 'Not selected'}</div>
              </div>
              <button class="btn btn--outline btn--small edit-btn" data-screen="background" style="font-size: 13px; padding: 6px 12px;">Edit</button>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: var(--color-gray-50); border-radius: 10px;">
              <div style="flex: 1;">
                <div style="font-size: 15px; font-weight: 600; color: var(--color-gray-700); margin-bottom: 4px;">Party Size</div>
                <div style="font-size: 14px; color: var(--color-gray-600);">${state.partySize} ${state.partySize === 1 ? 'person' : 'people'}</div>
              </div>
              <button class="btn btn--outline btn--small edit-btn" data-screen="partySize" style="font-size: 13px; padding: 6px 12px;">Edit</button>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: var(--color-gray-50); border-radius: 10px;">
              <div style="flex: 1;">
                <div style="font-size: 15px; font-weight: 600; color: var(--color-gray-700); margin-bottom: 4px;">Delivery</div>
                <div style="font-size: 14px; color: var(--color-gray-600);">${state.deliveryMethod === 'print' ? 'Printed' : state.deliveryMethod === 'email' ? 'Email' : 'Both'}</div>
              </div>
              <button class="btn btn--outline btn--small edit-btn" data-screen="delivery" style="font-size: 13px; padding: 6px 12px;">Edit</button>
            </div>

            ${state.printQuantity > 0 ? `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: var(--color-gray-50); border-radius: 10px;">
                <div style="flex: 1;">
                  <div style="font-size: 15px; font-weight: 600; color: var(--color-gray-700); margin-bottom: 4px;">Prints</div>
                  <div style="font-size: 14px; color: var(--color-gray-600);">${state.printQuantity} ${state.printQuantity === 1 ? 'copy' : 'copies'} • $${printPrice.toFixed(2)}</div>
                </div>
                <button class="btn btn--outline btn--small edit-btn" data-screen="quantity" style="font-size: 13px; padding: 6px 12px;">Edit</button>
              </div>
            ` : ''}

            ${emailCount > 0 ? `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: var(--color-gray-50); border-radius: 10px;">
                <div style="flex: 1;">
                  <div style="font-size: 15px; font-weight: 600; color: var(--color-gray-700); margin-bottom: 4px;">Emails</div>
                  <div style="font-size: 14px; color: var(--color-gray-600);">${emailCount} ${emailCount === 1 ? 'recipient' : 'recipients'} • $${emailPrice.toFixed(2)}</div>
                </div>
                <button class="btn btn--outline btn--small edit-btn" data-screen="email" style="font-size: 13px; padding: 6px 12px;">Edit</button>
              </div>
            ` : ''}

            <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: var(--color-gray-50); border-radius: 10px;">
              <div style="flex: 1;">
                <div style="font-size: 15px; font-weight: 600; color: var(--color-gray-700); margin-bottom: 4px;">Name</div>
                <div style="font-size: 14px; color: var(--color-gray-600);">${state.customerName || 'Not entered'}</div>
              </div>
              <button class="btn btn--outline btn--small edit-btn" data-screen="name" style="font-size: 13px; padding: 6px 12px;">Edit</button>
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

          <!-- Info Card -->
          <div style="background: var(--color-gray-50); padding: 20px; border-radius: 12px; text-align: center;">
            <div style="font-size: 14px; color: var(--color-gray-600); line-height: 1.6;">
              Review your order carefully.<br>You can edit any item above.
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

  // Filter payment methods by config (D5)
  const paymentMethods = [
    { id: 'cash', label: 'CASH', emoji: '💵', enabled: config?.features?.cash !== false },
    { id: 'debit', label: 'DEBIT', emoji: '💳', enabled: true }, // Always available
    { id: 'credit', label: 'CREDIT', emoji: '💳', enabled: config?.features?.creditCard !== false },
    { id: 'check', label: 'CHECK', emoji: '🏦', enabled: config?.features?.check === true }
  ].filter(method => method.enabled);

  return `
    <div class="screen">
      <header style="display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; background: rgba(0,0,0,0.02); border-bottom: 1px solid var(--color-border); min-height: 50px; max-height: 50px;">
        <button class="btn btn--ghost btn--small" id="backBtn" style="min-height: 50px; font-size: 14px; padding: 8px 12px;">← Back</button>
        <div style="font-size: 16px; font-weight: 600;">Payment Method</div>
        <button class="btn btn--danger btn--small" id="startOverBtn" style="min-height: 50px; font-size: 14px; padding: 8px 12px;">✕</button>
      </header>

      <main style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; max-height: calc(100vh - 36px - 40px);">
        <!-- Total Amount -->
        <div style="background: var(--gradient-success); padding: 24px 48px; border-radius: 16px; margin-bottom: 40px; text-align: center; box-shadow: var(--shadow-xl);">
          <div style="font-size: 18px; color: white; opacity: 0.95; margin-bottom: 8px;">Total Amount</div>
          <div style="font-size: 56px; font-weight: bold; color: white; line-height: 1;">$${state.totalPrice.toFixed(2)}</div>
        </div>

        <h1 style="font-size: 32px; font-weight: bold; margin-bottom: 32px; text-align: center;">How will you pay?</h1>

        <!-- Payment Options (D5: Filtered by config) -->
        <div style="display: grid; grid-template-columns: repeat(${Math.min(paymentMethods.length, 4)}, 1fr); gap: 16px; width: 100%; max-width: ${paymentMethods.length * 260}px; margin-bottom: 30px;">
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

        <!-- Continue Button -->
        <button class="btn btn--gradient-primary btn--large" id="nextBtn" ${!state.paymentMethod ? 'disabled' : ''}
                style="width: 100%; max-width: 600px; height: 70px; font-size: 20px; font-weight: bold; box-shadow: var(--shadow-lg);">
          CONTINUE →
        </button>
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
      <header style="display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; background: rgba(0,0,0,0.02); border-bottom: 1px solid var(--color-border); min-height: 50px; max-height: 50px;">
        <button class="btn btn--ghost btn--small" id="backBtn" style="min-height: 50px; font-size: 14px; padding: 8px 12px;">← Back</button>
        <div style="font-size: 16px; font-weight: 600;">Customer ID Photo</div>
        <button class="btn btn--danger btn--small" id="startOverBtn" style="min-height: 50px; font-size: 14px; padding: 8px 12px;">✕</button>
      </header>

      <main style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; max-height: calc(100vh - 36px - 40px);">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="font-size: 38px; font-weight: bold; margin-bottom: 10px;">📸 Smile!</h1>
          <p style="font-size: 18px; color: var(--color-gray-600);">This helps us match you to your final photo</p>
        </div>

        <!-- Camera Preview -->
        <div style="position: relative; width: 100%; max-width: 900px; aspect-ratio: 4/3; background: var(--color-gray-900); border-radius: 20px; overflow: hidden; box-shadow: var(--shadow-2xl); margin-bottom: 28px;">
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
        <button class="btn btn--danger btn--small" id="startOverBtn" style="min-height: 50px; font-size: 14px; padding: 8px 12px;">✕</button>
      </header>

      <main style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; max-height: calc(100vh - 36px - 40px); gap: 20px;">
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
  // Ensure customer number is generated (defensive programming)
  if (!state.customerNumber) {
    state.customerNumber = generateCustomerNumber();
  }

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

            ${state.customerPhoto ? `
              <div style="margin-bottom: 10px; text-align: center;">
                <div style="font-weight: bold; font-size: 10px; margin-bottom: 4px;">CUSTOMER ID PHOTO:</div>
                <img src="${state.customerPhoto}" alt="Customer ID" style="width: 100%; max-width: 250px; height: auto; border: 2px solid #333; border-radius: 4px; margin: 0 auto; display: block;">
              </div>
            ` : ''}

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

        <div style="text-align: center; margin-top: 12px; display: flex; flex-direction: column; gap: 10px; align-items: center;">
          <button class="btn btn--gradient-primary btn--large" id="printBtn" style="font-size: 16px; padding: 14px 32px;">
            <span class="icon-printer" style="transform: scale(1.0);"></span>
            <span>PRINT RECEIPTS</span>
          </button>
          <div style="font-size: 14px; color: var(--color-gray-600);">Returning to start in <span id="countdown">30</span> seconds...</div>
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

  // NO FLASHBANG - instant render
  app.innerHTML = html;
  attachEventListeners();
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
      render(); // Re-render to update selection state
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

      // Reset quantities when delivery method changes
      if (state.deliveryMethod === 'print') {
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

  // Add email button (with real-time pricing and duplicate prevention - T3)
  const addEmailBtn = document.getElementById('addEmailBtn');
  if (addEmailBtn) {
    addEmailBtn.addEventListener('click', () => {
      state.emailAddresses.push('');
      render();
    });
  }

  // Validate for duplicates on blur (T3)
  emailInputs.forEach(input => {
    input.addEventListener('blur', (e) => {
      const currentEmail = e.target.value.trim().toLowerCase();
      if (!currentEmail) return;

      const currentIndex = parseInt(e.target.dataset.index);
      const hasDuplicate = state.emailAddresses.some((email, index) =>
        index !== currentIndex && email.trim().toLowerCase() === currentEmail
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
      const index = parseInt(btn.dataset.index);
      state.emailAddresses.splice(index, 1);
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

  // AUTO-FOCUS: Email inputs (M7)
  const firstEmailInput = document.getElementById('email-0');
  if (firstEmailInput) {
    setTimeout(() => firstEmailInput.focus(), 100);
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
        // If email only, go back to delivery; otherwise go to quantity
        if (state.deliveryMethod === 'email') {
          state.currentScreen = 'delivery';
        } else if (state.deliveryMethod === 'both' && state.printQuantity > 0) {
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
      } else if (state.currentScreen === 'photo') {
        // Stop webcam before going back
        stopWebcam();
        state.currentScreen = 'payment';
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
        state.currentScreen = 'photoConfirm';
        render();
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
      state.currentScreen = 'processing';
      render();
      setTimeout(() => {
        state.currentScreen = 'receipt';
        render();
      }, 3000);
    });
  }

  // ==================== PHOTO CONFIRMATION SCREEN ====================
  const retakeBtn = document.getElementById('retakeBtn');
  if (retakeBtn) {
    retakeBtn.addEventListener('click', () => {
      state.customerPhoto = null;
      state.photoCaptured = false;
      state.currentScreen = 'photo';
      render();
    });
  }

  const usePhotoBtn = document.getElementById('usePhotoBtn');
  if (usePhotoBtn) {
    usePhotoBtn.addEventListener('click', () => {
      // Advance to processing
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
  const printBtn = document.getElementById('printBtn');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
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
        state.currentScreen = 'attract';
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
        render();
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
        state.currentScreen = 'partySize';
      } else if (state.currentScreen === 'partySize') {
        state.currentScreen = 'delivery';
      } else if (state.currentScreen === 'delivery') {
        // If email only, skip quantity and go straight to email
        if (state.deliveryMethod === 'email') {
          state.currentScreen = 'email';
        } else {
          state.currentScreen = 'quantity';
        }
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
