const axios = require('axios');

// Shared helpers
function truncateString(str, maxLength, suffix = '...') {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - suffix.length) + suffix;
}

function countSeverities(vulnerabilities) {
  return {
    critical: vulnerabilities.filter(v => v.severity === 'CRITICAL').length,
    high: vulnerabilities.filter(v => v.severity === 'HIGH').length,
    medium: vulnerabilities.filter(v => v.severity === 'MEDIUM').length,
    low: vulnerabilities.filter(v => v.severity === 'LOW').length
  };
}

function logWebhookError(error, context = 'webhook') {
  console.error(`Failed to send ${context} notification:`, error.message);
  if (error.response) {
    console.error(`${context} API error response:`, {
      status: error.response.status,
      statusText: error.response.statusText,
      data: error.response.data
    });
  }
}

// Webhook timeout
const WEBHOOK_TIMEOUT = 10000; // 10 seconds

// Axios instance for webhooks
const webhookClient = axios.create({
  timeout: WEBHOOK_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'MNVD-Scanner/1.0.0'
  }
});

// Send notification to webhook (Discord or Teams)
async function sendNotification(webhookUrl, vulnerability) {
  try {
    const webhookType = detectWebhookType(webhookUrl);
    const payload = createPayload(webhookType, vulnerability);

    const response = await webhookClient.post(webhookUrl, payload);

    if (response.status === 204 || response.status === 200) {
      console.log(`${webhookType} notification sent successfully for ${vulnerability.cveId}`);
      return true;
    }
    console.warn(`${webhookType} webhook returned status ${response.status} for ${vulnerability.cveId}`);
    return false;

  } catch (error) {
    logWebhookError(error, webhookType);
    return false;
  }
}

// Detect webhook type based on URL
function detectWebhookType(webhookUrl) {
  if (webhookUrl.includes('discord.com/api/webhooks/') || webhookUrl.includes('discordapp.com/api/webhooks/')) {
    return 'discord';
  } else if (webhookUrl.includes('webhook.office.com/webhookb2/')) {
    return 'teams';
  } else {
    return 'unknown';
  }
}

// Create payload based on webhook type
function createPayload(webhookType, vulnerability) {
  switch (webhookType) {
    case 'discord':
      return createDiscordPayload(vulnerability);
    case 'teams':
      return createTeamsPayload(vulnerability);
    default:
      throw new Error(`Unsupported webhook type: ${webhookType}`);
  }
}

// Create Discord payload
function createDiscordPayload(vulnerability) {
  const embed = createDiscordEmbed(vulnerability);
  
  return {
    embeds: [embed],
    username: 'NVD Scanner',
    avatar_url: 'https://avatars.githubusercontent.com/u/16651435?s=200&v=4'
  };
}

// Create Microsoft Teams payload
function createTeamsPayload(vulnerability) {
  const { cveId, description, severity, cvssScore, nvdUrl, cpeMatch } = vulnerability;
  
  const color = getSeverityColor(severity);
  const colorHex = `#${color.toString(16).padStart(6, '0')}`;
  
  return {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    "themeColor": colorHex,
    "summary": `New Vulnerability: ${cveId}`,
    "sections": [{
      "activityTitle": `🚨 New Vulnerability Detected: ${cveId}`,
      "activitySubtitle": `Severity: ${severity} (${cvssScore})`,
      "activityImage": "https://nvd.nist.gov/images/nvd-logo.png",
      "text": truncateString(description, 1000),
      "facts": [
        {
          "name": "CPE Match",
          "value": cpeMatch
        },
        {
          "name": "Published",
          "value": new Date().toLocaleDateString()
        }
      ],
      "markdown": true
    }],
    "potentialAction": [{
      "@type": "OpenUri",
      "name": "View in NVD",
      "targets": [{
        "os": "default",
        "uri": nvdUrl
      }]
    }]
  };
}

