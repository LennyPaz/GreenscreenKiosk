/**
 * Operator Dashboard JavaScript - Enhanced Version
 * Handles all dashboard functionality including fetching, displaying, and managing transactions
 * 
 * FEATURES:
 * - Export to CSV
 * - Print Receipts
 * - Bulk Actions
 * - Quick Stats Filters
 * - Sort Columns
 * - Date Range Filter
 * - Photo Preview
 * - Email Delivery Dashboard
 * - Print Queue Management
 * - Analytics Charts
 * - Dark Mode Toggle
 */

// ============================================
// CONFIGURATION
// ============================================

const API_BASE_URL = 'http://localhost:5000/api';
const REFRESH_INTERVAL = 30000; // 30 seconds

// ============================================
// STATE MANAGEMENT
// ============================================

let state = {
  transactions: [],
  filteredTransactions: [],
  statistics: {},
  currentFilter: 'all',
  searchTerm: '',
  isLoading: false,
  selectedOrders: new Set(),
  sortField: 'created_at',
  sortDirection: 'desc',
  dateFrom: null,
  dateTo: null,
  activeStatFilter: null,
  currentTransaction: null
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Check authentication
  if (!sessionStorage.getItem('operatorAuthenticated')) {
    window.location.href = 'login.html';
    return;
  }

  // Add keyboard shortcut for logout (Ctrl+Shift+R)
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'R') {
      e.preventDefault();
      sessionStorage.removeItem('operatorAuthenticated');
      window.location.href = 'login.html';
    }
  });

  initializeApp();
});

async function initializeApp() {
  console.log('Initializing dashboard...');
  
  // Initialize dark mode
  initializeDarkMode();
  
  // Set up event listeners
  setupEventListeners();
  
  // Initial data load
  await loadDashboardData();
  
  // Set up auto-refresh
  setInterval(loadDashboardData, REFRESH_INTERVAL);
  
  console.log('Dashboard initialized successfully');
}

// ============================================
// DARK MODE
// ============================================

function initializeDarkMode() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.body.dataset.theme = savedTheme;
  updateDarkModeIcon(savedTheme);
}

function toggleDarkMode() {
  const currentTheme = document.body.dataset.theme || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  
  document.body.dataset.theme = newTheme;
  localStorage.setItem('theme', newTheme);
  updateDarkModeIcon(newTheme);
  
  showToast(`${newTheme === 'dark' ? 'Dark' : 'Light'} mode enabled`, 'info');
}

function updateDarkModeIcon(theme) {
  const icon = document.getElementById('darkModeIcon');
  icon.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
  // Dark mode toggle
  document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);
  
  // Analytics button
  document.getElementById('analyticsBtn').addEventListener('click', openAnalyticsModal);
  
  // Refresh button
  document.getElementById('refreshBtn').addEventListener('click', async () => {
    await loadDashboardData();
    showToast('Data refreshed successfully', 'success');
  });
  
  // Search - live search as user types
  document.getElementById('searchBtn').addEventListener('click', handleSearch);
  document.getElementById('searchInput').addEventListener('input', handleSearch); // Live search
  document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  });
  
  // Clear search
  document.getElementById('clearSearchBtn').addEventListener('click', () => {
    document.getElementById('searchInput').value = '';
    state.searchTerm = '';
    filterAndRenderTransactions();
  });
  
  // Status filter
  document.getElementById('statusFilter').addEventListener('change', (e) => {
    state.currentFilter = e.target.value;
    filterAndRenderTransactions();
  });
  
  // Date filters
  document.getElementById('dateFrom').addEventListener('change', applyDateFilter);
  document.getElementById('dateTo').addEventListener('change', applyDateFilter);
  document.getElementById('clearDatesBtn').addEventListener('click', clearDateFilter);
  
  // Export CSV
  document.getElementById('exportCSVBtn').addEventListener('click', exportToCSV);
  
  // Print Queue
  document.getElementById('printQueueBtn').addEventListener('click', openPrintQueueModal);
  
  // Email Dashboard
  document.getElementById('emailDashboardBtn').addEventListener('click', openEmailDashboardModal);
  
  // Bulk actions
  document.getElementById('selectAllCheckbox').addEventListener('change', handleSelectAll);
  document.getElementById('bulkCompleteBtn').addEventListener('click', bulkMarkComplete);
  document.getElementById('bulkPrintBtn').addEventListener('click', bulkPrintReceipts);
  document.getElementById('bulkDeselectBtn').addEventListener('click', deselectAll);
  
  // Stats card filters
  document.querySelectorAll('.stat-card.clickable').forEach(card => {
    card.addEventListener('click', () => handleStatCardClick(card));
  });
  
  // Modal close handlers
  setupModalCloseHandlers('detailModal', ['modalClose', 'modalCloseBtn', 'modalOverlay']);
  setupModalCloseHandlers('analyticsModal', ['analyticsClose', 'analyticsCloseBtn', 'analyticsOverlay']);
  setupModalCloseHandlers('printQueueModal', ['printQueueClose', 'printQueueCloseBtn', 'printQueueOverlay']);
  setupModalCloseHandlers('emailDashboardModal', ['emailDashboardClose', 'emailDashboardCloseBtn', 'emailDashboardOverlay']);
  
  // Print receipt button
  document.getElementById('printReceiptBtn').addEventListener('click', () => {
    if (state.currentTransaction) {
      printReceipt(state.currentTransaction.customer_number);
    }
  });
  
  // Setup sortable headers
  setTimeout(() => {
    document.querySelectorAll('.sortable').forEach(th => {
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => sortTransactions(th.dataset.sort));
    });
  }, 100);
}

function setupModalCloseHandlers(modalId, elementIds) {
  const modal = document.getElementById(modalId);
  elementIds.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('click', () => closeModal(modalId));
    }
  });
}

// ============================================
// DATA FETCHING
// ============================================

