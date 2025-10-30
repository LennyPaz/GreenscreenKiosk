const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const db = require('./database');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize database before starting server
let serverReady = false;

// Auto-import backgrounds from filesystem to database on startup
async function autoImportBackgrounds() {
  try {
    const backgroundsDir = path.join(__dirname, '../public/backgrounds');

    // Check if directory exists
    if (!fs.existsSync(backgroundsDir)) {
      console.log('[STARTUP] No backgrounds directory found - skipping auto-import');
      return;
    }

    // Get existing backgrounds from database
    const existingBackgrounds = db.getAllBackgrounds();
    const existingFilenames = new Set(existingBackgrounds.map(bg => bg.filename));

    // Get all themes and create a map
    const themes = db.getAllThemes();
    const themeMap = {};
    themes.forEach(t => {
      themeMap[t.tab_name.toLowerCase()] = t.id;
    });

    // Read all files from directory
    const files = fs.readdirSync(backgroundsDir)
      .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file))
      .sort();

    if (files.length === 0) {
      console.log('[STARTUP] No background images found in filesystem');
      return;
    }

    // Find new files that aren't in database
    const newFiles = files.filter(file => !existingFilenames.has(file));

    if (newFiles.length === 0) {
      console.log(`[STARTUP] All ${files.length} filesystem backgrounds already in database - no import needed`);
      return;
    }

    console.log(`[STARTUP] Found ${newFiles.length} new background(s) to import (${existingBackgrounds.length} already in database)`);

    let imported = 0;
    let skipped = 0;

    newFiles.forEach(file => {
      // Extract theme from filename (e.g., "nature-1.jpg" -> "nature")
      const match = file.match(/^([a-z]+)-\d+\./i);
      if (!match) {
        console.log(`[STARTUP] Skipping ${file} - cannot determine theme from filename`);
        skipped++;
        return;
      }

      const themeName = match[1].toLowerCase();
      const themeId = themeMap[themeName];

      if (!themeId) {
        console.log(`[STARTUP] Skipping ${file} - no theme found for "${themeName}"`);
        skipped++;
        return;
      }

      // Get display name from filename
      const displayName = file
        .replace(/\.(jpg|jpeg|png|gif)$/i, '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());

      // Import to database
      try {
        db.createBackground({
          filename: file,
          theme_id: themeId,
          display_name: displayName,
          enabled: 1,
          sort_order: 0
        });
        console.log(`[STARTUP] ✓ Imported ${file} → ${themeName} theme`);
        imported++;
      } catch (error) {
        console.error(`[STARTUP] ✗ Failed to import ${file}:`, error.message);
        skipped++;
      }
    });

    console.log(`[STARTUP] Auto-import complete: ${imported} imported, ${skipped} skipped (${existingBackgrounds.length + imported} total in database)`);
  } catch (error) {
    console.error('[STARTUP] Error during auto-import:', error);
    // Don't fail startup if import fails
  }
}

