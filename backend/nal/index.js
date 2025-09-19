const fs = require('fs').promises;
const path = require('path');
const notificationService = require('../notification-service');

/**
 * Notification Access Layer (NAL)
 * Provides a unified interface for managing notifications across different platforms
 */

class NotificationAccessLayer {
  constructor(dataDir = './data') {
    this.dataDir = dataDir;
    this.notificationsFile = path.join(dataDir, 'notifications.json');
    this.webhooksFile = path.join(dataDir, 'webhooks.json');
  }

  /**
   * Initialize the NAL
   */
  async initialize() {
    try {
      // Ensure data directory exists
      await fs.mkdir(this.dataDir, { recursive: true });

      // Initialize notifications file if it doesn't exist
      await this.initializeNotificationsFile();
      
      // Initialize webhooks file if it doesn't exist
      await this.initializeWebhooksFile();

      console.log('NAL initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize NAL:', error);
      throw error;
    }
  }

  /**
   * Initialize notifications.json file
   */
  async initializeNotificationsFile() {
    try {
      await fs.access(this.notificationsFile);
    } catch {
      const initialData = {
        notifications: [],
        stats: {
          totalSent: 0,
          totalFailed: 0,
          byPlatform: {
            discord: 0,
            teams: 0,
            unknown: 0
          },
          bySeverity: {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0
          }
        }
      };
      await fs.writeFile(this.notificationsFile, JSON.stringify(initialData, null, 2));
    }
  }

  /**
   * Initialize webhooks.json file
   */
  async initializeWebhooksFile() {
    try {
      await fs.access(this.webhooksFile);
    } catch {
      const initialData = {
        webhooks: [],
        categories: {
          'critical-systems': {
            name: 'Critical Systems',
            description: 'High-priority systems requiring immediate attention',
            webhookUrls: []
          },
          'development': {
            name: 'Development',
            description: 'Development environment notifications',
            webhookUrls: []
          },
          'production': {
            name: 'Production',
            description: 'Production environment notifications',
            webhookUrls: []
          }
        }
      };
      await fs.writeFile(this.webhooksFile, JSON.stringify(initialData, null, 2));
    }
  }

