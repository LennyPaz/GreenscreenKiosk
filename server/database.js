const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

/**
 * Get current local datetime string for SQL
 * Stores in local timezone instead of forcing EST
 */
function getLocalDateTime(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Get current datetime string for SQL (alias for consistency)
 */
function getESTNow() {
  return getLocalDateTime();
}

let db = null;
const dbPath = path.join(__dirname, '../data/transactions.db');

/**
 * Initialize database
 */
async function initializeDatabase() {
  const SQL = await initSqlJs();
  
  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
    console.log('✓ Database loaded from file');
  } else {
    db = new SQL.Database();
    console.log('✓ New database created');
  }

  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_number TEXT NOT NULL UNIQUE,

      -- Customer Info
      customer_name TEXT NOT NULL,
      party_size INTEGER NOT NULL,
      customer_photo_path TEXT,

      -- Order Details
      photo_quantity INTEGER DEFAULT 1,
      use_same_background BOOLEAN DEFAULT 1,
      backgrounds_data TEXT,
      ai_prompts_data TEXT,
      background_id TEXT NOT NULL,
      background_name TEXT NOT NULL,
      delivery_method TEXT NOT NULL,
      print_quantity INTEGER DEFAULT 0,

      -- Email Details (JSON array)
      email_addresses TEXT,
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

      -- Metadata (stored in local timezone)
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

      -- Operator Notes
      operator_notes TEXT,

      -- Sync Status (for cloud backup)
      synced_to_cloud BOOLEAN DEFAULT 0,
      cloud_sync_at DATETIME,

      -- Event Info
      event_name TEXT,
      event_date DATE
    )
  `;

  const createIndexes = `
    CREATE INDEX IF NOT EXISTS idx_customer_number ON transactions(customer_number);
    CREATE INDEX IF NOT EXISTS idx_created_at ON transactions(created_at);
    CREATE INDEX IF NOT EXISTS idx_status_picked_up ON transactions(status_picked_up);
  `;

  // Settings table - stores all kiosk configuration
  const createSettingsTable = `
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),

      -- Features
      free_mode BOOLEAN DEFAULT 0,
      print_enabled BOOLEAN DEFAULT 1,
      email_enabled BOOLEAN DEFAULT 1,
      webcam_enabled BOOLEAN DEFAULT 1,
      custom_background_enabled BOOLEAN DEFAULT 0,
      ai_custom_enabled BOOLEAN DEFAULT 0,
      multi_print_enabled BOOLEAN DEFAULT 1,

      -- Payment Methods
      credit_card_enabled BOOLEAN DEFAULT 1,
      debit_card_enabled BOOLEAN DEFAULT 1,
      cash_enabled BOOLEAN DEFAULT 1,
      check_enabled BOOLEAN DEFAULT 1,
      venmo_enabled BOOLEAN DEFAULT 1,
      zelle_enabled BOOLEAN DEFAULT 1,
      tap_to_pay_enabled BOOLEAN DEFAULT 1,

      -- Branding
      theme_name TEXT DEFAULT 'Green Screen Photos',
      event_name TEXT DEFAULT 'Special Event',

      -- Print Pricing
      base_price REAL DEFAULT 10.00,
      price_2_prints REAL DEFAULT 15.00,
      price_3_prints REAL DEFAULT 20.00,
      price_4_prints REAL DEFAULT 25.00,
      price_5_prints REAL DEFAULT 30.00,
      price_6_prints REAL DEFAULT 35.00,
      price_7_prints REAL DEFAULT 40.00,
      price_8_prints REAL DEFAULT 45.00,

      -- Email Pricing
      email_base_price REAL DEFAULT 10.00,
      email_additional_price REAL DEFAULT 1.00,

      -- AI Settings
      openai_api_key TEXT,

      -- Metadata
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Themes table - stores custom background themes/tabs
  const createThemesTable = `
    CREATE TABLE IF NOT EXISTS themes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      tab_name TEXT NOT NULL,
      enabled BOOLEAN DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Backgrounds table - stores background images with theme associations
  const createBackgroundsTable = `
    CREATE TABLE IF NOT EXISTS backgrounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      theme_id INTEGER,
      display_name TEXT,
      enabled BOOLEAN DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(theme_id) REFERENCES themes(id) ON DELETE SET NULL
    )
  `;

  try {
    db.run(createTableSQL);
    db.run(createIndexes);
    db.run(createSettingsTable);
    db.run(createThemesTable);
    db.run(createBackgroundsTable);

    // Add missing columns to existing tables (migration)
    try {
      // Check if photo_quantity column exists
      const checkColumnStmt = db.prepare("PRAGMA table_info(transactions)");
      const columns = [];
      while (checkColumnStmt.step()) {
        columns.push(checkColumnStmt.getAsObject().name);
      }
      checkColumnStmt.free();

      // Add photo_quantity if it doesn't exist
      if (!columns.includes('photo_quantity')) {
        db.run('ALTER TABLE transactions ADD COLUMN photo_quantity INTEGER DEFAULT 1');
        console.log('✓ Added photo_quantity column');
      }

      // Add use_same_background if it doesn't exist
      if (!columns.includes('use_same_background')) {
        db.run('ALTER TABLE transactions ADD COLUMN use_same_background BOOLEAN DEFAULT 1');
        console.log('✓ Added use_same_background column');
      }

      // Add backgrounds_data if it doesn't exist
      if (!columns.includes('backgrounds_data')) {
        db.run('ALTER TABLE transactions ADD COLUMN backgrounds_data TEXT');
        console.log('✓ Added backgrounds_data column');
      }

      // Add ai_prompts_data if it doesn't exist
      if (!columns.includes('ai_prompts_data')) {
        db.run('ALTER TABLE transactions ADD COLUMN ai_prompts_data TEXT');
        console.log('✓ Added ai_prompts_data column');
      }
    } catch (migrationError) {
      console.warn('Migration warning:', migrationError.message);
    }

    // Add new settings columns for AI custom and multi-print features
    try {
      const checkSettingsStmt = db.prepare("PRAGMA table_info(settings)");
      const settingsColumns = [];
      while (checkSettingsStmt.step()) {
        settingsColumns.push(checkSettingsStmt.getAsObject().name);
      }
      checkSettingsStmt.free();

      // Add ai_custom_enabled if it doesn't exist
      if (!settingsColumns.includes('ai_custom_enabled')) {
        db.run('ALTER TABLE settings ADD COLUMN ai_custom_enabled BOOLEAN DEFAULT 0');
        console.log('✓ Added ai_custom_enabled column to settings');
      }

      // Add multi_print_enabled if it doesn't exist
      if (!settingsColumns.includes('multi_print_enabled')) {
        db.run('ALTER TABLE settings ADD COLUMN multi_print_enabled BOOLEAN DEFAULT 1');
        console.log('✓ Added multi_print_enabled column to settings');
      }

      // Add openai_api_key if it doesn't exist
      if (!settingsColumns.includes('openai_api_key')) {
        db.run('ALTER TABLE settings ADD COLUMN openai_api_key TEXT');
        console.log('✓ Added openai_api_key column to settings');
      }
    } catch (settingsMigrationError) {
      console.warn('Settings migration warning:', settingsMigrationError.message);
    }

    // Migrate config.txt to settings table if needed
    await migrateConfigToDatabase();

    // Seed default themes if empty
    seedDefaultThemes();

    saveDatabase();
    console.log('✓ Database initialized successfully');
  } catch (error) {
    console.error('✗ Database initialization error:', error);
    throw error;
  }
}

/**
 * Migrate config.txt to database settings table
 */
async function migrateConfigToDatabase() {
  try {
    // Check if settings already exist
    const checkStmt = db.prepare('SELECT COUNT(*) as count FROM settings WHERE id = 1');
    checkStmt.step();
    const count = checkStmt.getAsObject().count;
    checkStmt.free();

    if (count > 0) {
      console.log('✓ Settings already exist in database');
      return;
    }

    // Try to read config.txt
    const configPath = path.join(__dirname, '../public/config.txt');
    if (!fs.existsSync(configPath)) {
      console.log('⚠ config.txt not found, using default settings');
      insertDefaultSettings();
      return;
    }

    const configText = fs.readFileSync(configPath, 'utf-8');
    const config = parseConfigFile(configText);

    // Insert settings from config
    const stmt = db.prepare(`
      INSERT INTO settings (
        id, free_mode, print_enabled, email_enabled, custom_background_enabled,
        credit_card_enabled, debit_card_enabled, cash_enabled, check_enabled,
        theme_name, event_name,
        base_price, price_2_prints, price_3_prints, price_4_prints,
        price_5_prints, price_6_prints, price_7_prints, price_8_prints,
        email_base_price, email_additional_price
      ) VALUES (
        1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    stmt.run([
      config.FR || 0,
      config.PF !== undefined ? config.PF : 1,
      config.EF !== undefined ? config.EF : 1,
      config.CUS || 0,
      config.CC !== undefined ? config.CC : 1,
      config.DC !== undefined ? config.DC : 1,
      config.CK !== undefined ? config.CK : 1,
      0, // check (default off)
      config.THM || 'Green Screen Photos',
      config.EV || 'Special Event',
      config.BP || 10.00,
      config.P2P || 15.00,
      config.P3P || 20.00,
      config.P4P || 25.00,
      config.P5P || 30.00,
      config.P6P || 35.00,
      config.P7P || 40.00,
      config.P8P || 45.00,
      config.E1P || 10.00,
      config.E2P ? parseFloat(config.E2P.replace('+', '')) : 1.00
    ]);

    stmt.free();
    console.log('✓ Migrated config.txt to database');
  } catch (error) {
    console.error('⚠ Error migrating config:', error.message);
    insertDefaultSettings();
  }
}

