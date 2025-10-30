# Testing Guide for GitHub Users

Welcome! Thanks for testing the Greenscreen Kiosk. Here's what you need to know:

## Quick Start (5 minutes)

```bash
npm install
npm start
```

Open http://localhost:5000 and start testing!

## What You Can Test Immediately

###  Full Kiosk Experience
- Complete customer workflow from start to finish
- Multi-photo orders (try 1, 3, 5, or 8 photos)
- Background selection (28 pre-loaded backgrounds)
- Different backgrounds per photo (uncheck "same background" box)
- Party size selection
- Email/print delivery options
- Payment method selection
- **Receipt generation** (works 100% offline!)

###  Operator Dashboard
- View transactions (will be empty on first run)
- Manage order status
- Configure settings (pricing, features, payment methods)
- Upload additional backgrounds
- Edit background categories

## What Needs Setup

### > AI Background Generation (Optional)

**Without API Key:**
- You CAN enter prompts in the kiosk
- The kiosk will accept and store prompts
- Generation will fail with error message
- Everything else still works fine

**With API Key:**
1. Get free trial credits: https://platform.openai.com/api-keys
2. Open http://localhost:5000/operator
3. Click "Settings" tab
4. Enable "AI Custom Backgrounds" toggle
5. Paste your API key
6. Save settings
7. Return to kiosk and try: "tropical beach at sunset" or "apple orchard"

**Cost:** ~$0.04 per image with DALL-E 3 (standard quality, 1024x1024)

## Data & Privacy

### What's Included:
-  Application code
-  Sample backgrounds (28 images)
-  Database schema (auto-creates empty)
-  Default settings

### What's Excluded (for privacy):
- L Transaction history
- L Customer photos
- L AI generated images
- L My API keys

Your fresh database will be created automatically at `data/transactions.db` on first run.

## Testing Scenarios

### Scenario 1: Simple Single Photo
1. Choose 1 photo
2. Select any background
3. Enter party size (1-10+)
4. Choose print or email
5. Select payment method
6. View receipt

### Scenario 2: Multi-Photo with Different Backgrounds
1. Choose 3 photos
2. **Uncheck** "Use same background for all photos"
3. Select different background for each photo
4. Notice the progress tracker (1/3, 2/3, 3/3)
5. Complete order

### Scenario 3: AI Custom Background (requires API key)
1. Choose 1 photo
2. Click "Custom" tab
3. Click "AI" mode toggle
4. Enter prompt: "mountain peak at sunrise"
5. Click "Generate AI Background"
6. Wait 15-20 seconds
7. Use "Regenerate" or "Try Different Prompt"
8. Click "Use This" when satisfied

### Scenario 4: Test the Operator Panel
1. Open http://localhost:5000/operator in new tab
2. Click through Settings tab
3. Change pricing, enable/disable features
4. Save and refresh kiosk to see changes

## Known Limitations for Testing

1. **No Email Sending**: Email delivery won't actually send (no SMTP configured)
2. **No Webcam**: Photo capture won't work without webcam access
3. **Receipts Print in Browser**: Uses browser print dialog, not physical printer
4. **Empty Transaction History**: Fresh database has no past orders

## Architecture Overview

- **Frontend**: Vanilla JavaScript (no React/Vue)
- **Backend**: Node.js + Express
- **Database**: sql.js (SQLite in JavaScript)
- **AI**: OpenAI DALL-E 3
- **State**: LocalStorage for session persistence

## Troubleshooting

### Port 5000 already in use?
```bash
# Kill existing process on port 5000
netstat -ano | findstr :5000
taskkill /F /PID <process_id>
```

### Database not saving?
- Check `data/` directory exists
- Ensure write permissions
- Look for `data/transactions.db` after first transaction

### AI generation failing?
- Verify API key is entered correctly
- Check OpenAI account has credits
- View browser console (F12) for error messages

## Feedback Welcome!

Found a bug? Have suggestions? Please open an issue on GitHub!

## Quick Reference

- **Kiosk**: http://localhost:5000
- **Operator**: http://localhost:5000/operator
- **API docs**: Check `/server/server.js` for endpoints
- **Database schema**: Check `/server/database.js`
