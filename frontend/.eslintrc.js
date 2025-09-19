module.exports = {
  extends: [
    'next/core-web-vitals',
    'next/typescript'
  ],
  rules: {
    // Add any custom rules here
    'react/no-unescaped-entities': 'off',
    '@next/next/no-page-custom-font': 'off'
  }
}
