# Background Setup Guide

## What's Been Done

### 1. Downloaded 24 Placeholder Images ✓
- **6 Nature backgrounds** (`nature-1.jpg` through `nature-6.jpg`)
- **6 Urban backgrounds** (`urban-1.jpg` through `urban-6.jpg`)
- **6 Sky backgrounds** (`sky-1.jpg` through `sky-6.jpg`)
- **6 Abstract backgrounds** (`abstract-1.jpg` through `abstract-6.jpg`)

All images are now in: `public/backgrounds/`

### 2. Fixed the [Object Promise] Error ✓
- Made the `render()` function async in `src/kiosk.js`
- Added `await` when calling `createBackgroundScreen()`
- Background screen now displays properly

### 3. Added Filesystem Fallback ✓
- If database has no backgrounds, kiosk automatically scans `public/backgrounds` folder
- Existing images will work immediately without database import
- New API endpoint: `GET /api/backgrounds/scan-directory`

### 4. Created Import API Endpoint ✓
- New endpoint: `POST /api/backgrounds/import-from-directory`
- Automatically maps backgrounds to themes based on filename prefix
- Avoids duplicate imports
- Provides detailed import results

## Next Steps

You have **TWO OPTIONS** for using these backgrounds:

### Option 1: Use Filesystem Fallback (No Action Required)
The backgrounds will work automatically via filesystem scanning. Just start the kiosk:
```bash
node server/server.js
```

Then open the kiosk at `http://localhost:5000` and navigate to the background selection screen. The 4 theme tabs (Nature, Urban, Sky, Abstract) should show with 6 backgrounds each.

### Option 2: Import into Database (Recommended for Production)
This allows you to manage backgrounds through the operator settings panel.

1. **Start the server:**
   ```bash
   node server/server.js
   ```

2. **In a separate terminal, run the import:**
   ```bash
   node test-import.js
   ```

   You should see output like:
   ```
   Import Results:
   ✓ Imported: 24
   ⊘ Skipped: 0
   📊 Total files: 24
   ```

3. **Verify in settings panel:**
   - Go to `http://localhost:5000/operator/settings.html`
   - Click "Manage Backgrounds" for each theme
   - You should see the imported backgrounds

## Theme Setup

Make sure you've created these 4 themes in the operator settings panel:

| Theme Name | Tab Name |
|------------|----------|
| Nature     | Nature   |
| Urban      | Urban    |
| Sky        | Sky      |
| Abstract   | Abstract |

The tab names must match the filename prefixes (case-insensitive) for the import to work correctly.

## Replacing Placeholder Images

These are placeholder images from Picsum Photos. To replace them with your own:

### Using the Settings Panel (Easiest):
1. Go to operator settings
2. Click "Manage Backgrounds" for a theme
3. Upload your image (it will auto-number: `themename-7.jpg`, etc.)
4. Delete old placeholders if desired

### Using Filesystem:
1. Delete the placeholders in `public/backgrounds/`
2. Add your own images with the naming convention: `{theme-name}-{number}.jpg`
   - Example: `nature-1.jpg`, `nature-2.jpg`, etc.
3. Either:
   - Let filesystem fallback handle it automatically, OR
   - Run `node test-import.js` to import them into the database

## File Naming Convention

**Format:** `{theme-tab-name}-{number}.{ext}`

Examples:
- `nature-1.jpg` → Nature theme
- `urban-5.png` → Urban theme
- `sky-12.jpg` → Sky theme
- `abstract-3.gif` → Abstract theme

The import script:
- Extracts theme from filename prefix
- Auto-generates display names (e.g., `nature-1.jpg` → "Nature 1")
- Maps to correct theme in database
- Assigns to proper theme tab in kiosk

## Troubleshooting

**Backgrounds not showing up?**
1. Check `public/backgrounds/` directory has images
2. Make sure themes exist in settings panel
3. Verify theme tab names match filename prefixes
4. Check browser console for errors

**Import failing?**
1. Make sure server is running
2. Verify themes exist in database first
3. Check theme tab names match exactly

**Want to start fresh?**
1. Delete all backgrounds from settings panel
2. Delete `public/backgrounds/*`
3. Re-run `node download-backgrounds.js`
4. Re-run `node test-import.js`
