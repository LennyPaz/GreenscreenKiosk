# Operator Page & Data Storage Strategy
## Comprehensive Plan for Greenscreen Kiosk Backend System

---

## Executive Summary

This document outlines a complete strategy for:
1. **Operator Dashboard** - A web interface for viewing customer transactions
2. **Data Storage** - Hybrid local/cloud approach for offline resilience
3. **Image Management** - Cloudflare R2 integration for photo storage
4. **Offline-First Architecture** - Works without internet, syncs when available

**Key Decision**: Use **hybrid storage** - SQLite locally with optional Cloudflare D1 sync for backup/analysis.

---

## 1. Data Storage Strategy

### 1.1 The Challenge
Your professor said: "should work without any internet"

**Requirements**:
- ✅ Work completely offline (kiosk in venue without WiFi)
- ✅ Store transaction data persistently
- ✅ Store customer ID photos
- ✅ Optionally sync to cloud for backup/analytics
- ✅ Operator can view data on same machine or remotely

### 1.2 Recommended Solution: **Hybrid Local + Cloud**

#### **Architecture Overview**
```
┌─────────────────────────────────────────────────┐
│           KIOSK (LOCAL MACHINE)                │
│                                                 │
│  ┌──────────────────┐    ┌─────────────────┐ │
│  │   SQLite DB      │    │  Local Images   │ │
│  │  transactions    │    │  (Base64/File)  │ │
│  │  .db file        │    │  /images/       │ │
│  └──────────────────┘    └─────────────────┘ │
│           │                       │            │
│           └───────┬───────────────┘            │
│                   │                             │
│          ┌────────▼──────────┐                │
│          │  Operator Page    │                │
│          │  (localhost:5000) │                │
│          └───────────────────┘                │
└─────────────────────────────────────────────────┘
                    │
                    │ (Optional Sync)
                    ▼
         ┌──────────────────────┐
         │  CLOUDFLARE (CLOUD)  │
         │                      │
         │  ┌────────────────┐ │
         │  │  D1 Database   │ │
         │  │  (Backup Copy) │ │
         │  └────────────────┘ │
         │  ┌────────────────┐ │
         │  │  R2 Bucket     │ │
         │  │  (Images CDN)  │ │
         │  └────────────────┘ │
         └──────────────────────┘
```

#### **Why This Approach?**

**✅ PROS:**
- Works 100% offline (local SQLite + file storage)
- Fast (no network latency)
- Reliable (no dependency on internet)
- Scalable (can sync to cloud later)
- Free (SQLite is free, Cloudflare free tier is generous)

**❌ CONS:**
- Need to run local server (Node.js/Python)
- Image sync can be slow over poor connections
- Need backup strategy for local data

---

### 1.3 Database Schema (SQLite)

```sql
-- Main transactions table
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_number INTEGER NOT NULL UNIQUE,
    
    -- Customer Info
    customer_name TEXT NOT NULL,
    party_size INTEGER NOT NULL,
    customer_photo_path TEXT, -- Path to local image file
    
    -- Order Details
    background_id TEXT NOT NULL,
    background_name TEXT NOT NULL,
    delivery_method TEXT NOT NULL, -- 'print', 'email', 'both'
    print_quantity INTEGER DEFAULT 0,
    
    -- Email Details (JSON array)
    email_addresses TEXT, -- JSON: ["email1@example.com", "email2@example.com"]
    email_count INTEGER DEFAULT 0,
    
    -- Payment
    payment_method TEXT NOT NULL,
    total_price REAL NOT NULL,
    
    -- Operator Status Tracking
    status_photo_taken BOOLEAN DEFAULT 0,
    status_paid BOOLEAN DEFAULT 0,
    status_emails_sent BOOLEAN DEFAULT 0,
    status_prints_ready BOOLEAN DEFAULT 0,
    status_picked_up BOOLEAN DEFAULT 0,
    
    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Operator Notes
    operator_notes TEXT,
    
    -- Sync Status (for cloud backup)
    synced_to_cloud BOOLEAN DEFAULT 0,
    cloud_sync_at DATETIME,
    
    -- Event Info (from config)
    event_name TEXT,
    event_date DATE
);

-- Index for fast lookups
CREATE INDEX idx_customer_number ON transactions(customer_number);
CREATE INDEX idx_created_at ON transactions(created_at);
CREATE INDEX idx_status_picked_up ON transactions(status_picked_up);
```