(async () => {
  try {
    await db.initializeDatabase();
    await autoImportBackgrounds();
    serverReady = true;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
})();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Large limit for base64 images
app.use(express.urlencoded({ extended: true }));

// Static file serving
app.use(express.static(path.join(__dirname, '../'))); // Serve root directory
app.use('/operator', express.static(path.join(__dirname, '../operator'))); // Operator dashboard
app.use('/images', express.static(path.join(__dirname, '../data/images'))); // Serve images

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ==================== API ROUTES ====================

/**
 * GET / - Health check
 */
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'online', 
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

/**
 * GET /api/transactions - Get all transactions
 */
app.get('/api/transactions', (req, res) => {
  try {
    const transactions = db.getAllTransactions();
    
    // Parse JSON fields
    const formattedTransactions = transactions.map(t => ({
      ...t,
      emailAddresses: t.email_addresses ? JSON.parse(t.email_addresses) : []
    }));
    
    res.json({ 
      success: true, 
      count: transactions.length,
      transactions: formattedTransactions 
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch transactions' 
    });
  }
});

/**
 * GET /api/transactions/:customerNumber - Get single transaction
 */
app.get('/api/transactions/:customerNumber', (req, res) => {
  try {
    const { customerNumber } = req.params;
    const transaction = db.getTransactionByNumber(customerNumber);
    
    if (!transaction) {
      return res.status(404).json({ 
        success: false, 
        error: 'Transaction not found' 
      });
    }

    // Parse JSON fields
    transaction.emailAddresses = transaction.email_addresses
      ? JSON.parse(transaction.email_addresses)
      : [];

    transaction.backgroundsData = transaction.backgrounds_data
      ? JSON.parse(transaction.backgrounds_data)
      : [];

    transaction.aiPromptsData = transaction.ai_prompts_data
      ? JSON.parse(transaction.ai_prompts_data)
      : [];

    res.json({
      success: true,
      transaction
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch transaction' 
    });
  }
});

/**
 * POST /api/transactions - Create new transaction
 */
app.post('/api/transactions', async (req, res) => {
  try {
    const data = req.body;
    
    // Validate required fields
    if (!data.customerNumber || !data.customerName || !data.backgroundId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }

    // Save customer photo if provided
    let photoPath = null;
    if (data.customerPhoto) {
      photoPath = await saveCustomerPhoto(data.customerNumber, data.customerPhoto);
    }

    // Rename AI generated background files if provided
    const renamedAIBackgrounds = [];
    if (data.aiGeneratedImages && Array.isArray(data.aiGeneratedImages)) {
      for (let i = 0; i < data.aiGeneratedImages.length; i++) {
        const aiImage = data.aiGeneratedImages[i];
        if (aiImage && aiImage.tempFilename) {
          const photoNum = i + 1;
          const newFilename = `${data.customerNumber}-photo${photoNum}-ai-bg.png`;
          const aiBackgroundsDir = path.join(__dirname, '..', 'data', 'images', 'ai_backgrounds');
          const oldPath = path.join(aiBackgroundsDir, aiImage.tempFilename);
          const newPath = path.join(aiBackgroundsDir, newFilename);

          try {
            // Rename the file
            fs.renameSync(oldPath, newPath);
            console.log(`✓ Renamed AI background: ${aiImage.tempFilename} → ${newFilename}`);

            renamedAIBackgrounds.push({
              photoIndex: i,
              filename: newFilename,
              path: `/images/ai_backgrounds/${newFilename}`
            });
          } catch (renameError) {
            console.error(`Error renaming AI background ${aiImage.tempFilename}:`, renameError);
          }
        }
      }
    }

    // Prepare transaction data
    const transactionData = {
      customerNumber: data.customerNumber,
      customerName: data.customerName,
      partySize: data.partySize || 1,
      customerPhotoPath: photoPath,
      photoQuantity: data.photoQuantity || 1,
      useSameBackground: data.useSameBackground !== undefined ? data.useSameBackground : true,
      selectedBackgrounds: data.selectedBackgrounds || [],
      backgroundId: data.selectedBackground || data.backgroundId,
      backgroundName: data.backgroundName || 'Unknown',
      aiCustomSelected: data.aiCustomSelected || false,
      aiPrompts: data.aiPrompts || [],
      deliveryMethod: data.deliveryMethod || 'print',
      printQuantity: data.printQuantity || 0,
      emailAddresses: data.emailAddresses || [],
      emailCount: data.emailAddresses ? data.emailAddresses.length : 0,
      paymentMethod: data.paymentMethod || 'cash',
      totalPrice: data.totalPrice || 0,
      eventName: data.eventName || null,
      eventDate: data.eventDate || null
    };

    // Create transaction in database
    const result = db.createTransaction(transactionData);
    
    res.json({ 
      success: true, 
      message: 'Transaction created successfully',
      transaction: result
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create transaction',
      details: error.message
    });
  }
});

/**
 * POST /api/generate-ai-background - Generate AI background using OpenAI DALL-E
 */
app.post('/api/generate-ai-background', async (req, res) => {
  try {
    const { prompt } = req.body;
    console.log('🎨 Generate AI background request received:', prompt);

    if (!prompt || !prompt.trim()) {
      console.log('❌ No prompt provided');
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }

    // Get OpenAI API key from settings
    const settings = db.getSettings();
    console.log('📋 Settings retrieved:', settings ? 'OK' : 'NULL');
    console.log('📋 Settings object keys:', settings ? Object.keys(settings).join(', ') : 'N/A');
    console.log('🔑 API Key value:', settings?.openai_api_key);
    console.log('🔑 API Key present:', settings?.openai_api_key ? 'YES (length: ' + settings.openai_api_key.length + ')' : 'NO');

    const apiKey = settings?.openai_api_key;

    if (!apiKey) {
      console.log('❌ API key not found in settings');
      return res.status(500).json({
        success: false,
        error: 'OpenAI API key not configured. Please add your API key in settings.'
      });
    }

    console.log('✅ API key found, proceeding with generation...');

    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey });

    // Generate image using DALL-E 3
    console.log('Generating AI background with prompt:', prompt);
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: `Create an authentic, realistic environment or location for a greenscreen photo composition where people will be digitally placed into the scene.

Scene: ${prompt}

CRITICAL Requirements:
- ABSOLUTELY NO people, faces, human figures, body parts, or silhouettes anywhere in the scene
- ABSOLUTELY NO text, words, letters, numbers, signs, or any readable characters visible in the scene
- Must be a REAL, authentic location or environment - NOT a photography set, studio backdrop, or fake prop scenery
- Create a place where people can naturally envision themselves being present
- Suitable for vertical/portrait orientation with people in the foreground
- Good depth and perspective, as if viewing the scene from where someone would naturally stand
- Well-lit, vibrant colors, high quality, photorealistic
- Clear center area where people will be digitally positioned
- Avoid busy or distracting elements in the lower center (where people will stand)
- The composition should work with 1-4 people standing in it
- Professional photography quality, sharp focus throughout
- Generate real-world scenes and genuine locations, not artificial photography sets
- Empty, unpopulated scene - no humans whatsoever
- Clean scene without any text or signage`,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    const imageUrl = response.data[0].url;
    console.log('✓ AI background generated successfully');
    console.log('📥 Downloading image and saving to disk...');

    // Download the image
    const imageResponse = await fetch(imageUrl);
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate temporary filename with timestamp
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const tempFilename = `temp-ai-${timestamp}-${randomId}.png`;
    const aiBackgroundsDir = path.join(__dirname, '..', 'data', 'images', 'ai_backgrounds');

    // Ensure directory exists
    if (!fs.existsSync(aiBackgroundsDir)) {
      fs.mkdirSync(aiBackgroundsDir, { recursive: true });
    }

    const tempFilePath = path.join(aiBackgroundsDir, tempFilename);

    // Save image to disk
    fs.writeFileSync(tempFilePath, buffer);
    console.log('✓ Image saved to:', tempFilePath);

    // Also convert to base64 for immediate preview
    const base64 = `data:image/png;base64,${buffer.toString('base64')}`;

    // Return web-accessible path
    const webPath = `/images/ai_backgrounds/${tempFilename}`;

    console.log('✓ Image ready (size: ' + Math.round(buffer.length / 1024) + 'KB)');

    res.json({
      success: true,
      imageBase64: base64,
      imagePath: webPath,
      tempFilename: tempFilename,
      prompt
    });
  } catch (error) {
    console.error('Error generating AI background:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI background',
      details: error.message
    });
  }
});