  /**
   * Get all notifications
   */
  async getNotifications() {
    try {
      const data = await fs.readFile(this.notificationsFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to read notifications:', error);
      throw error;
    }
  }

  /**
   * Get all webhooks
   */
  async getWebhooks() {
    try {
      const data = await fs.readFile(this.webhooksFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to read webhooks:', error);
      throw error;
    }
  }

  /**
   * Add a new webhook
   */
  async addWebhook(webhookData) {
    try {
      const { name, url, platform, category = 'default', description = '' } = webhookData;
      
      if (!name || !url) {
        throw new Error('Name and URL are required');
      }

      if (!notificationService.isValidWebhookUrl(url)) {
        throw new Error('Invalid webhook URL format');
      }

      const webhooks = await this.getWebhooks();
      const newWebhook = {
        id: Date.now().toString(),
        name,
        url,
        platform: platform || notificationService.detectWebhookType(url),
        category,
        description,
        createdAt: new Date().toISOString(),
        isActive: true
      };

      webhooks.webhooks.push(newWebhook);
      await fs.writeFile(this.webhooksFile, JSON.stringify(webhooks, null, 2));

      console.log(`Webhook added: ${name} (${newWebhook.platform})`);
      return newWebhook;
    } catch (error) {
      console.error('Failed to add webhook:', error);
      throw error;
    }
  }

  /**
   * Update a webhook
   */
  async updateWebhook(id, updates) {
    try {
      const webhooks = await this.getWebhooks();
      const webhookIndex = webhooks.webhooks.findIndex(w => w.id === id);
      
      if (webhookIndex === -1) {
        throw new Error('Webhook not found');
      }

      // Validate URL if provided
      if (updates.url && !notificationService.isValidWebhookUrl(updates.url)) {
        throw new Error('Invalid webhook URL format');
      }

      webhooks.webhooks[webhookIndex] = {
        ...webhooks.webhooks[webhookIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await fs.writeFile(this.webhooksFile, JSON.stringify(webhooks, null, 2));
      return webhooks.webhooks[webhookIndex];
    } catch (error) {
      console.error('Failed to update webhook:', error);
      throw error;
    }
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(id) {
    try {
      const webhooks = await this.getWebhooks();
      const webhookIndex = webhooks.webhooks.findIndex(w => w.id === id);
      
      if (webhookIndex === -1) {
        throw new Error('Webhook not found');
      }

      const deletedWebhook = webhooks.webhooks.splice(webhookIndex, 1)[0];
      await fs.writeFile(this.webhooksFile, JSON.stringify(webhooks, null, 2));

      console.log(`Webhook deleted: ${deletedWebhook.name}`);
      return deletedWebhook;
    } catch (error) {
      console.error('Failed to delete webhook:', error);
      throw error;
    }
  }

  /**
   * Get webhooks by category
   */
  async getWebhooksByCategory(category) {
    try {
      const webhooks = await this.getWebhooks();
      return webhooks.webhooks.filter(w => w.category === category && w.isActive);
    } catch (error) {
      console.error('Failed to get webhooks by category:', error);
      throw error;
    }
  }

  /**
   * Get webhooks by platform
   */
  async getWebhooksByPlatform(platform) {
    try {
      const webhooks = await this.getWebhooks();
      return webhooks.webhooks.filter(w => w.platform === platform && w.isActive);
    } catch (error) {
      console.error('Failed to get webhooks by platform:', error);
      throw error;
    }
  }

  /**
   * Send notification to specific webhook
   */
  async sendNotification(webhookId, vulnerability) {
    try {
      const webhooks = await this.getWebhooks();
      const webhook = webhooks.webhooks.find(w => w.id === webhookId);
      
      if (!webhook) {
        throw new Error('Webhook not found');
      }

      if (!webhook.isActive) {
        throw new Error('Webhook is inactive');
      }

      const success = await notificationService.sendNotification(webhook.url, vulnerability);
      
      // Log the notification
      await this.logNotification(webhookId, vulnerability, success);
      
      return success;
    } catch (error) {
      console.error('Failed to send notification:', error);
      throw error;
    }
  }

  /**
   * Send notification to all webhooks in a category
   */
  async sendNotificationToCategory(category, vulnerability) {
    try {
      const webhooks = await this.getWebhooksByCategory(category);
      const results = [];

      for (const webhook of webhooks) {
        try {
          const success = await notificationService.sendNotification(webhook.url, vulnerability);
          results.push({ webhookId: webhook.id, success });
          await this.logNotification(webhook.id, vulnerability, success);
        } catch (error) {
          console.error(`Failed to send notification to ${webhook.name}:`, error);
          results.push({ webhookId: webhook.id, success: false, error: error.message });
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to send notification to category:', error);
      throw error;
    }
  }

  /**
   * Send batch notification to specific webhook
   */
  async sendBatchNotification(webhookId, vulnerabilities, cpeId) {
    try {
      const webhooks = await this.getWebhooks();
      const webhook = webhooks.webhooks.find(w => w.id === webhookId);
      
      if (!webhook) {
        throw new Error('Webhook not found');
      }

      if (!webhook.isActive) {
        throw new Error('Webhook is inactive');
      }

      const success = await notificationService.sendBatchNotification(webhook.url, vulnerabilities, cpeId);
      
      // Log the batch notification
      await this.logBatchNotification(webhookId, vulnerabilities, cpeId, success);
      
      return success;
    } catch (error) {
      console.error('Failed to send batch notification:', error);
      throw error;
    }
  }

  /**
   * Send batch notification to all webhooks in a category
   */
  async sendBatchNotificationToCategory(category, vulnerabilities, cpeId) {
    try {
      const webhooks = await this.getWebhooksByCategory(category);
      const results = [];

      for (const webhook of webhooks) {
        try {
          const success = await notificationService.sendBatchNotification(webhook.url, vulnerabilities, cpeId);
          results.push({ webhookId: webhook.id, success });
          await this.logBatchNotification(webhook.id, vulnerabilities, cpeId, success);
        } catch (error) {
          console.error(`Failed to send batch notification to ${webhook.name}:`, error);
          results.push({ webhookId: webhook.id, success: false, error: error.message });
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to send batch notification to category:', error);
      throw error;
    }
  }

  /**
   * Log a notification
   */
  async logNotification(webhookId, vulnerability, success) {
    try {
      const notifications = await this.getNotifications();
      const webhooks = await this.getWebhooks();
      const webhook = webhooks.webhooks.find(w => w.id === webhookId);

      const notification = {
        id: Date.now().toString(),
        webhookId,
        webhookName: webhook?.name || 'Unknown',
        webhookPlatform: webhook?.platform || 'unknown',
        cveId: vulnerability.cveId,
        severity: vulnerability.severity,
        success,
        timestamp: new Date().toISOString()
      };

      notifications.notifications.push(notification);
      
      // Update stats
      notifications.stats.totalSent++;
      if (success) {
        notifications.stats.byPlatform[webhook?.platform || 'unknown']++;
        notifications.stats.bySeverity[vulnerability.severity.toLowerCase()]++;
      } else {
        notifications.stats.totalFailed++;
      }

      await fs.writeFile(this.notificationsFile, JSON.stringify(notifications, null, 2));
    } catch (error) {
      console.error('Failed to log notification:', error);
    }
  }

  /**
   * Log a batch notification
   */
  async logBatchNotification(webhookId, vulnerabilities, cpeId, success) {
    try {
      const notifications = await this.getNotifications();
      const webhooks = await this.getWebhooks();
      const webhook = webhooks.webhooks.find(w => w.id === webhookId);

      const notification = {
        id: Date.now().toString(),
        webhookId,
        webhookName: webhook?.name || 'Unknown',
        webhookPlatform: webhook?.platform || 'unknown',
        type: 'batch',
        cpeId,
        vulnerabilityCount: vulnerabilities.length,
        success,
        timestamp: new Date().toISOString()
      };

      notifications.notifications.push(notification);
      
      // Update stats
      notifications.stats.totalSent++;
      if (success) {
        notifications.stats.byPlatform[webhook?.platform || 'unknown']++;
        // Count vulnerabilities by severity
        vulnerabilities.forEach(vuln => {
          notifications.stats.bySeverity[vuln.severity.toLowerCase()]++;
        });
      } else {
        notifications.stats.totalFailed++;
      }

      await fs.writeFile(this.notificationsFile, JSON.stringify(notifications, null, 2));
    } catch (error) {
      console.error('Failed to log batch notification:', error);
    }
  }

  /**
   * Get notification statistics
   */
  async getStats() {
    try {
      const notifications = await this.getNotifications();
      return notifications.stats;
    } catch (error) {
      console.error('Failed to get notification stats:', error);
      throw error;
    }
  }

  /**
   * Get recent notifications
   */
  async getRecentNotifications(limit = 50) {
    try {
      const notifications = await this.getNotifications();
      return notifications.notifications
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to get recent notifications:', error);
      throw error;
    }
  }

  /**
   * Add a new category
   */
  async addCategory(categoryData) {
    try {
      const { id, name, description = '' } = categoryData;
      
      if (!id || !name) {
        throw new Error('ID and name are required');
      }

      const webhooks = await this.getWebhooks();
      
      if (webhooks.categories[id]) {
        throw new Error('Category already exists');
      }

      webhooks.categories[id] = {
        name,
        description,
        webhookUrls: []
      };

      await fs.writeFile(this.webhooksFile, JSON.stringify(webhooks, null, 2));
      return webhooks.categories[id];
    } catch (error) {
      console.error('Failed to add category:', error);
      throw error;
    }
  }

  /**
   * Get all categories
   */
  async getCategories() {
    try {
      const webhooks = await this.getWebhooks();
      return webhooks.categories;
    } catch (error) {
      console.error('Failed to get categories:', error);
      throw error;
    }
  }
}

module.exports = NotificationAccessLayer;