/**
 * Parse config.txt file
 */
function parseConfigFile(text) {
  const config = {};
  const lines = text.split('\n');

  lines.forEach(line => {
    if (!line.trim() || line.startsWith('[') || !line.includes('=')) return;
    const [key, value] = line.split('=');
    const trimmedValue = value.trim();
    config[key.trim()] = isNaN(trimmedValue) ? trimmedValue : parseFloat(trimmedValue);
  });

  return config;
}

/**
 * Insert default settings
 */
function insertDefaultSettings() {
  const stmt = db.prepare(`
    INSERT INTO settings (id) VALUES (1)
  `);
  stmt.run();
  stmt.free();
  console.log('✓ Inserted default settings');
}

/**
 * Seed default themes (Nature category)
 */
function seedDefaultThemes() {
  try {
    const checkStmt = db.prepare('SELECT COUNT(*) as count FROM themes');
    checkStmt.step();
    const count = checkStmt.getAsObject().count;
    checkStmt.free();

    if (count > 0) {
      return; // Already have themes
    }

    // Insert default "Nature" theme
    const stmt = db.prepare(`
      INSERT INTO themes (name, tab_name, enabled, sort_order)
      VALUES ('Nature', 'Nature', 1, 0)
    `);
    stmt.run();
    stmt.free();
    console.log('✓ Seeded default themes');
  } catch (error) {
    console.warn('⚠ Error seeding themes:', error.message);
  }
}

