# Greenscreen Sprint - Refactoring Plan

## Executive Summary

This document outlines a comprehensive refactoring strategy for the Greenscreen Sprint kiosk application. The refactoring maintains the single-file architecture (as specified in CLAUDE.md) while significantly improving code organization, maintainability, and documentation.

**Current State:**
- **kiosk.js**: 2,633 lines (50+ functions, mixed concerns)
- **style.css**: 1,785 lines (well-organized with BEM)
- **index.html**: Mix of templates and inline styles
- **Status**: Functional but needs better organization

**Goals:**
1. ✅ Improve code organization without breaking functionality
2. ✅ Add comprehensive documentation
3. ✅ Extract reusable patterns
4. ✅ Enhance maintainability
5. ✅ Keep single-file architecture

---

## 1. Code Organization Improvements

### Current Structure Issues

**Problems:**
- ❌ Mixed concerns (state, UI, business logic)
- ❌ Duplicate functions (two `calculateCurrentPrice` functions found)
- ❌ Inconsistent patterns
- ❌ Hard to find specific functionality
- ❌ Limited documentation

### Proposed Structure

Reorganize `kiosk.js` into clearly delineated sections with banner comments:

```javascript
/**
 * GREENSCREEN KIOSK - Single File Version
 * Organized refactored structure for better maintainability
 * Last Updated: [DATE]
 */

// ============================================
// SECTION 1: CONSTANTS & CONFIGURATION (Lines 1-150)
// ============================================
// - Global constants
// - Default configurations
// - Feature flags

// ============================================
// SECTION 2: STATE MANAGEMENT (Lines 151-300)
// ============================================
// - State object definition
// - State persistence (save/load/restore)
// - State validation

// ============================================
// SECTION 3: UTILITY FUNCTIONS (Lines 301-500)
// ============================================
// - Template utilities (cloneTemplate, bindData, insertDynamic)
// - Navigation helpers (navigateTo, goBack)
// - ID generators (generateCustomerNumber, generateEmailId)
// - Date/time utilities

// ============================================
// SECTION 4: CONFIGURATION & API (Lines 501-650)
// ============================================
// - Config parser (parseConfig, loadConfig)
// - API integration (submitOrderToAPI)
// - Error handling

// ============================================
// SECTION 5: BUSINESS LOGIC (Lines 651-850)
// ============================================
// - Price calculation (single unified function)
// - Email validation
// - Form validation
// - Delivery method logic

// ============================================
// SECTION 6: UI COMPONENTS (Lines 851-1100)
// ============================================
// - Reusable components:
//   - createProgressBar()
//   - createPricePreviewBadge()
//   - createKeyboard()
//   - createConfetti()
// - Component helpers

// ============================================
// SECTION 7: SCREEN CREATORS (Lines 1101-2100)
// ============================================
// Organized by workflow order:
// 7.1 Attract & Welcome Screens
// 7.2 Customer Info Screens (Name, Party Size)
// 7.3 Selection Screens (Background, Delivery, Quantity)
// 7.4 Data Entry Screens (Email, Payment)
// 7.5 Photo Screens (Capture, Confirm)
// 7.6 Final Screens (Review, Processing, Receipt)

// ============================================
// SECTION 8: EVENT HANDLERS (Lines 2101-2400)
// ============================================
// - Keyboard listeners
// - Button click handlers
// - Form submission handlers
// - Webcam handlers
// - Modal handlers

// ============================================
// SECTION 9: RENDERING ENGINE (Lines 2401-2500)
// ============================================
// - render() function
// - attachEventListeners() function
// - Screen transition logic

// ============================================
// SECTION 10: INITIALIZATION (Lines 2501-2633)
// ============================================
// - setupKeyboardShortcuts()
// - showResumePrompt()
// - init() function
// - App bootstrap
```

---

## 2. Specific Refactorings Needed

### 2.1 Remove Duplicate Functions

**Issue:** Two `calculateCurrentPrice()` functions exist (lines 103 and 613)

**Fix:**
```javascript
/**
 * Calculate current total price based on delivery method and selections
 * Handles free mode, print pricing, and email pricing
 * @returns {number} Total price in dollars
 */
function calculateCurrentPrice() {
  const config = state.config;
  if (!config || config.features?.freeMode) return 0;

  let total = 0;

  // Print pricing
  if (state.deliveryMethod === 'print' || state.deliveryMethod === 'both') {
    total += config.printPricing?.[state.printQuantity] || 0;
  }

  // Email pricing (base + $1 per additional recipient)
  if (state.deliveryMethod === 'email' || state.deliveryMethod === 'both') {
    const baseEmailPrice = config.emailPricing?.[1] || 10;
    const validEmails = state.emailAddresses.filter(email =>
      (typeof email === 'object' ? email.value : email)?.trim()
    );
    if (validEmails.length > 0) {
      total += baseEmailPrice + (validEmails.length - 1);
    }
  }

  return total;
}
```

