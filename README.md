# Greenscreen Kiosk System

A professional, touch-friendly kiosk interface for greenscreen photo operations with an operator dashboard for transaction management.

## Quick Start

### First Time Setup

1. **Install Node.js** (if not already installed): https://nodejs.org/
2. **Install dependencies**:
   ```bash
   npm install
   ```

### Running the System

**Option 1: Full System (Recommended)**
```bash
npm start
```
This starts the Node.js server which serves:
- Kiosk interface: `http://localhost:5000`
- Operator dashboard: `http://localhost:5000/operator`
- API endpoints: `http://localhost:5000/api`

**Option 2: Development Mode with Auto-Reload**
```bash
npm run dev
```
Server automatically restarts when you make changes to files.

**Option 3: Kiosk Only (No Database)**
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .
```
Then open `http://localhost:8000/start-here.html` (transactions won't be saved)

## Project Structure

```
Greenscreen Sprint/
├── index.html              # Main entry point (kiosk)
├── src/
│   ├── kiosk.js            # All JavaScript (single file)
│   └── style.css           # All CSS (consolidated)
├── public/
│   ├── config.txt          # Configuration (operator editable)
│   └── backgrounds/        # Background images
├── server/                 # Backend (Node.js + Express)
│   ├── server.js           # Main server file
│   ├── database.js         # SQLite operations
│   └── routes/             # API route handlers
├── operator/               # Operator dashboard (frontend)
│   ├── index.html          # Dashboard UI
│   ├── dashboard.js        # Dashboard logic
│   └── dashboard.css       # Dashboard styles
├── data/                   # Local data storage
│   ├── transactions.db     # SQLite database (created on first run)
│   └── images/
│       └── customer_photos/ # Customer ID photos
├── package.json            # Node.js dependencies
├── README.md               # This file
└── CLAUDE.md              # Development documentation
```

## Configuration

Edit `public/config.txt` to customize:
- Station settings and branding
- Pricing for prints and emails
- Enable/disable payment methods
- Feature toggles

Format:
```
[INFO]
STN=0              # Station number
THM=Event Name     # Theme/branding
BP=10.00           # Base price
PF=1               # Prints feature (1=enabled, 0=disabled)
EF=1               # Email feature (1=enabled, 0=disabled)
```

## Design System

- **Touch-first**: Minimum 80px touch targets
- **8px grid system**: Consistent spacing throughout
- **Kiosk-sized typography**: 24px body text minimum
- **BEM CSS methodology**: `.block__element--modifier`
- **Vanilla JavaScript**: No frameworks or build tools

## Features

- 📸 Multi-photo orders (1-8 photos per order)
- 🎨 Custom background selection (different per photo)
- 🤖 AI background generation (powered by DALL-E 3)
- 💳 Multiple payment methods
- 📧 Email delivery support
- 🖨️ Print queue management
- 👨‍💼 Operator dashboard for order management
- 🧾 Receipt generation (works offline!)
- Config-driven pricing and features
- Touch-optimized interface
- Progress tracking
- State management with localStorage
- Customer number generation
- Modular screen flow

## 🚀 For GitHub Testers

### What Works Out of the Box:
✅ **Entire kiosk workflow** - All screens and UI work immediately
✅ **Background selection** - Pre-loaded backgrounds ready to use
✅ **Operator dashboard** - Opens and fully functional
✅ **Receipt display** - Works even offline (uses session data only)
✅ **Settings configuration** - Save pricing, features, payment methods

### What Requires Configuration:
❌ **AI Background Generation** - Requires your own OpenAI API key:
   1. Sign up at https://platform.openai.com/api-keys
   2. Open http://localhost:5000/operator
   3. Go to Settings → Enable "AI Custom" → Paste API key
   4. Note: Requires OpenAI account with billing enabled

### What You Won't See:
- **Transaction history** - Database is excluded from git (privacy/security)
- **Customer photos** - All customer data excluded from repo
- **AI generated backgrounds** - User-specific, not included

### Testing Tips:
- The database auto-creates on first run with default settings
- Try different photo quantities (1-8 photos)
- Test with/without "same background" checkbox
- Operator panel will be empty (no transactions yet)
- Add your own backgrounds to `public/backgrounds/`

## For Developers

See `CLAUDE.md` for comprehensive development documentation including:
- Architecture details
- Design requirements and heuristics
- CSS best practices
- Implementation guidelines
- Rubric alignment

---

Built for UX class project following Nielsen's 10 Usability Heuristics and CSS best practices.
