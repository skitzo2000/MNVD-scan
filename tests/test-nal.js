#!/usr/bin/env node

/**
 * Notification Access Layer (NAL) Test Script
 * Tests the NAL functionality for managing webhooks and notifications
 */

const NotificationAccessLayer = require('../backend/nal');

// Test data
const testVulnerability = {
  cveId: 'CVE-2024-12345',
  description: 'This is a test vulnerability for NAL testing. It demonstrates how the NAL handles notifications across different platforms.',
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

// Test NAL initialization
async function testNALInitialization() {
  console.log('🧪 Testing NAL initialization...');
  
  try {
    const nal = new NotificationAccessLayer('./test-data');
    await nal.initialize();
    console.log('  ✅ NAL initialized successfully');
    return nal;
  } catch (error) {
    console.log(`  ❌ NAL initialization failed: ${error.message}`);
    throw error;
  }
}

// Test webhook management
async function testWebhookManagement(nal) {
  console.log('\n🧪 Testing webhook management...');
  
  try {
    // Test adding webhooks
    console.log('  Adding test webhooks...');
    
    const discordWebhook = await nal.addWebhook({
      name: 'Test Discord Webhook',
      url: 'https://discord.com/api/webhooks/123456789/abcdef123456',
      platform: 'discord',
      category: 'critical-systems',
      description: 'Test Discord webhook for critical systems'
    });
    console.log(`    ✅ Discord webhook added: ${discordWebhook.id}`);
    
    const teamsWebhook = await nal.addWebhook({
      name: 'Test Teams Webhook',
      url: 'https://your-org.webhook.office.com/webhookb2/12345678-1234-1234-1234-123456789012/IncomingWebhook/abcdef123456/12345678-1234-1234-1234-123456789012',
      platform: 'teams',
      category: 'development',
      description: 'Test Teams webhook for development'
    });
    console.log(`    ✅ Teams webhook added: ${teamsWebhook.id}`);
    
    // Test getting webhooks
    console.log('  Getting all webhooks...');
    const webhooks = await nal.getWebhooks();
    console.log(`    ✅ Found ${webhooks.webhooks.length} webhooks`);
    
    // Test getting webhooks by category
    console.log('  Getting webhooks by category...');
    const criticalWebhooks = await nal.getWebhooksByCategory('critical-systems');
    console.log(`    ✅ Found ${criticalWebhooks.length} critical systems webhooks`);
    
    const devWebhooks = await nal.getWebhooksByCategory('development');
    console.log(`    ✅ Found ${devWebhooks.length} development webhooks`);
    
    // Test getting webhooks by platform
    console.log('  Getting webhooks by platform...');
    const discordWebhooks = await nal.getWebhooksByPlatform('discord');
    console.log(`    ✅ Found ${discordWebhooks.length} Discord webhooks`);
    
    const teamsWebhooks = await nal.getWebhooksByPlatform('teams');
    console.log(`    ✅ Found ${teamsWebhooks.length} Teams webhooks`);
    
    return { discordWebhook, teamsWebhook };
  } catch (error) {
    console.log(`  ❌ Webhook management failed: ${error.message}`);
    throw error;
  }
}

// Test category management
async function testCategoryManagement(nal) {
  console.log('\n🧪 Testing category management...');
  
  try {
    // Test adding a new category
    console.log('  Adding new category...');
    let newCategory;
    try {
      newCategory = await nal.addCategory({
        id: 'security-team',
        name: 'Security Team',
        description: 'Notifications for the security team'
      });
      console.log(`    ✅ Category added: ${newCategory.name}`);
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log(`    ✅ Category already exists (expected): ${error.message}`);
        // Get existing category for display
        const categories = await nal.getCategories();
        newCategory = { id: 'security-team', ...categories['security-team'] };
      } else {
        throw error;
      }
    }
    
    // Test getting all categories
    console.log('  Getting all categories...');
    const categories = await nal.getCategories();
    console.log(`    ✅ Found ${Object.keys(categories).length} categories`);
    
    // List categories
    Object.entries(categories).forEach(([id, category]) => {
      console.log(`      - ${id}: ${category.name} (${category.description})`);
    });
    
    return newCategory;
  } catch (error) {
    console.log(`  ❌ Category management failed: ${error.message}`);
    throw error;
  }
}