/**
 * Save database to disk
 */
function saveDatabase() {
  if (!db) return;
  
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    
    // Ensure directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(dbPath, buffer);
  } catch (error) {
    console.error('Error saving database:', error);
  }
}

/**
 * Get all transactions
 */
function getAllTransactions() {
  try {
    const stmt = db.prepare('SELECT * FROM transactions ORDER BY created_at DESC');
    const results = [];
    
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    
    stmt.free();
    return results;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
}

/**
 * Get a single transaction by customer number
 */
function getTransactionByNumber(customerNumber) {
  try {
    const stmt = db.prepare('SELECT * FROM transactions WHERE customer_number = ?');
    stmt.bind([customerNumber]);
    
    let result = null;
    if (stmt.step()) {
      result = stmt.getAsObject();
    }
    
    stmt.free();
    return result;
  } catch (error) {
    console.error('Error fetching transaction:', error);
    throw error;
  }
}

/**
 * Create a new transaction
 */
function createTransaction(data) {
  try {
    // Use provided timestamp if available, otherwise use current time
    const timestamp = data.createdAt || getESTNow();

    // Handle backgrounds and custom prompts
    let backgroundId = data.backgroundId;
    let backgroundName = data.backgroundName;
    let operatorNotes = null;
    let backgroundsData = data.selectedBackgrounds ? JSON.stringify(data.selectedBackgrounds) : null;

    // If there are custom prompts, format them for operator notes
    if (data.aiPrompts && Array.isArray(data.aiPrompts)) {
      const validPrompts = data.aiPrompts.filter(p => p && p.trim());

      if (validPrompts.length > 0) {
        // Build operator notes based on which photos have custom prompts
        const promptLines = [];

        validPrompts.forEach((prompt, index) => {
          // Determine if this is AI or manual custom
          let type = 'Custom';
          if (data.selectedBackgrounds && data.selectedBackgrounds[index]) {
            const bg = data.selectedBackgrounds[index];
            if (bg.id === 'ai-custom') {
              type = 'AI Custom';
            } else if (bg.id === 'custom') {
              type = 'Manual Custom';
            }
          }

          promptLines.push(`Photo ${index + 1} (${type}): ${prompt.trim()}`);
        });

        operatorNotes = `Custom Background Requests:\n${promptLines.join('\n')}`;

        // If ALL photos use custom (either AI or manual), update main background fields
        if (validPrompts.length === data.photoQuantity) {
          const allAI = data.selectedBackgrounds && data.selectedBackgrounds.every(bg => bg.id === 'ai-custom');
          const allManual = data.selectedBackgrounds && data.selectedBackgrounds.every(bg => bg.id === 'custom');

          if (allAI) {
            backgroundId = 'ai-custom';
            backgroundName = 'AI Custom Background';
          } else if (allManual) {
            backgroundId = 'custom';
            backgroundName = 'Custom Background';
          } else {
            backgroundId = 'mixed-custom';
            backgroundName = 'Mixed Custom Backgrounds';
          }
        }
      }
    }

    const stmt = db.prepare(`
      INSERT INTO transactions (
        customer_number, customer_name, party_size, customer_photo_path,
        photo_quantity, use_same_background, backgrounds_data, ai_prompts_data,
        background_id, background_name, delivery_method, print_quantity,
        email_addresses, email_count, payment_method, total_price,
        event_name, event_date, operator_notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      data.customerNumber,
      data.customerName,
      data.partySize,
      data.customerPhotoPath || null,
      data.photoQuantity || 1,
      data.useSameBackground !== undefined ? (data.useSameBackground ? 1 : 0) : 1,
      backgroundsData,
      data.aiPrompts ? JSON.stringify(data.aiPrompts) : null,
      backgroundId,
      backgroundName,
      data.deliveryMethod,
      data.printQuantity || 0,
      data.emailAddresses ? JSON.stringify(data.emailAddresses) : null,
      data.emailCount || 0,
      data.paymentMethod,
      data.totalPrice,
      data.eventName || null,
      data.eventDate || null,
      operatorNotes,
      timestamp,
      timestamp
    ]);

    stmt.free();
    saveDatabase();

    // Get the last inserted id
    const idStmt = db.prepare('SELECT last_insert_rowid() as id');
    idStmt.step();
    const id = idStmt.getAsObject().id;
    idStmt.free();

    return { id, customerNumber: data.customerNumber };
  } catch (error) {
    console.error('Error creating transaction:', error);
    throw error;
  }
}

/**
 * Update transaction status
 */
function updateTransactionStatus(customerNumber, statusField, value) {
  try {
    const allowedFields = [
      'status_photo_taken',
      'status_paid',
      'status_emails_sent',
      'status_prints_ready',
      'status_picked_up'
    ];

    if (!allowedFields.includes(statusField)) {
      throw new Error(`Invalid status field: ${statusField}`);
    }

    const estNow = getESTNow();
    const stmt = db.prepare(`
      UPDATE transactions 
      SET ${statusField} = ?, updated_at = ? 
      WHERE customer_number = ?
    `);

    stmt.run([value ? 1 : 0, estNow, customerNumber]);
    stmt.free();
    saveDatabase();

    return true;
  } catch (error) {
    console.error('Error updating status:', error);
    throw error;
  }
}

/**
 * Update operator notes
 */
function updateOperatorNotes(customerNumber, notes) {
  try {
    const estNow = getESTNow();
    const stmt = db.prepare(`
      UPDATE transactions 
      SET operator_notes = ?, updated_at = ? 
      WHERE customer_number = ?
    `);

    stmt.run([notes, estNow, customerNumber]);
    stmt.free();
    saveDatabase();

    return true;
  } catch (error) {
    console.error('Error updating notes:', error);
    throw error;
  }
}

/**
 * Get statistics for dashboard
 */
function getStatistics() {
  try {
    const totalOrdersStmt = db.prepare('SELECT COUNT(*) as count FROM transactions');
    totalOrdersStmt.step();
    const totalOrders = totalOrdersStmt.getAsObject().count;
    totalOrdersStmt.free();

    const totalRevenueStmt = db.prepare('SELECT SUM(total_price) as total FROM transactions');
    totalRevenueStmt.step();
    const totalRevenue = totalRevenueStmt.getAsObject().total || 0;
    totalRevenueStmt.free();

    const pendingOrdersStmt = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE status_picked_up = 0');
    pendingOrdersStmt.step();
    const pendingOrders = pendingOrdersStmt.getAsObject().count;
    pendingOrdersStmt.free();

    // Get today's date in local timezone
    const todayLocal = getESTNow().split(' ')[0]; // Gets YYYY-MM-DD
    const todayOrdersStmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM transactions
      WHERE DATE(created_at) = ?
    `);
    todayOrdersStmt.bind([todayLocal]);
    todayOrdersStmt.step();
    const todayOrders = todayOrdersStmt.getAsObject().count;
    todayOrdersStmt.free();

    return {
      totalOrders,
      totalRevenue,
      pendingOrders,
      todayOrders
    };
  } catch (error) {
    console.error('Error fetching statistics:', error);
    throw error;
  }
}

/**
 * Get orders by hour for a specific date
 */
function getOrdersByHour(date) {
  try {
    const stmt = db.prepare(`
      SELECT 
        CAST(strftime('%H', created_at) AS INTEGER) as hour,
        COUNT(*) as count
      FROM transactions
      WHERE DATE(created_at) = ?
      GROUP BY hour
      ORDER BY hour
    `);
    
    stmt.bind([date]);
    
    // Initialize all hours to 0
    const hourlyData = Array(24).fill(0);
    
    while (stmt.step()) {
      const row = stmt.getAsObject();
      hourlyData[row.hour] = row.count;
    }
    
    stmt.free();
    return hourlyData;
  } catch (error) {
    console.error('Error fetching orders by hour:', error);
    throw error;
  }
}

/**
 * Search transactions
 */
function searchTransactions(searchTerm) {
  try {
    const stmt = db.prepare(`
      SELECT * FROM transactions 
      WHERE CAST(customer_number AS TEXT) LIKE ? 
         OR customer_name LIKE ? 
         OR background_name LIKE ?
      ORDER BY created_at DESC
    `);

    const pattern = `%${searchTerm}%`;
    stmt.bind([pattern, pattern, pattern]);

    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }

    stmt.free();
    return results;
  } catch (error) {
    console.error('Error searching transactions:', error);
    throw error;
  }
}