/**
 * PUT /api/transactions/:customerNumber/status - Update transaction status
 */
app.put('/api/transactions/:customerNumber/status', (req, res) => {
  try {
    const { customerNumber } = req.params;
    const { field, value } = req.body;
    
    if (!field) {
      return res.status(400).json({ 
        success: false, 
        error: 'Status field is required' 
      });
    }

    const updated = db.updateTransactionStatus(
      customerNumber,
      field,
      value
    );
    
    if (!updated) {
      return res.status(404).json({ 
        success: false, 
        error: 'Transaction not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Status updated successfully' 
    });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update status',
      details: error.message
    });
  }
});

/**
 * PUT /api/transactions/:customerNumber/notes - Update operator notes
 */
app.put('/api/transactions/:customerNumber/notes', (req, res) => {
  try {
    const { customerNumber } = req.params;
    const { notes } = req.body;
    
    const updated = db.updateOperatorNotes(
      customerNumber,
      notes || ''
    );
    
    if (!updated) {
      return res.status(404).json({ 
        success: false, 
        error: 'Transaction not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Notes updated successfully' 
    });
  } catch (error) {
    console.error('Error updating notes:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update notes' 
    });
  }
});

/**
 * GET /api/statistics - Get dashboard statistics
 */
app.get('/api/statistics', (req, res) => {
  try {
    const stats = db.getStatistics();
    res.json({ 
      success: true, 
      statistics: stats 
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch statistics' 
    });
  }
});

