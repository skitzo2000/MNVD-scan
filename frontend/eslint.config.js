import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'build/**',
      'dist/**',
      '**/.next/**',
      '**/node_modules/**',
      '**/*.d.ts',
      '**/.next/types/**',
      '**/.next/static/**',
      '**/.next/standalone/**'
    ]
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        queueMicrotask: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        FormData: 'readonly',
        Blob: 'readonly',
        FileReader: 'readonly',
        XMLHttpRequest: 'readonly',
        PerformanceObserver: 'readonly',
        performance: 'readonly',
        self: 'readonly',
        location: 'readonly',
        navigator: 'readonly',
        matchMedia: 'readonly',
        HTMLElement: 'readonly',
        ActiveXObject: 'readonly',
        Bun: 'readonly',
        Deno: 'readonly',
        reportError: 'readonly',
        MessageChannel: 'readonly',
        global: 'readonly',
        // React/Next.js globals
        React: 'readonly',
        __REACT_DEVTOOLS_GLOBAL_HOOK__: 'readonly',
        _N_E: 'readonly',
        __nccwpck_require__: 'readonly',
        // Node.js globals
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly'
      }
    },
    plugins: {
      react,
      'react-hooks': reactHooks
    },
    settings: {
      react: {
        version: 'detect'
      }
    },
    rules: {
      'no-unused-vars': 'error',
      'no-console': 'off',
      'prefer-const': 'error',
      'no-undef': 'error',
      'no-prototype-builtins': 'error',
      'no-empty': 'error',
      'no-fallthrough': 'error',
      'no-useless-catch': 'error',
      'no-self-assign': 'error',
      'no-cond-assign': 'error',
      'no-control-regex': 'error',
      'no-redeclare': 'error',
      'no-func-assign': 'error',
      'no-case-declarations': 'error',
      'no-useless-escape': 'error',
      // React-specific rules
      'react/jsx-uses-react': 'off', // React 17+ doesn't need React import
      'react/react-in-jsx-scope': 'off', // React 17+ doesn't need React import
      'react/jsx-uses-vars': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn'
    }
  }
];