---

### 1.4 Image Storage Strategy

#### **Local Storage (Primary)**
```
/images/
  ├── customer_photos/
  │   ├── 600.jpg
  │   ├── 601.jpg
  │   └── 602.jpg
  └── final_photos/     (Optional: If operator uploads finals)
      ├── 600_final.jpg
      ├── 601_final.jpg
      └── 602_final.jpg
```

**Implementation**:
```javascript
// Save customer photo
function saveCustomerPhoto(customerNumber, base64Image) {
  const fs = require('fs');
  const path = `./images/customer_photos/${customerNumber}.jpg`;
  
  // Remove base64 prefix
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  
  fs.writeFileSync(path, buffer);
  return path;
}
```

#### **Cloud Storage (Optional Backup)**
Use **Cloudflare R2** (like your Spear Exchange project):

```javascript
// Upload to R2 when internet available
async function syncPhotoToCloud(localPath, customerNumber) {
  const fs = require('fs');
  const file = fs.readFileSync(localPath);
  
  await env.IMAGES_BUCKET.put(
    `customer_photos/${customerNumber}.jpg`,
    file,
    {
      httpMetadata: { contentType: 'image/jpeg' }
    }
  );
  
  return `https://pub-[YOUR-R2-ID].r2.dev/customer_photos/${customerNumber}.jpg`;
}
```

---

## 2. Local Server Architecture

### 2.1 Why Need a Local Server?

Your kiosk HTML/JS runs in browser, but needs:
- ❌ Browser can't write files directly
- ❌ Browser can't create SQLite databases
- ✅ Need Node.js/Python backend to handle storage

### 2.2 Recommended Stack: **Node.js + Express + Better-SQLite3**

**Why Node.js?**
- You already know JavaScript
- Simple to set up
- Fast performance
- Can reuse code from kiosk frontend
- Easy to deploy

#### **Project Structure**
```
GreenscreenSprint/
├── public/              (Kiosk frontend)
│   ├── index.html
│   ├── src/
│   │   ├── kiosk.js
│   │   └── style.css
│   └── config.txt
│
├── server/              (NEW: Backend)
│   ├── server.js        (Main server file)
│   ├── database.js      (SQLite operations)
│   ├── routes/
│   │   ├── transactions.js
│   │   ├── operator.js
│   │   └── sync.js
│   └── middleware/
│       └── auth.js      (Optional: password protect operator page)
│
├── operator/            (NEW: Operator frontend)
│   ├── index.html
│   ├── dashboard.js
│   └── dashboard.css
│
├── data/                (NEW: Database & images)
│   ├── transactions.db
│   └── images/
│       └── customer_photos/
│
├── package.json
└── README.md
```

---

### 2.3 Server Implementation

#### **server/server.js**
```javascript
const express = require('express');
const path = require('path');
const cors = require('cors');
const Database = require('better-sqlite3');
const fs = require('fs');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Large limit for base64 images
app.use(express.static('public'));
app.use('/operator', express.static('operator'));

// Initialize database
const db = new Database('./data/transactions.db');

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_number INTEGER NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    party_size INTEGER NOT NULL,
    customer_photo_path TEXT,
    background_id TEXT NOT NULL,
    background_name TEXT NOT NULL,
    delivery_method TEXT NOT NULL,
    print_quantity INTEGER DEFAULT 0,
    email_addresses TEXT,
    email_count INTEGER DEFAULT 0,
    payment_method TEXT NOT NULL,
    total_price REAL NOT NULL,
    status_photo_taken BOOLEAN DEFAULT 0,
    status_paid BOOLEAN DEFAULT 0,
    status_emails_sent BOOLEAN DEFAULT 0,
    status_prints_ready BOOLEAN DEFAULT 0,
    status_picked_up BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    operator_notes TEXT,
    event_name TEXT,
    event_date DATE
  );
  
  CREATE INDEX IF NOT EXISTS idx_customer_number ON transactions(customer_number);