/**
 * GET /api/search - Search transactions
 */
app.get('/api/search', (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ 
        success: false, 
        error: 'Search query is required' 
      });
    }

    const results = db.searchTransactions(q);
    
    // Parse JSON fields
    const formattedResults = results.map(t => ({
      ...t,
      emailAddresses: t.email_addresses ? JSON.parse(t.email_addresses) : []
    }));
    
    res.json({ 
      success: true, 
      count: results.length,
      results: formattedResults 
    });
  } catch (error) {
    console.error('Error searching transactions:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to search transactions' 
    });
  }
});

/**
 * GET /api/analytics/orders-by-hour - Get orders by hour for a specific date
 */
app.get('/api/analytics/orders-by-hour', (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ 
        success: false, 
        error: 'Date parameter is required (YYYY-MM-DD format)' 
      });
    }
    
    const ordersByHour = db.getOrdersByHour(date);
    
    res.json({ 
      success: true, 
      date: date,
      hourlyData: ordersByHour 
    });
  } catch (error) {
    console.error('Error fetching orders by hour:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch hourly data' 
    });
  }
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Save customer photo to file system
 */
async function saveCustomerPhoto(customerNumber, base64Image) {
  try {
    const imagesDir = path.join(__dirname, '../data/images/customer_photos');
    
    // Ensure directory exists
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    const filename = `${customerNumber}.jpg`;
    const filepath = path.join(imagesDir, filename);
    
    // Remove base64 prefix if present
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Write file
    fs.writeFileSync(filepath, buffer);
    
    return `/images/customer_photos/${filename}`;
  } catch (error) {
    console.error('Error saving customer photo:', error);
    throw error;
  }
}

// ==================== SETTINGS ROUTES ====================

/**
 * GET /api/settings - Get current settings
 */
app.get('/api/settings', (req, res) => {
  try {
    const settings = db.getSettings();

    if (!settings) {
      return res.status(404).json({
        success: false,
        error: 'Settings not found'
      });
    }

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings'
    });
  }
});

/**
 * PUT /api/settings - Update settings
 */
app.put('/api/settings', (req, res) => {
  try {
    const settings = req.body;
    db.updateSettings(settings);

    res.json({
      success: true,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings'
    });
  }
});

/**
 * GET /api/config - Get config in kiosk format (for backward compatibility)
 */
