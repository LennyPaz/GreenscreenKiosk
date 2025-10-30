/**
 * Settings Page JavaScript
 * Handles all settings management functionality
 */

const API_BASE_URL = 'http://localhost:5000/api';

let currentSettings = null;
let themes = [];
let currentThemeId = null; // For background management

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadThemes();
  setupEventListeners();
});

function setupEventListeners() {
  // Save settings
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);

  // Export config
  document.getElementById('exportConfigBtn').addEventListener('click', exportConfig);

  // Cancel
  document.getElementById('cancelBtn').addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  // Add theme modal
  document.getElementById('addThemeBtn').addEventListener('click', () => {
    showModal('addThemeModal');
  });
  document.getElementById('cancelThemeBtn').addEventListener('click', () => {
    hideModal('addThemeModal');
  });
  document.getElementById('saveThemeBtn').addEventListener('click', createTheme);

  // Backgrounds modal
  document.getElementById('closeBackgroundsBtn').addEventListener('click', () => {
    hideModal('manageBackgroundsModal');
  });

  // Reset backgrounds button
  document.getElementById('resetBackgroundsBtn').addEventListener('click', resetAllBackgrounds);

  // File upload
  const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('fileInput');

  uploadArea.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleFileSelect);

  // Drag and drop
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  });
}

// ============================================
// LOAD SETTINGS
// ============================================