// Create Discord embed
function createDiscordEmbed(vulnerability) {
  const { cveId, description, severity, cvssScore, nvdUrl, cpeMatch } = vulnerability;

  const color = getSeverityColor(severity);
  const truncatedDescription = truncateString(description, 500);

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
      return await sendNotification(webhookUrl, vulnerabilities[0]);
    }

    const webhookType = detectWebhookType(webhookUrl);
    const payload = createBatchPayload(webhookType, vulnerabilities, cpeId);

    const response = await webhookClient.post(webhookUrl, payload);

    if (response.status === 204 || response.status === 200) {
      console.log(`Batch ${webhookType} notification sent for ${vulnerabilities.length} vulnerabilities`);
      return true;
    }
    console.warn(`Batch ${webhookType} webhook returned status ${response.status}`);
    return false;

  } catch (error) {
    console.error(`Failed to send batch notification:`, error.message);
    return false;
  }
}

// Create batch payload based on webhook type
function createBatchPayload(webhookType, vulnerabilities, cpeId) {
  switch (webhookType) {
    case 'discord':
      return createDiscordBatchPayload(vulnerabilities, cpeId);
    case 'teams':
      return createTeamsBatchPayload(vulnerabilities, cpeId);
    default:
      throw new Error(`Unsupported webhook type: ${webhookType}`);
  }
}

// Create Discord batch payload
function createDiscordBatchPayload(vulnerabilities, cpeId) {
  const embed = createDiscordBatchEmbed(vulnerabilities, cpeId);
  
  return {
    embeds: [embed],
    username: 'NVD Scanner',
    avatar_url: 'https://avatars.githubusercontent.com/u/16651435?s=200&v=4'
  };
}

// Create Microsoft Teams batch payload
function createTeamsBatchPayload(vulnerabilities, cpeId) {
  const counts = countSeverities(vulnerabilities);

  const description = vulnerabilities
    .slice(0, 5)
    .map(v => `• [${v.cveId}](${v.nvdUrl}) - ${v.severity}`)
    .join('\n');

  const remainingCount = Math.max(0, vulnerabilities.length - 5);
  const remainingText = remainingCount > 0 ? `\n... and ${remainingCount} more` : '';

  return {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    "themeColor": "#FF6600",
    "summary": `Multiple Vulnerabilities Detected`,
    "sections": [{
      "activityTitle": "🚨 Multiple Vulnerabilities Detected",
      "activitySubtitle": `CPE: ${cpeId}`,
      "activityImage": "https://nvd.nist.gov/images/nvd-logo.png",
      "text": `${description}${remainingText}`,
      "facts": [
        {
          "name": "CPE Match",
          "value": cpeId
        },
        {
          "name": "Summary",
          "value": `Critical: ${counts.critical} | High: ${counts.high} | Medium: ${counts.medium} | Low: ${counts.low}`
        },
        {
          "name": "Total Found",
          "value": `${vulnerabilities.length}`
        }
      ],
      "markdown": true
    }]
  };
}

// Create Discord batch embed
function createDiscordBatchEmbed(vulnerabilities, cpeId) {
  const counts = countSeverities(vulnerabilities);

  const description = vulnerabilities
    .slice(0, 5)
    .map(v => `• [${v.cveId}](${v.nvdUrl}) - ${v.severity}`)
    .join('\n');

  const remainingCount = Math.max(0, vulnerabilities.length - 5);
  const remainingText = remainingCount > 0 ? `\n... and ${remainingCount} more` : '';

  return {
    title: `🚨 Multiple Vulnerabilities Detected`,
    description: `${description}${remainingText}`,
    color: 0xFF6600,
    fields: [
      {
        name: 'CPE Match',
        value: `\`${cpeId}\``,
        inline: true
      },
      {
        name: 'Summary',
        value: `Critical: ${counts.critical} | High: ${counts.high} | Medium: ${counts.medium} | Low: ${counts.low}`,
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

// Validate webhook URL format
function isValidWebhookUrl(url) {
  try {
    // Discord webhook URLs
    const discordRegex = /^https:\/\/discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/;
    
    // Microsoft Teams webhook URLs (more flexible pattern)
    const teamsRegex = /^https:\/\/[^\/]+\.webhook\.office\.com\/webhookb2\/[^\/]+\/IncomingWebhook\/[^\/]+\/[^\/]+$/;
    
    // For testing, also allow localhost URLs
    const localhostRegex = /^https?:\/\/localhost(:\d+)?\/.*$/;
    
    return discordRegex.test(url) || teamsRegex.test(url) || localhostRegex.test(url);
  } catch {
    return false;
  }
}

module.exports = {
  sendNotification,
  sendBatchNotification,
  isValidWebhookUrl,
  detectWebhookType
};
