const db = require('./server/database.js');
const fs = require('fs');
const path = require('path');

console.log('Importing backgrounds to database...\n');

// Get all themes
const themes = db.getAllThemes();
console.log(`Found ${themes.length} themes in database:`);
themes.forEach(t => console.log(`  - ${t.name} (tab: ${t.tab_name}, id: ${t.id})`));
console.log();

// Map tab names to theme IDs (case-insensitive)
const themeMap = {};
themes.forEach(t => {
  themeMap[t.tab_name.toLowerCase()] = t.id;
});

// Get all image files from backgrounds directory
const backgroundsDir = path.join(__dirname, 'public', 'backgrounds');
const files = fs.readdirSync(backgroundsDir)
  .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file))
  .sort();

console.log(`Found ${files.length} background images\n`);

// Check if backgrounds already exist in database
const existingBackgrounds = db.getAllBackgrounds();
if (existingBackgrounds.length > 0) {
  console.log(`⚠ Warning: Database already has ${existingBackgrounds.length} backgrounds`);
  console.log('This script will only add backgrounds that are not already in the database.\n');
}

const existingFilenames = new Set(existingBackgrounds.map(bg => bg.filename));

let imported = 0;
let skipped = 0;

// Import each file
files.forEach(file => {
  // Skip if already in database
  if (existingFilenames.has(file)) {
    console.log(`⊘ Skipping ${file} (already in database)`);
    skipped++;
    return;
  }

  // Extract theme from filename (e.g., "nature-1.jpg" -> "nature")
  const match = file.match(/^([a-z]+)-\d+\./i);
  if (!match) {
    console.log(`⚠ Skipping ${file} (cannot determine theme from filename)`);
    skipped++;
    return;
  }

  const themeName = match[1].toLowerCase();
  const themeId = themeMap[themeName];

  if (!themeId) {
    console.log(`⚠ Skipping ${file} (no matching theme for "${themeName}")`);
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
    console.log(`✓ Imported ${file} → ${themeName} theme (${displayName})`);
    imported++;
  } catch (error) {
    console.error(`✗ Failed to import ${file}:`, error.message);
    skipped++;
  }
});

console.log(`\n✓ Import complete!`);
console.log(`  Imported: ${imported}`);
console.log(`  Skipped: ${skipped}`);
console.log(`  Total in database: ${db.getAllBackgrounds().length}`);