app.get('/api/config', (req, res) => {
  try {
    const settings = db.getSettings();

    if (!settings) {
      return res.status(404).json({
        success: false,
        error: 'Settings not found'
      });
    }

    // Convert database settings to kiosk config format
    const config = {
      theme: settings.theme_name,
      eventName: settings.event_name,
      basePrice: settings.base_price,
      features: {
        freeMode: settings.free_mode === 1,
        prints: settings.print_enabled === 1,
        email: settings.email_enabled === 1,
        webcam: settings.webcam_enabled === 1,
        customBackground: settings.custom_background_enabled === 1,
        aiCustom: settings.ai_custom_enabled === 1,
        multiPrint: settings.multi_print_enabled === 1,
        creditCard: settings.credit_card_enabled === 1,
        debitCard: settings.debit_card_enabled === 1,
        cash: settings.cash_enabled === 1,
        check: settings.check_enabled === 1,
        venmo: settings.venmo_enabled === 1,
        zelle: settings.zelle_enabled === 1,
        tapToPay: settings.tap_to_pay_enabled === 1
      },
      printPricing: {
        1: settings.base_price,
        2: settings.price_2_prints,
        3: settings.price_3_prints,
        4: settings.price_4_prints,
        5: settings.price_5_prints,
        6: settings.price_6_prints,
        7: settings.price_7_prints,
        8: settings.price_8_prints
      },
      emailPricing: {
        1: settings.email_base_price,
        2: settings.email_base_price + settings.email_additional_price,
        3: settings.email_base_price + (settings.email_additional_price * 2),
        4: settings.email_base_price + (settings.email_additional_price * 3),
        5: settings.email_base_price + (settings.email_additional_price * 4),
        6: settings.email_base_price + (settings.email_additional_price * 5),
        7: settings.email_base_price + (settings.email_additional_price * 6),
        8: settings.email_base_price + (settings.email_additional_price * 7)
      }
    };

    res.json(config);
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch config'
    });
  }
});

// ==================== THEMES ROUTES ====================

/**
 * GET /api/themes - Get all themes
 */
app.get('/api/themes', (req, res) => {
  try {
    const themes = db.getAllThemes();
    res.json({
      success: true,
      themes
    });
  } catch (error) {
    console.error('Error fetching themes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch themes'
    });
  }
});

/**
 * GET /api/themes/enabled - Get enabled themes only
 */
app.get('/api/themes/enabled', (req, res) => {
  try {
    const themes = db.getEnabledThemes();
    res.json({
      success: true,
      themes
    });
  } catch (error) {
    console.error('Error fetching enabled themes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch enabled themes'
    });
  }
});

/**
 * POST /api/themes - Create new theme
 */
app.post('/api/themes', (req, res) => {
  try {
    const data = req.body;

    if (!data.name || !data.tab_name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name and tab_name'
      });
    }

    const result = db.createTheme(data);
    res.json({
      success: true,
      id: result.id,
      message: 'Theme created successfully'
    });
  } catch (error) {
    console.error('Error creating theme:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create theme'
    });
  }
});

/**
 * PUT /api/themes/:id - Update theme
 */
app.put('/api/themes/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    db.updateTheme(parseInt(id), data);
    res.json({
      success: true,
      message: 'Theme updated successfully'
    });
  } catch (error) {
    console.error('Error updating theme:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update theme'
    });
  }
});

/**
 * DELETE /api/themes/:id - Delete theme
 */
app.delete('/api/themes/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.deleteTheme(parseInt(id));
    res.json({
      success: true,
      message: 'Theme deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting theme:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete theme'
    });
  }
});

// ==================== BACKGROUNDS ROUTES ====================

/**
 * GET /api/backgrounds - Get all backgrounds
 */
app.get('/api/backgrounds', (req, res) => {
  try {
    const { theme_id } = req.query;

    let backgrounds;
    if (theme_id) {
      backgrounds = db.getBackgroundsByTheme(parseInt(theme_id));
    } else {
      backgrounds = db.getAllBackgrounds();
    }

    res.json({
      success: true,
      backgrounds
    });
  } catch (error) {
    console.error('Error fetching backgrounds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch backgrounds'
    });
  }
});

/**
 * POST /api/backgrounds - Create new background (with image upload)
 */