### 2.2 Extract Validation Functions

**Current:** Validation logic scattered throughout screen creators

**Proposed:**
```javascript
// ============================================
// VALIDATION UTILITIES
// ============================================

/**
 * Validate email address format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Validate customer name (not empty, reasonable length)
 * @param {string} name - Name to validate
 * @returns {{valid: boolean, error: string}} Validation result
 */
function validateCustomerName(name) {
  if (!name || !name.trim()) {
    return { valid: false, error: 'Please enter your name' };
  }
  if (name.length > 50) {
    return { valid: false, error: 'Name is too long' };
  }
  return { valid: true, error: '' };
}

/**
 * Validate party size selection
 * @param {number} size - Party size to validate
 * @returns {{valid: boolean, error: string}} Validation result
 */
function validatePartySize(size) {
  if (!size || size < 1) {
    return { valid: false, error: 'Please select party size' };
  }
  return { valid: true, error: '' };
}
```

### 2.3 Improve State Management

**Add State Validation:**
```javascript
/**
 * Validate current state before proceeding to next screen
 * @param {string} currentScreen - Current screen name
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
function validateStateForScreen(currentScreen) {
  const errors = [];

  switch (currentScreen) {
    case 'name':
      const nameValidation = validateCustomerName(state.customerName);
      if (!nameValidation.valid) errors.push(nameValidation.error);
      break;

    case 'partySize':
      const sizeValidation = validatePartySize(state.partySize);
      if (!sizeValidation.valid) errors.push(sizeValidation.error);
      break;

    case 'background':
      if (!state.selectedBackground) {
        errors.push('Please select a background');
      }
      break;

    case 'delivery':
      if (!state.deliveryMethod) {
        errors.push('Please select a delivery method');
      }
      break;

    case 'email':
      if (state.emailAddresses.length === 0) {
        errors.push('Please add at least one email address');
      }
      const invalidEmails = state.emailAddresses.filter(email =>
        !isValidEmail(typeof email === 'object' ? email.value : email)
      );
      if (invalidEmails.length > 0) {
        errors.push('Some email addresses are invalid');
      }
      break;

    case 'payment':
      if (!state.paymentMethod) {
        errors.push('Please select a payment method');
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

### 2.4 Consolidate Keyboard Logic

**Extract Keyboard State Management:**
```javascript
// ============================================
// KEYBOARD STATE MANAGEMENT
// ============================================

const keyboardState = {
  capsLock: false,
  shift: false
};

/**
 * Toggle caps lock and update UI
 */
function toggleCapsLock() {
  keyboardState.capsLock = !keyboardState.capsLock;
  if (keyboardState.capsLock) {
    keyboardState.shift = false;
    updateShiftButtonUI(false);
  }
  updateCapsLockButtonUI(keyboardState.capsLock);
}

/**
 * Enable shift (one-time use)
 */
function enableShift() {
  keyboardState.shift = true;
  updateShiftButtonUI(true);
}

/**
 * Disable shift after use
 */
function disableShift() {
  keyboardState.shift = false;
  updateShiftButtonUI(false);
}

/**
 * Update visual state of CAPS LOCK buttons
 * @param {boolean} active - Whether caps lock is active
 */
function updateCapsLockButtonUI(active) {
  const capsButtons = document.querySelectorAll('.keyboard__key--caps');
  capsButtons.forEach(btn => {
    if (active) {
      btn.style.background = 'var(--color-primary)';
      btn.style.color = 'white';
      btn.style.fontWeight = 'bold';
    } else {
      btn.style.background = '';
      btn.style.color = '';
      btn.style.fontWeight = '';
    }
  });
}

/**
 * Update visual state of SHIFT buttons
 * @param {boolean} active - Whether shift is active
 */
