# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Section 1: Design Requirements

### Nielsen's 10 Usability Heuristics - How We Apply Them

1. **Visibility of System Status**
   - Progress bar with visual dots showing current step (8 total steps)
   - Immediate visual feedback on all button interactions (hover, active states)
   - Clear step counter in header ("Step 2 of 8")
   - Loading states for async operations (config loading)

2. **Match Between System and Real World**
   - Touch-first interface mimics physical kiosk interactions
   - Natural language ("Tap to Start", "What's your name?")
   - Familiar iconography (✕ for quit, ← → for navigation)
   - Real-world pricing display ($10.00 format)

3. **User Control and Freedom**
   - Quit button accessible on every screen (with confirmation)
   - Back button on all screens to undo steps
   - Easy navigation between screens
   - State saved in localStorage for crash recovery

4. **Consistency and Standards**
   - BEM CSS methodology throughout
   - Consistent button sizes (min 80px touch targets)
   - Uniform color scheme and visual language
   - Predictable navigation pattern (Back/Next buttons)

5. **Error Prevention**
   - Validation before proceeding to next screen
   - Touch-optimized targets prevent mis-taps
   - Confirmation dialogs for destructive actions (quit)
   - Large, clear buttons reduce errors

6. **Recognition Rather Than Recall**
   - Visual progress indicator always visible
   - Selected state clearly marked (green highlight)
   - All options visible, no hidden menus
   - Context-aware screen titles

7. **Flexibility and Efficiency of Use**
   - Config-driven system allows operator customization
   - Dynamic screen flow (skips irrelevant steps)
   - Enter key submits on name input
   - Fast, immediate transitions

8. **Aesthetic and Minimalist Design**
   - Clean, uncluttered layouts
   - Generous whitespace (8px grid system)
   - Focus on essential information only
   - No unnecessary decorative elements

9. **Help Users Recognize, Diagnose, and Recover from Errors**
   - Clear error messages (planned for validation)
   - Helpful placeholder text
   - Visual feedback for invalid states
   - Easy recovery with back button

10. **Help and Documentation**
    - "How it works" on welcome screen
    - Clear instructions on each screen
    - Descriptive labels and helper text
    - README.md and CLAUDE.md for operators/developers

### Touch-First Design Principles

- **Minimum touch targets**: 80px × 80px (--touch-min)
- **Comfortable targets**: 100px × 100px (--touch-comfortable)
- **Large targets**: 120px × 120px (--touch-large)
- **Huge CTAs**: 150px minimum height for primary actions
- **No hover dependencies**: All interactions work on touch-only devices
- **Prevent double-tap zoom**: `touch-action: manipulation` on interactive elements
- **Large spacing**: Minimum 16px gaps between interactive elements

### Kiosk Viewport Constraints - CRITICAL

**NO SCROLLING ALLOWED**: Everything must fit on one screen at all times.

- **Body**: `overflow: hidden; position: fixed; width: 100vw; height: 100vh;`
- **Screen**: `height: 100vh; max-height: 100vh; overflow: hidden;`
- **Screen Body**: `max-height: calc(100vh - var(--header-height) - var(--progress-bar-height))`
- **Header**: `flex-shrink: 0; min-height/max-height: var(--header-height)`
- **Progress**: `flex-shrink: 0; position: fixed; bottom: 0;`
- **No viewport zoom**: `maximum-scale=1.0, user-scalable=no` in meta tag
- **Design Implication**: Content must be sized to fit within available space, not require scrolling

### Accessibility Requirements

- **WCAG AA contrast ratios**: All text meets minimum 4.5:1 contrast
- **Large typography**: 24px body text minimum, 32-80px for headings
- **Focus indicators**: 3px solid outline on :focus-visible
- **Keyboard navigation**: Logical tab order (though kiosk is touch-first)
- **Readable from distance**: Designed to be read from 6 feet away
- **No text selection**: Disabled except in input fields (kiosk mode)
- **Reduced motion support**: Animations disabled for users who prefer it

