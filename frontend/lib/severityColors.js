/**
 * Shared severity color utilities for consistent styling across components.
 */

const SEVERITY_TEXT_COLORS = {
  critical: '#d32f2f',
  high: '#d32f2f',
  medium: '#f57c00',
  low: '#1976d2',
};

const SEVERITY_BG_COLORS = {
  critical: '#ffebee',
  high: '#ffebee',
  medium: '#fff3e0',
  low: '#e3f2fd',
};

const SEVERITY_BORDER_COLORS = {
  critical: '#d32f2f',
  high: '#d32f2f',
  medium: '#f57c00',
  low: '#1976d2',
};

export function getSeverityTextColor(severity) {
  return SEVERITY_TEXT_COLORS[severity?.toLowerCase()] || '#666';
}

export function getSeverityBgColor(severity) {
  return SEVERITY_BG_COLORS[severity?.toLowerCase()] || 'transparent';
}

export function getCardSeverityStyle(query) {
  if (query.criticalHighCount > 0) {
    return { borderLeft: `4px solid ${SEVERITY_BORDER_COLORS.critical}`, backgroundColor: SEVERITY_BG_COLORS.critical };
  }
  if (query.mediumCount > 0) {
    return { borderLeft: `4px solid ${SEVERITY_BORDER_COLORS.medium}`, backgroundColor: SEVERITY_BG_COLORS.medium };
  }
  if (query.lowCount > 0) {
    return { borderLeft: `4px solid ${SEVERITY_BORDER_COLORS.low}`, backgroundColor: SEVERITY_BG_COLORS.low };
  }
  return {};
}