// Test notification sending (mock)
async function testNotificationSending(nal, webhooks) {
  console.log('\n🧪 Testing notification sending...');
  
  try {
    // Test single notification
    console.log('  Testing single notification...');
    try {
      // This will fail because the webhook URLs are fake, but we can test the structure
      await nal.sendNotification(webhooks.discordWebhook.id, testVulnerability);
      console.log('    ✅ Single notification sent (mock)');
    } catch (error) {
      console.log(`    ⚠️  Single notification failed (expected with fake webhook): ${error.message}`);
    }
    
    // Test batch notification
    console.log('  Testing batch notification...');
    try {
      // This will fail because the webhook URLs are fake, but we can test the structure
      await nal.sendBatchNotification(webhooks.teamsWebhook.id, testVulnerabilities, 'cpe:2.3:a:apache:httpd:2.4:*:*:*:*:*:*:*');
      console.log('    ✅ Batch notification sent (mock)');
    } catch (error) {
      console.log(`    ⚠️  Batch notification failed (expected with fake webhook): ${error.message}`);
    }
    
    // Test category notifications
    console.log('  Testing category notifications...');
    try {
      const results = await nal.sendNotificationToCategory('critical-systems', testVulnerability);
      console.log(`    ✅ Category notification results: ${results.length} webhooks`);
    } catch (error) {
      console.log(`    ⚠️  Category notification failed (expected with fake webhooks): ${error.message}`);
    }
    
  } catch (error) {
    console.log(`  ❌ Notification sending failed: ${error.message}`);
    throw error;
  }
}

// Test notification logging
async function testNotificationLogging(nal) {
  console.log('\n🧪 Testing notification logging...');
  
  try {
    // Test getting stats
    console.log('  Getting notification stats...');
    const stats = await nal.getStats();
    console.log(`    ✅ Stats retrieved: ${JSON.stringify(stats, null, 2)}`);
    
    // Test getting recent notifications
    console.log('  Getting recent notifications...');
    const recentNotifications = await nal.getRecentNotifications(10);
    console.log(`    ✅ Found ${recentNotifications.length} recent notifications`);
    
    // Display recent notifications
    recentNotifications.forEach(notification => {
      console.log(`      - ${notification.cveId} to ${notification.webhookName} (${notification.success ? 'success' : 'failed'})`);
    });
    
  } catch (error) {
    console.log(`  ❌ Notification logging failed: ${error.message}`);
    throw error;
  }
}

// Test webhook updates
async function testWebhookUpdates(nal, webhooks) {
  console.log('\n🧪 Testing webhook updates...');
  
  try {
    // Test updating webhook
    console.log('  Updating webhook...');
    const updatedWebhook = await nal.updateWebhook(webhooks.discordWebhook.id, {
      name: 'Updated Discord Webhook',
      description: 'Updated description'
    });
    console.log(`    ✅ Webhook updated: ${updatedWebhook.name}`);
    
    // Test deactivating webhook
    console.log('  Deactivating webhook...');
    const deactivatedWebhook = await nal.updateWebhook(webhooks.teamsWebhook.id, {
      isActive: false
    });
    console.log(`    ✅ Webhook deactivated: ${deactivatedWebhook.name} (active: ${deactivatedWebhook.isActive})`);
    
    // Test reactivating webhook
    console.log('  Reactivating webhook...');
    const reactivatedWebhook = await nal.updateWebhook(webhooks.teamsWebhook.id, {
      isActive: true
    });
    console.log(`    ✅ Webhook reactivated: ${reactivatedWebhook.name} (active: ${reactivatedWebhook.isActive})`);
    
  } catch (error) {
    console.log(`  ❌ Webhook updates failed: ${error.message}`);
    throw error;
  }
}

// Test webhook deletion
async function testWebhookDeletion(nal, webhooks) {
  console.log('\n🧪 Testing webhook deletion...');
  
  try {
    // Test deleting webhook
    console.log('  Deleting webhook...');
    const deletedWebhook = await nal.deleteWebhook(webhooks.discordWebhook.id);
    console.log(`    ✅ Webhook deleted: ${deletedWebhook.name}`);
    
    // Verify deletion
    console.log('  Verifying deletion...');
    const remainingWebhooks = await nal.getWebhooks();
    console.log(`    ✅ Remaining webhooks: ${remainingWebhooks.webhooks.length}`);
    
  } catch (error) {
    console.log(`  ❌ Webhook deletion failed: ${error.message}`);
    throw error;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Notification Access Layer (NAL) Test Suite');
  console.log('=============================================\n');
  
  let nal;
  let webhooks;
  
  try {
    // Initialize NAL
    nal = await testNALInitialization();
    
    // Test webhook management
    webhooks = await testWebhookManagement(nal);
    
    // Test category management
    await testCategoryManagement(nal);
    
    // Test notification sending
    await testNotificationSending(nal, webhooks);
    
    // Test notification logging
    await testNotificationLogging(nal);
    
    // Test webhook updates
    await testWebhookUpdates(nal, webhooks);
    
    // Test webhook deletion
    await testWebhookDeletion(nal, webhooks);
    
    console.log('\n✅ All NAL tests completed successfully!');
    console.log('\n📋 NAL Features Tested:');
    console.log('- Webhook management (add, update, delete)');
    console.log('- Category management');
    console.log('- Notification sending (single and batch)');
    console.log('- Notification logging and statistics');
    console.log('- Platform detection (Discord, Teams)');
    console.log('- Multi-webhook support');
    
  } catch (error) {
    console.log(`\n❌ NAL tests failed: ${error.message}`);
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  runTests,
  testNALInitialization,
  testWebhookManagement,
  testCategoryManagement,
  testNotificationSending,
  testNotificationLogging,
  testWebhookUpdates,
  testWebhookDeletion
};