async function loadSettings() {
  try {
    const response = await fetch(`${API_BASE_URL}/settings`);
    const data = await response.json();

    if (data.success) {
      currentSettings = data.settings;
      populateForm(currentSettings);
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    showToast('Failed to load settings', 'error');
  }
}

function populateForm(settings) {
  // General
  document.getElementById('themeName').value = settings.theme_name || '';
  document.getElementById('eventName').value = settings.event_name || '';
  document.getElementById('freeMode').checked = settings.free_mode === 1;

  // Features
  document.getElementById('printEnabled').checked = settings.print_enabled === 1;
  document.getElementById('emailEnabled').checked = settings.email_enabled === 1;
  document.getElementById('webcamEnabled').checked = settings.webcam_enabled === 1;
  document.getElementById('customBackgroundEnabled').checked = settings.custom_background_enabled === 1;
  // Handle new fields that might not exist in older databases
  if (document.getElementById('aiCustomEnabled')) {
    document.getElementById('aiCustomEnabled').checked = settings.ai_custom_enabled === 1;
  }
  if (document.getElementById('multiPrintEnabled')) {
    document.getElementById('multiPrintEnabled').checked = (settings.multi_print_enabled === 1 || settings.multi_print_enabled === undefined);
  }

  // Payment Methods
  document.getElementById('creditCardEnabled').checked = settings.credit_card_enabled === 1;
  document.getElementById('debitCardEnabled').checked = settings.debit_card_enabled === 1;
  document.getElementById('cashEnabled').checked = settings.cash_enabled === 1;
  document.getElementById('checkEnabled').checked = settings.check_enabled === 1;
  document.getElementById('venmoEnabled').checked = settings.venmo_enabled === 1;
  document.getElementById('zelleEnabled').checked = settings.zelle_enabled === 1;

  // Print Pricing
  document.getElementById('basePrice').value = settings.base_price || 10.00;
  document.getElementById('price2Prints').value = settings.price_2_prints || 15.00;
  document.getElementById('price3Prints').value = settings.price_3_prints || 20.00;
  document.getElementById('price4Prints').value = settings.price_4_prints || 25.00;
  document.getElementById('price5Prints').value = settings.price_5_prints || 30.00;
  document.getElementById('price6Prints').value = settings.price_6_prints || 35.00;
  document.getElementById('price7Prints').value = settings.price_7_prints || 40.00;
  document.getElementById('price8Prints').value = settings.price_8_prints || 45.00;

  // Email Pricing
  document.getElementById('emailBasePrice').value = settings.email_base_price || 10.00;
  document.getElementById('emailAdditionalPrice').value = settings.email_additional_price || 1.00;
}

// ============================================
// SAVE SETTINGS
// ============================================

async function saveSettings() {
  try {
    const settings = {
      theme_name: document.getElementById('themeName').value,
      event_name: document.getElementById('eventName').value,
      free_mode: document.getElementById('freeMode').checked ? 1 : 0,

      print_enabled: document.getElementById('printEnabled').checked ? 1 : 0,
      email_enabled: document.getElementById('emailEnabled').checked ? 1 : 0,
      webcam_enabled: document.getElementById('webcamEnabled').checked ? 1 : 0,
      custom_background_enabled: document.getElementById('customBackgroundEnabled').checked ? 1 : 0,
      ai_custom_enabled: document.getElementById('aiCustomEnabled') ? (document.getElementById('aiCustomEnabled').checked ? 1 : 0) : 0,
      multi_print_enabled: document.getElementById('multiPrintEnabled') ? (document.getElementById('multiPrintEnabled').checked ? 1 : 0) : 1,

      credit_card_enabled: document.getElementById('creditCardEnabled').checked ? 1 : 0,
      debit_card_enabled: document.getElementById('debitCardEnabled').checked ? 1 : 0,
      cash_enabled: document.getElementById('cashEnabled').checked ? 1 : 0,
      check_enabled: document.getElementById('checkEnabled').checked ? 1 : 0,
      venmo_enabled: document.getElementById('venmoEnabled').checked ? 1 : 0,
      zelle_enabled: document.getElementById('zelleEnabled').checked ? 1 : 0,

      base_price: parseFloat(document.getElementById('basePrice').value) || 10.00,
      price_2_prints: parseFloat(document.getElementById('price2Prints').value) || 15.00,
      price_3_prints: parseFloat(document.getElementById('price3Prints').value) || 20.00,
      price_4_prints: parseFloat(document.getElementById('price4Prints').value) || 25.00,
      price_5_prints: parseFloat(document.getElementById('price5Prints').value) || 30.00,
      price_6_prints: parseFloat(document.getElementById('price6Prints').value) || 35.00,
      price_7_prints: parseFloat(document.getElementById('price7Prints').value) || 40.00,
      price_8_prints: parseFloat(document.getElementById('price8Prints').value) || 45.00,

      email_base_price: parseFloat(document.getElementById('emailBasePrice').value) || 10.00,
      email_additional_price: parseFloat(document.getElementById('emailAdditionalPrice').value) || 1.00
    };

    const response = await fetch(`${API_BASE_URL}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });

    const data = await response.json();

    if (data.success) {
      showToast('Settings saved successfully! Kiosk will use new settings on next refresh.', 'success');
      currentSettings = settings;
    } else {
      showToast('Failed to save settings', 'error');
    }
  } catch (error) {
    console.error('Error saving settings:', error);
    showToast('Failed to save settings', 'error');
  }
}

// ============================================
// THEMES
// ============================================

async function loadThemes() {
  try {
    const response = await fetch(`${API_BASE_URL}/themes`);
    const data = await response.json();

    if (data.success) {
      themes = data.themes;
      renderThemes();
    }
  } catch (error) {
    console.error('Error loading themes:', error);
    showToast('Failed to load themes', 'error');
  }
}

function renderThemes() {
  const themeList = document.getElementById('themeList');

  if (themes.length === 0) {
    themeList.innerHTML = '<p style="color: var(--color-gray-600);">No themes yet. Add one to get started!</p>';
    return;
  }

  themeList.innerHTML = themes.map(theme => `
    <div class="theme-item ${theme.enabled ? 'active' : ''}">
      <div class="theme-info">
        <div class="theme-name">${theme.name}</div>
        <div class="theme-tab">Tab: "${theme.tab_name}"</div>
      </div>
      <div class="theme-actions">
        <button class="btn btn-secondary btn-small" onclick="manageBackgrounds(${theme.id}, '${theme.name}')">
          📷 Backgrounds
        </button>
        <button class="btn btn-secondary btn-small" onclick="toggleTheme(${theme.id}, ${theme.enabled ? 0 : 1})">
          ${theme.enabled ? '✓ Enabled' : '○ Disabled'}
        </button>
        <button class="btn btn-danger btn-small" onclick="deleteTheme(${theme.id}, '${theme.name}')">
          Delete
        </button>
      </div>
    </div>
  `).join('');
}

async function createTheme() {
  const name = document.getElementById('newThemeName').value.trim();
  const tabName = document.getElementById('newThemeTabName').value.trim();

  if (!name || !tabName) {
    showToast('Please fill in both fields', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/themes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, tab_name: tabName, enabled: 1, sort_order: themes.length })
    });

    const data = await response.json();

    if (data.success) {
      showToast('Theme created successfully!', 'success');
      document.getElementById('newThemeName').value = '';
      document.getElementById('newThemeTabName').value = '';
      hideModal('addThemeModal');
      loadThemes();
    } else {
      showToast('Failed to create theme', 'error');
    }
  } catch (error) {
    console.error('Error creating theme:', error);
    showToast('Failed to create theme', 'error');
  }
}

async function toggleTheme(id, enabled) {
  try {
    const response = await fetch(`${API_BASE_URL}/themes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...themes.find(t => t.id === id),
        enabled
      })
    });

    const data = await response.json();

    if (data.success) {
      showToast(enabled ? 'Theme enabled' : 'Theme disabled', 'success');
      loadThemes();
    }
  } catch (error) {
    console.error('Error toggling theme:', error);
    showToast('Failed to update theme', 'error');
  }
}

