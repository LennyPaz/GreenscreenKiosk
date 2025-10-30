// Simple script to test the import API endpoint
// Make sure the server is running first: node server/server.js

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/backgrounds/import-from-directory',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log('Calling import API endpoint...\n');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('Import Results:');
      console.log(`✓ Imported: ${result.imported}`);
      console.log(`⊘ Skipped: ${result.skipped}`);
      console.log(`📊 Total files: ${result.total}\n`);

      if (result.results && result.results.length > 0) {
        console.log('Details:');
        result.results.forEach(r => {
          if (r.status === 'imported') {
            console.log(`  ✓ ${r.file} → ${r.theme} theme (${r.displayName})`);
          } else if (r.status === 'skipped') {
            console.log(`  ⊘ ${r.file} (${r.reason})`);
          } else {
            console.log(`  ✗ ${r.file} (${r.reason})`);
          }
        });
      }
    } catch (error) {
      console.error('Error parsing response:', error);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error calling API:', error.message);
  console.log('\n⚠ Make sure the server is running: node server/server.js');
});

req.end();