app.post('/api/backgrounds', async (req, res) => {
  try {
    const { image, theme_id, display_name, enabled, sort_order } = req.body;

    if (!image || !theme_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: image and theme_id'
      });
    }

    // Get theme info for filename prefix
    const themes = db.getAllThemes();
    const theme = themes.find(t => t.id === parseInt(theme_id));

    if (!theme) {
      return res.status(404).json({
        success: false,
        error: 'Theme not found'
      });
    }

    // Generate filename: themename-number.jpg
    const existingBackgrounds = db.getBackgroundsByTheme(parseInt(theme_id));
    const nextNumber = existingBackgrounds.length + 1;
    const filename = `${theme.tab_name.toLowerCase().replace(/\s+/g, '-')}-${nextNumber}.jpg`;

    // Save image file
    const filepath = path.join(__dirname, '../public/backgrounds', filename);

    // Ensure directory exists
    const bgDir = path.join(__dirname, '../public/backgrounds');
    if (!fs.existsSync(bgDir)) {
      fs.mkdirSync(bgDir, { recursive: true });
    }

    // Decode and save base64 image
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filepath, buffer);

    // Save to database
    const result = db.createBackground({
      filename,
      theme_id: parseInt(theme_id),
      display_name: display_name || null,
      enabled: enabled !== undefined ? enabled : 1,
      sort_order: sort_order || 0
    });

    res.json({
      success: true,
      id: result.id,
      filename,
      message: 'Background created successfully'
    });
  } catch (error) {
    console.error('Error creating background:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create background'
    });
  }
});

/**
 * PUT /api/backgrounds/:id - Update background
 */
app.put('/api/backgrounds/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    db.updateBackground(parseInt(id), data);
    res.json({
      success: true,
      message: 'Background updated successfully'
    });
  } catch (error) {
    console.error('Error updating background:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update background'
    });
  }
});

/**
 * DELETE /api/backgrounds/:id - Delete background
 */
app.delete('/api/backgrounds/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Get background info to delete file
    const backgrounds = db.getAllBackgrounds();
    const background = backgrounds.find(b => b.id === parseInt(id));

    if (background) {
      // Delete file
      const filepath = path.join(__dirname, '../public/backgrounds', background.filename);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
    }

    // Delete from database
    db.deleteBackground(parseInt(id));

    res.json({
      success: true,
      message: 'Background deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting background:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete background'
    });
  }
});

/**
 * DELETE /api/backgrounds/clear-all - Delete all backgrounds from database only
 * Note: Physical files remain on filesystem for potential re-import
 */
app.delete('/api/backgrounds/clear-all', (req, res) => {
  try {
    // Get count before deleting
    const backgrounds = db.getAllBackgrounds();
    const count = backgrounds.length;

    // Delete all database records in one operation
    // Files remain on filesystem
    db.deleteAllBackgrounds();

    console.log(`Cleared ${count} backgrounds from database (files preserved on filesystem)`);

    res.json({
      success: true,
      message: `Deleted ${count} backgrounds from database`,
      count: count
    });
  } catch (error) {
    console.error('Error clearing backgrounds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear backgrounds'
    });
  }
});

/**
 * GET /api/backgrounds/scan-directory - Scan backgrounds folder for existing files
 * Used as fallback when database has no backgrounds
 */
app.get('/api/backgrounds/scan-directory', (req, res) => {
  try {
    const backgroundsDir = path.join(__dirname, '../public/backgrounds');

    // Check if directory exists
    if (!fs.existsSync(backgroundsDir)) {
      return res.json({
        success: true,
        backgrounds: []
      });
    }

    // Get all themes and create a map
    const themes = db.getAllThemes();
    const themeMap = {};
    themes.forEach(t => {
      themeMap[t.tab_name.toLowerCase()] = t.id;
    });

    // Read all files from directory
    const files = fs.readdirSync(backgroundsDir);

    // Filter for image files and create background objects
    const backgrounds = files
      .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file))
      .map((file, index) => {
        // Try to infer theme from filename (e.g., "nature-1.jpg" -> theme "nature")
        const match = file.match(/^([a-z]+)-\d+\./i);
        const themeName = match ? match[1].toLowerCase() : 'nature';
        const themeId = themeMap[themeName] || 1;  // Fallback to theme ID 1 if not found

        return {
          id: `file-${index}`,  // Use temporary IDs
          filename: file,
          theme_id: themeId,  // Map to correct theme
          display_name: file.replace(/\.(jpg|jpeg|png|gif)$/i, '').replace(/-/g, ' '),
          enabled: 1,
          sort_order: index
        };
      });

    console.log(`[API] Scanned backgrounds directory: found ${backgrounds.length} files across ${themes.length} themes`);

    res.json({
      success: true,
      backgrounds
    });
  } catch (error) {
    console.error('Error scanning backgrounds directory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to scan backgrounds directory'
    });
  }
});

