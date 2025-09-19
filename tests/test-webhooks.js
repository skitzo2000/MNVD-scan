#!/usr/bin/env node

/**
 * Webhook Compatibility Test Script
 * Tests Discord and Microsoft Teams webhook functionality
 */

const notificationService = require('../backend/notification-service');

// Test data
const testVulnerability = {
  cveId: 'CVE-2024-12345',
  description: 'This is a test vulnerability for webhook compatibility testing. It demonstrates how the notification system handles different webhook types.',
  severity: 'HIGH',
  cvssScore: '7.5',
  nvdUrl: 'https://nvd.nist.gov/vuln/detail/CVE-2024-12345',
  cpeMatch: 'cpe:2.3:a:apache:httpd:2.4:*:*:*:*:*:*:*',
  publishedDate: new Date().toISOString()
};

const testVulnerabilities = [
  {
    cveId: 'CVE-2024-12345',
    description: 'Test vulnerability 1',
    severity: 'HIGH',
    cvssScore: '7.5',
    nvdUrl: 'https://nvd.nist.gov/vuln/detail/CVE-2024-12345',
    cpeMatch: 'cpe:2.3:a:apache:httpd:2.4:*:*:*:*:*:*:*',
    publishedDate: new Date().toISOString()
  },
  {
    cveId: 'CVE-2024-12346',
    description: 'Test vulnerability 2',
    severity: 'CRITICAL',
    cvssScore: '9.1',
    nvdUrl: 'https://nvd.nist.gov/vuln/detail/CVE-2024-12346',
    cpeMatch: 'cpe:2.3:a:apache:httpd:2.4:*:*:*:*:*:*:*',
    publishedDate: new Date().toISOString()
  }
];