`);

// Ensure images directory exists
if (!fs.existsSync('./data/images/customer_photos')) {
  fs.mkdirSync('./data/images/customer_photos', { recursive: true });
}

// ============================================
// API ENDPOINTS
// ============================================

// POST: Save new transaction
app.post('/api/transactions', (req, res) => {
  try {
    const transaction = req.body;
    
    // Save customer photo if provided
    let photoPath = null;
    if (transaction.customerPhoto) {
      photoPath = saveCustomerPhoto(
        transaction.customerNumber,
        transaction.customerPhoto
      );
    }
    
    // Insert transaction
    const stmt = db.prepare(`
      INSERT INTO transactions (
        customer_number, customer_name, party_size, customer_photo_path,
        background_id, background_name, delivery_method, print_quantity,
        email_addresses, email_count, payment_method, total_price,
        event_name, event_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      transaction.customerNumber,
      transaction.customerName,
      transaction.partySize,
      photoPath,
      transaction.selectedBackground,
      transaction.backgroundName,
      transaction.deliveryMethod,
      transaction.printQuantity,
      JSON.stringify(transaction.emailAddresses),
      transaction.emailAddresses.length,
      transaction.paymentMethod,
      transaction.totalPrice,
      transaction.eventName,
      new Date().toISOString().split('T')[0] // Today's date
    );
    
    res.json({
      success: true,
      id: result.lastInsertRowid,
      message: 'Transaction saved successfully'
    });
  } catch (error) {
    console.error('Save transaction error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET: Retrieve all transactions
app.get('/api/transactions', (req, res) => {
  try {
    const { date, status, limit = 100, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM transactions WHERE 1=1';
    const params = [];
    
    if (date) {
      query += ' AND DATE(created_at) = ?';
      params.push(date);
    }
    
    if (status === 'pending') {
      query += ' AND status_picked_up = 0';
    } else if (status === 'complete') {
      query += ' AND status_picked_up = 1';
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const stmt = db.prepare(query);
    const transactions = stmt.all(...params);
    
    // Parse email addresses JSON
    transactions.forEach(t => {
      if (t.email_addresses) {
        t.email_addresses = JSON.parse(t.email_addresses);
      }
    });
    
    res.json({
      success: true,
      transactions,
      count: transactions.length
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET: Retrieve single transaction
app.get('/api/transactions/:id', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM transactions WHERE id = ?');
    const transaction = stmt.get(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }
    
    // Parse email addresses
    if (transaction.email_addresses) {
      transaction.email_addresses = JSON.parse(transaction.email_addresses);
    }
    
    res.json({
      success: true,
      transaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PATCH: Update transaction status
app.patch('/api/transactions/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Build dynamic update query
    const fields = [];
    const values = [];
    
    const allowedFields = [
      'status_photo_taken',
      'status_paid',
      'status_emails_sent',
      'status_prints_ready',
      'status_picked_up',
      'operator_notes'
    ];
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    });
    
    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    const query = `UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`;
    const stmt = db.prepare(query);
    stmt.run(...values);
    
    res.json({
      success: true,
      message: 'Transaction updated'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET: Get customer photo
app.get('/api/photos/:customerNumber', (req, res) => {
  try {
    const photoPath = `./data/images/customer_photos/${req.params.customerNumber}.jpg`;
    
    if (!fs.existsSync(photoPath)) {
      return res.status(404).json({
        success: false,
        error: 'Photo not found'
      });
    }
    
    res.sendFile(path.resolve(photoPath));
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper function to save customer photo
function saveCustomerPhoto(customerNumber, base64Image) {
  const photoPath = `./data/images/customer_photos/${customerNumber}.jpg`;
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  fs.writeFileSync(photoPath, buffer);
  return photoPath;
}

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📊 Operator dashboard: http://localhost:${PORT}/operator`);
  console.log(`🎯 Kiosk interface: http://localhost:${PORT}`);
});
```

#### **package.json**
```json
{
  "name": "greenscreen-kiosk",
  "version": "1.0.0",
  "description": "Greenscreen photo kiosk with operator dashboard",
  "main": "server/server.js",
  "scripts": {
    "start": "node server/server.js",
    "dev": "nodemon server/server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "better-sqlite3": "^9.2.2",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

---

## 3. Operator Dashboard Design

### 3.1 Dashboard Features

**Must-Have Features**:
1. ✅ View all transactions (today, this week, all time)
2. ✅ Search by customer number/name
3. ✅ Filter by status (pending pickup, completed)
4. ✅ View digital receipt (same as printed)
5. ✅ Update order status (5 stamps)
6. ✅ Add operator notes
7. ✅ Export data (CSV for Excel)
8. ✅ Print individual receipts

**Nice-to-Have Features**:
- 📊 Analytics dashboard (total revenue, orders per hour)
- 📧 Bulk email sender (resend emails if failed)
- 🖼️ View customer ID photos inline
- 🔍 Advanced search (by date range, email, payment method)
- 💾 Backup/restore database
- ☁️ Cloud sync status

---

### 3.2 Operator Dashboard UI (HTML/CSS/JS)

#### **operator/index.html**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Operator Dashboard - Greenscreen Kiosk</title>
  <link rel="stylesheet" href="dashboard.css">
</head>
<body>
  <div class="dashboard">
    <!-- Header -->
    <header class="dashboard__header">
      <div class="dashboard__logo">
        <h1>📸 Greenscreen Kiosk</h1>
        <p>Operator Dashboard</p>
      </div>
      
      <div class="dashboard__stats">
        <div class="stat-card">
          <div class="stat-card__value" id="todayOrders">0</div>
          <div class="stat-card__label">Today's Orders</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__value" id="todayRevenue">$0.00</div>
          <div class="stat-card__label">Today's Revenue</div>
        </div>
        <div class="stat-card stat-card--warning">
          <div class="stat-card__value" id="pendingPickups">0</div>
          <div class="stat-card__label">Pending Pickups</div>
        </div>
      </div>
    </header>

    <!-- Filters & Search -->
    <div class="dashboard__controls">
      <div class="search-box">
        <input type="text" id="searchInput" placeholder="Search by customer number or name...">
        <button id="searchBtn">🔍 Search</button>
      </div>
      
      <div class="filters">
        <select id="statusFilter">
          <option value="all">All Orders</option>
          <option value="pending">Pending Pickup</option>
          <option value="complete">Completed</option>
        </select>
        
        <select id="dateFilter">
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="all">All Time</option>
        </select>
        
        <button id="refreshBtn">↻ Refresh</button>
        <button id="exportBtn">📥 Export CSV</button>
      </div>
    </div>

    <!-- Transactions Table -->
    <div class="dashboard__content">
      <table class="transactions-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Photo</th>
            <th>Customer</th>
            <th>Order Details</th>
            <th>Status</th>
            <th>Total</th>
            <th>Time</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="transactionsTableBody">
          <!-- Populated by JavaScript -->
        </tbody>
      </table>
      
      <div id="emptyState" class="empty-state" style="display: none;">
        <div class="empty-state__icon">📭</div>
        <div class="empty-state__title">No transactions found</div>
        <div class="empty-state__text">Transactions will appear here once customers complete orders.</div>
      </div>
    </div>

    <!-- Transaction Detail Modal -->
    <div id="detailModal" class="modal" style="display: none;">
      <div class="modal__overlay"></div>
      <div class="modal__content">
        <div class="modal__header">
          <h2>Transaction Details</h2>
          <button class="modal__close" id="closeModal">✕</button>
        </div>
        <div class="modal__body" id="modalBody">
          <!-- Populated by JavaScript -->
        </div>
      </div>
    </div>
  </div>

  <script src="dashboard.js"></script>
</body>
</html>
```

#### **operator/dashboard.js**
```javascript
const API_URL = 'http://localhost:5000/api';

// State
let transactions = [];
let currentFilter = { status: 'all', date: 'today', search: '' };

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadTransactions();
  setupEventListeners();
  startAutoRefresh();
});

// Setup Event Listeners
function setupEventListeners() {
  document.getElementById('searchBtn').addEventListener('click', handleSearch);
  document.getElementById('refreshBtn').addEventListener('click', loadTransactions);
  document.getElementById('exportBtn').addEventListener('click', exportToCSV);
  document.getElementById('statusFilter').addEventListener('change', (e) => {
    currentFilter.status = e.target.value;
    loadTransactions();
  });
  document.getElementById('dateFilter').addEventListener('change', (e) => {
    currentFilter.date = e.target.value;
    loadTransactions();
  });
  document.getElementById('closeModal').addEventListener('click', closeModal);
}

// Load Transactions
async function loadTransactions() {
  try {
    const params = new URLSearchParams();
    
    if (currentFilter.status !== 'all') {
      params.append('status', currentFilter.status);
    }
    
    if (currentFilter.date === 'today') {
      params.append('date', new Date().toISOString().split('T')[0]);
    }
    
    const response = await fetch(`${API_URL}/transactions?${params}`);
    const data = await response.json();
    
    if (data.success) {
      transactions = data.transactions;
      renderTransactions();
      updateStats();
    }
  } catch (error) {
    console.error('Load transactions error:', error);
    alert('Failed to load transactions');
  }
}

// Render Transactions Table
function renderTransactions() {
  const tbody = document.getElementById('transactionsTableBody');
  const emptyState = document.getElementById('emptyState');
  
  if (transactions.length === 0) {
    tbody.innerHTML = '';
    emptyState.style.display = 'flex';
    return;
  }
  
  emptyState.style.display = 'none';
  
  tbody.innerHTML = transactions.map(t => `
    <tr class="${t.status_picked_up ? 'transaction--complete' : ''}">
      <td class="transaction__number">#${t.customer_number}</td>
      <td class="transaction__photo">
        ${t.customer_photo_path ? 
          `<img src="${API_URL.replace('/api', '')}/api/photos/${t.customer_number}" 
                alt="Customer ${t.customer_number}" class="customer-photo">` :
          '<div class="no-photo">📷</div>'
        }
      </td>
      <td>
        <div class="customer-info">
          <div class="customer-info__name">${t.customer_name}</div>
          <div class="customer-info__party">${t.party_size} ${t.party_size === 1 ? 'person' : 'people'}</div>
        </div>
      </td>
      <td>
        <div class="order-details">
          ${t.print_quantity > 0 ? `<div>🖨️ ${t.print_quantity} prints</div>` : ''}
          ${t.email_count > 0 ? `<div>📧 ${t.email_count} emails</div>` : ''}
          <div>💳 ${t.payment_method.toUpperCase()}</div>
        </div>
      </td>
      <td>
        <div class="status-badges">
          ${renderStatusBadge('Photo', t.status_photo_taken)}
          ${renderStatusBadge('Paid', t.status_paid)}
          ${t.email_count > 0 ? renderStatusBadge('Email', t.status_emails_sent) : ''}
          ${t.print_quantity > 0 ? renderStatusBadge('Print', t.status_prints_ready) : ''}
          ${t.print_quantity > 0 ? renderStatusBadge('Pickup', t.status_picked_up) : ''}
        </div>
      </td>
      <td class="transaction__total">$${t.total_price.toFixed(2)}</td>
      <td class="transaction__time">${formatTime(t.created_at)}</td>
      <td class="transaction__actions">
        <button class="btn btn--small" onclick="viewTransaction(${t.id})">View</button>
        <button class="btn btn--small btn--success" onclick="printReceipt(${t.id})">Print</button>
      </td>
    </tr>
  `).join('');
}

// Render Status Badge
function renderStatusBadge(label, completed) {
  const className = completed ? 'status-badge--complete' : 'status-badge--pending';
  const icon = completed ? '✓' : '○';
  return `<span class="status-badge ${className}">${icon} ${label}</span>`;
}

// Update Stats
function updateStats() {
  const today = transactions.filter(t => 
    new Date(t.created_at).toDateString() === new Date().toDateString()
  );
  
  document.getElementById('todayOrders').textContent = today.length;
  document.getElementById('todayRevenue').textContent = 
    '$' + today.reduce((sum, t) => sum + t.total_price, 0).toFixed(2);
  document.getElementById('pendingPickups').textContent = 
    transactions.filter(t => !t.status_picked_up && t.print_quantity > 0).length;
}

// View Transaction Detail
async function viewTransaction(id) {
  try {
    const response = await fetch(`${API_URL}/transactions/${id}`);
    const data = await response.json();
    
    if (data.success) {
      showTransactionModal(data.transaction);
    }
  } catch (error) {
    console.error('View transaction error:', error);
  }
}

// Show Transaction Modal
function showTransactionModal(transaction) {
  const modal = document.getElementById('detailModal');
  const modalBody = document.getElementById('modalBody');
  
  modalBody.innerHTML = `
    <div class="transaction-detail">
      <!-- Customer Info -->
      <div class="detail-section">
        <h3>Customer Information</h3>
        ${transaction.customer_photo_path ? 
          `<img src="${API_URL.replace('/api', '')}/api/photos/${transaction.customer_number}" 
                alt="Customer" class="detail-photo">` : ''
        }
        <div class="detail-row">
          <span class="detail-label">Customer Number:</span>
          <span class="detail-value">#${transaction.customer_number}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Name:</span>
          <span class="detail-value">${transaction.customer_name}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Party Size:</span>
          <span class="detail-value">${transaction.party_size} ${transaction.party_size === 1 ? 'person' : 'people'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Background:</span>
          <span class="detail-value">#${transaction.background_id} - ${transaction.background_name}</span>
        </div>
      </div>
      
      <!-- Order Details -->
      <div class="detail-section">
        <h3>Order Details</h3>
        <div class="detail-row">
          <span class="detail-label">Delivery Method:</span>
          <span class="detail-value">${transaction.delivery_method.toUpperCase()}</span>
        </div>
        ${transaction.print_quantity > 0 ? `
          <div class="detail-row">
            <span class="detail-label">Prints:</span>
            <span class="detail-value">${transaction.print_quantity}</span>
          </div>
        ` : ''}
        ${transaction.email_count > 0 ? `
          <div class="detail-row">
            <span class="detail-label">Emails:</span>
            <div class="detail-value">
              ${transaction.email_addresses.map((e, i) => 
                `<div>${i + 1}. ${e.value || e}</div>`
              ).join('')}
            </div>
          </div>
        ` : ''}
        <div class="detail-row">
          <span class="detail-label">Payment:</span>
          <span class="detail-value">${transaction.payment_method.toUpperCase()}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Total:</span>
          <span class="detail-value"><strong>$${transaction.total_price.toFixed(2)}</strong></span>
        </div>
      </div>
      
      <!-- Status Checkboxes -->
      <div class="detail-section">
        <h3>Order Status</h3>
        <div class="status-checkboxes">
          <label>
            <input type="checkbox" ${transaction.status_photo_taken ? 'checked' : ''} 
                   onchange="updateStatus(${transaction.id}, 'status_photo_taken', this.checked)">
            Photo Taken
          </label>
          <label>
            <input type="checkbox" ${transaction.status_paid ? 'checked' : ''} 
                   onchange="updateStatus(${transaction.id}, 'status_paid', this.checked)">
            Paid
          </label>
          ${transaction.email_count > 0 ? `
            <label>
              <input type="checkbox" ${transaction.status_emails_sent ? 'checked' : ''} 
                     onchange="updateStatus(${transaction.id}, 'status_emails_sent', this.checked)">
              Emails Sent
            </label>
          ` : ''}
          ${transaction.print_quantity > 0 ? `
            <label>
              <input type="checkbox" ${transaction.status_prints_ready ? 'checked' : ''} 
                     onchange="updateStatus(${transaction.id}, 'status_prints_ready', this.checked)">
              Prints Ready
            </label>
            <label>
              <input type="checkbox" ${transaction.status_picked_up ? 'checked' : ''} 
                     onchange="updateStatus(${transaction.id}, 'status_picked_up', this.checked)">
              Picked Up
            </label>
          ` : ''}
        </div>
      </div>
      
      <!-- Operator Notes -->
      <div class="detail-section">
        <h3>Operator Notes</h3>
        <textarea id="operatorNotes" rows="4">${transaction.operator_notes || ''}</textarea>
        <button class="btn btn--primary" onclick="saveNotes(${transaction.id})">Save Notes</button>
      </div>
      
      <!-- Timestamp -->
      <div class="detail-section">
        <div class="detail-row">
          <span class="detail-label">Created:</span>
          <span class="detail-value">${new Date(transaction.created_at).toLocaleString()}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Last Updated:</span>
          <span class="detail-value">${new Date(transaction.updated_at).toLocaleString()}</span>
        </div>
      </div>
    </div>
  `;
  
  modal.style.display = 'flex';
}

// Update Status
async function updateStatus(id, field, value) {
  try {
    const response = await fetch(`${API_URL}/transactions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value ? 1 : 0 })
    });
    
    const data = await response.json();
    if (data.success) {
      loadTransactions(); // Refresh table
    }
  } catch (error) {
    console.error('Update status error:', error);
  }
}

// Save Notes
async function saveNotes(id) {
  try {
    const notes = document.getElementById('operatorNotes').value;
    const response = await fetch(`${API_URL}/transactions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operator_notes: notes })
    });
    
    const data = await response.json();
    if (data.success) {
      alert('Notes saved successfully');
    }
  } catch (error) {
    console.error('Save notes error:', error);
  }
}

// Close Modal
function closeModal() {
  document.getElementById('detailModal').style.display = 'none';
}

// Export to CSV
function exportToCSV() {
  const headers = [
    'Customer Number', 'Name', 'Party Size', 'Background', 
    'Prints', 'Emails', 'Payment Method', 'Total', 'Created At'
  ];
  
  const rows = transactions.map(t => [
    t.customer_number,
    t.customer_name,
    t.party_size,
    `${t.background_id} - ${t.background_name}`,
    t.print_quantity,
    t.email_count,
    t.payment_method,
    t.total_price,
    t.created_at
  ]);
  
  let csv = headers.join(',') + '\n';
  rows.forEach(row => {
    csv += row.join(',') + '\n';
  });
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
}

// Print Receipt
function printReceipt(id) {
  // Open receipt in new window and trigger print
  window.open(`/receipt/${id}`, '_blank');
}

// Auto-refresh every 30 seconds
function startAutoRefresh() {
  setInterval(() => {
    if (document.getElementById('detailModal').style.display === 'none') {
      loadTransactions();
    }
  }, 30000);
}

// Helper Functions
function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Handle Search
function handleSearch() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  
  if (!searchTerm) {
    loadTransactions();
    return;
  }
  
  const filtered = transactions.filter(t => 
    t.customer_number.toString().includes(searchTerm) ||
    t.customer_name.toLowerCase().includes(searchTerm)
  );
  
  transactions = filtered;
  renderTransactions();
}
```

---

## 4. Integration with Kiosk Frontend

### 4.1 Modify kiosk.js to Save to Backend

Add at the end of `createProcessingScreen()`:

```javascript
// In the processing screen, after customer number generated
async function saveTransactionToDatabase() {
  try {
    const transactionData = {
      customerNumber: state.customerNumber,
      customerName: state.customerName,
      partySize: state.partySize,
      customerPhoto: state.customerPhoto, // Base64 string
      selectedBackground: state.selectedBackground,
      backgroundName: state.backgroundName,
      deliveryMethod: state.deliveryMethod,
      printQuantity: state.printQuantity,
      emailAddresses: state.emailAddresses,
      paymentMethod: state.paymentMethod,
      totalPrice: state.totalPrice,
      eventName: state.config?.eventName || 'Special Event'
    };
    
    const response = await fetch('http://localhost:5000/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transactionData)
    });
    
    const result = await response.json();
    
    if (!result.success) {
      console.error('Failed to save transaction:', result.error);
      // Still continue to receipt - local storage fallback
    }
  } catch (error) {
    console.error('Save transaction error:', error);
    // Still continue to receipt - operator can manually enter later
  }
}
```

Call this function in the processing screen timeout:

```javascript
// In createProcessingScreen(), update the setTimeout
setTimeout(async () => {
  await saveTransactionToDatabase(); // Save before showing receipt
  navigateTo('receipt');
  createConfetti();
}, 2500);
```

---

## 5. Cloud Sync (Optional)

### 5.1 Cloudflare Integration

If you want cloud backup (using your existing Cloudflare account):

#### **Add to server.js**
```javascript
// Cloudflare Worker API endpoint (you'd need to deploy this)
const CLOUDFLARE_WORKER_URL = 'https://greenscreen-sync.YOUR-SUBDOMAIN.workers.dev';

// Sync transaction to cloud
async function syncToCloud(transaction) {
  try {
    const response = await fetch(`${CLOUDFLARE_WORKER_URL}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SYNC_API_KEY}`
      },
      body: JSON.stringify(transaction)
    });
    
    if (response.ok) {
      // Update local DB to mark as synced
      db.prepare('UPDATE transactions SET synced_to_cloud = 1, cloud_sync_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(transaction.id);
    }
  } catch (error) {
    console.error('Cloud sync error:', error);
    // Fail silently - will retry later
  }
}
```

#### **Cloudflare Worker (sync-worker.js)**
```javascript
export default {
  async fetch(request, env) {
    if (request.method === 'POST' && new URL(request.url).pathname === '/sync') {
      // Verify API key
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || authHeader !== `Bearer ${env.SYNC_API_KEY}`) {
        return new Response('Unauthorized', { status: 401 });
      }
      
      const transaction = await request.json();
      
      // Save to D1
      await env.DB.prepare(`
        INSERT OR REPLACE INTO transactions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        transaction.customer_number,
        transaction.customer_name,
        // ... all fields
      ).run();
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('Not Found', { status: 404 });
  }
};
```

---

## 6. Deployment & Setup

### 6.1 Installation Steps

```bash
# 1. Navigate to project
cd GreenscreenSprint

# 2. Install dependencies
npm install

# 3. Create data directory
mkdir -p data/images/customer_photos

# 4. Start server
npm start
```

### 6.2 Running the System

```bash
# Terminal 1: Start backend server
npm start

# Terminal 2 (optional): Watch for changes during development
npm run dev
```

**URLs**:
- Kiosk: `http://localhost:5000`
- Operator Dashboard: `http://localhost:5000/operator`

---

## 7. Additional Features to Consider

### 7.1 Analytics Dashboard
- Revenue by day/week/month
- Popular backgrounds
- Average order value
- Peak hours chart

### 7.2 Backup System
```javascript
// Add to server.js
app.get('/api/backup', (req, res) => {
  const backup = {
    timestamp: new Date().toISOString(),
    transactions: db.prepare('SELECT * FROM transactions').all()
  };
  
  res.json(backup);
});
```

### 7.3 Email Integration
```javascript
// Use Resend (like Spear Exchange) to send receipts via email
const Resend = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendReceiptEmail(transaction) {
  await resend.emails.send({
    from: 'noreply@greenscreenphotos.com',
    to: transaction.email_addresses[0].value,
    subject: `Order Confirmation #${transaction.customer_number}`,
    html: generateReceiptHTML(transaction)
  });
}
```

---

## 8. Summary & Recommendations

### ✅ **Recommended Approach**
1. **Local SQLite Database** - Primary storage, works offline
2. **Local Image Storage** - Customer photos saved as files
3. **Node.js Backend** - Express server with REST API
4. **Operator Dashboard** - Web interface for management
5. **Optional Cloud Sync** - Cloudflare D1 + R2 for backup

### 🎯 **Why This Works**
- ✅ Works 100% offline (professor requirement met)
- ✅ Fast and reliable (local database)
- ✅ Easy to implement (Node.js + SQLite)
- ✅ Scalable (can add cloud sync later)
- ✅ Familiar tech stack (you know JavaScript)
- ✅ No recurring costs (SQLite is free)

### 📝 **Next Steps**
1. Set up Node.js server structure
2. Create database schema
3. Build operator dashboard UI
4. Integrate kiosk frontend with backend API
5. Test offline functionality
6. (Optional) Add Cloudflare sync

---

## 9. Alternative: Text File Approach (Not Recommended)

If you absolutely want text files instead of database:

```javascript
// Save transaction as JSON file
function saveToTextFile(transaction) {
  const fs = require('fs');
  const filename = `./data/transactions/${transaction.customerNumber}.txt`;
  
  const text = `
CUSTOMER #${transaction.customerNumber}
Name: ${transaction.customerName}
Party Size: ${transaction.partySize}
Background: ${transaction.backgroundName}
Prints: ${transaction.printQuantity}
Emails: ${transaction.emailAddresses.join(', ')}
Payment: ${transaction.paymentMethod}
Total: $${transaction.totalPrice}
Time: ${new Date().toISOString()}
`;
  
  fs.writeFileSync(filename, text);
}
```

**Why Not Recommended:**
- ❌ Hard to search/filter
- ❌ No data integrity
- ❌ Slow for large datasets
- ❌ Can't update status easily
- ❌ No relationships between data
- ❌ Harder to build operator dashboard

---

## 10. Questions & Answers

**Q: Can this run without internet?**
A: Yes! The Node.js server and SQLite database run entirely locally on the kiosk computer. No internet needed.

**Q: How do I access the operator page from another computer?**
A: Change server to listen on `0.0.0.0` instead of `localhost`, then access via `http://KIOSK_IP_ADDRESS:5000/operator` from any device on the same network.

**Q: What if the kiosk computer crashes?**
A: The SQLite database file (`transactions.db`) persists on disk. Just restart the server and all data is intact. For extra safety, periodically backup the `data/` folder.

**Q: Can images be stored in the database instead of files?**
A: Yes, but not recommended. Base64 images make the database huge and slow. File storage is more efficient.

**Q: How do I deploy this for the actual event?**
A: 
1. Copy entire project folder to kiosk computer
2. Install Node.js on kiosk computer
3. Run `npm install` once
4. Add `npm start` to Windows startup scripts
5. Kiosk will auto-start on boot

---

This comprehensive plan should give you everything you need to implement a robust operator dashboard with proper data storage. The hybrid local+cloud approach gives you the best of both worlds: offline reliability with optional cloud backup for analytics and safety.

Let me know which parts you'd like me to implement first!