/**
 * POST /api/backgrounds/import-from-directory - Import backgrounds from filesystem into database
 * Maps backgrounds to themes based on filename prefix (e.g., "nature-1.jpg" -> Nature theme)
 */
app.post('/api/backgrounds/import-from-directory', (req, res) => {
  try {
    const backgroundsDir = path.join(__dirname, '../public/backgrounds');

    // Check if directory exists
    if (!fs.existsSync(backgroundsDir)) {
      return res.json({
        success: true,
        message: 'No backgrounds directory found',
        imported: 0
      });
    }

    // Get all themes and create a map
    const themes = db.getAllThemes();
    const themeMap = {};
    themes.forEach(t => {
      themeMap[t.tab_name.toLowerCase()] = t.id;
    });

    // Get existing backgrounds to avoid duplicates
    const existingBackgrounds = db.getAllBackgrounds();
    const existingFilenames = new Set(existingBackgrounds.map(bg => bg.filename));

    // Read all files from directory
    const files = fs.readdirSync(backgroundsDir)
      .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file))
      .sort();

    let imported = 0;
    let skipped = 0;
    const results = [];

    files.forEach(file => {
      // Skip if already in database
      if (existingFilenames.has(file)) {
        skipped++;
        results.push({ file, status: 'skipped', reason: 'already exists' });
        return;
      }

      // Extract theme from filename (e.g., "nature-1.jpg" -> "nature")
      const match = file.match(/^([a-z]+)-\d+\./i);
      if (!match) {
        skipped++;
        results.push({ file, status: 'skipped', reason: 'cannot determine theme' });
        return;
      }

      const themeName = match[1].toLowerCase();
      const themeId = themeMap[themeName];

      if (!themeId) {
        skipped++;
        results.push({ file, status: 'skipped', reason: `no theme found for "${themeName}"` });
        return;
      }

      // Get display name from filename
      const displayName = file
        .replace(/\.(jpg|jpeg|png|gif)$/i, '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());

      // Import to database
      try {
        db.createBackground({
          filename: file,
          theme_id: themeId,
          display_name: displayName,
          enabled: 1,
          sort_order: 0
        });
        imported++;
        results.push({ file, status: 'imported', theme: themeName, displayName });
      } catch (error) {
        skipped++;
        results.push({ file, status: 'error', reason: error.message });
      }
    });

    console.log(`[API] Import complete: ${imported} imported, ${skipped} skipped`);

    res.json({
      success: true,
      imported,
      skipped,
      total: files.length,
      results
    });
  } catch (error) {
    console.error('Error importing backgrounds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import backgrounds'
    });
  }
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ==================== SERVER START ====================

// Wait for database to initialize
const checkAndStart = setInterval(() => {
  if (serverReady) {
    clearInterval(checkAndStart);
    
    app.listen(PORT, () => {
      console.log('\n' + '='.repeat(50));
      console.log('🟢 Greenscreen Kiosk Server');
      console.log('='.repeat(50));
      console.log(`📡 Server running on: http://localhost:${PORT}`);
      console.log(`🖥️  Kiosk interface: http://localhost:${PORT}`);
      console.log(`👨‍💼 Operator dashboard: http://localhost:${PORT}/operator`);
      console.log(`📊 API endpoint: http://localhost:${PORT}/api`);
      console.log('='.repeat(50) + '\n');
    });
  }
}, 100);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🔴 Shutting down server...');
  db.closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🔴 Shutting down server...');
  db.closeDatabase();
  process.exit(0);
});