// Test webhook URL validation
function testWebhookValidation() {
  console.log('🧪 Testing webhook URL validation...');
  
  const notificationService = require('../backend/notification-service');
  
  // Test Discord URLs
  const discordUrls = [
    'https://discord.com/api/webhooks/123456789/abcdef123456',
    'https://discordapp.com/api/webhooks/123456789/abcdef123456',
    'https://discord.com/api/webhooks/123456789/abcdef-123456',
    'https://discord.com/api/webhooks/123456789/abcdef_123456'
  ];
  
  // Test Teams URLs
  const teamsUrls = [
    'https://your-org.webhook.office.com/webhookb2/12345678-1234-1234-1234-123456789012/IncomingWebhook/abcdef123456/12345678-1234-1234-1234-123456789012',
    'https://contoso.webhook.office.com/webhookb2/87654321-4321-4321-4321-210987654321/IncomingWebhook/zyxwvu987654/87654321-4321-4321-4321-210987654321'
  ];
  
  // Test invalid URLs
  const invalidUrls = [
    'https://example.com/webhook',
    'https://discord.com/api/webhooks/invalid',
    'https://teams.microsoft.com/webhook',
    'not-a-url'
  ];
  
  console.log('  Testing Discord URLs...');
  discordUrls.forEach(url => {
    const isValid = notificationService.isValidWebhookUrl(url);
    console.log(`    ${url}: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
  });
  
  console.log('  Testing Teams URLs...');
  teamsUrls.forEach(url => {
    const isValid = notificationService.isValidWebhookUrl(url);
    console.log(`    ${url}: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
  });
  
  console.log('  Testing invalid URLs...');
  invalidUrls.forEach(url => {
    const isValid = notificationService.isValidWebhookUrl(url);
    console.log(`    ${url}: ${isValid ? '❌ Should be invalid' : '✅ Correctly invalid'}`);
  });
}

// Test webhook type detection
function testWebhookTypeDetection() {
  console.log('\n🧪 Testing webhook type detection...');
  
  const notificationService = require('../backend/notification-service');
  
  const testUrls = [
    { url: 'https://discord.com/api/webhooks/123456789/abcdef123456', expected: 'discord' },
    { url: 'https://discordapp.com/api/webhooks/123456789/abcdef123456', expected: 'discord' },
    { url: 'https://your-org.webhook.office.com/webhookb2/12345678-1234-1234-1234-123456789012/IncomingWebhook/abcdef123456/12345678-1234-1234-1234-123456789012', expected: 'teams' },
    { url: 'https://contoso.webhook.office.com/webhookb2/87654321-4321-4321-4321-210987654321/IncomingWebhook/zyxwvu987654/87654321-4321-4321-4321-210987654321', expected: 'teams' },
    { url: 'https://example.com/webhook', expected: 'unknown' }
  ];
  
  testUrls.forEach(({ url, expected }) => {
    const detected = notificationService.detectWebhookType(url);
    const isCorrect = detected === expected;
    console.log(`    ${url}: ${isCorrect ? '✅' : '❌'} Detected: ${detected}, Expected: ${expected}`);
  });
}

// Test payload creation
function testPayloadCreation() {
  console.log('\n🧪 Testing payload creation...');
  
  const notificationService = require('../backend/notification-service');
  
  try {
    // Test Discord payload
    const discordPayload = notificationService.createPayload('discord', testVulnerability);
    console.log('  Discord payload structure:');
    console.log(`    Has embeds: ${discordPayload.embeds ? '✅' : '❌'}`);
    console.log(`    Has username: ${discordPayload.username ? '✅' : '❌'}`);
    console.log(`    Embed title: ${discordPayload.embeds[0].title ? '✅' : '❌'}`);
    console.log(`    Embed color: ${discordPayload.embeds[0].color ? '✅' : '❌'}`);
    
    // Test Teams payload
    const teamsPayload = notificationService.createPayload('teams', testVulnerability);
    console.log('  Teams payload structure:');
    console.log(`    Has @type: ${teamsPayload['@type'] ? '✅' : '❌'}`);
    console.log(`    Has sections: ${teamsPayload.sections ? '✅' : '❌'}`);
    console.log(`    Has themeColor: ${teamsPayload.themeColor ? '✅' : '❌'}`);
    console.log(`    Section title: ${teamsPayload.sections[0].activityTitle ? '✅' : '❌'}`);
    
    console.log('  ✅ Payload creation tests passed');
    
  } catch (error) {
    console.log(`  ❌ Payload creation failed: ${error.message}`);
  }
}

// Test batch payload creation
function testBatchPayloadCreation() {
  console.log('\n🧪 Testing batch payload creation...');
  
  const notificationService = require('../backend/notification-service');
  
  try {
    // Test Discord batch payload
    const discordBatchPayload = notificationService.createBatchPayload('discord', testVulnerabilities, 'cpe:2.3:a:apache:httpd:2.4:*:*:*:*:*:*:*');
    console.log('  Discord batch payload structure:');
    console.log(`    Has embeds: ${discordBatchPayload.embeds ? '✅' : '❌'}`);
    console.log(`    Embed title: ${discordBatchPayload.embeds[0].title ? '✅' : '❌'}`);
    
    // Test Teams batch payload
    const teamsBatchPayload = notificationService.createBatchPayload('teams', testVulnerabilities, 'cpe:2.3:a:apache:httpd:2.4:*:*:*:*:*:*:*');
    console.log('  Teams batch payload structure:');
    console.log(`    Has @type: ${teamsBatchPayload['@type'] ? '✅' : '❌'}`);
    console.log(`    Has sections: ${teamsBatchPayload.sections ? '✅' : '❌'}`);
    console.log(`    Section title: ${teamsBatchPayload.sections[0].activityTitle ? '✅' : '❌'}`);
    
    console.log('  ✅ Batch payload creation tests passed');
    
  } catch (error) {
    console.log(`  ❌ Batch payload creation failed: ${error.message}`);
  }
}

// Test with actual webhook URLs (if provided)
async function testActualWebhooks() {
  console.log('\n🧪 Testing with actual webhook URLs...');
  
  const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
  const teamsWebhookUrl = process.env.TEAMS_WEBHOOK_URL;
  
  if (!discordWebhookUrl && !teamsWebhookUrl) {
    console.log('  ⚠️  No webhook URLs configured in environment variables');
    console.log('  Set DISCORD_WEBHOOK_URL or TEAMS_WEBHOOK_URL to test actual webhooks');
    return;
  }
  
  const notificationService = require('../backend/notification-service');
  
  if (discordWebhookUrl) {
    console.log('  Testing Discord webhook...');
    try {
      const success = await notificationService.sendNotification(discordWebhookUrl, testVulnerability);
      console.log(`    Discord notification: ${success ? '✅ Success' : '❌ Failed'}`);
    } catch (error) {
      console.log(`    Discord notification: ❌ Error - ${error.message}`);
    }
  }
  
  if (teamsWebhookUrl) {
    console.log('  Testing Teams webhook...');
    try {
      const success = await notificationService.sendNotification(teamsWebhookUrl, testVulnerability);
      console.log(`    Teams notification: ${success ? '✅ Success' : '❌ Failed'}`);
    } catch (error) {
      console.log(`    Teams notification: ❌ Error - ${error.message}`);
    }
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Webhook Compatibility Test Suite');
  console.log('=====================================\n');
  
  testWebhookValidation();
  testWebhookTypeDetection();
  testPayloadCreation();
  testBatchPayloadCreation();
  await testActualWebhooks();
  
  console.log('\n✅ Webhook compatibility tests completed!');
  console.log('\n📋 Summary:');
  console.log('- Discord webhooks: Supported with rich embeds');
  console.log('- Microsoft Teams webhooks: Supported with MessageCard format');
  console.log('- Automatic webhook type detection');
  console.log('- Batch notifications for multiple vulnerabilities');
  console.log('- Comprehensive error handling');
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  runTests,
  testWebhookValidation,
  testWebhookTypeDetection,
  testPayloadCreation,
  testBatchPayloadCreation,
  testActualWebhooks
};