function updateShiftButtonUI(active) {
  const shiftButtons = document.querySelectorAll('.keyboard__key--shift');
  shiftButtons.forEach(btn => {
    if (active) {
      btn.style.background = 'var(--color-warning)';
      btn.style.color = 'white';
      btn.style.fontWeight = 'bold';
    } else {
      btn.style.background = '';
      btn.style.color = '';
      btn.style.fontWeight = '';
    }
  });
}
```

---

## 3. Documentation Improvements

### 3.1 Add JSDoc Comments to All Functions

**Before:**
```javascript
function calculateCurrentPrice() {
  const config = state.config;
  if (!config) return 0;
  // ...
}
```

**After:**
```javascript
/**
 * Calculate the current total price based on selected delivery method and quantities.
 *
 * Pricing logic:
 * - Free mode: Always returns 0
 * - Print: Uses config.printPricing[quantity]
 * - Email: Base price + $1 per additional recipient
 * - Both: Sum of print and email prices
 *
 * @returns {number} Total price in USD (e.g., 25.00)
 *
 * @example
 * // Print only - 2 copies
 * state.deliveryMethod = 'print';
 * state.printQuantity = 2;
 * calculateCurrentPrice(); // Returns 15.00 (based on config)
 *
 * @example
 * // Email only - 3 recipients
 * state.deliveryMethod = 'email';
 * state.emailAddresses = [{value: 'a@b.com'}, {value: 'c@d.com'}, {value: 'e@f.com'}];
 * calculateCurrentPrice(); // Returns 12.00 (10 base + 2 additional)
 */
function calculateCurrentPrice() {
  // Implementation
}
```

### 3.2 Add Section Headers with Context

```javascript
// ============================================
// SECTION 3: UTILITY FUNCTIONS
// ============================================
// This section contains pure utility functions that have no side effects
// and can be used throughout the application.
//
// Organization:
// - Template utilities: DOM manipulation helpers
// - Navigation: Screen flow management
// - Generators: ID and number generation
// - Formatters: Date, currency, etc.
//
// All functions in this section should:
// - Have clear JSDoc comments
// - Be pure or clearly document side effects
// - Handle edge cases gracefully
// - Return consistent data types
// ============================================
```

---

## 4. HTML Template Improvements

### 4.1 Move Inline Styles to CSS Classes

**Current Problem:**
```html
<button style="font-size: 28px; font-weight: 900; color: var(--color-primary); min-width: 36px;">
```

**Proposed:**
```css
/* style.css - Add new utility classes */
.text-jumbo {
  font-size: 28px;
  font-weight: 900;
}

.text-primary {
  color: var(--color-primary);
}

.min-w-touch {
  min-width: 50px;
}
```

```html
<button class="text-jumbo text-primary min-w-touch">
```

### 4.2 Create Reusable Header Template

**Extract Standard Header:**
```html
<!-- TEMPLATE: Standard Screen Header Component -->
<template id="standard-header-template">
  <header class="screen__header screen__header--standard">
    <button class="btn btn--ghost btn--small" data-action="back">
      ← Back
    </button>
    <div class="screen__title" data-bind="title">
      Screen Title
    </div>
    <button class="btn btn--danger btn--small" data-action="quit">
      ✕
    </button>
  </header>
</template>
```

**Usage:**
```javascript
function createHeader(title) {
  const fragment = cloneTemplate('standard-header-template');
  bindData(fragment, { title });
  return fragment;
}
```

---

## 5. Performance Optimizations

### 5.1 Event Delegation for Keyboard

**Current:** Individual listeners for each key (can be 40+ listeners)

**Proposed:**
```javascript
/**
 * Attach single delegated listener for keyboard
 * Much more efficient than individual listeners per key
 */
function attachKeyboardDelegation() {
  const keyboard = document.querySelector('.keyboard');
  if (!keyboard) return;

  keyboard.addEventListener('click', (e) => {
    const keyButton = e.target.closest('.keyboard__key');
    if (!keyButton) return;

    const key = keyButton.dataset.key;
    const inputId = keyButton.dataset.inputId;
    const input = document.getElementById(inputId);

    if (!input) return;

    handleKeyPress(key, input);
  });
}

/**
 * Handle individual key press
 * @param {string} key - Key identifier
 * @param {HTMLElement} input - Target input element
 */
function handleKeyPress(key, input) {
  switch (key) {
    case 'SHIFT':
      enableShift();
      break;
    case 'CAPS':
      toggleCapsLock();
      break;
    case 'DELETE':
      input.value = input.value.slice(0, -1);
      break;
    case 'SPACE':
      input.value += ' ';
      break;
    // ... other cases
    default:
      insertCharacter(key, input);
  }

  updateInputState(input);
}
```

### 5.2 Lazy Load Background Images

**Current:** All background images load immediately

**Proposed:**
```javascript
/**
 * Implement intersection observer for lazy loading
 * Only load images when they're about to become visible
 */
