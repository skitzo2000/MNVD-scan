const fs = require('fs').promises;
const path = require('path');
const nvdClient = require('../nvd-client');
const NotificationAccessLayer = require('../nal');

/**
 * Scan Access Layer (SAL)
 * Provides a unified interface for managing different types of vulnerability scans
 */

class ScanAccessLayer {
  constructor(dataDir = './data') {
    this.dataDir = dataDir;
    this.scansFile = path.join(dataDir, 'scans.json');
    this.workflowsFile = path.join(dataDir, 'workflows.json');
    this.nal = new NotificationAccessLayer(dataDir);
  }

  /**
   * Initialize the SAL
   */
  async initialize() {
    try {
      // Ensure data directory exists
      await fs.mkdir(this.dataDir, { recursive: true });

      // Initialize scans file if it doesn't exist
      await this.initializeScansFile();
      
      // Initialize workflows file if it doesn't exist
      await this.initializeWorkflowsFile();

      // Initialize NAL
      await this.nal.initialize();

      console.log('SAL initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize SAL:', error);
      throw error;
    }
  }

  /**
   * Initialize scans.json file
   */
  async initializeScansFile() {
    try {
      await fs.access(this.scansFile);
    } catch {
      const initialData = {
        scans: [],
        stats: {
          totalScans: 0,
          successfulScans: 0,
          failedScans: 0,
          byType: {
            nvd: 0,
            custom: 0,
            scheduled: 0,
            manual: 0
          },
          byStatus: {
            completed: 0,
            running: 0,
            failed: 0,
            cancelled: 0
          }
        }
      };
      await fs.writeFile(this.scansFile, JSON.stringify(initialData, null, 2));
    }
  }

  /**
   * Initialize workflows.json file
   */
  async initializeWorkflowsFile() {
    try {
      await fs.access(this.workflowsFile);
    } catch {
      const initialData = {
        workflows: [],
        templates: {
          'nvd-scan': {
            name: 'NVD Vulnerability Scan',
            description: 'Standard NVD vulnerability scanning workflow',
            steps: [
              {
                type: 'nvd_scan',
                name: 'Scan NVD for vulnerabilities',
                config: {
                  cpeId: '{{cpeId}}',
                  daysBack: 30
                }
              },
              {
                type: 'notification',
                name: 'Send notifications',
                config: {
                  categories: ['critical-systems']
                }
              }
            ]
          },
          'comprehensive-scan': {
            name: 'Comprehensive Security Scan',
            description: 'Multi-source vulnerability scanning workflow',
            steps: [
              {
                type: 'nvd_scan',
                name: 'NVD vulnerability scan',
                config: {
                  cpeId: '{{cpeId}}',
                  daysBack: 30
                }
              },
              {
                type: 'custom_scan',
                name: 'Custom security checks',
                config: {
                  checks: ['version_check', 'config_audit']
                }
              },
              {
                type: 'notification',
                name: 'Send to security team',
                config: {
                  categories: ['security-team']
                }
              }
            ]
          }
        }
      };
      await fs.writeFile(this.workflowsFile, JSON.stringify(initialData, null, 2));
    }
  }