async function deleteTheme(id, name) {
  if (!confirm(`Are you sure you want to delete the theme "${name}"? This will also delete all backgrounds in this theme.`)) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/themes/${id}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (data.success) {
      showToast('Theme deleted successfully', 'success');
      loadThemes();
    }
  } catch (error) {
    console.error('Error deleting theme:', error);
    showToast('Failed to delete theme', 'error');
  }
}

// ============================================
// BACKGROUNDS
// ============================================

async function manageBackgrounds(themeId, themeName) {
  currentThemeId = themeId;
  document.getElementById('backgroundsModalTitle').textContent = `Backgrounds - ${themeName}`;
  showModal('manageBackgroundsModal');
  loadBackgrounds(themeId);
}

async function loadBackgrounds(themeId) {
  try {
    const response = await fetch(`${API_BASE_URL}/backgrounds?theme_id=${themeId}`);
    const data = await response.json();

    if (data.success) {
      renderBackgrounds(data.backgrounds);
    }
  } catch (error) {
    console.error('Error loading backgrounds:', error);
    showToast('Failed to load backgrounds', 'error');
  }
}

function renderBackgrounds(backgrounds) {
  const grid = document.getElementById('backgroundGrid');

  if (backgrounds.length === 0) {
    grid.innerHTML = '<p style="color: var(--color-gray-600); grid-column: 1/-1; text-align: center; padding: 40px;">No backgrounds yet. Upload one above!</p>';
    return;
  }

  grid.innerHTML = backgrounds.map(bg => {
    // Create combined name: "filename (Display Name)" or just "filename"
    const displayText = bg.display_name ? `${bg.filename} (${bg.display_name})` : bg.filename;

    return `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div class="background-item">
          <img src="/public/backgrounds/${bg.filename}" alt="${bg.display_name || bg.filename}">
          <button class="delete-btn" onclick="deleteBackground(${bg.id}, '${bg.filename}')">✕</button>
        </div>
        <div style="font-size: 12px; color: var(--color-gray-700); word-break: break-word; display: flex; align-items: center; gap: 6px;">
          <span style="flex: 1; line-height: 1.3;">
            ${displayText}
          </span>
          <button onclick="editBackgroundName(${bg.id}, '${bg.filename}', '${(bg.display_name || '').replace(/'/g, "\\'")}', event)" style="padding: 4px 8px; font-size: 11px; background: var(--color-primary); color: white; border: none; border-radius: 4px; cursor: pointer; flex-shrink: 0;" title="Edit display name">✏️</button>
        </div>
      </div>
    `;
  }).join('');
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) {
    handleFile(file);
  }
}

