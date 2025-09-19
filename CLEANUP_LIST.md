# Cleanup List - Obsolete Files to Delete

## 🗑️ Files to Delete (Obsolete CRA Components)

### 1. Old CRA Build Output (No longer needed with Next.js)
- `frontend/build/` - Entire directory
  - `frontend/build/asset-manifest.json`
  - `frontend/build/index.html`
  - `frontend/build/manifest.json`
  - `frontend/build/static/` - Entire directory
    - `frontend/build/static/js/main.56fda411.js`
    - `frontend/build/static/js/main.56fda411.js.LICENSE.txt`
    - `frontend/build/static/js/main.56fda411.js.map`

### 2. Old CRA Entry Point (Replaced by Next.js pages)
- `frontend/src/index.js` - Old CRA entry point

### 3. Old CRA Public Files (Replaced by Next.js public)
- `frontend/public/index.html` - Old CRA template
- `frontend/public/manifest.json` - Old CRA manifest

### 4. Empty Directories
- `frontend/src/components/` - Empty directory (components moved to root components/)

## ✅ Files to Keep (Next.js Structure)

### Core Next.js Files
- `frontend/pages/` - Next.js pages directory
- `frontend/components/` - New modular components
- `frontend/lib/` - Utility libraries
- `frontend/src/App.js` - Main app component (used by pages/index.js)

### Configuration Files
- `frontend/next.config.js` - Next.js configuration
- `frontend/package.json` - Updated dependencies
- `frontend/Dockerfile` - Optimized for Next.js
- `frontend/.dockerignore` - Docker optimization

### Public Assets
- `frontend/public/favicon.svg` - Keep favicon
- `frontend/env.example` - Environment template

## 📊 Cleanup Benefits

### Size Reduction
- Remove ~500KB+ of old build artifacts
- Eliminate duplicate files
- Cleaner directory structure

### Performance Benefits
- Faster Docker builds (smaller context)
- Reduced confusion between old/new files
- Cleaner development experience

### Maintenance Benefits
- Clear separation of old vs new
- Easier to understand project structure
- Reduced risk of using wrong files