  /**
   * Get all scans
   */
  async getScans() {
    try {
      const data = await fs.readFile(this.scansFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to read scans:', error);
      throw error;
    }
  }

  /**
   * Get all workflows
   */
  async getWorkflows() {
    try {
      const data = await fs.readFile(this.workflowsFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to read workflows:', error);
      throw error;
    }
  }

  /**
   * Create a new scan
   */
  async createScan(scanData) {
    try {
      const { type, cpeId, workflowId, name, description = '' } = scanData;
      
      if (!type || !cpeId) {
        throw new Error('Type and CPE ID are required');
      }

      const scans = await this.getScans();
      const newScan = {
        id: Date.now().toString(),
        type,
        cpeId,
        workflowId: workflowId || null,
        name: name || `${type} scan for ${cpeId}`,
        description,
        status: 'pending',
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
        results: {
          vulnerabilities: [],
          errors: [],
          notifications: []
        },
        config: scanData.config || {}
      };

      scans.scans.push(newScan);
      await fs.writeFile(this.scansFile, JSON.stringify(scans, null, 2));

      console.log(`Scan created: ${newScan.name} (${newScan.id})`);
      return newScan;
    } catch (error) {
      console.error('Failed to create scan:', error);
      throw error;
    }
  }

  /**
   * Execute a scan
   */
  async executeScan(scanId) {
    try {
      const scans = await this.getScans();
      const scan = scans.scans.find(s => s.id === scanId);
      
      if (!scan) {
        throw new Error('Scan not found');
      }

      if (scan.status === 'running') {
        throw new Error('Scan is already running');
      }

      // Update scan status
      scan.status = 'running';
      scan.startedAt = new Date().toISOString();
      await this.updateScanStats('running');

      console.log(`Starting scan: ${scan.name} (${scan.type})`);

      let results;
      switch (scan.type) {
        case 'nvd':
          results = await this.executeNVDScan(scan);
          break;
        case 'custom':
          results = await this.executeCustomScan(scan);
          break;
        case 'workflow':
          results = await this.executeWorkflowScan(scan);
          break;
        default:
          throw new Error(`Unknown scan type: ${scan.type}`);
      }

      // Update scan with results
      scan.results = results;
      scan.status = 'completed';
      scan.completedAt = new Date().toISOString();
      
      await fs.writeFile(this.scansFile, JSON.stringify(scans, null, 2));
      await this.updateScanStats('completed');

      console.log(`Scan completed: ${scan.name}`);
      return scan;

    } catch (error) {
      console.error(`Scan execution failed: ${error.message}`);
      
      // Update scan status to failed
      const scans = await this.getScans();
      const scan = scans.scans.find(s => s.id === scanId);
      if (scan) {
        scan.status = 'failed';
        scan.completedAt = new Date().toISOString();
        scan.results.errors.push(error.message);
        await fs.writeFile(this.scansFile, JSON.stringify(scans, null, 2));
        await this.updateScanStats('failed');
      }
      
      throw error;
    }
  }

  /**
   * Execute NVD scan
   */
  async executeNVDScan(scan) {
    try {
      const { cpeId, config = {} } = scan;
      const daysBack = config.daysBack || 30;

      console.log(`Executing NVD scan for ${cpeId} (last ${daysBack} days)`);

      // Fetch vulnerabilities from NVD
      let vulnerabilities = await nvdClient.fetchRecentVulnerabilitiesByCPE(cpeId, daysBack);
      
      if (vulnerabilities.length === 0) {
        console.log(`No recent vulnerabilities found for ${cpeId}, checking all vulnerabilities...`);
        const allVulns = await nvdClient.fetchVulnerabilitiesByCPE(cpeId, 0, 10);
        vulnerabilities = allVulns.vulnerabilities || [];
      }

      console.log(`Found ${vulnerabilities.length} vulnerabilities for ${cpeId}`);

      // Send notifications if vulnerabilities found
      const notifications = [];
      if (vulnerabilities.length > 0) {
        const webhooks = await this.nal.getWebhooks();
        const activeWebhooks = webhooks.webhooks.filter(w => w.isActive);

        for (const webhook of activeWebhooks) {
          try {
            let success;
            if (vulnerabilities.length === 1) {
              success = await this.nal.sendNotification(webhook.id, vulnerabilities[0]);
            } else {
              success = await this.nal.sendBatchNotification(webhook.id, vulnerabilities, cpeId);
            }
            
            notifications.push({
              webhookId: webhook.id,
              webhookName: webhook.name,
              success,
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            console.error(`Failed to send notification to ${webhook.name}:`, error.message);
            notifications.push({
              webhookId: webhook.id,
              webhookName: webhook.name,
              success: false,
              error: error.message,
              timestamp: new Date().toISOString()
            });
          }
        }
      }

      return {
        vulnerabilities,
        notifications,
        errors: []
      };

    } catch (error) {
      console.error('NVD scan execution failed:', error);
      return {
        vulnerabilities: [],
        notifications: [],
        errors: [error.message]
      };
    }
  }

  /**
   * Execute custom scan
   */
  async executeCustomScan(scan) {
    try {
      const { cpeId, config = {} } = scan;
      const { checks = [] } = config;

      console.log(`Executing custom scan for ${cpeId}`);

      const results = {
        vulnerabilities: [],
        notifications: [],
        errors: []
      };

      // Execute custom checks
      for (const check of checks) {
        try {
          const checkResult = await this.executeCustomCheck(check, cpeId);
          if (checkResult.vulnerabilities) {
            results.vulnerabilities.push(...checkResult.vulnerabilities);
          }
          if (checkResult.errors) {
            results.errors.push(...checkResult.errors);
          }
        } catch (error) {
          console.error(`Custom check ${check} failed:`, error.message);
          results.errors.push(`${check}: ${error.message}`);
        }
      }

      // Send notifications if vulnerabilities found
      if (results.vulnerabilities.length > 0) {
        const webhooks = await this.nal.getWebhooks();
        const activeWebhooks = webhooks.webhooks.filter(w => w.isActive);

        for (const webhook of activeWebhooks) {
          try {
            let success;
            if (results.vulnerabilities.length === 1) {
              success = await this.nal.sendNotification(webhook.id, results.vulnerabilities[0]);
            } else {
              success = await this.nal.sendBatchNotification(webhook.id, results.vulnerabilities, cpeId);
            }
            
            results.notifications.push({
              webhookId: webhook.id,
              webhookName: webhook.name,
              success,
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            console.error(`Failed to send notification to ${webhook.name}:`, error.message);
            results.notifications.push({
              webhookId: webhook.id,
              webhookName: webhook.name,
              success: false,
              error: error.message,
              timestamp: new Date().toISOString()
            });
          }
        }
      }

      return results;

    } catch (error) {
      console.error('Custom scan execution failed:', error);
      return {
        vulnerabilities: [],
        notifications: [],
        errors: [error.message]
      };
    }
  }

  /**
   * Execute custom check
   */
  async executeCustomCheck(check, cpeId) {
    switch (check) {
      case 'version_check':
        return await this.executeVersionCheck(cpeId);
      case 'config_audit':
        return await this.executeConfigAudit(cpeId);
      case 'dependency_scan':
        return await this.executeDependencyScan(cpeId);
      default:
        throw new Error(`Unknown custom check: ${check}`);
    }
  }

  /**
   * Execute version check
   */
  async executeVersionCheck(cpeId) {
    // This would integrate with version checking services
    // For now, return a mock result
    return {
      vulnerabilities: [],
      errors: []
    };
  }

  /**
   * Execute configuration audit
   */
  async executeConfigAudit(cpeId) {
    // This would integrate with configuration auditing tools
    // For now, return a mock result
    return {
      vulnerabilities: [],
      errors: []
    };
  }

  /**
   * Execute dependency scan
   */
  async executeDependencyScan(cpeId) {
    // This would integrate with dependency scanning tools
    // For now, return a mock result
    return {
      vulnerabilities: [],
      errors: []
    };
  }

  /**
   * Execute workflow scan
   */
  async executeWorkflowScan(scan) {
    try {
      const { workflowId } = scan;
      const workflows = await this.getWorkflows();
      const workflow = workflows.workflows.find(w => w.id === workflowId);
      
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      console.log(`Executing workflow: ${workflow.name}`);

      const results = {
        vulnerabilities: [],
        notifications: [],
        errors: []
      };

      // Execute each step in the workflow
      for (const step of workflow.steps) {
        try {
          const stepResult = await this.executeWorkflowStep(step, scan);
          if (stepResult.vulnerabilities) {
            results.vulnerabilities.push(...stepResult.vulnerabilities);
          }
          if (stepResult.notifications) {
            results.notifications.push(...stepResult.notifications);
          }
          if (stepResult.errors) {
            results.errors.push(...stepResult.errors);
          }
        } catch (error) {
          console.error(`Workflow step ${step.name} failed:`, error.message);
          results.errors.push(`${step.name}: ${error.message}`);
        }
      }

      return results;

    } catch (error) {
      console.error('Workflow scan execution failed:', error);
      return {
        vulnerabilities: [],
        notifications: [],
        errors: [error.message]
      };
    }
  }

  /**
   * Execute workflow step
   */
  async executeWorkflowStep(step, scan) {
    switch (step.type) {
      case 'nvd_scan':
        return await this.executeNVDScan({
          ...scan,
          config: step.config
        });
      case 'custom_scan':
        return await this.executeCustomScan({
          ...scan,
          config: step.config
        });
      case 'notification':
        return await this.executeNotificationStep(step, scan);
      default:
        throw new Error(`Unknown workflow step type: ${step.type}`);
    }
  }

  /**
   * Execute notification step
   */
  async executeNotificationStep(step, scan) {
    const { config } = step;
    const { categories = [] } = config;

    const results = {
      vulnerabilities: [],
      notifications: [],
      errors: []
    };

    // Get webhooks for specified categories
    const webhooks = await this.nal.getWebhooks();
    const activeWebhooks = webhooks.webhooks.filter(w => 
      w.isActive && categories.includes(w.category)
    );

    // Send notifications to each webhook
    for (const webhook of activeWebhooks) {
      try {
        // This would send notifications based on scan results
        // For now, just log the action
        console.log(`Sending notification to ${webhook.name} (${webhook.category})`);
        
        results.notifications.push({
          webhookId: webhook.id,
          webhookName: webhook.name,
          success: true,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error(`Failed to send notification to ${webhook.name}:`, error.message);
        results.notifications.push({
          webhookId: webhook.id,
          webhookName: webhook.name,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    return results;
  }

  /**
   * Update scan statistics
   */
  async updateScanStats(status) {
    try {
      const scans = await this.getScans();
      scans.stats.totalScans++;
      
      if (status === 'completed') {
        scans.stats.successfulScans++;
        scans.stats.byStatus.completed++;
      } else if (status === 'failed') {
        scans.stats.failedScans++;
        scans.stats.byStatus.failed++;
      } else if (status === 'running') {
        scans.stats.byStatus.running++;
      }
      
      await fs.writeFile(this.scansFile, JSON.stringify(scans, null, 2));
    } catch (error) {
      console.error('Failed to update scan stats:', error);
    }
  }

  /**
   * Get scan statistics
   */
  async getStats() {
    try {
      const scans = await this.getScans();
      return scans.stats;
    } catch (error) {
      console.error('Failed to get scan stats:', error);
      throw error;
    }
  }

  /**
   * Get recent scans
   */
  async getRecentScans(limit = 50) {
    try {
      const scans = await this.getScans();
      return scans.scans
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to get recent scans:', error);
      throw error;
    }
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(workflowData) {
    try {
      const { name, description, steps } = workflowData;
      
      if (!name || !steps || !Array.isArray(steps)) {
        throw new Error('Name and steps are required');
      }

      const workflows = await this.getWorkflows();
      const newWorkflow = {
        id: Date.now().toString(),
        name,
        description: description || '',
        steps,
        createdAt: new Date().toISOString(),
        isActive: true
      };

      workflows.workflows.push(newWorkflow);
      await fs.writeFile(this.workflowsFile, JSON.stringify(workflows, null, 2));

      console.log(`Workflow created: ${newWorkflow.name} (${newWorkflow.id})`);
      return newWorkflow;
    } catch (error) {
      console.error('Failed to create workflow:', error);
      throw error;
    }
  }

  /**
   * Get workflow templates
   */
  async getWorkflowTemplates() {
    try {
      const workflows = await this.getWorkflows();
      return workflows.templates;
    } catch (error) {
      console.error('Failed to get workflow templates:', error);
      throw error;
    }
  }

  /**
   * Create scan from workflow template
   */
  async createScanFromTemplate(templateId, cpeId, config = {}) {
    try {
      const templates = await this.getWorkflowTemplates();
      const template = templates[templateId];
      
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      const scanData = {
        type: 'workflow',
        cpeId,
        name: `${template.name} for ${cpeId}`,
        description: template.description,
        config: {
          templateId,
          ...config
        }
      };

      return await this.createScan(scanData);
    } catch (error) {
      console.error('Failed to create scan from template:', error);
      throw error;
    }
  }

  /**
   * Schedule a scan
   */
  async scheduleScan(scanId, schedule) {
    try {
      // This would integrate with a job scheduler
      // For now, just log the schedule
      console.log(`Scan ${scanId} scheduled for ${schedule}`);
      return true;
    } catch (error) {
      console.error('Failed to schedule scan:', error);
      throw error;
    }
  }

  /**
   * Cancel a scan
   */
  async cancelScan(scanId) {
    try {
      const scans = await this.getScans();
      const scan = scans.scans.find(s => s.id === scanId);
      
      if (!scan) {
        throw new Error('Scan not found');
      }

      if (scan.status === 'running') {
        scan.status = 'cancelled';
        scan.completedAt = new Date().toISOString();
        await fs.writeFile(this.scansFile, JSON.stringify(scans, null, 2));
        await this.updateScanStats('cancelled');
        console.log(`Scan cancelled: ${scan.name}`);
      }

      return scan;
    } catch (error) {
      console.error('Failed to cancel scan:', error);
      throw error;
    }
  }
}

module.exports = ScanAccessLayer;
