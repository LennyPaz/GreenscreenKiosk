# ✅ Operator Dashboard - Quick Start Checklist

## Step-by-Step Guide to Get Running

### ☐ Step 1: Verify Files
Navigate to: `C:\Users\theon\OneDrive\Desktop\GreenscreenSprint\operator\`

Confirm these files exist:
- [ ] `dashboard.js` (should be ~57KB)
- [ ] `dashboard.css`
- [ ] `index.html`
- [ ] `FIXED_README.md` (new)

### ☐ Step 2: Start the Server

**Option A - Automated (Easiest):**
- [ ] Double-click `quick-start.bat` in the main project folder
- [ ] Wait 10-15 seconds
- [ ] Dashboard should open automatically in browser

**Option B - Manual:**
- [ ] Open terminal/command prompt
- [ ] Navigate: `cd C:\Users\theon\OneDrive\Desktop\GreenscreenSprint`
- [ ] Run: `npm start`
- [ ] Wait for "Server running on: http://localhost:5000" message

### ☐ Step 3: Generate Test Data (If Using Manual Start)
In a second terminal:
- [ ] Navigate: `cd C:\Users\theon\OneDrive\Desktop\GreenscreenSprint\server`
- [ ] Run: `node generate-test-data.js 25`
- [ ] Wait for "Successfully created 25 test transactions!" message

### ☐ Step 4: Open Dashboard
- [ ] Open browser
- [ ] Navigate to: `http://localhost:5000/operator`
- [ ] Dashboard should load within 2-3 seconds

### ☐ Step 5: Verify It's Working

**Statistics Cards (top of page):**
- [ ] Total Orders shows a number > 0
- [ ] Total Revenue shows currency amount
- [ ] Pending Orders shows a number
- [ ] Today's Orders shows a number
- [ ] All cards are clickable (try clicking one)

**Connection Status (top right):**
- [ ] Shows green dot 🟢
- [ ] Says "Connected"

**Transaction Table:**
- [ ] Shows multiple rows of data
- [ ] Each row has order number, customer name, etc.
- [ ] "View" buttons are visible

### ☐ Step 6: Test Core Features

**Search & Filter:**
- [ ] Type a customer name in search box
- [ ] Click "Search" button
- [ ] Results update immediately
- [ ] Click "Clear" to reset

**View Order Details:**
- [ ] Click "View" on any order
- [ ] Modal opens with full details
- [ ] Status checkboxes are interactive
- [ ] Can add operator notes

**Dark Mode:**
- [ ] Click moon icon (🌙) in top right
- [ ] Page switches to dark theme
- [ ] Click sun icon (☀️) to switch back

**Export:**
- [ ] Click "Export CSV" button
- [ ] CSV file downloads
- [ ] Open in Excel/spreadsheet app
- [ ] Contains order data

**Analytics:**
- [ ] Click "Analytics" button
- [ ] Modal opens with charts
- [ ] 4 charts are visible:
  - Revenue Over Time
  - Popular Backgrounds
  - Orders by Hour
  - Delivery Methods

**Print Queue:**
- [ ] Click "Print Queue" button
- [ ] Modal shows print orders
- [ ] Can mark prints as ready

**Email Dashboard:**
- [ ] Click "Email Status" button
- [ ] Modal shows email orders
- [ ] Can mark emails as sent

### ☐ Step 7: Test Advanced Features

**Sorting:**
- [ ] Click any column header
- [ ] Table sorts by that column
- [ ] Click again to reverse sort
- [ ] Arrow icon shows sort direction

**Bulk Actions:**
- [ ] Check multiple order checkboxes
- [ ] Bulk actions bar appears
- [ ] Try "Mark Complete" button
- [ ] Selected orders update

**Date Filtering:**
- [ ] Select "From" date
- [ ] Select "To" date
- [ ] Table filters to date range
- [ ] Click "Clear" to reset

**Status Filtering:**
- [ ] Use status dropdown
- [ ] Select "Pending Orders"
- [ ] Table shows only pending
- [ ] Change back to "All Orders"

## 🎯 Expected Results

### ✅ Success Indicators
- Dashboard loads in 2-3 seconds
- All statistics show real numbers
- Table displays 25+ orders
- No JavaScript errors in console (F12)
- All buttons are clickable
- Modals open and close smoothly
- Dark mode toggle works
- Connection shows as "Connected"

### ❌ Failure Indicators
If you see any of these, something's wrong:

- "Loading..." that never stops
- Statistics all show "0"
- Empty transaction table
- "Disconnected" status (red dot)
- Console errors (F12 shows red text)
- Buttons don't respond to clicks

## 🔧 Troubleshooting

### Dashboard Won't Load
1. [ ] Check server terminal for errors
2. [ ] Verify server shows "Server running on: http://localhost:5000"
3. [ ] Try accessing `http://localhost:5000/api/health`
4. [ ] Should return JSON: `{"status":"online"}`

### No Data Showing
1. [ ] Run test data generator: `node server/generate-test-data.js 25`
2. [ ] Check database file exists: `data/transactions.db`
3. [ ] Restart server: Ctrl+C, then `npm start`

### Connection Issues
1. [ ] Check firewall isn't blocking port 5000
2. [ ] Try different browser (Chrome/Edge/Firefox)
3. [ ] Clear browser cache: Ctrl+Shift+R
4. [ ] Check no other app is using port 5000

### Still Not Working?
1. [ ] Read `FIXED_README.md` for detailed troubleshooting
2. [ ] Check browser console (F12) for error messages
3. [ ] Check server terminal for error messages
4. [ ] Verify Node.js version: `node --version` (need v14+)
5. [ ] Reinstall dependencies: `npm install`

## 📋 Final Checklist

Before considering it "done", verify:

- [ ] Server starts without errors
- [ ] Test data generator runs successfully
- [ ] Dashboard loads quickly
- [ ] All statistics display correctly
- [ ] Transaction table is populated
- [ ] Search works
- [ ] Filters work
- [ ] Sorting works
- [ ] Modals open and close
- [ ] Status updates work
- [ ] Dark mode works
- [ ] Export CSV works
- [ ] Print queue works
- [ ] Email dashboard works
- [ ] Analytics charts display
- [ ] No console errors
- [ ] Responsive on mobile (optional)

## 🎉 Completion

When all items above are checked, your operator dashboard is:

✅ **FULLY FUNCTIONAL**
✅ **PROPERLY CONFIGURED**
✅ **READY FOR USE**

Congratulations! You now have a professional, feature-rich operator dashboard for managing your greenscreen kiosk orders!

---

## 📞 Quick Reference

**Server URL:** http://localhost:5000
**Dashboard URL:** http://localhost:5000/operator
**API Health Check:** http://localhost:5000/api/health

**Files to know:**
- Main server: `server/server.js`
- Database: `data/transactions.db`
- Dashboard JS: `operator/dashboard.js`
- Dashboard CSS: `operator/dashboard.css`
- Test data gen: `server/generate-test-data.js`

**Commands to remember:**
```bash
# Start server
npm start

# Generate test data
node server/generate-test-data.js 25

# Stop server
Ctrl + C
```

---

**Status:** Ready to use! 🚀
**Last Updated:** October 21, 2025
**Version:** 1.0.0 (Fixed)
