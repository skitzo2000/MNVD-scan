#!/bin/bash
# Script to close pull requests that were addressed by PR #95
# 
# This script is provided for your convenience but requires manual execution
# as the GitHub Copilot agent does not have write access to close PRs.
#
# Prerequisites:
# - GitHub CLI (gh) must be installed and authenticated
# - You must have write access to the repository
#
# Usage:
#   bash close-addressed-prs.sh

set -e

REPO="skitzo2000/MNVD-scan"
MERGE_PR="95"

echo "================================"
echo "Closing PRs Addressed by PR #${MERGE_PR}"
echo "================================"
echo ""

# PR #65 - js-yaml update
echo "Closing PR #65 (js-yaml 4.1.0 → 4.1.1)..."
COMMENT_65="Closing as this update (js-yaml 4.1.0 → 4.1.1) was already included in PR #${MERGE_PR}, which consolidated multiple dependency updates and has been merged to main.

Verified: js-yaml is now at version 4.1.1 in frontend/package.json."
gh pr close 65 --repo "$REPO" --comment "$COMMENT_65"

echo "✓ PR #65 closed"
echo ""

# PR #71 - nodemon update  
echo "Closing PR #71 (nodemon 3.1.7 → 3.1.11)..."
COMMENT_71="Closing as this update (nodemon 3.1.7 → 3.1.11) was already included in PR #${MERGE_PR}, which consolidated multiple dependency updates and has been merged to main.

Verified: nodemon is now at version 3.1.11 in backend/package.json."
gh pr close 71 --repo "$REPO" --comment "$COMMENT_71"

echo "✓ PR #71 closed"
echo ""

echo "================================"
echo "Summary"
echo "================================"
echo "Closed PRs: #65, #71"
echo ""
echo "Remaining open PRs (not addressed by PR #${MERGE_PR}):"
echo "  - PR #69: axios update"
echo "  - PR #72: actions/checkout v5 → v6"
echo "  - PR #78: @mui/material 7.3.4 → 7.3.6"
echo "  - PR #79: @mui/icons-material 7.3.4 → 7.3.6"
echo "  - PR #88: react-dom 19.2.0 → 19.2.3"
echo ""
echo "Done!"

exit 0