/**
 * Close database connection
 */
function closeDatabase() {
  if (db) {
    saveDatabase();
    db.close();
    console.log('Database connection closed');
  }
}

/**
 * Get database instance (for advanced queries)
 */
function getDatabase() {
  return db;
}

// ============================================
// SETTINGS FUNCTIONS
// ============================================

/**
 * Get all settings
 */
function getSettings() {
  try {
    const stmt = db.prepare('SELECT * FROM settings WHERE id = 1');
    stmt.step();
    const settings = stmt.getAsObject();
    stmt.free();
    return settings || null;
  } catch (error) {
    console.error('Error getting settings:', error);
    throw error;
  }
}

/**
 * Update settings
 */
function updateSettings(settings) {
  try {
    // Get current settings first to merge with new values
    const currentSettings = getSettings();

    // Merge new settings with current settings
    const mergedSettings = {
      ...currentSettings,
      ...settings
    };

    const stmt = db.prepare(`
      UPDATE settings SET
        free_mode = ?,
        print_enabled = ?,
        email_enabled = ?,
        webcam_enabled = ?,
        custom_background_enabled = ?,
        ai_custom_enabled = ?,
        multi_print_enabled = ?,
        credit_card_enabled = ?,
        debit_card_enabled = ?,
        cash_enabled = ?,
        check_enabled = ?,
        venmo_enabled = ?,
        zelle_enabled = ?,
        tap_to_pay_enabled = ?,
        theme_name = ?,
        event_name = ?,
        base_price = ?,
        price_2_prints = ?,
        price_3_prints = ?,
        price_4_prints = ?,
        price_5_prints = ?,
        price_6_prints = ?,
        price_7_prints = ?,
        price_8_prints = ?,
        email_base_price = ?,
        email_additional_price = ?,
        openai_api_key = ?,
        updated_at = ?
      WHERE id = 1
    `);

    stmt.run([
      mergedSettings.free_mode || 0,
      mergedSettings.print_enabled !== undefined ? mergedSettings.print_enabled : 1,
      mergedSettings.email_enabled !== undefined ? mergedSettings.email_enabled : 1,
      mergedSettings.webcam_enabled !== undefined ? mergedSettings.webcam_enabled : 1,
      mergedSettings.custom_background_enabled || 0,
      mergedSettings.ai_custom_enabled || 0,
      mergedSettings.multi_print_enabled !== undefined ? mergedSettings.multi_print_enabled : 1,
      mergedSettings.credit_card_enabled !== undefined ? mergedSettings.credit_card_enabled : 1,
      mergedSettings.debit_card_enabled !== undefined ? mergedSettings.debit_card_enabled : 1,
      mergedSettings.cash_enabled !== undefined ? mergedSettings.cash_enabled : 1,
      mergedSettings.check_enabled || 0,
      mergedSettings.venmo_enabled !== undefined ? mergedSettings.venmo_enabled : 1,
      mergedSettings.zelle_enabled !== undefined ? mergedSettings.zelle_enabled : 1,
      mergedSettings.tap_to_pay_enabled !== undefined ? mergedSettings.tap_to_pay_enabled : 1,
      mergedSettings.theme_name || 'Green Screen Photos',
      mergedSettings.event_name || 'Special Event',
      mergedSettings.base_price || 10.00,
      mergedSettings.price_2_prints || 15.00,
      mergedSettings.price_3_prints || 20.00,
      mergedSettings.price_4_prints || 25.00,
      mergedSettings.price_5_prints || 30.00,
      mergedSettings.price_6_prints || 35.00,
      mergedSettings.price_7_prints || 40.00,
      mergedSettings.price_8_prints || 45.00,
      mergedSettings.email_base_price || 10.00,
      mergedSettings.email_additional_price || 1.00,
      mergedSettings.openai_api_key !== undefined ? mergedSettings.openai_api_key : null,
      getLocalDateTime()
    ]);

    stmt.free();
    saveDatabase();
    return true;
  } catch (error) {
    console.error('Error updating settings:', error);
    throw error;
  }
}

