/**
 * Simple script to set OpenAI API key in the database
 * Usage: node server/set-api-key.js YOUR_API_KEY_HERE
 */

const db = require('./database');

async function setApiKey() {
  const apiKey = process.argv[2];

  if (!apiKey) {
    console.error('❌ Error: Please provide your OpenAI API key as an argument');
    console.log('\nUsage:');
    console.log('  node server/set-api-key.js sk-YOUR-API-KEY-HERE');
    console.log('\nExample:');
    console.log('  node server/set-api-key.js sk-proj-abc123xyz...');
    process.exit(1);
  }

  if (!apiKey.startsWith('sk-')) {
    console.error('❌ Warning: OpenAI API keys typically start with "sk-"');
    console.log('Are you sure this is correct? Continuing anyway...\n');
  }

  try {
    console.log('🔧 Initializing database...');
    await db.initializeDatabase();

    console.log('🔑 Setting OpenAI API key...');
    db.updateSettings({ openai_api_key: apiKey });

    console.log('✅ OpenAI API key set successfully!');
    console.log('\nYou can now use AI generation in your kiosk.');
    console.log('Restart the server if it\'s already running.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting API key:', error.message);
    process.exit(1);
  }
}

setApiKey();