function setupLazyLoadingForBackgrounds() {
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.dataset.src;
        if (src) {
          img.src = src;
          img.removeAttribute('data-src');
          imageObserver.unobserve(img);
        }
      }
    });
  }, {
    rootMargin: '50px' // Start loading 50px before visible
  });

  document.querySelectorAll('img[data-src]').forEach(img => {
    imageObserver.observe(img);
  });
}
```

---

## 6. Error Handling Improvements

### 6.1 Global Error Handler

```javascript
/**
 * Global error handler for uncaught errors
 * Shows user-friendly message and logs for debugging
 */
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);

  showErrorMessage({
    title: 'Something went wrong',
    message: 'Please tap the ✕ button to start over.',
    technical: event.error.message
  });
});

/**
 * Display error message to user
 * @param {{title: string, message: string, technical?: string}} error
 */
function showErrorMessage({ title, message, technical }) {
  // Create modal with error details
  const html = `
    <div class="modal modal--error" id="errorModal">
      <div class="modal__backdrop"></div>
      <div class="modal__content">
        <h2 class="text-2xl font-bold mb-md">${title}</h2>
        <p class="text-lg mb-lg">${message}</p>
        ${technical ? `<p class="text-sm text-gray">${technical}</p>` : ''}
        <button class="btn btn--primary btn--large w-full" onclick="closeErrorModal()">
          OK
        </button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);
}
```

### 6.2 API Error Handling

```javascript
/**
 * Submit order to API with comprehensive error handling
 * @returns {Promise<Object>} API response
 * @throws {Error} If submission fails
 */
async function submitOrderToAPI() {
  try {
    const orderData = buildOrderData();

    const response = await fetch('http://localhost:5000/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Transaction failed');
    }

    return result;

  } catch (error) {
    console.error('Order submission failed:', error);

    // Handle different error types
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection.');
    } else if (error instanceof TypeError) {
      throw new Error('Network error. Please check your connection.');
    }

    throw error;
  }
}
```

---

## 7. Testing Strategy

### 7.1 Manual Test Checklist

Create a comprehensive test checklist:

```markdown
## Manual Testing Checklist

### Attract Loop
- [ ] Displays correct theme and event name from config
- [ ] Shows pricing information
- [ ] Tap anywhere advances to welcome screen
- [ ] Returns to attract after 60s of inactivity

### Welcome Screen
- [ ] Displays "How It Works" section
- [ ] Start button advances to name entry
- [ ] Config values displayed correctly

### Name Entry
- [ ] On-screen keyboard works (all keys)
- [ ] Caps lock toggles correctly
- [ ] Shift works (one-time)
- [ ] Delete removes characters
- [ ] Name saves to state
- [ ] Can proceed with valid name
- [ ] Cannot proceed with empty name

### Party Size
- [ ] Numbers 1-9 selectable
- [ ] 10+ button shows input
- [ ] Selection visually indicated
- [ ] Party size saves to state

### Background Selection
- [ ] All categories display (Nature, Urban, Sky, Abstract)
- [ ] Category tabs switch views
- [ ] Background images load
- [ ] Selection visually indicated
- [ ] Preview shows selected background
- [ ] Continue button enabled when selected

### Delivery Method
- [ ] Print option available (if PF=1)
- [ ] Email option available (if EF=1)
- [ ] Both option available
- [ ] Selection visually indicated
- [ ] Price preview updates

### Quantity Selection
- [ ] Print quantity buttons work (1-8)
- [ ] Email recipient adding works
- [ ] Email validation on add
- [ ] Email removal works
- [ ] Price updates in real-time

### Payment Method
- [ ] Credit card option (if CC=1)
- [ ] Cash option (if CK=1)
- [ ] Check option (if CUS=1)
- [ ] Selection visually indicated

### Photo Capture
- [ ] Webcam initializes
- [ ] Capture button takes photo
- [ ] Retake button allows re-capture
- [ ] Photo preview displays

### Review Screen
- [ ] All selections displayed
- [ ] Prices calculated correctly
- [ ] Edit buttons navigate back
- [ ] Confirm proceeds to processing

### Receipt
- [ ] Customer number generated
- [ ] All details displayed correctly
- [ ] Print button triggers print
- [ ] Done button returns to attract

### Navigation
- [ ] Back button works on all screens
- [ ] Quit (✕) button shows confirmation
- [ ] Confirm quit returns to attract
- [ ] Cancel quit stays on screen
- [ ] Progress bar updates correctly
```

### 7.2 State Validation Tests

```javascript
/**
 * Test state validation logic
 * Run in browser console
 */
function runStateValidationTests() {
  console.log('Running state validation tests...');

  // Test 1: Empty name
  state.customerName = '';
  const test1 = validateStateForScreen('name');
  console.assert(!test1.valid, 'Test 1 failed: Empty name should be invalid');

  // Test 2: Valid name
  state.customerName = 'John Doe';
  const test2 = validateStateForScreen('name');
  console.assert(test2.valid, 'Test 2 failed: Valid name should be valid');

  // Test 3: No background selected
  state.selectedBackground = null;
  const test3 = validateStateForScreen('background');
  console.assert(!test3.valid, 'Test 3 failed: No background should be invalid');

  // Test 4: Invalid email
  state.emailAddresses = [{ value: 'invalid-email' }];
  const test4 = validateStateForScreen('email');
  console.assert(!test4.valid, 'Test 4 failed: Invalid email should be invalid');

  console.log('All tests completed!');
}
```

---

## 8. CSS Refactoring Opportunities

### 8.1 Create Component-Specific CSS

**Current:** Inline styles mixed with CSS classes

**Proposed:** Move all component styles to CSS

```css
/* ============================================
   BACKGROUND SELECTION SCREEN COMPONENTS
   ============================================ */

.category-tabs {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  background: var(--color-gray-100);
  border-bottom: 2px solid var(--color-border);
}

.category-tab {
  flex: 1;
  padding: 16px 20px;
  border-radius: 10px;
  font-size: 18px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: all var(--transition-base);
  background: white;
  color: var(--color-gray-700);
  box-shadow: var(--shadow-sm);
  min-height: 60px;
}

.category-tab--active {
  background: var(--gradient-primary);
  color: white;
  box-shadow: var(--shadow-md);
}

.background-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  overflow-y: auto;
  align-content: start;
  padding-right: 8px;
}

.background-btn {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  aspect-ratio: 4/3;
  min-height: 140px;
  border: 3px solid var(--color-border);
  transition: all var(--transition-base);
  box-shadow: var(--shadow-md);
}

.background-btn--selected {
  border: 4px solid var(--color-success);
  box-shadow: 0 0 0 4px rgba(16,185,129,0.3), var(--shadow-lg);
}
```

### 8.2 Reduce CSS Variables (if unused)

**Audit and remove unused variables:**
```bash
# Script to find unused CSS variables
grep -oh "var(--[a-z0-9-]*)" src/kiosk.js | sort -u > used-vars.txt
grep -oh "^  --[a-z0-9-]*:" src/style.css | sort -u > defined-vars.txt
comm -13 used-vars.txt defined-vars.txt  # Shows defined but unused
```

---

## 9. File Organization After Refactoring

### Proposed File Structure

```
GreenscreenSprint/
├── index.html (230 lines - reduced inline styles)
├── src/
│   ├── kiosk.js (2,633 lines → ~2,400 lines after removing duplication)
│   └── style.css (1,785 lines → ~1,900 lines after adding component styles)
├── public/
│   ├── config.txt
│   └── backgrounds/
├── docs/
│   ├── README.md
│   ├── CLAUDE.md (updated)
│   ├── REFACTORING_PLAN.md (this file)
│   └── API.md (document API functions)
└── tests/
    └── manual-test-checklist.md
```

---

## 10. Migration Plan

### Phase 1: Non-Breaking Refactors (Week 1)
1. ✅ Add JSDoc comments to all functions
2. ✅ Reorganize sections with clear banners
3. ✅ Remove duplicate `calculateCurrentPrice`
4. ✅ Extract validation functions
5. ✅ Consolidate keyboard state management
6. ✅ Update CLAUDE.md with new structure

### Phase 2: Template Improvements (Week 2)
1. ✅ Move inline styles to CSS classes
2. ✅ Create reusable header template
3. ✅ Create reusable progress bar template
4. ✅ Test all screens still render correctly

### Phase 3: Performance & Error Handling (Week 3)
1. ✅ Implement event delegation for keyboard
2. ✅ Add lazy loading for background images
3. ✅ Add global error handler
4. ✅ Improve API error handling
5. ✅ Add loading states

### Phase 4: Testing & Documentation (Week 4)
1. ✅ Create manual test checklist
2. ✅ Run full regression test
3. ✅ Document all API functions
4. ✅ Update README with new structure
5. ✅ Create operator quick-start guide

---

## 11. Before & After Comparison

### Before: Finding a Function
```
❌ Search through 2,633 lines
❌ No clear organization
❌ Mixed concerns
❌ Time: ~5 minutes
```

### After: Finding a Function
```
✅ Jump to section (e.g., "SECTION 5: BUSINESS LOGIC")
✅ Clear organization by category
✅ Separated concerns
✅ Time: ~30 seconds
```

### Before: Adding a New Screen
```
❌ Copy-paste existing screen
❌ Manually wire up event listeners
❌ Add to render() switch
❌ Hope nothing breaks
❌ Time: ~2 hours
```

### After: Adding a New Screen
```
✅ Use template utilities
✅ Follow documented pattern
✅ Clear section to add to
✅ Validation helpers available
✅ Time: ~30 minutes
```

---

## 12. Success Metrics

After refactoring, measure success by:

1. **Code Quality**
   - ✅ Every function has JSDoc
   - ✅ No duplicate functions
   - ✅ Clear separation of concerns
   - ✅ Consistent naming conventions

2. **Maintainability**
   - ✅ New developer can find any function in < 1 minute
   - ✅ Can add new screen in < 1 hour
   - ✅ Bug fixes don't break other screens

3. **Performance**
   - ✅ Initial load time < 1 second
   - ✅ Screen transitions < 200ms
   - ✅ Keyboard responsive < 100ms

4. **Stability**
   - ✅ No console errors in normal flow
   - ✅ Graceful error handling for edge cases
   - ✅ State persistence works correctly

---

## 13. Risk Assessment

### Low Risk Refactorings ✅
- Adding JSDoc comments
- Organizing sections with banners
- Extracting pure utility functions
- Adding validation functions

### Medium Risk Refactorings ⚠️
- Removing duplicate functions (test thoroughly)
- Event delegation (verify all interactions)
- Template system changes (verify rendering)

### High Risk Refactorings ⛔
- Changing state structure (requires migration)
- Modifying render flow (core to app)
- API changes (affects backend)

**Recommendation:** Start with low-risk refactorings, test thoroughly, then proceed to medium-risk. Avoid high-risk unless absolutely necessary.

---

## 14. Next Steps

1. **Review this plan** with team/stakeholders
2. **Set up version control** (git) if not already
3. **Create backup** of current working version
4. **Start Phase 1** (documentation & organization)
5. **Test after each change**
6. **Document any deviations** from plan

---

## Appendix A: Quick Reference - New Function Locations

After refactoring, here's where to find key functions:

| Function | Old Location | New Location | Section |
|----------|-------------|--------------|---------|
| `parseConfig` | Line 35 | Section 4 | Configuration |
| `calculateCurrentPrice` | Lines 103 & 613 (duplicate) | Section 5 | Business Logic |
| `generateCustomerNumber` | Line 274 | Section 3 | Utilities |
| `createProgressBar` | Line 637 | Section 6 | UI Components |
| `createKeyboard` | Line 452 | Section 6 | UI Components |
| `createWelcomeScreen` | Line 693 | Section 7.1 | Screens |
| `createBackgroundScreen` | Line 715 | Section 7.3 | Screens |
| `createReceiptScreen` | Line 1753 | Section 7.6 | Screens |
| `render` | Line 1988 | Section 9 | Rendering |
| `attachEventListeners` | Line 2061 | Section 8 | Event Handlers |
| `init` | End of file | Section 10 | Initialization |

---

## Appendix B: Code Style Guide

### Function Naming
- ✅ Use verb-noun format: `calculatePrice`, `createScreen`, `validateEmail`
- ✅ Boolean functions use `is/has/can` prefix: `isValidEmail`, `hasSelection`
- ✅ Event handlers use `handle/on` prefix: `handleClick`, `onSubmit`

### Comments
- ✅ Use JSDoc for all public functions
- ✅ Use inline comments for complex logic
- ✅ Use section banners for organization
- ❌ Don't comment obvious code

### Constants
- ✅ Use SCREAMING_SNAKE_CASE: `MAX_PARTY_SIZE`
- ✅ Group related constants
- ✅ Document purpose with JSDoc

### Error Handling
- ✅ Always catch async errors
- ✅ Log errors with context
- ✅ Show user-friendly messages
- ✅ Never fail silently

---

**Last Updated:** 2025-10-22
**Status:** Ready for Implementation
**Estimated Effort:** 4 weeks (part-time)
**Risk Level:** Low-Medium
**Confidence:** High