### Visual Design Goals: "Worth Thousands"

**Quality Markers:**
- ✅ Modern gradient backgrounds (7 preset gradients: primary, secondary, success, sunset, ocean, purple, fire)
- ✅ Elevation with shadows (--shadow-sm through --shadow-2xl)
- ✅ Smooth animations and transitions (250ms base, 6 keyframe animations)
- ✅ Professional color palette (indigo/pink/amber with gradients)
- ✅ Generous whitespace and breathing room
- ✅ Card-based layouts with depth and glassmorphism
- ✅ Polished micro-interactions (float, slideUp, glow, heartbeat, shimmer)
- ✅ Gradient text effects using background-clip
- ✅ Glassmorphism with backdrop-filter (3 variants: glass, glass-strong, glass-dark)
- No rough edges or placeholder content

**Implemented Premium Effects:**
- **Gradients**: 7 color gradients + 3 background gradients
- **Glassmorphism**: Frosted glass effect with backdrop blur (10px/20px)
- **Micro-animations**: float, slideUp, glow, heartbeat, shimmer, bounce, pulse
- **Button variants**: gradient-primary, gradient-secondary, gradient-success, glass
- **Card variants**: glass, gradient-primary, gradient-secondary, elevated
- **Staggered animations**: Sequential delays for cascade effects (animation-delay)

**Inspiration:**
- Apple Store kiosks
- Premium photo booth companies (Snapbar, Pixilated)
- Contemporary SaaS apps (Linear, Notion, Stripe)
- Modern event technology

---

## Section 2: Technical Architecture

### File Structure

```
Greenscreen Sprint/
├── start-here.html          # Entry point - double-click to run
├── src/
│   ├── kiosk.js            # Single-file application (no modules)
│   └── style.css           # Consolidated CSS (all styles)
├── public/
│   ├── config.txt          # Operator-editable configuration
│   └── backgrounds/        # Background images (to be implemented)
├── README.md               # User documentation
└── CLAUDE.md              # This file - development reference
```

