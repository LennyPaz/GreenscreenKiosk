# Greenscreen Kiosk System

A professional, touch-friendly kiosk interface for greenscreen photo operations.

## Quick Start

**To run the kiosk**: Double-click `start-here.html` or open it in your web browser.

**For full functionality** (config file loading):
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .
```
Then open `http://localhost:8000/start-here.html`

## Project Structure

```
Greenscreen Sprint/
├── start-here.html          # Main entry point
├── src/
│   ├── kiosk.js            # All JavaScript (single file)
│   └── style.css           # All CSS (consolidated)
├── public/
│   ├── config.txt          # Configuration (operator editable)
│   └── backgrounds/        # Background images
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

- Config-driven pricing and features
- Touch-optimized interface
- Progress tracking
- State management with localStorage
- Customer number generation
- Modular screen flow

## For Developers

See `CLAUDE.md` for comprehensive development documentation including:
- Architecture details
- Design requirements and heuristics
- CSS best practices
- Implementation guidelines
- Rubric alignment

---

Built for UX class project following Nielsen's 10 Usability Heuristics and CSS best practices.