// ============================================
// THEMES FUNCTIONS
// ============================================

/**
 * Get all themes
 */
function getAllThemes() {
  try {
    const stmt = db.prepare('SELECT * FROM themes ORDER BY sort_order ASC, id ASC');
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (error) {
    console.error('Error getting themes:', error);
    throw error;
  }
}

/**
 * Get enabled themes only
 */
function getEnabledThemes() {
  try {
    const stmt = db.prepare('SELECT * FROM themes WHERE enabled = 1 ORDER BY sort_order ASC, id ASC');
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (error) {
    console.error('Error getting enabled themes:', error);
    throw error;
  }
}

/**
 * Create theme
 */
function createTheme(data) {
  try {
    const stmt = db.prepare(`
      INSERT INTO themes (name, tab_name, enabled, sort_order)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run([
      data.name,
      data.tab_name,
      data.enabled !== undefined ? data.enabled : 1,
      data.sort_order || 0
    ]);

    stmt.free();
    saveDatabase();

    const idStmt = db.prepare('SELECT last_insert_rowid() as id');
    idStmt.step();
    const id = idStmt.getAsObject().id;
    idStmt.free();

    return { id };
  } catch (error) {
    console.error('Error creating theme:', error);
    throw error;
  }
}

/**
 * Update theme
 */
function updateTheme(id, data) {
  try {
    const stmt = db.prepare(`
      UPDATE themes SET
        name = ?,
        tab_name = ?,
        enabled = ?,
        sort_order = ?
      WHERE id = ?
    `);

    stmt.run([
      data.name,
      data.tab_name,
      data.enabled !== undefined ? data.enabled : 1,
      data.sort_order !== undefined ? data.sort_order : 0,
      id
    ]);

    stmt.free();
    saveDatabase();
    return true;
  } catch (error) {
    console.error('Error updating theme:', error);
    throw error;
  }
}

/**
 * Delete theme
 */
function deleteTheme(id) {
  try {
    const stmt = db.prepare('DELETE FROM themes WHERE id = ?');
    stmt.run([id]);
    stmt.free();
    saveDatabase();
    return true;
  } catch (error) {
    console.error('Error deleting theme:', error);
    throw error;
  }
}

// ============================================
// BACKGROUNDS FUNCTIONS
// ============================================

/**
 * Get all backgrounds
 */
function getAllBackgrounds() {
  try {
    const stmt = db.prepare(`
      SELECT b.*, t.name as theme_name, t.tab_name
      FROM backgrounds b
      LEFT JOIN themes t ON b.theme_id = t.id
      ORDER BY b.theme_id, b.sort_order ASC, b.id ASC
    `);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (error) {
    console.error('Error getting backgrounds:', error);
    throw error;
  }
}

/**
 * Get backgrounds by theme
 */
function getBackgroundsByTheme(themeId) {
  try {
    const stmt = db.prepare(`
      SELECT * FROM backgrounds
      WHERE theme_id = ? AND enabled = 1
      ORDER BY sort_order ASC, id ASC
    `);
    stmt.bind([themeId]);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (error) {
    console.error('Error getting backgrounds by theme:', error);
    throw error;
  }
}

/**
 * Create background
 */
function createBackground(data) {
  try {
    const stmt = db.prepare(`
      INSERT INTO backgrounds (filename, theme_id, display_name, enabled, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run([
      data.filename,
      data.theme_id || null,
      data.display_name || null,
      data.enabled !== undefined ? data.enabled : 1,
      data.sort_order || 0
    ]);

    stmt.free();
    saveDatabase();

    const idStmt = db.prepare('SELECT last_insert_rowid() as id');
    idStmt.step();
    const id = idStmt.getAsObject().id;
    idStmt.free();

    return { id };
  } catch (error) {
    console.error('Error creating background:', error);
    throw error;
  }
}

/**
 * Update background
 */
function updateBackground(id, data) {
  try {
    // Get current background data first
    const current = db.exec('SELECT * FROM backgrounds WHERE id = ?', [id]);
    if (!current || current.length === 0 || current[0].values.length === 0) {
      throw new Error('Background not found');
    }

    const currentData = {
      filename: current[0].values[0][1],
      theme_id: current[0].values[0][2],
      display_name: current[0].values[0][3],
      enabled: current[0].values[0][4],
      sort_order: current[0].values[0][5]
    };

    // Merge with new data (only update provided fields)
    const updatedData = {
      filename: data.filename !== undefined ? data.filename : currentData.filename,
      theme_id: data.theme_id !== undefined ? data.theme_id : currentData.theme_id,
      display_name: data.display_name !== undefined ? data.display_name : currentData.display_name,
      enabled: data.enabled !== undefined ? data.enabled : currentData.enabled,
      sort_order: data.sort_order !== undefined ? data.sort_order : currentData.sort_order
    };

    const stmt = db.prepare(`
      UPDATE backgrounds SET
        filename = ?,
        theme_id = ?,
        display_name = ?,
        enabled = ?,
        sort_order = ?
      WHERE id = ?
    `);

    stmt.run([
      updatedData.filename,
      updatedData.theme_id,
      updatedData.display_name,
      updatedData.enabled,
      updatedData.sort_order,
      id
    ]);

    stmt.free();
    saveDatabase();
    return true;
  } catch (error) {
    console.error('Error updating background:', error);
    throw error;
  }
}

/**
 * Delete background
 */
function deleteBackground(id) {
  try {
    const stmt = db.prepare('DELETE FROM backgrounds WHERE id = ?');
    stmt.run([id]);
    stmt.free();
    saveDatabase();
    return true;
  } catch (error) {
    console.error('Error deleting background:', error);
    throw error;
  }
}

function deleteAllBackgrounds() {
  try {
    const stmt = db.prepare('DELETE FROM backgrounds');
    stmt.run();
    stmt.free();
    saveDatabase();
    return true;
  } catch (error) {
    console.error('Error deleting all backgrounds:', error);
    throw error;
  }
}

module.exports = {
  initializeDatabase,
  getAllTransactions,
  getTransactionByNumber,
  createTransaction,
  updateTransactionStatus,
  updateOperatorNotes,
  getStatistics,
  getOrdersByHour,
  searchTransactions,
  closeDatabase,
  getDatabase,
  // Settings
  getSettings,
  updateSettings,
  // Themes
  getAllThemes,
  getEnabledThemes,
  createTheme,
  updateTheme,
  deleteTheme,
  // Backgrounds
  getAllBackgrounds,
  getBackgroundsByTheme,
  createBackground,
  updateBackground,
  deleteBackground,
  deleteAllBackgrounds
};
