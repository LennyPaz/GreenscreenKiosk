const https = require('https');
const fs = require('fs');
const path = require('path');

// Using Picsum Photos (reliable placeholder service)
// Using different seed numbers to get varied images
const backgrounds = [
  // Nature theme (6 images) - IDs known for nature-like images
  { url: 'https://picsum.photos/seed/nature1/1200/900', filename: 'nature-1.jpg' },
  { url: 'https://picsum.photos/seed/nature2/1200/900', filename: 'nature-2.jpg' },
  { url: 'https://picsum.photos/seed/nature3/1200/900', filename: 'nature-3.jpg' },
  { url: 'https://picsum.photos/seed/nature4/1200/900', filename: 'nature-4.jpg' },
  { url: 'https://picsum.photos/seed/nature5/1200/900', filename: 'nature-5.jpg' },
  { url: 'https://picsum.photos/seed/nature6/1200/900', filename: 'nature-6.jpg' },

  // Urban theme (6 images)
  { url: 'https://picsum.photos/seed/urban1/1200/900', filename: 'urban-1.jpg' },
  { url: 'https://picsum.photos/seed/urban2/1200/900', filename: 'urban-2.jpg' },
  { url: 'https://picsum.photos/seed/urban3/1200/900', filename: 'urban-3.jpg' },
  { url: 'https://picsum.photos/seed/urban4/1200/900', filename: 'urban-4.jpg' },
  { url: 'https://picsum.photos/seed/urban5/1200/900', filename: 'urban-5.jpg' },
  { url: 'https://picsum.photos/seed/urban6/1200/900', filename: 'urban-6.jpg' },

  // Sky theme (6 images)
  { url: 'https://picsum.photos/seed/sky1/1200/900', filename: 'sky-1.jpg' },
  { url: 'https://picsum.photos/seed/sky2/1200/900', filename: 'sky-2.jpg' },
  { url: 'https://picsum.photos/seed/sky3/1200/900', filename: 'sky-3.jpg' },
  { url: 'https://picsum.photos/seed/sky4/1200/900', filename: 'sky-4.jpg' },
  { url: 'https://picsum.photos/seed/sky5/1200/900', filename: 'sky-5.jpg' },
  { url: 'https://picsum.photos/seed/sky6/1200/900', filename: 'sky-6.jpg' },

  // Abstract theme (6 images)
  { url: 'https://picsum.photos/seed/abstract1/1200/900', filename: 'abstract-1.jpg' },
  { url: 'https://picsum.photos/seed/abstract2/1200/900', filename: 'abstract-2.jpg' },
  { url: 'https://picsum.photos/seed/abstract3/1200/900', filename: 'abstract-3.jpg' },
  { url: 'https://picsum.photos/seed/abstract4/1200/900', filename: 'abstract-4.jpg' },
  { url: 'https://picsum.photos/seed/abstract5/1200/900', filename: 'abstract-5.jpg' },
  { url: 'https://picsum.photos/seed/abstract6/1200/900', filename: 'abstract-6.jpg' },
];

const backgroundsDir = path.join(__dirname, 'public', 'backgrounds');

// Create backgrounds directory if it doesn't exist
if (!fs.existsSync(backgroundsDir)) {
  fs.mkdirSync(backgroundsDir, { recursive: true });
  console.log('✓ Created backgrounds directory');
}

// Download function with redirect handling
function downloadImage(url, filepath, retries = 3) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading ${path.basename(filepath)}...`);

    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadImage(response.headers.location, filepath, retries)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(filepath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`✓ Downloaded ${path.basename(filepath)}`);
        resolve();
      });

      fileStream.on('error', (err) => {
        fs.unlink(filepath, () => {});
        reject(err);
      });
    }).on('error', (err) => {
      if (retries > 0) {
        console.log(`Retrying ${path.basename(filepath)}... (${retries} attempts left)`);
        setTimeout(() => {
          downloadImage(url, filepath, retries - 1)
            .then(resolve)
            .catch(reject);
        }, 1000);
      } else {
        reject(err);
      }
    });
  });
}

// Download all backgrounds sequentially (to avoid rate limiting)
async function downloadAll() {
  console.log(`Starting download of ${backgrounds.length} background images...\n`);

  for (let i = 0; i < backgrounds.length; i++) {
    const bg = backgrounds[i];
    const filepath = path.join(backgroundsDir, bg.filename);

    try {
      await downloadImage(bg.url, filepath);
      // Small delay between downloads to be nice to Unsplash
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`✗ Failed to download ${bg.filename}:`, error.message);
    }
  }

  console.log('\n✓ Download complete!');
  console.log(`Downloaded ${fs.readdirSync(backgroundsDir).length} images to ${backgroundsDir}`);
}

downloadAll().catch(console.error);