async function handleFile(file) {
  if (!file.type.startsWith('image/')) {
    showToast('Please select an image file', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      // Get display name from input field
      const displayNameInput = document.getElementById('backgroundDisplayName');
      const displayName = displayNameInput.value.trim() || file.name;

      const response = await fetch(`${API_BASE_URL}/backgrounds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: e.target.result,
          theme_id: currentThemeId,
          display_name: displayName,
          enabled: 1,
          sort_order: 0
        })
      });

      const data = await response.json();

      if (data.success) {
        showToast('Background uploaded successfully!', 'success');
        // Clear the display name input
        displayNameInput.value = '';
        loadBackgrounds(currentThemeId);
      } else {
        showToast('Failed to upload background', 'error');
      }
    } catch (error) {
      console.error('Error uploading background:', error);
      showToast('Failed to upload background', 'error');
    }
  };

  reader.readAsDataURL(file);
}

async function deleteBackground(id, filename) {
  if (!confirm(`Delete background "${filename}"?`)) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/backgrounds/${id}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (data.success) {
      showToast('Background deleted', 'success');
      loadBackgrounds(currentThemeId);
    }
  } catch (error) {
    console.error('Error deleting background:', error);
    showToast('Failed to delete background', 'error');
  }
}

async function resetAllBackgrounds() {
  const confirmed = confirm(
    'WARNING: This will delete ALL backgrounds from the database.\n\n' +
    'Image files will remain on the filesystem and can be re-imported later.\n\n' +
    'Are you sure you want to continue?'
  );

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/backgrounds/clear-all`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (data.success) {
      showToast(`Successfully cleared ${data.count} backgrounds from database`, 'success');
      // Reload themes to refresh background counts
      loadThemes();
      // If a background modal is open, close it
      if (currentThemeId !== null) {
        hideModal('manageBackgroundsModal');
        currentThemeId = null;
      }
    } else {
      showToast('Failed to reset backgrounds', 'error');
    }
  } catch (error) {
    console.error('Error resetting backgrounds:', error);
    showToast('Failed to reset backgrounds', 'error');
  }
}

async function editBackgroundName(id, filename, currentDisplayName, event) {
  event.stopPropagation();

  const newName = prompt(
    `Edit display name for: ${filename}\n\n` +
    `Current display name: ${currentDisplayName || '(auto-generated)'}\n\n` +
    `Enter new display name (leave empty to use auto-generated):`,
    currentDisplayName || ''
  );

  // If user cancelled or didn't change anything, return
  if (newName === null || newName === currentDisplayName) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/backgrounds/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        display_name: newName.trim()
      })
    });

    const data = await response.json();

    if (data.success) {
      showToast('Background name updated!', 'success');
      loadBackgrounds(currentThemeId);
    } else {
      showToast('Failed to update background name', 'error');
    }
  } catch (error) {
    console.error('Error updating background name:', error);
    showToast('Failed to update background name', 'error');
  }
}

// ============================================
// EXPORT CONFIG
// ============================================

async function exportConfig() {
  try {
    const response = await fetch(`${API_BASE_URL}/settings`);
    const data = await response.json();

    if (!data.success) {
      showToast('Failed to export config', 'error');
      return;
    }

    const settings = data.settings;

    // Generate config.txt content
    const configText = `[INFO]
STN=0
FR=${settings.free_mode || 0}
THM=${settings.theme_name || 'Green Screen Photos'}
BP=${settings.base_price || 10.00}
DU=0
OP=1
PF=${settings.print_enabled || 1}
MP=1
OE=1
EF=${settings.email_enabled || 1}
EV=${settings.event_name || 'Special Event'}
CC=${settings.credit_card_enabled || 1}
DC=${settings.debit_card_enabled || 1}
CK=${settings.cash_enabled || 0}
CUS=${settings.custom_background_enabled || 0}
AIC=${settings.ai_custom_enabled || 0}
MTP=${settings.multi_print_enabled !== undefined ? settings.multi_print_enabled : 1}
WEC=${settings.webcam_enabled || 1}
P2P=${settings.price_2_prints || 15.00}
P3P=${settings.price_3_prints || 20.00}
P4P=${settings.price_4_prints || 25.00}
P5P=${settings.price_5_prints || 30.00}
P6P=${settings.price_6_prints || 35.00}
P7P=${settings.price_7_prints || 40.00}
P8P=${settings.price_8_prints || 45.00}
E1P=${settings.email_base_price || 10.00}
E2P=+${settings.email_additional_price || 1.00}
E3P=+${settings.email_additional_price || 1.00}
E4P=+${settings.email_additional_price / 2 || 0.50}
E5P=+${settings.email_additional_price / 2 || 0.50}
`;

    // Download file
    const blob = new Blob([configText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'config.txt';
    a.click();
    URL.revokeObjectURL(url);

    showToast('Config exported successfully!', 'success');
  } catch (error) {
    console.error('Error exporting config:', error);
    showToast('Failed to export config', 'error');
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showModal(id) {
  document.getElementById(id).classList.add('show');
}

function hideModal(id) {
  document.getElementById(id).classList.remove('show');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;

  const colors = {
    success: '#10b981',
    error: '#ef4444',
    info: '#3b82f6'
  };

  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${colors[type] || colors.info};
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    font-weight: 600;
    animation: slideIn 0.3s ease;
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