async function loadDashboardData() {
  if (state.isLoading) return;
  
  state.isLoading = true;
  updateConnectionStatus('loading');
  
  try {
    // Fetch statistics and transactions in parallel
    const [statsResponse, transactionsResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/statistics`),
      fetch(`${API_BASE_URL}/transactions`)
    ]);
    
    if (!statsResponse.ok || !transactionsResponse.ok) {
      throw new Error('Failed to fetch data');
    }
    
    const statsData = await statsResponse.json();
    const transactionsData = await transactionsResponse.json();
    
    // Update state
    state.statistics = statsData.statistics;
    state.transactions = transactionsData.transactions;
    
    // Update UI
    renderStatistics();
    filterAndRenderTransactions();
    
    updateConnectionStatus('online');
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    updateConnectionStatus('offline');
    showToast('Failed to load data. Retrying...', 'error');
  } finally {
    state.isLoading = false;
  }
}

// ============================================
// RENDERING FUNCTIONS
// ============================================

function renderStatistics() {
  const { totalOrders, totalRevenue, pendingOrders, todayOrders } = state.statistics;
  
  document.getElementById('totalOrders').textContent = totalOrders || 0;
  document.getElementById('totalRevenue').textContent = formatCurrency(totalRevenue || 0);
  document.getElementById('pendingOrders').textContent = pendingOrders || 0;
  document.getElementById('todayOrders').textContent = todayOrders || 0;
}

function filterAndRenderTransactions() {
  // Start with all transactions
  let filtered = [...state.transactions];
  
  // Apply search filter
  if (state.searchTerm) {
    filtered = filtered.filter(t => {
      const searchLower = state.searchTerm.toLowerCase();
      return (
        t.customer_number.toString().toLowerCase().includes(searchLower) ||
        t.customer_name.toLowerCase().includes(searchLower) ||
        t.background_name.toLowerCase().includes(searchLower)
      );
    });
  }
  
  // Apply status filter
  if (state.currentFilter !== 'all') {
    filtered = filtered.filter(t => {
      switch (state.currentFilter) {
        case 'pending':
          return t.status_picked_up === 0;
        case 'completed':
          return t.status_picked_up === 1;
        case 'unpaid':
          return t.status_paid === 0;
        default:
          return true;
      }
    });
  }
  
  // Apply stat card filter
  if (state.activeStatFilter) {
    filtered = filtered.filter(t => {
      switch (state.activeStatFilter) {
        case 'pending':
          return t.status_picked_up === 0;
        case 'today':
          const today = new Date().toDateString();
          const tDate = new Date(t.created_at).toDateString();
          return today === tDate;
        case 'revenue':
          return t.status_paid === 1;
        case 'all':
        default:
          return true;
      }
    });
  }
  
  // Apply date range filter
  if (state.dateFrom || state.dateTo) {
    filtered = filtered.filter(t => {
      const tDate = new Date(t.created_at);
      if (state.dateFrom && tDate < state.dateFrom) return false;
      if (state.dateTo && tDate > state.dateTo) return false;
      return true;
    });
  }
  
  // Apply sorting
  filtered.sort((a, b) => {
    let aVal = a[state.sortField];
    let bVal = b[state.sortField];
    
    // Handle numeric and string comparisons
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return state.sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }
    
    // String comparison
    aVal = String(aVal).toLowerCase();
    bVal = String(bVal).toLowerCase();
    
    if (state.sortDirection === 'asc') {
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    } else {
      return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
    }
  });
  
  state.filteredTransactions = filtered;
  renderTransactions();
  updateSortIcons();
}

function renderTransactions() {
  const tbody = document.getElementById('transactionsBody');
  const countElement = document.getElementById('transactionCount');
  
  // Update count
  countElement.textContent = `Showing ${state.filteredTransactions.length} of ${state.transactions.length} orders`;
  
  // Clear existing rows
  tbody.innerHTML = '';
  
  // Handle empty state
  if (state.filteredTransactions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="13" class="empty-cell">
          <p>No transactions found</p>
          ${state.searchTerm || state.currentFilter !== 'all' || state.activeStatFilter ? '<p style="margin-top: 8px; font-size: 14px;">Try adjusting your filters</p>' : ''}
        </td>
      </tr>
    `;
    return;
  }
  
  // Render transactions
  state.filteredTransactions.forEach(transaction => {
    const row = createTransactionRow(transaction);
    tbody.appendChild(row);
  });
  
  // Update select all checkbox state
  updateSelectAllCheckbox();
}

function createTransactionRow(t) {
  const row = document.createElement('tr');
  const status = getTransactionStatus(t);
  const isSelected = state.selectedOrders.has(t.customer_number);
  
  row.innerHTML = `
    <td>
      <input type="checkbox" class="row-checkbox" data-customer-number="${t.customer_number}" ${isSelected ? 'checked' : ''}>
    </td>
    <td>
      <span class="customer-number" onclick="openReceiptImages('${t.customer_number}')" style="cursor: pointer; text-decoration: underline;" title="Click to open images folder">#${t.customer_number}</span>
    </td>
    <td>
      ${t.customer_photo_path 
        ? `<img src="${t.customer_photo_path}" alt="Customer photo" class="photo-thumbnail" onclick="viewPhoto('${t.customer_photo_path}')" title="Click to enlarge">`
        : '<span class="no-photo">No Photo</span>'
      }
    </td>
    <td>${escapeHtml(t.customer_name)}</td>
    <td>${t.party_size >= 10 ? '10+' : t.party_size}</td>
    <td>
      ${t.photo_quantity || 1}
    </td>
    <td>
      ${(() => {
        // Check if multiple different backgrounds (photo_quantity > 1 AND use_same_background is false/0 AND has backgrounds_data)
        if ((t.photo_quantity > 1) && (t.use_same_background === 0 || t.use_same_background === false) && t.backgrounds_data) {
          try {
            const backgrounds = JSON.parse(t.backgrounds_data);
            // Show grouped format instead of "Multiple ↓"
            const bgCounts = {};
            backgrounds.forEach(bg => {
              bgCounts[bg.name] = (bgCounts[bg.name] || 0) + 1;
            });
            const displayText = Object.entries(bgCounts)
              .map(([name, count]) => count > 1 ? `${name} ×${count}` : name)
              .join(', ');
            const tooltip = backgrounds.map((bg, i) => `Photo ${i+1}: ${bg.name}`).join('\\n');
            return `<span title="${tooltip}">${escapeHtml(displayText)}</span>`;
          } catch(e) {
            return escapeHtml(t.background_name);
          }
        }
        return escapeHtml(t.background_name);
      })()}
      ${(() => {
        // Check if any background is custom (including AI custom and in multiple backgrounds)
        let hasCustom = t.background_id === 'ai-custom' ||
          t.background_id === 'custom' ||
          t.background_id === 'mixed-custom' ||
          t.background_name.toLowerCase() === 'custom' ||
          t.background_name.toLowerCase() === 'custom background' ||
          t.background_name.toLowerCase().includes('ai custom') ||
          t.background_name.toLowerCase().includes('manual custom') ||
          t.background_name.toLowerCase().includes('mixed custom');

        // Also check if any background in backgrounds_data is custom
        if (!hasCustom && t.backgrounds_data) {
          try {
            const backgrounds = JSON.parse(t.backgrounds_data);
            // Check for AI custom type or custom backgrounds
            hasCustom = (backgrounds.type === 'ai-custom') || backgrounds.some(bg =>
              bg.name.toLowerCase() === 'custom' || bg.name.toLowerCase() === 'custom background'
            );
          } catch(e) {}
        }

        return hasCustom
          ? ` <button class="btn btn-sm btn-secondary" onclick="viewTransactionDetailsAndScrollToNotes('${t.customer_number}')" title="View custom background notes" style="display: inline-block; vertical-align: middle; margin-left: 6px; padding: 2px 8px; font-size: 11px;">📋</button>`
          : '';
      })()}
    </td>
    <td>${formatDeliveryMethod(t.delivery_method)}</td>
    <td>${formatPaymentMethod(t.payment_method)}</td>
    <td><span class="price">${formatCurrency(t.total_price)}</span></td>
    <td>
      <div style="display: flex; align-items: center; gap: 6px;">
        <span class="status-badge ${status.class}">${status.label}</span>
        ${getQuickActionButton(t, status)}
      </div>
    </td>
    <td>
      <div class="timestamp">${formatTimestamp(t.created_at)}</div>
    </td>
    <td>
      <button class="btn btn-sm btn-secondary" onclick="viewTransactionDetails('${t.customer_number}')">
        View
      </button>
    </td>
  `;
  
  // Add checkbox change listener
  const checkbox = row.querySelector('.row-checkbox');
  checkbox.addEventListener('change', (e) => {
    handleRowCheckboxChange(t.customer_number, e.target.checked);
  });
  
  return row;
}

// ============================================
// SORTING
// ============================================

function sortTransactions(field) {
  if (state.sortField === field) {
    state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    state.sortField = field;
    state.sortDirection = 'asc';
  }
  filterAndRenderTransactions();
}

function updateSortIcons() {
  document.querySelectorAll('.sortable').forEach(th => {
    const sortField = th.dataset.sort;
    const icon = th.querySelector('.sort-icon');
    
    if (sortField === state.sortField) {
      icon.textContent = state.sortDirection === 'asc' ? ' ▲' : ' ▼';
      icon.style.opacity = '1';
    } else {
      icon.textContent = ' ▼';
      icon.style.opacity = '0.3';
    }
  });
}

// ============================================
// STAT CARD FILTERS
// ============================================

function handleStatCardClick(card) {
  const filter = card.dataset.filter;
  
  // Toggle active state
  document.querySelectorAll('.stat-card.clickable').forEach(c => c.classList.remove('active'));
  
  if (state.activeStatFilter === filter) {
    // Clicking the same card again - clear filter
    state.activeStatFilter = null;
  } else {
    // Set new filter
    state.activeStatFilter = filter;
    card.classList.add('active');
  }
  
  filterAndRenderTransactions();
}

// ============================================
// DATE FILTERING
// ============================================

function applyDateFilter() {
  const dateFrom = document.getElementById('dateFrom').value;
  const dateTo = document.getElementById('dateTo').value;
  
  state.dateFrom = dateFrom ? new Date(dateFrom + 'T00:00:00') : null;
  state.dateTo = dateTo ? new Date(dateTo + 'T23:59:59') : null;
  
  filterAndRenderTransactions();
}

function clearDateFilter() {
  document.getElementById('dateFrom').value = '';
  document.getElementById('dateTo').value = '';
  state.dateFrom = null;
  state.dateTo = null;
  filterAndRenderTransactions();
}

// ============================================
// BULK ACTIONS
// ============================================

function handleSelectAll(e) {
  const isChecked = e.target.checked;
  
  state.filteredTransactions.forEach(t => {
    if (isChecked) {
      state.selectedOrders.add(t.customer_number);
    } else {
      state.selectedOrders.delete(t.customer_number);
    }
  });
  
  // Update all visible checkboxes
  document.querySelectorAll('.row-checkbox').forEach(cb => {
    cb.checked = isChecked;
  });
  
  updateBulkActions();
}

function handleRowCheckboxChange(customerNumber, isChecked) {
  if (isChecked) {
    state.selectedOrders.add(customerNumber);
  } else {
    state.selectedOrders.delete(customerNumber);
  }
  
  updateBulkActions();
  updateSelectAllCheckbox();
}

function updateSelectAllCheckbox() {
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  const visibleCustomerNumbers = state.filteredTransactions.map(t => t.customer_number);
  const allVisibleSelected = visibleCustomerNumbers.every(num => state.selectedOrders.has(num));
  const someVisibleSelected = visibleCustomerNumbers.some(num => state.selectedOrders.has(num));
  
  selectAllCheckbox.checked = allVisibleSelected && visibleCustomerNumbers.length > 0;
  selectAllCheckbox.indeterminate = someVisibleSelected && !allVisibleSelected;
}

function updateBulkActions() {
  const bulkBar = document.getElementById('bulkActionsBar');
  const bulkCount = document.getElementById('bulkCount');
  
  if (state.selectedOrders.size > 0) {
    bulkBar.style.display = 'flex';
    bulkCount.textContent = `${state.selectedOrders.size} selected`;
  } else {
    bulkBar.style.display = 'none';
  }
}

async function bulkMarkComplete() {
  if (state.selectedOrders.size === 0) return;
  
  const confirmed = confirm(`Mark ${state.selectedOrders.size} order(s) as complete?`);
  if (!confirmed) return;
  
  try {
    const promises = Array.from(state.selectedOrders).map(customerNumber =>
      fetch(`${API_BASE_URL}/transactions/${customerNumber}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: 'status_picked_up', value: true })
      })
    );
    
    await Promise.all(promises);
    
    // Update local state
    state.selectedOrders.forEach(customerNumber => {
      const transaction = state.transactions.find(t => t.customer_number === customerNumber);
      if (transaction) {
        transaction.status_picked_up = 1;
      }
    });
    
    deselectAll();
    filterAndRenderTransactions();
    showToast(`Successfully marked ${promises.length} order(s) as complete`, 'success');
  } catch (error) {
    console.error('Error in bulk update:', error);
    showToast('Failed to update some orders', 'error');
  }
}

function bulkPrintReceipts() {
  if (state.selectedOrders.size === 0) return;
  
  Array.from(state.selectedOrders).forEach(customerNumber => {
    setTimeout(() => printReceipt(customerNumber), 100);
  });
}

function deselectAll() {
  state.selectedOrders.clear();
  document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = false);
  document.getElementById('selectAllCheckbox').checked = false;
  updateBulkActions();
}

// ============================================
// EXPORT TO CSV
// ============================================

function exportToCSV() {
  const headers = [
    'Order #',
    'Customer Name',
    'Party Size',
    'Background',
    'Delivery Method',
    'Payment Method',
    'Total Price',
    'Status',
    'Photo Taken',
    'Paid',
    'Emails Sent',
    'Prints Ready',
    'Picked Up',
    'Created At',
    'Operator Notes'
  ];
  
  const rows = state.filteredTransactions.map(t => {
    const status = getTransactionStatus(t);

    // Handle multiple backgrounds for CSV export
    let backgroundDisplay = t.background_name;
    if (t.backgrounds_data && (t.photo_quantity || 1) > 1 && (t.use_same_background === 0 || t.use_same_background === false)) {
      try {
        const backgrounds = JSON.parse(t.backgrounds_data);
        const bgCounts = {};
        backgrounds.forEach(bg => {
          bgCounts[bg.name] = (bgCounts[bg.name] || 0) + 1;
        });
        backgroundDisplay = Object.entries(bgCounts)
          .map(([name, count]) => count > 1 ? `${name} ×${count}` : name)
          .join(', ');
      } catch(e) {
        backgroundDisplay = t.background_name;
      }
    }

    return [
      t.customer_number,
      t.customer_name,
      t.party_size >= 10 ? '10+' : t.party_size,
      backgroundDisplay,
      formatDeliveryMethod(t.delivery_method),
      formatPaymentMethod(t.payment_method),
      t.total_price,
      status.label,
      t.status_photo_taken ? 'Yes' : 'No',
      t.status_paid ? 'Yes' : 'No',
      t.status_emails_sent ? 'Yes' : 'No',
      t.status_prints_ready ? 'Yes' : 'No',
      t.status_picked_up ? 'Yes' : 'No',
      new Date(t.created_at).toLocaleString(),
      (t.operator_notes || '').replace(/"/g, '""')
    ];
  });
  
  const csvContent = [
    headers.map(h => `"${h}"`).join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `greenscreen-orders-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  
  showToast(`Exported ${rows.length} order(s) to CSV`, 'success');
}

// ============================================
// PRINT RECEIPT
// ============================================

async function printReceipt(customerNumber) {
  try {
    console.log('Fetching transaction:', customerNumber);

    // Fetch transaction from API to get parsed fields
    const response = await fetch(`${API_BASE_URL}/transactions/${customerNumber}`);
    if (!response.ok) {
      console.error('API response not OK:', response.status);
      showToast('Transaction not found', 'error');
      return;
    }

    const data = await response.json();
    const transaction = data.transaction;
    console.log('Transaction data:', transaction);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      console.error('Popup blocked');
      showToast('Please allow popups to print receipts', 'warning');
      return;
    }

    console.log('Print window opened');

    const now = new Date();
    const date = now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const eventName = transaction.event_name || 'Special Event';

    // Use pre-parsed fields from API
    const emailAddresses = transaction.emailAddresses || [];
    const selectedBackgrounds = transaction.backgroundsData || [];
    const aiPrompts = transaction.aiPromptsData || [];
    const emailCount = emailAddresses.length;

    console.log('Email addresses:', emailAddresses);
    console.log('Selected backgrounds:', selectedBackgrounds);
    console.log('AI prompts:', aiPrompts);

    console.log('Starting document.write...');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt #${transaction.customer_number}</title>
        <style>
          :root {
            --color-success: #10b981;
            --color-gray-100: #f3f4f6;
            --color-gray-600: #4b5563;
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body {
            height: 100%;
            width: 100%;
            overflow: hidden;
          }
          body {
            font-family: Arial, sans-serif;
            background: #e5e7eb;
            display: flex;
            flex-direction: column;
            padding: 8px;
          }
          .header-text {
            text-align: center;
            margin-bottom: 8px;
          }
          .receipt-wrapper {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            max-height: calc(100vh - 100px);
          }
          .receipt-container {
            flex: 1;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0;
            background: white;
            border: 2px solid #000;
            overflow: auto;
          }
          .customer-receipt, .operator-receipt {
            padding: 12px;
            color: black;
          }
          .customer-receipt {
            background: white;
            border-right: 3px dashed #000;
          }
          .operator-receipt {
            background: #f8f8f8;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid black;
            padding-bottom: 12px;
            margin-bottom: 12px;
          }
          .customer-number {
            font-size: 28px;
            font-weight: bold;
            margin: 8px 0;
          }
          .keep-receipt {
            font-size: 18px;
            font-weight: 900;
            color: #d00;
            background: #ffeb3b;
            padding: 6px 12px;
            display: inline-block;
            border: 2px solid #000;
          }
          .content {
            font-size: 11px;
            line-height: 1.4;
          }
          .event-name {
            margin-bottom: 8px;
            font-weight: bold;
            font-size: 12px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            margin-bottom: 8px;
          }
          .section {
            border-top: 1px solid #000;
            padding-top: 8px;
            margin-bottom: 8px;
          }
          .section-title {
            font-weight: bold;
            margin-bottom: 4px;
          }
          .qr-box {
            text-align: center;
            margin: 12px 0;
            padding: 12px;
            background: white;
            border: 2px solid #000;
          }
          .qr-code {
            width: 80px;
            height: 80px;
            margin: 0 auto;
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #000;
          }
          .operator-qr-code {
            width: 90px;
            height: 90px;
          }
          .checkbox {
            border: 2px solid #000;
            width: 65px;
            height: 65px;
            background: white;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin: 8px 0;
          }
          .customer-photo {
            text-align: center;
            margin-bottom: 8px;
          }
          .customer-photo img {
            max-width: 200px;
            max-height: 200px;
            width: 200px;
            height: auto;
            border: 3px solid #000;
            display: block;
            margin: 0 auto;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          }
          .quick-data {
            font-size: 9px;
            line-height: 1.4;
            background: white;
            padding: 8px;
            border: 1px solid #000;
            margin-bottom: 8px;
          }
          .mono {
            font-family: monospace;
            font-size: 8px;
          }
          .mono-small {
            font-family: monospace;
            font-size: 7px;
            margin-left: 8px;
          }
          .notes-box {
            border: 2px solid #000;
            padding: 12px;
            margin-bottom: 12px;
            min-height: 100px;
            background: white;
          }
          .notes-title {
            font-weight: bold;
            font-size: 12px;
            margin-bottom: 10px;
            text-align: center;
          }
          .notes-space {
            height: 70px;
          }
          @media print {
            html, body {
              height: 100%;
              overflow: visible;
            }
            body {
              background: white;
              padding: 8px;
            }
            button { display: none; }
            .print-button-wrapper { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header-text">
          <h1 style="font-size: 18px; font-weight: bold; color: #10b981;">Receipts Ready - Cut Along Dashed Line</h1>
        </div>

        <div class="receipt-wrapper">
          <div class="receipt-container">
          <!-- CUSTOMER RECEIPT (LEFT) -->
          <div class="customer-receipt">
            <div class="header">
              <div style="font-size: 22px; font-weight: bold;">CUSTOMER RECEIPT</div>
              <div class="customer-number">#${transaction.customer_number}</div>
              <div class="keep-receipt">⚠️ KEEP THIS RECEIPT ⚠️</div>
            </div>

            <div class="content">
              <div class="event-name">${eventName}</div>
              <div class="info-grid">
                <div><strong>Name:</strong> ${escapeHtml(transaction.customer_name)}</div>
                <div><strong>Party:</strong> ${transaction.party_size >= 10 ? '10+' : transaction.party_size}</div>
                <div><strong>Date:</strong> ${date}</div>
                <div><strong>Time:</strong> ${time}</div>
              </div>

              ${!transaction.use_same_background && transaction.photo_quantity > 1 ? `
                <div style="font-size: 10px; padding: 6px; background: #f0f0f0; border: 1px solid #000; margin-bottom: 8px; text-align: center; font-weight: bold;">
                  PHOTOS: ${transaction.photo_quantity} | Different BGs
                </div>
              ` : ''}

              <div class="section">
                <div class="section-title">ORDER:</div>
                <div>• ${transaction.photo_quantity} Photo${transaction.photo_quantity > 1 ? 's' : ''}</div>
                ${(() => {
                  // Count regular backgrounds
                  const regularBgs = [];
                  let manualCustomCount = 0;
                  let aiCustomCount = 0;

                  if (selectedBackgrounds && selectedBackgrounds.length > 0) {
                    selectedBackgrounds.forEach((bg, index) => {
                      if (bg.id === 'custom') {
                        manualCustomCount++;
                      } else if (bg.id === 'ai-custom') {
                        aiCustomCount++;
                      } else {
                        regularBgs.push(bg.name);
                      }
                    });
                  }

                  const parts = [];

                  // Regular backgrounds
                  if (regularBgs.length > 0) {
                    const bgCounts = {};
                    regularBgs.forEach(name => {
                      bgCounts[name] = (bgCounts[name] || 0) + 1;
                    });
                    const bgList = Object.entries(bgCounts)
                      .map(([name, count]) => count > 1 ? name + ' ×' + count : name)
                      .join(', ');
                    parts.push(bgList);
                  }

                  // Custom counts
                  if (manualCustomCount > 0) {
                    parts.push('Manual Custom ×' + manualCustomCount);
                  }
                  if (aiCustomCount > 0) {
                    parts.push('AI Custom ×' + aiCustomCount);
                  }

                  return parts.length > 0 ? '<div>• BG: ' + parts.join(', ') + '</div>' : '';
                })()}
                ${transaction.print_quantity > 0 ? `<div>• ${transaction.print_quantity} Print${transaction.print_quantity > 1 ? 's' : ''}</div>` : ''}
                ${emailAddresses.length > 0 ? `<div>• ${emailAddresses.length} Email${emailAddresses.length > 1 ? 's' : ''}</div>` : ''}
                <div>• ${transaction.payment_method?.toUpperCase()}</div>
                <div style="font-weight: bold; margin-top: 4px;">TOTAL: $${transaction.total_price.toFixed(2)}</div>
              </div>

              <div class="qr-box">
                <div style="font-weight: bold; font-size: 11px; margin-bottom: 8px;">SCAN TO CHECK ORDER STATUS</div>
                <div class="qr-code">
                  <svg viewBox="0 0 29 29" style="width: 100%; height: 100%;">
                    <rect width="29" height="29" fill="white"/>
                    <path d="M0,0h7v7h-7zM8,0h1v1h1v1h-1v1h-1v-1h-1v1h-1v-2h2zM10,0h3v1h-1v1h-1v1h-1zM16,0h1v3h1v-1h1v-1h3v1h-1v1h-1v1h1v1h1v-1h1v2h-1v1h1v1h1v-1h1v-2h1v-3h1v7h-1v-1h-2v2h-1v-1h-1v-1h-1v1h-1v1h1v2h-1v1h-1v-2h-1v-1h-1v1h-1v-1h-1v1h-1v1h1v1h-1v1h-2v-1h-1v1h-1v-1h-1v-1h1v-1h-1v-1h2v-1h1v-1h1v-1h-2v-1h1v-1h-1v-1h1v-1h2v-2h2v-1h1v-1h-3v-1h-1v-1h1v-1h-1v-1h1v-1h2v1h1v-2h-2v-1h-1v-1h-1v-1h-1v-2h2v1h1v-1h2v-1h-2v-2h1v-1h-1v-1h-1v2h-1v1h-1v-1h-1v1h-1v-1h-2v-1h1v-1h-1v-1h1v-1h1zM14,1h1v1h-1zM22,0h7v7h-7zM1,1v5h5v-5zM9,2h1v1h-1zM11,2v1h-1v1h1v-1h1v-1zM15,2h1v1h-1zM23,1v5h5v-5zM2,2h3v3h-3zM18,2h1v2h-1zM24,2h3v3h-3zM10,4h1v2h-1v1h-1v-1h1zM16,4v1h-1v1h1v1h-2v-1h-1v1h-1v-1h-1v-1h3v-1zM19,5h1v1h-1zM8,6h1v1h-1zM20,6h1v2h-1zM5,7h2v1h1v1h-1v1h-1v-1h-2v1h-1v-1h-1v-1h2v-1h1zM13,7h2v2h-1v-1h-1zM9,8h1v1h-1zM0,9h1v1h1v1h1v1h-2v1h1v1h-1v2h1v-1h1v1h-1v1h-2v-3h1v-2h-1zM14,9h1v1h2v1h-2v1h-1v1h1v1h-1v1h-2v-1h-1v1h-1v-1h-1v-1h1v-1h-1v-1h3v1h1v-1h1zM18,9h1v1h1v-1h1v1h-1v2h1v-1h2v2h-1v-1h-1v3h-1v-2h-1v-1h-1v-1h1v-1h-1zM4,10h2v1h-2zM22,10v1h1v1h-1v1h-1v1h1v-1h1v3h-1v1h-1v-3h-1v-1h1v-2h-2v-1zM6,11h1v1h-1zM25,11h1v1h-1zM26,12h1v2h-1zM8,13h1v1h1v1h-2zM24,13h1v2h-1v1h-1v-1h1v-1h-1zM17,14h2v1h-2zM27,14h2v1h-2zM11,15h1v1h-1zM16,15h1v1h-1zM4,16h1v2h1v-1h1v-1h2v1h-1v1h-1v1h1v1h-1v1h-2v-1h-1v-1h1v-1h-1zM20,16h1v1h-1zM26,16h1v1h-1zM9,17h1v1h-1zM15,17h1v1h1v-1h1v1h-1v1h-1v1h-1v-1h1zM28,17h1v2h-1zM19,18h1v1h1v-1h3v1h-1v1h-1v-1h-2v1h-1v1h1v1h-2v-1h1v-1h-1v-1h1zM25,18h1v1h1v2h-1v-1h-1zM10,19h2v1h-1v1h-1zM27,19h1v2h-1zM13,20h2v1h-1v1h-1zM23,20h1v1h-1zM9,21h1v1h-1zM0,22h7v7h-7zM16,22h1v1h-1zM18,22h1v2h-1zM20,22h2v1h-2zM24,22h1v1h-1zM1,23v5h5v-5zM11,23h1v1h-1zM26,23h1v1h-1zM2,24h3v3h-3zM10,24h1v2h-1zM13,24h2v1h1v1h-1v1h-1v1h-1v-1h-1v-1h1zM21,24h1v1h-1zM23,24h2v1h1v1h-3v1h2v1h-3v1h4v-2h1v-1h-1v-1h1v-1h-1v-1h-3zM8,25h1v1h-1zM17,25v1h1v1h-2v-1h1zM20,25h1v3h-1zM28,25h1v4h-1zM9,26v1h-1v1h2v-2zM11,27h1v1h-1zM16,27h1v1h-1zM22,27h1v1h-1zM25,28h2v1h-2z" fill="black"/>
                  </svg>
                </div>
                <div style="font-size: 9px; margin-top: 6px; color: #666;">ID: ${transaction.customer_number}</div>
              </div>

              ${transaction.print_quantity > 0 ? `
                <div class="section" style="font-size: 10px;">
                  <div style="font-weight: bold; margin-bottom: 4px;">PRINT PICKUP:</div>
                  <div>Return at end of event</div>
                </div>
                <div class="checkbox">
                  <div style="font-size: 16px; font-weight: bold;">☐</div>
                  <div style="font-size: 9px; color: #666; margin-top: 2px;">RCVD</div>
                </div>
              ` : ''}

              ${emailCount > 0 ? `
                <div class="section" style="font-size: 10px;">
                  <div style="font-weight: bold;">EMAIL DELIVERY:</div>
                  <div>If not received in 2 days:</div>
                  <div style="font-weight: bold;">support@greenscreenphotos.com</div>
                </div>
              ` : ''}

              <div class="section" style="font-size: 10px;">
                <div style="font-weight: bold;">QUESTIONS? Call: 1-800-PHOTO-HELP</div>
                <div style="border: 1px solid #000; padding: 6px; margin-top: 4px; min-height: 25px; background: #f9f9f9;">
                  <div style="color: #999; font-size: 8px;">Notes:</div>
                  ${(() => {
                    const promptEntries = aiPrompts
                      .map((prompt, index) => ({ prompt, index }))
                      .filter(entry => entry.prompt && entry.prompt.trim());

                    if (promptEntries.length > 0 && selectedBackgrounds && selectedBackgrounds.length > 0) {
                      // Separate prompts into manual and AI
                      const manualPrompts = [];
                      const aiPromptsFiltered = [];

                      promptEntries.forEach(entry => {
                        const bg = selectedBackgrounds[entry.index];
                        const isAI = bg && bg.id === 'ai-custom';
                        const photoInfo = { photoNum: entry.index + 1, prompt: entry.prompt };

                        if (isAI) {
                          aiPromptsFiltered.push(photoInfo);
                        } else {
                          manualPrompts.push(photoInfo);
                        }
                      });

                      let html = '';

                      // Manual Custom box (if any)
                      if (manualPrompts.length > 0) {
                        html += '<div style="font-size: 8px; margin-top: 4px; padding: 4px; background: #fffacd; border: 1px solid #000;">' +
                          '<strong>MANUAL CUSTOM:</strong><br>' +
                          manualPrompts.map(p => 'Photo ' + p.photoNum + ': ' + p.prompt).join('<br>') +
                        '</div>';
                      }

                      // AI Custom box (if any)
                      if (aiPromptsFiltered.length > 0) {
                        html += '<div style="font-size: 8px; margin-top: 4px; padding: 4px; background: #e6f3ff; border: 1px solid #000;">' +
                          '<strong>AI CUSTOM:</strong><br>' +
                          aiPromptsFiltered.map(p => 'Photo ' + p.photoNum + ': ' + p.prompt).join('<br>') +
                        '</div>';
                      }

                      return html;
                    }
                    return '';
                  })()}
                </div>
              </div>
            </div>
          </div>

          <!-- OPERATOR RECEIPT (RIGHT) -->
          <div class="operator-receipt">
            <div class="header">
              <div style="font-size: 16px; font-weight: bold;">OPERATOR COPY</div>
              <div class="customer-number">${transaction.customer_number}</div>
            </div>

            ${transaction.customer_photo_path ? `
              <div class="customer-photo">
                <div style="font-weight: bold; font-size: 11px; margin-bottom: 6px;">CUSTOMER ID:</div>
                <img src="${transaction.customer_photo_path}" alt="Customer ID">
              </div>
            ` : ''}

            <div class="quick-data">
              <div style="font-weight: bold; margin-bottom: 4px;">QUICK DATA:</div>
              <div class="mono">N: ${escapeHtml(transaction.customer_name)} | ${transaction.payment_method?.toUpperCase()}</div>
              <div class="mono">
                BG#${transaction.background_id === 'custom' || transaction.background_id === 'ai-custom' || transaction.background_id === 'mixed-custom' ? 'CUSTOM' : transaction.background_id}: ${escapeHtml(transaction.background_name)}
                ${(() => {
                  // Show per-photo backgrounds summary if multiple different backgrounds
                  if (!transaction.use_same_background && transaction.photo_quantity > 1 && selectedBackgrounds && selectedBackgrounds.length > 1) {
                    // Count regular backgrounds
                    const regularBgs = [];
                    let manualCustomCount = 0;
                    let aiCustomCount = 0;

                    selectedBackgrounds.forEach((bg, index) => {
                      if (bg.id === 'custom') {
                        manualCustomCount++;
                      } else if (bg.id === 'ai-custom') {
                        aiCustomCount++;
                      } else {
                        regularBgs.push(bg.name);
                      }
                    });

                    const parts = [];

                    // Regular backgrounds with counts
                    if (regularBgs.length > 0) {
                      const bgCounts = {};
                      regularBgs.forEach(name => {
                        bgCounts[name] = (bgCounts[name] || 0) + 1;
                      });
                      const bgList = Object.entries(bgCounts)
                        .map(([name, count]) => count > 1 ? name + ' ×' + count : name)
                        .join(', ');
                      parts.push(bgList);
                    }

                    // Custom counts
                    if (manualCustomCount > 0) {
                      parts.push('Manual Custom ×' + manualCustomCount);
                    }
                    if (aiCustomCount > 0) {
                      parts.push('AI Custom ×' + aiCustomCount);
                    }

                    return '<br>' + parts.join(', ');
                  }
                  return '';
                })()}
              </div>
              <div class="mono">Party: ${transaction.party_size >= 10 ? '10+' : transaction.party_size} | $${transaction.total_price.toFixed(2)} | ${transaction.print_quantity}P ${emailAddresses.length}E</div>
              <div class="mono">${date} ${time}</div>
            </div>

            ${emailAddresses.length > 0 ? `
              <div style="border: 1px solid #000; padding: 6px; margin-bottom: 8px; font-size: 8px; background: white;">
                <div style="font-weight: bold; margin-bottom: 4px;">Emails:</div>
                ${(() => {
                  // Split into two columns if more than 4 emails
                  if (emailAddresses.length > 4) {
                    const midpoint = Math.ceil(emailAddresses.length / 2);
                    const leftColumn = emailAddresses.slice(0, midpoint);
                    const rightColumn = emailAddresses.slice(midpoint);

                    return '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">' +
                      '<div>' + leftColumn.map((emailObj, i) => '<div>' + (i + 1) + '. ' + escapeHtml(emailObj.value || emailObj) + '</div>').join('') + '</div>' +
                      '<div>' + rightColumn.map((emailObj, i) => '<div>' + (midpoint + i + 1) + '. ' + escapeHtml(emailObj.value || emailObj) + '</div>').join('') + '</div>' +
                    '</div>';
                  } else {
                    return emailAddresses.map((emailObj, i) => '<div>' + (i + 1) + '. ' + escapeHtml(emailObj.value || emailObj) + '</div>').join('');
                  }
                })()}
              </div>
            ` : ''}

            <div class="notes-box">
              <div class="notes-title">NOTES:</div>
              ${(() => {
                const promptEntries = aiPrompts
                  .map((prompt, index) => ({ prompt, index }))
                  .filter(entry => entry.prompt && entry.prompt.trim());

                if (promptEntries.length > 0 && selectedBackgrounds && selectedBackgrounds.length > 0) {
                  // Separate prompts into manual and AI
                  const manualPrompts = [];
                  const aiPromptsFiltered = [];

                  promptEntries.forEach(entry => {
                    const bg = selectedBackgrounds[entry.index];
                    const isAI = bg && bg.id === 'ai-custom';
                    const photoInfo = { photoNum: entry.index + 1, prompt: entry.prompt };

                    if (isAI) {
                      aiPromptsFiltered.push(photoInfo);
                    } else {
                      manualPrompts.push(photoInfo);
                    }
                  });

                  let html = '';

                  // Manual Custom box (if any)
                  if (manualPrompts.length > 0) {
                    html += '<div style="font-size: 9px; margin-bottom: 8px; padding: 6px; background: #fffacd; border: 1px solid #000;">' +
                      '<strong>MANUAL CUSTOM:</strong><br>' +
                      manualPrompts.map(p => 'Photo ' + p.photoNum + ': ' + escapeHtml(p.prompt)).join('<br>') +
                    '</div>';
                  }

                  // AI Custom box (if any)
                  if (aiPromptsFiltered.length > 0) {
                    html += '<div style="font-size: 9px; margin-bottom: 8px; padding: 6px; background: #e6f3ff; border: 1px solid #000;">' +
                      '<strong>AI CUSTOM:</strong><br>' +
                      aiPromptsFiltered.map(p => 'Photo ' + p.photoNum + ': ' + escapeHtml(p.prompt)).join('<br>') +
                    '</div>';
                  }

                  return html;
                }
                return '<div style="height: 70px;"></div>';
              })()}
            </div>

            <div class="qr-box">
              <div style="font-weight: bold; font-size: 11px; margin-bottom: 8px;">OPERATOR: SCAN TO VIEW/UPDATE</div>
              <div class="qr-code operator-qr-code">
                <svg viewBox="0 0 29 29" style="width: 100%; height: 100%;">
                  <rect width="29" height="29" fill="white"/>
                  <path d="M0,0h7v7h-7zM8,0h1v1h1v1h-1v1h-1v-1h-1v1h-1v-2h2zM10,0h3v1h-1v1h-1v1h-1zM16,0h1v3h1v-1h1v-1h3v1h-1v1h-1v1h1v1h1v-1h1v2h-1v1h1v1h1v-1h1v-2h1v-3h1v7h-1v-1h-2v2h-1v-1h-1v-1h-1v1h-1v1h1v2h-1v1h-1v-2h-1v-1h-1v1h-1v-1h-1v1h-1v1h1v1h-1v1h-2v-1h-1v1h-1v-1h-1v-1h1v-1h-1v-1h2v-1h1v-1h1v-1h-2v-1h1v-1h-1v-1h1v-1h2v-2h2v-1h1v-1h-3v-1h-1v-1h1v-1h-1v-1h1v-1h2v1h1v-2h-2v-1h-1v-1h-1v-1h-1v-2h2v1h1v-1h2v-1h-2v-2h1v-1h-1v-1h-1v2h-1v1h-1v-1h-1v1h-1v-1h-2v-1h1v-1h-1v-1h1v-1h1zM14,1h1v1h-1zM22,0h7v7h-7zM1,1v5h5v-5zM9,2h1v1h-1zM11,2v1h-1v1h1v-1h1v-1zM15,2h1v1h-1zM23,1v5h5v-5zM2,2h3v3h-3zM18,2h1v2h-1zM24,2h3v3h-3zM10,4h1v2h-1v1h-1v-1h1zM16,4v1h-1v1h1v1h-2v-1h-1v1h-1v-1h-1v-1h3v-1zM19,5h1v1h-1zM8,6h1v1h-1zM20,6h1v2h-1zM5,7h2v1h1v1h-1v1h-1v-1h-2v1h-1v-1h-1v-1h2v-1h1zM13,7h2v2h-1v-1h-1zM9,8h1v1h-1zM0,9h1v1h1v1h1v1h-2v1h1v1h-1v2h1v-1h1v1h-1v1h-2v-3h1v-2h-1zM14,9h1v1h2v1h-2v1h-1v1h1v1h-1v1h-2v-1h-1v1h-1v-1h-1v-1h1v-1h-1v-1h3v1h1v-1h1zM18,9h1v1h1v-1h1v1h-1v2h1v-1h2v2h-1v-1h-1v3h-1v-2h-1v-1h-1v-1h1v-1h-1zM4,10h2v1h-2zM22,10v1h1v1h-1v1h-1v1h1v-1h1v3h-1v1h-1v-3h-1v-1h1v-2h-2v-1zM6,11h1v1h-1zM25,11h1v1h-1zM26,12h1v2h-1zM8,13h1v1h1v1h-2zM24,13h1v2h-1v1h-1v-1h1v-1h-1zM17,14h2v1h-2zM27,14h2v1h-2zM11,15h1v1h-1zM16,15h1v1h-1zM4,16h1v2h1v-1h1v-1h2v1h-1v1h-1v1h1v1h-1v1h-2v-1h-1v-1h1v-1h-1zM20,16h1v1h-1zM26,16h1v1h-1zM9,17h1v1h-1zM15,17h1v1h1v-1h1v1h-1v1h-1v1h-1v-1h1zM28,17h1v2h-1zM19,18h1v1h1v-1h3v1h-1v1h-1v-1h-2v1h-1v1h1v1h-2v-1h1v-1h-1v-1h1zM25,18h1v1h1v2h-1v-1h-1zM10,19h2v1h-1v1h-1zM27,19h1v2h-1zM13,20h2v1h-1v1h-1zM23,20h1v1h-1zM9,21h1v1h-1zM0,22h7v7h-7zM16,22h1v1h-1zM18,22h1v2h-1zM20,22h2v1h-2zM24,22h1v1h-1zM1,23v5h5v-5zM11,23h1v1h-1zM26,23h1v1h-1zM2,24h3v3h-3zM10,24h1v2h-1zM13,24h2v1h1v1h-1v1h-1v1h-1v-1h-1v-1h1zM21,24h1v1h-1zM23,24h2v1h1v1h-3v1h2v1h-3v1h4v-2h1v-1h-1v-1h1v-1h-1v-1h-3zM8,25h1v1h-1zM17,25v1h1v1h-2v-1h1zM20,25h1v3h-1zM28,25h1v4h-1zM9,26v1h-1v1h2v-2zM11,27h1v1h-1zM16,27h1v1h-1zM22,27h1v1h-1zM25,28h2v1h-2z" fill="black"/>
                </svg>
              </div>
              <div style="font-size: 10px; margin-top: 6px; color: #666;">localhost:5000/operator<br>Order #${transaction.customer_number}</div>
            </div>
          </div>
          </div>
        </div>

        <div class="print-button-wrapper" style="text-align: center; margin-top: 12px;">
          <button onclick="window.print()" style="padding: 12px 24px; font-size: 16px; cursor: pointer; background: #2563eb; color: white; border: none; border-radius: 5px;">
            Print Receipt
          </button>
        </div>
      </body>
    </html>
  `);
    console.log('Document.write completed');
    printWindow.document.close();
    console.log('Print receipt completed successfully');
  } catch (error) {
    console.error('Error printing receipt:', error);
    console.error('Error stack:', error.stack);
    showToast('Failed to print receipt: ' + error.message, 'error');
  }
}

// ============================================
// PHOTO VIEWER
// ============================================

function viewPhoto(photoPath) {
  const photoWindow = window.open('', '_blank');
  if (!photoWindow) {
    showToast('Please allow popups to view photos', 'warning');
    return;
  }
  
  photoWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Customer Photo</title>
        <style>
          body {
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: #000;
          }
          img {
            max-width: 100%;
            max-height: 100vh;
            object-fit: contain;
          }
        </style>
      </head>
      <body>
        <img src="${photoPath}" alt="Customer photo">
      </body>
    </html>
  `);
  photoWindow.document.close();
}

// ============================================
// TRANSACTION DETAILS MODAL
// ============================================

async function viewTransactionDetails(customerNumber) {
  try {
    // FIX: Close other modals before opening detail modal to prevent overlap
    closeModal('printQueueModal');
    closeModal('emailDashboardModal');
    closeModal('analyticsModal');

    const response = await fetch(`${API_BASE_URL}/transactions/${customerNumber}`);

    if (!response.ok) {
      throw new Error('Transaction not found');
    }

    const data = await response.json();
    const transaction = data.transaction;

    state.currentTransaction = transaction;
    renderTransactionModal(transaction);
    openModal('detailModal');
  } catch (error) {
    console.error('Error loading transaction details:', error);
    showToast('Failed to load transaction details', 'error');
  }
}

async function viewTransactionDetailsAndScrollToNotes(customerNumber) {
  // First open the modal
  await viewTransactionDetails(customerNumber);

  // Then scroll to notes after a short delay to ensure modal is rendered
  setTimeout(() => {
    scrollToNotes();
  }, 300);
}

function openReceiptImages(customerNumber) {
  try {
    // Extract date and last 4 characters from receipt number (GS-YYYYMMDD-XXXX)
    const receiptStr = customerNumber.toString();
    const parts = receiptStr.split('-');
    const dateAndLast4 = parts.length >= 3 ? `${parts[1]}-${parts[2]}` : receiptStr.slice(-4);

    // Trigger server to open File Explorer, which will bring window to front
    fetch(`${API_BASE_URL}/open-folder-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ receiptNumber: customerNumber })
    }).then(response => {
      if (response.ok) {
        showToast(`Opening images folder. Search for: *${dateAndLast4}*`, 'success');
      } else {
        showToast('Failed to open images folder', 'error');
      }
    }).catch(error => {
      console.error('Error opening folder:', error);
      showToast('Failed to open images folder', 'error');
    });

  } catch (error) {
    console.error('Error opening folder:', error);
    showToast('Failed to open images folder', 'error');
  }
}

function renderTransactionModal(t) {
  const modalBody = document.getElementById('modalBody');
  
  const emailAddresses = t.emailAddresses || (t.email_addresses ? JSON.parse(t.email_addresses) : []);
  const emailList = emailAddresses.map(e => e.value || e).join(', ') || 'None';
  
  modalBody.innerHTML = `
    <div style="display: grid; gap: 24px;">
      <!-- Customer Info -->
      <div>
        <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 16px; color: var(--text-primary);">
          Customer Information
        </h3>
        <div style="display: grid; gap: 12px;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-secondary);">Order Number:</span>
            <span style="font-weight: 600; color: var(--color-primary);">#${t.customer_number}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-secondary);">Customer Name:</span>
            <span style="font-weight: 500;">${escapeHtml(t.customer_name)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-secondary);">Party Size:</span>
            <span>${t.party_size >= 10 ? '10+' : t.party_size} ${t.party_size === 1 ? 'person' : 'people'}</span>
          </div>
          ${t.customer_photo_path ? `
            <div style="margin-top: 8px;">
              <span style="color: var(--text-secondary); display: block; margin-bottom: 8px;">Customer Photo:</span>
              <img src="${t.customer_photo_path}" alt="Customer photo" style="max-width: 200px; border-radius: 8px; border: 1px solid var(--color-gray-200); cursor: pointer;" onclick="viewPhoto('${t.customer_photo_path}')">
            </div>
          ` : ''}
        </div>
      </div>
      
      <!-- Order Details -->
      <div>
        <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 16px; color: var(--text-primary);">
          Order Details
        </h3>
        <div style="display: grid; gap: 12px;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-secondary);">Number of Photos:</span>
            <span style="font-weight: 500;">${t.photo_quantity || 1} ${(t.photo_quantity || 1) === 1 ? 'photo' : 'photos'}</span>
          </div>
          ${t.background_id === 'ai-custom' || t.background_id === 'custom' || t.background_id === 'mixed-custom' || t.background_name.toLowerCase() === 'custom' || t.background_name.toLowerCase() === 'custom background' || t.background_name.toLowerCase().includes('custom') ? `
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 16px; border-radius: 12px; cursor: pointer;" onclick="scrollToNotes()">
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 32px;">✨</span>
                <div style="flex: 1;">
                  <div style="color: white; font-weight: 700; font-size: 16px; margin-bottom: 4px;">
                    ${t.background_id === 'ai-custom' ? 'AI CUSTOM BACKGROUND' : t.background_id === 'mixed-custom' ? 'MIXED CUSTOM BACKGROUNDS' : 'CUSTOM BACKGROUND REQUESTED'}
                  </div>
                  <div style="color: rgba(255,255,255,0.9); font-size: 13px;">
                    ${(() => {
                      // Try to parse and display AI custom prompts
                      if (t.background_id === 'ai-custom' && t.backgrounds_data) {
                        try {
                          const data = JSON.parse(t.backgrounds_data);
                          if (data.type === 'ai-custom' && data.prompts) {
                            const promptsPreview = data.prompts.slice(0, 2).map((p, i) =>
                              `Photo ${i + 1}: "${p.substring(0, 40)}${p.length > 40 ? '...' : ''}"`
                            ).join(' • ');
                            return promptsPreview + (data.prompts.length > 2 ? ` + ${data.prompts.length - 2} more` : '');
                          }
                        } catch(e) {}
                      }
                      return 'Click to view operator notes for details →';
                    })()}
                  </div>
                </div>
              </div>
            </div>
          ` : ''}
          ${(() => {
            if (t.use_same_background === 0 && t.backgrounds_data) {
              try {
                const backgrounds = JSON.parse(t.backgrounds_data);
                return `
                  <div style="display: flex; flex-direction: column; gap: 8px;">
                    <span style="color: var(--text-secondary);">Backgrounds (Different per photo):</span>
                    <div style="background: var(--color-gray-50); padding: 12px; border-radius: 8px; border: 1px solid var(--color-gray-200);">
                      ${backgrounds.map((bg, i) => `
                        <div style="display: flex; justify-content: space-between; padding: 6px 0; ${i > 0 ? 'border-top: 1px solid var(--color-gray-200);' : ''}">
                          <span style="color: var(--text-secondary);">Photo ${i + 1}:</span>
                          <span style="font-weight: 500;">${escapeHtml(bg.name)}</span>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                `;
              } catch(e) {
                return `
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: var(--text-secondary);">Background:</span>
                    <span style="font-weight: 500;">${escapeHtml(t.background_name)}</span>
                  </div>
                `;
              }
            } else if (!t.background_name.toLowerCase().includes('custom')) {
              return `
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: var(--text-secondary);">Background${(t.photo_quantity || 1) > 1 ? ' (Same for all)' : ''}:</span>
                  <span style="font-weight: 500;">${escapeHtml(t.background_name)}</span>
                </div>
              `;
            }
            return '';
          })()}
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-secondary);">Delivery Method:</span>
            <span>${formatDeliveryMethod(t.delivery_method)}</span>
          </div>
          ${t.print_quantity > 0 ? `
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-secondary);">Print Quantity:</span>
              <span>${t.print_quantity}</span>
            </div>
          ` : ''}
          ${emailAddresses.length > 0 ? `
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-secondary);">Email Addresses:</span>
              <span style="text-align: right;">${emailList}</span>
            </div>
          ` : ''}
        </div>
      </div>
      
      <!-- Payment Info -->
      <div>
        <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 16px; color: var(--text-primary);">
          Payment Information
        </h3>
        <div style="display: grid; gap: 12px;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-secondary);">Payment Method:</span>
            <span>${formatPaymentMethod(t.payment_method)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-secondary);">Total Amount:</span>
            <span style="font-size: 20px; font-weight: 700; color: var(--color-success);">${formatCurrency(t.total_price)}</span>
          </div>
        </div>
      </div>
      
      <!-- Status Checklist -->
      <div>
        <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 16px; color: var(--text-primary);">
          Order Status
        </h3>
        <div style="display: grid; gap: 12px;">
          ${createStatusCheckbox(t, 'status_photo_taken', 'Photo Taken')}
          ${createStatusCheckbox(t, 'status_paid', 'Payment Received')}
          ${createStatusCheckbox(t, 'status_emails_sent', 'Emails Sent')}
          ${createStatusCheckbox(t, 'status_prints_ready', 'Prints Ready')}
          ${createStatusCheckbox(t, 'status_picked_up', 'Order Picked Up')}
        </div>
      </div>
      
      <!-- Operator Notes -->
      <div>
        <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 16px; color: var(--text-primary);">
          Operator Notes
        </h3>
        <textarea 
          id="operatorNotes" 
          rows="4" 
          style="width: 100%; padding: 12px; font-family: var(--font-family); font-size: 14px; border: 1px solid var(--color-gray-300); border-radius: 8px; resize: vertical;"
          placeholder="Add notes about this order..."
        >${t.operator_notes || ''}</textarea>
        <button class="btn btn-primary mt-4" onclick="saveOperatorNotes('${t.customer_number}')">
          Save Notes
        </button>
      </div>
      
      <!-- Metadata -->
      <div style="padding-top: 16px; border-top: 1px solid var(--color-gray-200);">
        <div style="display: grid; gap: 8px; font-size: 13px; color: var(--text-muted);">
          <div>Created: ${formatFullTimestamp(t.created_at)}</div>
          <div>Last Updated: ${formatFullTimestamp(t.updated_at)}</div>
          ${t.event_name ? `<div>Event: ${escapeHtml(t.event_name)}</div>` : ''}
        </div>
      </div>
    </div>
  `;
}

function createStatusCheckbox(transaction, field, label) {
  const isChecked = transaction[field] === 1;
  const checkboxId = `checkbox_${field}_${transaction.customer_number}`;
  
  return `
    <label style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-hover); border-radius: 8px; cursor: pointer;">
      <input
        type="checkbox"
        id="${checkboxId}"
        ${isChecked ? 'checked' : ''}
        onchange="updateTransactionStatus('${transaction.customer_number}', '${field}', this.checked)"
        style="width: 18px; height: 18px; cursor: pointer;"
      >
      <span style="font-weight: 500;">${label}</span>
    </label>
  `;
}

// ============================================
// API ACTIONS
// ============================================

async function updateTransactionStatus(customerNumber, field, value) {
  try {
    const response = await fetch(`${API_BASE_URL}/transactions/${customerNumber}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field, value })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update status');
    }
    
    // Update local state
    const transaction = state.transactions.find(t => t.customer_number === customerNumber);
    if (transaction) {
      transaction[field] = value ? 1 : 0;
      filterAndRenderTransactions();
    }
    
    showToast('Status updated successfully', 'success');
  } catch (error) {
    console.error('Error updating status:', error);
    showToast('Failed to update status', 'error');
    
    // Revert checkbox
    const checkbox = document.getElementById(`checkbox_${field}_${customerNumber}`);
    if (checkbox) {
      checkbox.checked = !value;
    }
  }
}

function scrollToNotes() {
  const notesTextarea = document.getElementById('operatorNotes');
  if (notesTextarea) {
    notesTextarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      notesTextarea.focus();
      notesTextarea.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.3)';
      setTimeout(() => {
        notesTextarea.style.boxShadow = '';
      }, 2000);
    }, 500);
  }
}

async function saveOperatorNotes(customerNumber) {
  const notes = document.getElementById('operatorNotes').value;

  try {
    const response = await fetch(`${API_BASE_URL}/transactions/${customerNumber}/notes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes })
    });

    if (!response.ok) {
      throw new Error('Failed to save notes');
    }

    // Update local state
    const transaction = state.transactions.find(t => t.customer_number === customerNumber);
    if (transaction) {
      transaction.operator_notes = notes;
    }

    showToast('Notes saved successfully', 'success');
  } catch (error) {
    console.error('Error saving notes:', error);
    showToast('Failed to save notes', 'error');
  }
}

async function handleSearch() {
  const searchInput = document.getElementById('searchInput');
  const query = searchInput.value.trim();

  // FIX: Allow empty search to clear filter (handles backspace to empty)
  state.searchTerm = query;
  filterAndRenderTransactions();
}

// ============================================
// ANALYTICS MODAL
// ============================================

function openAnalyticsModal() {
  openModal('analyticsModal');

  // Set default date to today (FIX: Use local date to avoid timezone offset)
  setTimeout(() => {
    const dateSelector = document.getElementById('ordersDateSelector');
    if (dateSelector && !dateSelector.value) {
      // FIX: Create local date string to avoid timezone shifting
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      dateSelector.value = `${year}-${month}-${day}`;

      // Add change listener
      dateSelector.removeEventListener('change', createOrdersTimeChart); // Remove if exists
      dateSelector.addEventListener('change', createOrdersTimeChart);
    }

    renderAnalytics();
  }, 100); // Give modal time to render
}

function renderAnalytics() {
  createRevenueChart();
  createBackgroundsChart();
  createOrdersTimeChart();
  createDeliveryChart();
}

function createRevenueChart() {
  const canvas = document.getElementById('revenueChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Group by date and sum revenue
  const revenueByDate = {};
  state.transactions.forEach(t => {
    // Handle both formats: "YYYY-MM-DD HH:MM:SS" (space) and "YYYY-MM-DDTHH:MM:SS" (T)
    const date = t.created_at.split(' ')[0] || t.created_at.split('T')[0];
    revenueByDate[date] = (revenueByDate[date] || 0) + parseFloat(t.total_price);
  });
  
  const sortedDates = Object.keys(revenueByDate).sort();
  const revenues = sortedDates.map(date => revenueByDate[date]);

  new Chart(ctx, {
    type: 'line',
    data: {
      // FIX: Parse date correctly to avoid timezone issues
      // When date is "2025-10-22", we want to display "Oct 22", not "Oct 21"
      labels: sortedDates.map(d => {
        const [year, month, day] = d.split('-').map(Number);
        const localDate = new Date(year, month - 1, day);
        return localDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      datasets: [{
        label: 'Revenue ($)',
        data: revenues,
        borderColor: 'rgb(37, 99, 235)',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '$' + value.toFixed(0);
            }
          }
        }
      }
    }
  });
}

function createBackgroundsChart() {
  const canvas = document.getElementById('backgroundsChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Count backgrounds
  const backgroundCounts = {};
  state.transactions.forEach(t => {
    const bg = t.background_name;
    backgroundCounts[bg] = (backgroundCounts[bg] || 0) + 1;
  });
  
  // Sort by count and take top 10
  const sortedBackgrounds = Object.entries(backgroundCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  const labels = sortedBackgrounds.map(([bg]) => bg);
  const data = sortedBackgrounds.map(([, count]) => count);
  
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Orders',
        data: data,
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  });
}

async function createOrdersTimeChart() {
  const canvas = document.getElementById('ordersTimeChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Get selected date or default to today
  const dateSelector = document.getElementById('ordersDateSelector');
  const selectedDate = dateSelector ? dateSelector.value : new Date().toISOString().split('T')[0];
  
  try {
    // Fetch hourly data from API
    const response = await fetch(`${API_BASE_URL}/analytics/orders-by-hour?date=${selectedDate}`);
    if (!response.ok) throw new Error('Failed to fetch hourly data');
    
    const data = await response.json();
    const hourCounts = data.hourlyData;
    
    const labels = hourCounts.map((_, i) => {
      const hour = i % 12 || 12;
      const ampm = i < 12 ? 'AM' : 'PM';
      return `${hour}${ampm}`;
    });
    
    // Destroy existing chart if it exists
    if (window.ordersTimeChartInstance) {
      window.ordersTimeChartInstance.destroy();
    }
    
    // Parse date correctly to avoid timezone issues
    // When date is "2025-10-22", we want to display "Oct 22", not "Oct 21"
    const [year, month, day] = selectedDate.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);

    window.ordersTimeChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Orders',
          data: hourCounts,
          backgroundColor: 'rgba(245, 158, 11, 0.8)',
          borderColor: 'rgb(245, 158, 11)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: `Orders by Hour - ${localDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
            font: {
              size: 14,
              weight: 'bold'
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Error creating orders time chart:', error);
    showToast('Failed to load hourly data', 'error');
  }
}

function createDeliveryChart() {
  const canvas = document.getElementById('deliveryChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Count delivery methods
  const deliveryCounts = { print: 0, email: 0, both: 0 };
  state.transactions.forEach(t => {
    deliveryCounts[t.delivery_method]++;
  });
  
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Print Only', 'Email Only', 'Both'],
      datasets: [{
        data: [deliveryCounts.print, deliveryCounts.email, deliveryCounts.both],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(236, 72, 153, 0.8)'
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(168, 85, 247)',
          'rgb(236, 72, 153)'
        ],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

// ============================================
// PRINT QUEUE MODAL
// ============================================

function openPrintQueueModal() {
  renderPrintQueue();
  openModal('printQueueModal');
}

function renderPrintQueue() {
  const body = document.getElementById('printQueueBody');

  const printOrders = state.transactions.filter(t =>
    t.delivery_method === 'print' || t.delivery_method === 'both'
  );

  const ready = printOrders.filter(t => t.status_prints_ready === 1 && t.status_picked_up === 0);
  const pending = printOrders.filter(t => t.status_prints_ready === 0);
  const pickedUp = printOrders.filter(t => t.status_picked_up === 1);

  // Filter based on hideCompleted checkbox state
  const hideCompleted = window.hidePrintCompleted || false;
  const displayedOrders = hideCompleted ? [...pending, ...ready] : [...pending, ...ready, ...pickedUp];

  body.innerHTML = `
    <div class="print-queue">
      <div class="queue-stats">
        <div class="queue-stat ready">
          <div class="stat-icon">✅</div>
          <div>
            <div class="stat-label">Ready for Pickup</div>
            <div class="stat-value">${ready.length}</div>
          </div>
        </div>
        <div class="queue-stat pending">
          <div class="stat-icon">⏳</div>
          <div>
            <div class="stat-label">Pending Print</div>
            <div class="stat-value">${pending.length}</div>
          </div>
        </div>
        <div class="queue-stat completed">
          <div class="stat-icon">📦</div>
          <div>
            <div class="stat-label">Picked Up</div>
            <div class="stat-value">${pickedUp.length}</div>
          </div>
        </div>
      </div>

      <div style="margin-top: 24px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="font-size: 16px; font-weight: 600; margin: 0;">Print Queue Details</h3>
        <label style="display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer;">
          <input type="checkbox" id="hidePrintCompletedCheckbox" ${hideCompleted ? 'checked' : ''}
                 onchange="toggleHidePrintCompleted()" style="cursor: pointer;">
          <span>Hide Completed</span>
        </label>
      </div>

      <div>
        <table class="print-queue-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Customer</th>
              <th>Copies</th>
              <th>Background</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${displayedOrders.length === 0
              ? '<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text-muted);">No print orders in queue</td></tr>'
              : displayedOrders.map(t => `
                <tr>
                  <td><span class="customer-number" onclick="openReceiptImages('${t.customer_number}')" style="cursor: pointer; text-decoration: underline;" title="Click to open images folder">#${t.customer_number}</span></td>
                  <td>${escapeHtml(t.customer_name)}</td>
                  <td>${t.print_quantity || 1}</td>
                  <td>${(() => {
                    // Handle multiple different backgrounds
                    if (t.backgrounds_data && (t.photo_quantity || 1) > 1 && (t.use_same_background === 0 || t.use_same_background === false)) {
                      try {
                        const backgrounds = JSON.parse(t.backgrounds_data);
                        const bgCounts = {};
                        backgrounds.forEach(bg => {
                          bgCounts[bg.name] = (bgCounts[bg.name] || 0) + 1;
                        });
                        return Object.entries(bgCounts)
                          .map(([name, count]) => count > 1 ? `${escapeHtml(name)} ×${count}` : escapeHtml(name))
                          .join(', ');
                      } catch(e) {
                        return escapeHtml(t.background_name);
                      }
                    }
                    return escapeHtml(t.background_name);
                  })()}</td>
                  <td>
                    <span class="status-badge ${t.status_picked_up ? 'completed' : (t.status_prints_ready ? 'completed' : 'pending')}">
                      ${t.status_picked_up ? 'Picked Up' : (t.status_prints_ready ? 'Ready' : 'Pending')}
                    </span>
                  </td>
                  <td>
                    <div style="display: flex; gap: 6px;">
                      ${!t.status_prints_ready
                        ? `<button class="btn btn-sm btn-success" onclick="markPrintReady('${t.customer_number}')">Mark Ready</button>`
                        : `<button class="btn btn-sm btn-secondary" onclick="viewTransactionDetails('${t.customer_number}')">View</button>`
                      }
                      <button class="btn btn-sm btn-primary" onclick="printReceipt('${t.customer_number}')" title="Print receipt">🧾 Receipt</button>
                    </div>
                  </td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function markPrintReady(customerNumber) {
  try {
    await updateTransactionStatus(customerNumber, 'status_prints_ready', true);
    renderPrintQueue(); // Refresh the print queue
    showToast('Print marked as ready', 'success');
  } catch (error) {
    showToast('Failed to update print status', 'error');
  }
}

function toggleHidePrintCompleted() {
  window.hidePrintCompleted = !window.hidePrintCompleted;
  renderPrintQueue();
}

// ============================================
// EMAIL DASHBOARD MODAL
// ============================================

function openEmailDashboardModal() {
  renderEmailDashboard();
  openModal('emailDashboardModal');
}

function renderEmailDashboard() {
  const body = document.getElementById('emailDashboardBody');

  const emailOrders = state.transactions.filter(t =>
    t.delivery_method === 'email' || t.delivery_method === 'both'
  );

  const sent = emailOrders.filter(t => t.status_emails_sent === 1);
  const pending = emailOrders.filter(t => t.status_emails_sent === 0);

  // Sort: pending first, then sent (important items at top)
  const sortedEmailOrders = [...pending, ...sent];

  // Filter based on hideCompleted checkbox state
  const hideCompleted = window.hideEmailCompleted || false;
  const displayedOrders = hideCompleted ? pending : sortedEmailOrders;

  body.innerHTML = `
    <div class="email-dashboard">
      <div class="email-stats">
        <div class="email-stat">
          <div class="stat-icon">📧</div>
          <div>
            <div class="stat-label">Total Email Orders</div>
            <div class="stat-value">${emailOrders.length}</div>
          </div>
        </div>
        <div class="email-stat success">
          <div class="stat-icon">✅</div>
          <div>
            <div class="stat-label">Emails Sent</div>
            <div class="stat-value">${sent.length}</div>
          </div>
        </div>
        <div class="email-stat warning">
          <div class="stat-icon">⏳</div>
          <div>
            <div class="stat-label">Pending</div>
            <div class="stat-value">${pending.length}</div>
          </div>
        </div>
      </div>

      <div style="margin-top: 24px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="font-size: 16px; font-weight: 600; margin: 0;">Email Delivery Status</h3>
        <label style="display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer;">
          <input type="checkbox" id="hideEmailCompletedCheckbox" ${hideCompleted ? 'checked' : ''}
                 onchange="toggleHideEmailCompleted()" style="cursor: pointer;">
          <span>Hide Completed</span>
        </label>
      </div>

      <div>
        <table class="email-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Customer</th>
              <th>Email Addresses</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${displayedOrders.length === 0
              ? '<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text-muted);">No email orders found</td></tr>'
              : displayedOrders.map(t => {
                const emails = t.email_addresses ? JSON.parse(t.email_addresses) : [];
                const emailList = emails.map(e => e.value || e).join(', ');
                return `
                  <tr>
                    <td><span class="customer-number">#${t.customer_number}</span></td>
                    <td>${escapeHtml(t.customer_name)}</td>
                    <td style="font-size: 12px; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${emailList || 'N/A'}</td>
                    <td>
                      <span class="status-badge ${t.status_emails_sent ? 'completed' : 'pending'}">
                        ${t.status_emails_sent ? 'Sent' : 'Pending'}
                      </span>
                    </td>
                    <td style="font-size: 12px;">${formatTimestamp(t.created_at)}</td>
                    <td>
                      ${!t.status_emails_sent
                        ? `<button class="btn btn-sm btn-success" onclick="markEmailSent('${t.customer_number}')">Mark Sent</button>`
                        : `<button class="btn btn-sm btn-secondary" onclick="viewTransactionDetails('${t.customer_number}')">View</button>`
                      }
                    </td>
                  </tr>
                `;
              }).join('')
            }
          </tbody>
        </table>
      </div>
      
      ${pending.length > 0 ? `
        <div style="margin-top: 20px; padding: 16px; background: var(--bg-hover); border-radius: 8px; border-left: 4px solid var(--color-warning);">
          <p style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px;">
            ⚠️ <strong>${pending.length}</strong> email order(s) pending
          </p>
          <p style="font-size: 13px; color: var(--text-muted);">
            These orders are waiting for email delivery. Once emails are sent, mark them as sent to update their status.
          </p>
        </div>
      ` : ''}
    </div>
  `;
}

async function markEmailSent(customerNumber) {
  try {
    await updateTransactionStatus(customerNumber, 'status_emails_sent', true);
    renderEmailDashboard(); // Refresh the email dashboard
    showToast('Email marked as sent', 'success');
  } catch (error) {
    showToast('Failed to update email status', 'error');
  }
}

function toggleHideEmailCompleted() {
  window.hideEmailCompleted = !window.hideEmailCompleted;
  renderEmailDashboard();
}

// ============================================
// UI HELPERS
// ============================================

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<p class="toast-message">${escapeHtml(message)}</p>`;
  
  container.appendChild(toast);
  
  // Auto remove after 4 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 200ms ease';
    setTimeout(() => {
      if (toast.parentNode) {
        container.removeChild(toast);
      }
    }, 200);
  }, 4000);
}

function updateConnectionStatus(status) {
  const dot = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  
  dot.className = 'status-dot';
  
  switch (status) {
    case 'online':
      dot.classList.add('online');
      text.textContent = 'Connected';
      break;
    case 'offline':
      dot.classList.add('offline');
      text.textContent = 'Disconnected';
      break;
    case 'loading':
      text.textContent = 'Loading...';
      break;
  }
}

// ============================================
// FORMATTING UTILITIES
// ============================================

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

function formatTimestamp(timestamp) {
  if (!timestamp) return 'N/A';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFullTimestamp(timestamp) {
  if (!timestamp) return 'N/A';

  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDeliveryMethod(method) {
  const methods = {
    'print': 'Print Only',
    'email': 'Email Only',
    'both': 'Print & Email'
  };
  return methods[method] || method;
}

function formatPaymentMethod(method) {
  if (!method) return 'N/A';

  const methods = {
    'cash': 'Cash',
    'card': 'Credit Card',
    'credit': 'Credit Card',
    'credit card': 'Credit Card',
    'venmo': 'Venmo',
    'free': 'Free/Comp'
  };

  const normalized = method.toLowerCase().trim();
  return methods[normalized] || method.charAt(0).toUpperCase() + method.slice(1).toLowerCase();
}

function getTransactionStatus(transaction) {
  // Order is complete
  if (transaction.status_picked_up) {
    return { label: 'Completed', class: 'completed' };
  }

  // Check specific pending items in order of importance
  if (!transaction.status_paid) {
    return { label: 'Payment Pending', class: 'pending' };
  }

  if (!transaction.status_photo_taken) {
    return { label: 'Photo Pending', class: 'pending' };
  }

  // Check delivery-specific requirements
  const needsEmail = transaction.delivery_method === 'email' || transaction.delivery_method === 'both';
  const needsPrint = transaction.delivery_method === 'print' || transaction.delivery_method === 'both';

  if (needsEmail && !transaction.status_emails_sent) {
    return { label: 'Email Pending', class: 'partial' };
  }

  if (needsPrint && !transaction.status_prints_ready) {
    return { label: 'Prints Pending', class: 'partial' };
  }

  // Everything is ready, just waiting for pickup
  if (needsPrint && transaction.status_prints_ready) {
    return { label: 'Pickup Pending', class: 'partial' };
  }

  // Fallback for edge cases
  return { label: 'In Progress', class: 'partial' };
}

function getQuickActionButton(transaction, status) {
  // Don't show quick action for completed orders
  if (transaction.status_picked_up) {
    return '';
  }

  const needsEmail = transaction.delivery_method === 'email' || transaction.delivery_method === 'both';
  const needsPrint = transaction.delivery_method === 'print' || transaction.delivery_method === 'both';

  // Check what action is needed based on status
  if (!transaction.status_paid) {
    return `<button class="btn btn-xs btn-success" onclick="quickMarkStatus('${transaction.customer_number}', 'status_paid')" title="Mark as paid">
      ✓ Paid
    </button>`;
  }

  if (!transaction.status_photo_taken) {
    return `<button class="btn btn-xs btn-success" onclick="quickMarkStatus('${transaction.customer_number}', 'status_photo_taken')" title="Mark photo as taken">
      ✓ Photo
    </button>`;
  }

  if (needsEmail && !transaction.status_emails_sent) {
    return `<button class="btn btn-xs btn-success" onclick="quickMarkStatus('${transaction.customer_number}', 'status_emails_sent')" title="Mark emails as sent">
      ✓ Email
    </button>`;
  }

  if (needsPrint && !transaction.status_prints_ready) {
    return `<button class="btn btn-xs btn-success" onclick="quickMarkStatus('${transaction.customer_number}', 'status_prints_ready')" title="Mark prints as ready">
      ✓ Prints
    </button>`;
  }

  if (needsPrint && transaction.status_prints_ready) {
    return `<button class="btn btn-xs btn-success" onclick="quickMarkStatus('${transaction.customer_number}', 'status_picked_up')" title="Mark as picked up">
      ✓ Pickup
    </button>`;
  }

  return '';
}

async function quickMarkStatus(customerNumber, statusField) {
  try {
    await updateTransactionStatus(customerNumber, statusField, true);
    await loadDashboardData(); // Refresh all data
    showToast(`Status updated successfully`, 'success');
  } catch (error) {
    console.error('Error updating status:', error);
    showToast('Failed to update status', 'error');
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// EXPOSE FUNCTIONS TO GLOBAL SCOPE
// (for onclick handlers in HTML)
// ============================================

window.viewTransactionDetails = viewTransactionDetails;
window.updateTransactionStatus = updateTransactionStatus;
window.saveOperatorNotes = saveOperatorNotes;
window.viewPhoto = viewPhoto;
window.markPrintReady = markPrintReady;
window.markEmailSent = markEmailSent;