**Why Single-File Approach:**
- No build tools required
- Runs directly in browser (file:// or http://)
- Easy to understand and debug
- Fast loading on kiosk hardware
- No module import issues

### State Management

**Global State Object** (`window.state` - src/kiosk.js:9-24):
```javascript
{
  currentScreen: 'welcome',     // Which screen to render
  currentStep: 0,               // Progress (1-8)
  totalSteps: 8,                // Total workflow steps
  customerName: '',             // User inputs
  partySize: 1,
  selectedBackground: null,
  deliveryMethod: null,         // 'print', 'email', or 'both'
  printQuantity: 0,
  emailQuantity: 0,
  emailAddresses: [],
  paymentMethod: null,          // 'credit', 'cash', etc.
  customerPhoto: null,          // Base64 or blob
  customerNumber: null,         // Generated unique ID
  config: null                  // Loaded from config.txt
}
```

**State Persistence:**
- Customer number counter stored in localStorage
- Auto-increments from 600
- Survives page refresh

**State Flow:**
1. User interaction updates state
2. `render()` function called
3. Screen HTML generated based on state
4. Event listeners attached
5. User sees updated UI

### Config-Driven Design

**File**: `public/config.txt` - INI-style format

**Parser**: `parseConfig()` function (src/kiosk.js:29-70)

**Config Structure:**
```javascript
{
  theme: "Green Screen Photos",      // Branding text
  eventName: "Special Event",        // Event name
  basePrice: 10.00,                  // Starting price
  features: {
    freeMode: false,                 // FR=1 for free
    prints: true,                    // PF=1
    email: true,                     // EF=1
    creditCard: true,                // CC=1
    cash: true,                      // CK=1
    check: false                     // CUS=1
  },
  printPricing: {
    1: 10.00,   // BP
    2: 15.00,   // P2P
    3: 20.00,   // P3P
    // ... up to P8P
  },
  emailPricing: {
    1: 10.00,   // E1P
    2: 11.00,   // E1P + E2P
    3: 12.00,   // E1P + E2P + E3P
    // ... cumulative
  }
}
```

**Fallback**: If config.txt fails to load, default values are used (src/kiosk.js:79-86)

### Screen Flow Logic

**Workflow Steps:**
1. Welcome → 2. Name Entry → 3. Party Size → 4. Background Selection → 5. Delivery Method → 6. Quantity Selection → 7. Email Entry (conditional) → 8. Payment Method → 9. Webcam Photo → 10. Review & Confirm → 11. Processing → 12. Receipt

**Rendering System** (src/kiosk.js:264-292):
1. `render()` function switches on `state.currentScreen`
2. Calls appropriate screen generator (e.g., `createWelcomeScreen()`)
3. Fades out (#app opacity: 0)
4. Updates innerHTML with new screen HTML
5. Calls `attachEventListeners()`
6. Fades in (#app opacity: 1)
7. 150ms transition for smooth experience

**Navigation Pattern:**
```javascript
// Forward
state.currentScreen = 'nextScreen';
render();

// Backward
state.currentScreen = 'previousScreen';
render();
```

**Event Handling** (src/kiosk.js:297-366):
- Event listeners attached after each render
- No global event delegation
- Each screen has specific handlers
- Back/Next/Quit buttons follow consistent pattern

### Progress Bar Component

**Visual**: Fixed bottom bar with step dots

**Implementation**: `createProgressBar(currentStep, totalSteps)` (src/kiosk.js:104-113)

**States:**
- `progress__dot`: Neutral gray (future steps)
- `progress__dot--complete`: Green (completed steps)
- `progress__dot--current`: Larger, blue with glow (current step)

**Auto-increment**: `state.currentStep` set per screen in render()

---

## Section 3: Implementation Checklist

### ✅ Completed Features

**Phase 1: Foundation**
- [x] CSS design system with variables
- [x] Consolidated single CSS file (style.css - 1,257 lines)
- [x] BEM naming methodology
- [x] Touch-optimized components (buttons, cards, inputs)
- [x] Responsive 8px grid system
- [x] Config parser with fallback defaults
- [x] Customer number generator with localStorage
- [x] Global state management
- [x] Screen rendering system
- [x] Progress bar component
- [x] Navigation system (back/next/quit)
- [x] Event listener management
- [x] File structure cleanup

**Phase 2: Design System Enhancement** ⭐ NEW
- [x] Viewport constraints (NO SCROLLING - fits on one screen)
- [x] 7 gradient color schemes (primary, secondary, success, sunset, ocean, purple, fire)
- [x] 3 background gradients (light, primary, warm)
- [x] Glassmorphism effects (glass, glass-strong, glass-dark with backdrop-filter)
- [x] 6 micro-animations (float, slideUp, glow, heartbeat, shimmer, confetti)
- [x] Enhanced button variants (gradient-primary, gradient-secondary, gradient-success, glass)
- [x] Enhanced card variants (glass, gradient-primary, gradient-secondary, elevated)
- [x] Gradient text effect using background-clip
- [x] Staggered animation delays for cascade effects
- [x] Updated Welcome screen with premium visuals
- [x] Updated Party Size screen with animations
- [x] Fixed viewport to 100vh (no scrolling, no zooming)

### 🔄 In-Progress Features

**Phase 3: Screen-by-Screen Implementation** (NEXT)
- [ ] Background selection screen - gallery with preview (PRIORITY)
- [ ] Delivery method screen - print/email/both cards
- [ ] Quantity selection screen - dynamic based on delivery
- [ ] Email entry screen - with validation

### ❌ TODO Features

**Screens:**
- [ ] Background selection (gallery with preview)
- [ ] Delivery method (print/email/both cards)
- [ ] Quantity selection (dynamic based on delivery)
- [ ] Email entry (with validation)
- [ ] Payment method (visual payment cards)
- [ ] Webcam photo (customer ID capture)
- [ ] Review & confirm (editable summary)
- [ ] Processing (loading animation)
- [ ] Receipt (two-part printing with instructions)

**Features:**
- [ ] Background image management system
- [ ] Email validation
- [ ] Price calculation display
- [ ] Webcam integration (getUserMedia API)
- [ ] Receipt generation (formatted text/HTML)
- [ ] Print functionality
- [ ] Confetti animation on completion
- [ ] Sound effects (optional, toggleable)
- [ ] Admin settings screen
- [ ] Error handling for all inputs
- [ ] Loading states for async operations

**Polish:**
- [ ] Enhanced color palette with gradients
- [ ] Glassmorphism effects
- [ ] Smooth screen-to-screen transitions (slide/scale)
- [ ] Celebration animations
- [ ] Micro-interactions on all elements
- [ ] Empty states
- [ ] Error states with helpful messages

---

## Section 4: CSS Best Practices Applied

### BEM Naming Convention

**Structure**: `.block__element--modifier`

**Examples:**
```css
/* Block */
.btn { }
.card { }
.progress { }

/* Element */
.btn__icon { }
.card__header { }
.card__title { }
.progress__dot { }

/* Modifier */
.btn--primary { }
.btn--large { }
.card--selected { }
.progress__dot--complete { }

/* Combined */
.btn.btn--primary.btn--large { }
.progress__dot.progress__dot--current { }
```

**Benefits:**
- Clear component boundaries
- No deep nesting
- Reusable styles
- Self-documenting class names

### CSS Variables Usage

**All design tokens centralized** (src/style.css:1-164):
```css
:root {
  /* Colors */
  --color-primary: #6366f1;

  /* Spacing */
  --space-md: 1.5rem;

  /* Typography */
  --text-lg: 2rem;

  /* Effects */
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.12);
  --transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

**Used throughout:**
```css
.btn {
  padding: var(--space-md) var(--space-lg);
  font-size: var(--text-lg);
  background: var(--color-primary);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-base);
}
```

**Advantages:**
- Single source of truth
- Easy theming
- Consistent design system
- Maintainable at scale

### DRY Principles

**Base classes + modifiers:**
```css
/* Base button - shared styles */
.btn {
  display: inline-flex;
  align-items: center;
  padding: var(--space-md) var(--space-lg);
  border-radius: var(--radius-lg);
  /* ...common properties */
}

/* Variants - only what changes */
.btn--primary { background: var(--color-primary); }
.btn--danger { background: var(--color-error); }
.btn--large { padding: var(--space-lg) var(--space-xl); }
```

**Utility classes** for common patterns:
```css
.flex { display: flex; }
.gap-md { gap: var(--space-md); }
.text-center { text-align: center; }
.shadow-lg { box-shadow: var(--shadow-lg); }
```

**No repetition** - compose classes instead:
```html
<button class="btn btn--primary btn--large">Click Me</button>
<div class="flex gap-md items-center">...</div>
```

### Component Reusability

**Standalone components:**
- `.btn` - Used on all screens (start, back, next, quit, selections)
- `.card` - Reusable for info displays, selections
- `.input` - Text entry, email entry
- `.progress` - Fixed bottom bar on all screens
- `.badge` - Status indicators, labels

**Composable modifiers:**
```css
.btn--primary.btn--large.btn--glow { }  /* Glowing large primary button */
.card.card--interactive.card--selected { }  /* Selected interactive card */
```

**No duplication** - extend with modifiers, not new components

---

## Section 5: Rubric Alignment

### Grading Rubric (105 Points Total)

#### Questions (12 points)
**Criteria**: Can justify every design decision with heuristics

**Our Implementation:**
- Every component mapped to specific heuristics (see Section 1)
- Progress bar → Visibility of System Status
- Back/Quit buttons → User Control & Freedom
- Touch targets → Error Prevention
- Clear labels → Recognition Rather Than Recall

**Status**: ✅ Strong - documented in this file

#### Features (14 points)
**Criteria**: All required + innovative extras

**Our Implementation:**
- ✅ Config-driven pricing
- ✅ Multiple payment methods
- ✅ Print/email delivery options
- 🔄 Background selection (in progress)
- 🔄 Webcam photo capture (planned)
- ❌ Receipt generation (TODO)

**Status**: 🔄 Good foundation, needs completion

#### Heuristics (12 points)
**Criteria**: Explicitly follow all 10, document how

**Our Implementation:**
- All 10 heuristics documented in Section 1
- Specific examples for each
- Design decisions tied to heuristics

**Status**: ✅ Excellent - comprehensive documentation

#### Mock-ups (12 points)
**Criteria**: Professional, polished HTML/CSS (this IS our mockup)

**Our Implementation:**
- Clean, consolidated CSS
- BEM methodology
- Touch-optimized components
- 🔄 Needs enhanced visual design (gradients, glassmorphism)

**Status**: 🔄 Good, needs visual polish

#### Reasoning (10 points)
**Criteria**: Every choice has clear rationale

**Our Implementation:**
- Single-file architecture explained
- Config-driven design justified
- Touch-first approach documented
- All in this CLAUDE.md file

**Status**: ✅ Strong documentation

#### Grandma Test (12 points)
**Criteria**: Anyone can use it first try

**Our Implementation:**
- Large, clear buttons
- Minimal text
- Visual feedback on everything
- Simple linear workflow
- 🔄 Needs real user testing

**Status**: 🔄 Designed for it, needs validation

#### Buttons vs Titles (3 points)
**Criteria**: Clear visual distinction always

**Our Implementation:**
- Buttons: Elevated, shadowed, colored, interactive
- Titles: Plain text, semantic heading tags, no interaction
- Clear hierarchy: h1 for screens, buttons for actions

**Status**: ✅ Clear distinction

#### Spice (4 points)
**Criteria**: Unique features that wow

**Our Implementation:**
- ✅ Config-driven system (operator customizable)
- ✅ Smooth animations and transitions
- ✅ Customer number generation
- 🔄 Planned: Confetti celebration, glassmorphism, advanced animations

**Status**: 🔄 Good start, can add more wow factors

### Areas Needing Improvement for Full Points

1. **Complete all screens** (Welcome, Name, Party Size, Background, Delivery, Quantity, Email, Payment, Webcam, Review, Receipt)
2. **Enhanced visual design** (gradients, glassmorphism, premium feel)
3. **Implement receipt generation** (two-part print with customer number)
4. **Add celebration moments** (confetti, success animations)
5. **User testing** for Grandma Test validation
6. **Error handling** for all inputs with helpful messages

---

## Section 6: Customer Needs from Requirements

### User Must Be Able To:

#### Core Workflow
- [x] See inviting welcome screen with branding
- [x] Enter name/party name
- [x] Select party size (1-10+)
- [ ] Choose background from gallery
- [ ] Select delivery method (print, email, or both)
- [ ] Choose quantity based on delivery method
- [ ] Enter email address(es) if email delivery selected
- [ ] Select payment method
- [ ] Have photo taken by webcam for customer ID
- [ ] Review all selections before confirming
- [ ] Receive receipt with customer number and instructions

#### Navigation
- [x] Go back to previous screen
- [x] Quit at any time (with confirmation)
- [x] See progress through workflow
- [x] Understand current step

#### System Features
- [x] System loads configuration from config.txt
- [x] Pricing adjusts based on configuration
- [x] Features enable/disable based on configuration
- [x] Free mode when FR=1 in config
- [ ] Print two-part receipt (customer copy + operator copy)
- [x] Customer number generation (unique, auto-incrementing)
- [ ] Background images load from public/backgrounds/

#### UX Requirements
- [x] Touch-screen only interface (minimal keyboard use)
- [x] Large, easy-to-tap buttons (80px minimum)
- [x] Limited text, visual-first design
- [x] Inviting and fun experience
- [x] Clear visual feedback on all interactions
- [ ] Error messages are helpful and kind
- [ ] Success moments are celebrated

### Implementation Status Summary

**Completed**: 60%
- Foundation ✅
- Core architecture ✅
- First 3 screens ✅
- State management ✅
- Config system ✅

**In Progress**: 20%
- Visual polish 🔄
- Design enhancements 🔄

**TODO**: 20%
- Remaining screens ❌
- Webcam integration ❌
- Receipt generation ❌
- Background gallery ❌
- Email validation ❌

---

## Development Commands

### Running Locally
```bash
# No build step needed - just open the file
# For config loading:
python -m http.server 8000
# or
npx serve .
```

### File Editing
- **JavaScript**: Edit `src/kiosk.js` - all application logic
- **CSS**: Edit `src/style.css` - all styles
- **Config**: Edit `public/config.txt` - pricing and features
- **Entry**: Edit `start-here.html` - minimal, just loads JS/CSS

### Debugging
```javascript
// In browser console:
state                    // View current state
render()                 // Manually re-render
state.config             // View loaded config
state.currentScreen = 'welcome'  // Jump to screen
render()                 // Apply change
```

### Adding New Screens

1. **Create screen function** in src/kiosk.js:
```javascript
function createNewScreen() {
  return `
    <div class="screen">
      <header class="screen__header">...</header>
      <main class="screen__body">...</main>
      ${createProgressBar(state.currentStep, state.totalSteps)}
    </div>
  `;
}
```

2. **Add to render() switch**:
```javascript
case 'newScreen':
  state.currentStep = X;
  html = createNewScreen();
  break;
```

3. **Add event listeners** in attachEventListeners():
```javascript
const newBtn = document.getElementById('newBtn');
if (newBtn) {
  newBtn.addEventListener('click', () => {
    // Handle interaction
    state.currentScreen = 'nextScreen';
    render();
  });
}
```

4. **Update navigation** from previous screen:
```javascript
state.currentScreen = 'newScreen';
render();
```

---

## Design Excellence Checklist

### First Impression: "Wow"
- [ ] Gradient background with subtle pattern
- [ ] Glassmorphism effect on cards
- [ ] Smooth, polished animations
- [ ] Professional color palette
- [ ] Clean, generous whitespace

### During Use: "Easy and Fun"
- [x] Immediate feedback on all interactions
- [x] Clear navigation
- [ ] Delightful micro-interactions
- [ ] Encouraging positive language
- [ ] No confusing moments

### After: "Great Experience"
- [ ] Celebration animation on completion
- [ ] Clear next steps on receipt
- [ ] Sense of accomplishment
- [ ] No frustration points
- [ ] Would recommend to others

---

## Quick Reference

### File Locations
- Entry point: `start-here.html`
- All JavaScript: `src/kiosk.js`
- All CSS: `src/style.css`
- Configuration: `public/config.txt`
- Backgrounds: `public/backgrounds/` (create images here)

### Key Functions
- `init()` - Loads config and starts app (src/kiosk.js:371)
- `render()` - Renders current screen (src/kiosk.js:264)
- `parseConfig()` - Parses config.txt (src/kiosk.js:29)
- `generateCustomerNumber()` - Creates unique ID (src/kiosk.js:93)
- `createProgressBar()` - Progress indicator (src/kiosk.js:104)
- `attachEventListeners()` - Wires up interactions (src/kiosk.js:297)

### CSS Conventions
- Use BEM: `.block__element--modifier`
- Use variables: `var(--color-primary)`
- Compose utilities: `class="flex gap-md items-center"`
- Touch targets: `min-height: var(--touch-min)`
- Spacing: Use `--space-xs` through `--space-3xl`

### State Management
- Read: `state.currentScreen`
- Write: `state.customerName = value`
- Navigate: `state.currentScreen = 'nextScreen'; render();`
- Debug: `window.state` in console

---

**Last Updated**: Phase 2 Complete - Design System Enhancement ✨
**Completed**: Foundation + Premium Visual Design (gradients, glassmorphism, animations, viewport constraints)
**Next Phase**: Phase 3 - Screen-by-Screen Implementation (Background Selection is priority)
