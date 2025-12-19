const axios = require('axios');

// Discord webhook timeout
const WEBHOOK_TIMEOUT = 10000; // 10 seconds

// Axios instance for Discord webhooks
const discordClient = axios.create({
  timeout: WEBHOOK_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'MNVD-Scanner/1.0.0'
  }
});

// Send notification to Discord webhook
async function sendNotification(webhookUrl, vulnerability) {
  try {
    const embed = createVulnerabilityEmbed(vulnerability);

    const payload = {
      embeds: [embed],
      username: 'NVD Scanner',
      avatar_url: 'https://avatars.githubusercontent.com/u/16651435?s=200&v=4' // NVD logo
    };

    const response = await discordClient.post(webhookUrl, payload);

    if (response.status === 204) {
      console.log(`Discord notification sent successfully for ${vulnerability.cveId}`);
      return true;
    } else {
      console.warn(`Discord webhook returned status ${response.status} for ${vulnerability.cveId}`);
      return false;
    }

  } catch (error) {
    console.error(`Failed to send Discord notification for ${vulnerability.cveId}:`, error.message);

    if (error.response) {
      console.error('Discord API error response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }

    return false;
  }
}

// Create Discord embed for vulnerability
function createVulnerabilityEmbed(vulnerability) {
  const { cveId, description, severity, cvssScore, nvdUrl, cpeMatch } = vulnerability;

  // Color based on severity
  const color = getSeverityColor(severity);

  // Truncate description if too long
  const truncatedDescription = description.length > 500
    ? description.substring(0, 497) + '...'
    : description;

  return {
    title: `🚨 New Vulnerability Detected: ${cveId}`,
    description: truncatedDescription,
    url: nvdUrl,
    color: color,
    fields: [
      {
        name: 'Severity',
        value: `**${severity}** (${cvssScore})`,
        inline: true
      },
      {
        name: 'CPE Match',
        value: `\`${cpeMatch}\``,
        inline: true
      },
      {
        name: 'Published',
        value: new Date().toLocaleDateString(),
        inline: true
      }
    ],
    footer: {
      text: 'NVD Scanner | National Vulnerability Database',
      icon_url: 'https://nvd.nist.gov/images/nvd-logo.png'
    },
    timestamp: new Date().toISOString()
  };
}

// Get color based on CVSS severity
function getSeverityColor(severity) {
  switch (severity.toUpperCase()) {
    case 'CRITICAL':
      return 0xFF0000; // Red
    case 'HIGH':
      return 0xFF6600; // Orange
    case 'MEDIUM':
      return 0xFFFF00; // Yellow
    case 'LOW':
      return 0x00FF00; // Green
    default:
      return 0x808080; // Gray
  }
}

// Send batch notification for multiple vulnerabilities
async function sendBatchNotification(webhookUrl, vulnerabilities, cpeId) {
  try {
    if (vulnerabilities.length === 0) {
      return true;
    }

    if (vulnerabilities.length === 1) {
      // Single vulnerability - send normal embed
      return await sendNotification(webhookUrl, vulnerabilities[0]);
    }

    // Multiple vulnerabilities - send summary embed
    const summaryEmbed = createBatchEmbed(vulnerabilities, cpeId);

    const payload = {
      embeds: [summaryEmbed],
      username: 'NVD Scanner',
      avatar_url: 'https://avatars.githubusercontent.com/u/16651435?s=200&v=4'
    };

    const response = await discordClient.post(webhookUrl, payload);

    if (response.status === 204) {
      console.log(`Batch Discord notification sent for ${vulnerabilities.length} vulnerabilities`);
      return true;
    } else {
      console.warn(`Batch Discord webhook returned status ${response.status}`);
      return false;
    }

  } catch (error) {
    console.error(`Failed to send batch Discord notification:`, error.message);
    return false;
  }
}

// Create embed for batch notifications
function createBatchEmbed(vulnerabilities, cpeId) {
  const criticalCount = vulnerabilities.filter(v => v.severity === 'CRITICAL').length;
  const highCount = vulnerabilities.filter(v => v.severity === 'HIGH').length;
  const mediumCount = vulnerabilities.filter(v => v.severity === 'MEDIUM').length;
  const lowCount = vulnerabilities.filter(v => v.severity === 'LOW').length;

  const description = vulnerabilities
    .slice(0, 5) // Show first 5
    .map(v => `• [${v.cveId}](${v.nvdUrl}) - ${v.severity}`)
    .join('\n');

  const remainingCount = Math.max(0, vulnerabilities.length - 5);
  const remainingText = remainingCount > 0 ? `\n... and ${remainingCount} more` : '';

  return {
    title: `🚨 Multiple Vulnerabilities Detected`,
    description: `${description}${remainingText}`,
    color: 0xFF6600, // Orange for batch notifications
    fields: [
      {
        name: 'CPE Match',
        value: `\`${cpeId}\``,
        inline: true
      },
      {
        name: 'Summary',
        value: `Critical: ${criticalCount} | High: ${highCount} | Medium: ${mediumCount} | Low: ${lowCount}`,
        inline: true
      },
      {
        name: 'Total Found',
        value: `${vulnerabilities.length}`,
        inline: true
      }
    ],
    footer: {
      text: 'NVD Scanner | National Vulnerability Database',
      icon_url: 'https://nvd.nist.gov/images/nvd-logo.png'
    },
    timestamp: new Date().toISOString()
  };
}

// Validate Discord webhook URL format
function isValidWebhookUrl(url) {
  try {
    const webhookRegex = /^https:\/\/discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/;
    return webhookRegex.test(url);
  } catch {
    return false;
  }
}

module.exports = {
  sendNotification,
  sendBatchNotification,
  isValidWebhookUrl
};
