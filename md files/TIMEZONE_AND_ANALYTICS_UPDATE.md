# Timezone and Analytics Updates

## Summary of Changes

This document outlines the changes made to implement EST timezone support and enhanced analytics with date filtering.

## 1. Timezone Changes (UTC → EST)

### Database Changes (`server/database.js`)

**Added EST Helper Functions:**
```javascript
/**
 * Convert UTC date to EST datetime string
 */
function toEST(date = new Date()) {
  const estOffset = -5; // EST is UTC-5 (during standard time)
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const estDate = new Date(utc + (3600000 * estOffset));
  return estDate.toISOString().replace('T', ' ').split('.')[0];
}

/**
 * Get current EST datetime string for SQL
 */
function getESTNow() {
  return toEST();
}
```

**Updated Functions to Use EST:**
- `createTransaction()` - Now stores `created_at` and `updated_at` in EST
- `updateTransactionStatus()` - Updates `updated_at` in EST
- `updateOperatorNotes()` - Updates `updated_at` in EST
- `getStatistics()` - Filters today's orders using EST date

**New Function:**
- `getOrdersByHour(date)` - Returns hourly order counts for a specific date

### Server Changes (`server/server.js`)

**New API Endpoint:**
```javascript
GET /api/analytics/orders-by-hour?date=YYYY-MM-DD
```

Returns hourly order data for analytics dashboard:
```json
{
  "success": true,
  "date": "2025-10-22",
  "hourlyData": [0, 0, 5, 10, ...]  // 24 elements (one per hour)
}
```

## 2. Analytics Dashboard Enhancements

### Orders by Hour Chart (`operator/dashboard.js`)

**Changes:**
- Chart now fetches data from new API endpoint
- Added date selector to choose which day to analyze
- Chart updates when date changes
- Displays selected date in chart title
- Properly destroys and recreates chart instance on date change

**Key Function:**
```javascript
async function createOrdersTimeChart() {
  // Fetch hourly data from API for selected date
  const response = await fetch(`${API_BASE_URL}/analytics/orders-by-hour?date=${selectedDate}`);
  const data = await response.json();
  const hourCounts = data.hourlyData;
  
  // Create/update chart with new data
  window.ordersTimeChartInstance = new Chart(ctx, { ... });
}
```

### UI Changes (`operator/index.html`)

**Added Date Selector:**
```html
<div class="analytics-card">
  <div style="display: flex; justify-content: space-between;">
    <h3>Orders by Hour</h3>
    <div>
      <label for="ordersDateSelector">Date:</label>
      <input type="date" id="ordersDateSelector" class="date-input">
    </div>
  </div>
  <canvas id="ordersTimeChart"></canvas>
</div>
```

### Dashboard Display (`operator/dashboard.js`)

**Updated Timestamp Formatting:**
- `formatFullTimestamp()` now displays times in EST timezone
- Automatically adds "EST" suffix to timestamps
- Uses `timeZone: 'America/New_York'` for consistent display

## 3. Receipt Consistency (Next Steps)

### Current State
- **Operator Dashboard Receipt**: Currently prints receipts with full transaction details
- **Main Kiosk Receipt**: Needs to be integrated to match operator dashboard format

### Integration Requirements

To complete the receipt consistency, you'll need to:

1. **Update Main Kiosk** (`src/kiosk.js`):
   - Add function to post order to `/api/transactions`
   - Show receipt screen after order completion
   - Display customer number and pickup instructions
   
2. **Standardize Receipt Format**:
   - Use the same receipt template in both kiosk and operator dashboard
   - Include all required fields from project requirements:
     - Customer name
     - Event name
     - Time (in EST)
     - Date
     - Prints and emails chosen
     - Payment method
     - Payment stamp area
     - Pickup instructions
     - Customer service info
     - Customer number

3. **Create Shared Receipt Component** (Recommended):
   ```javascript
   // public/receipt-template.js
   function generateReceiptHTML(transaction) {
     return `
       <div class="receipt">
         <!-- Standardized receipt layout -->
       </div>
     `;
   }
   ```

## 4. Testing Checklist

### Timezone Testing
- [ ] Create new order - verify `created_at` is in EST
- [ ] Update order status - verify `updated_at` is in EST
- [ ] Check "Today's Orders" statistic - should only count EST today
- [ ] Verify timestamps display with EST suffix in dashboard

### Analytics Testing
- [ ] Open Analytics modal
- [ ] Verify date selector defaults to today
- [ ] Change date - chart should update
- [ ] Select day with no orders - chart should show zeros
- [ ] Select day with many orders - chart should show correct distribution

### API Testing
```bash
# Test orders by hour endpoint
curl "http://localhost:5000/api/analytics/orders-by-hour?date=2025-10-22"

# Expected response:
{
  "success": true,
  "date": "2025-10-22",
  "hourlyData": [0, 0, 5, 10, 15, 8, 3, ...]
}
```

## 5. Known Considerations

### Daylight Saving Time
- Current implementation uses EST (UTC-5) year-round
- Does not automatically adjust for EDT (UTC-4) during summer
- **Recommendation**: Consider using a proper timezone library like `luxon` or `date-fns-tz` for production

### Database Migration
- Existing timestamps in database are in UTC
- New records will be in EST
- **If needed**: Run migration script to convert existing UTC timestamps to EST

### Performance
- Orders by hour query is efficient with existing indexes
- Consider adding index on `DATE(created_at)` if dataset grows very large

## 6. Future Enhancements

1. **Date Range Analytics**
   - Allow selecting date ranges for "Orders by Hour"
   - Add "Compare Dates" feature
   
2. **Real-time Updates**
   - WebSocket connection for live order updates
   - Auto-refresh charts when new orders arrive

3. **Export Analytics**
   - Export charts as images
   - Generate PDF reports with all analytics

4. **Time Zone Selection**
   - Allow operator to switch between EST/EDT/UTC
   - Store timezone preference in config

## 7. Configuration

No configuration changes needed - EST is now the default timezone for all operations.

If you need to change the timezone:
1. Edit `toEST()` function in `server/database.js`
2. Change `estOffset` value (e.g., -8 for PST, -6 for CST)
3. Update `formatFullTimestamp()` timezone string

---

## Quick Start

1. Start the server:
   ```bash
   npm start
   ```

2. Open operator dashboard:
   ```
   http://localhost:5000/operator
   ```

3. Click "Analytics" button to view updated analytics dashboard

4. Select different dates in "Orders by Hour" chart to see data for specific days

---

**Status**: ✅ Complete
**Next Step**: Integrate main kiosk order flow with receipt display
