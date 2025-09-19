# MNVD Frontend - Next.js Application

## 🚀 Overview

Modern Next.js 14.2.0 frontend for the MNVD (Monitor National Vulnerability Database) application with optimized performance, security, and Docker support.

## ✨ Features

- **Next.js 14.2.0** with App Router and Server Components
- **Material-UI 5** with SSR compatibility
- **SWR** for intelligent data fetching and caching
- **Rootless Docker** support for security
- **Performance Optimized** with code splitting and bundle analysis
- **Security Headers** and vulnerability-free dependencies

## 🏗️ Architecture

### Component Structure
```
components/
├── layout/           # Layout components (Header, Footer, Layout)
├── ui/              # UI components (Cards, Lists, Dialogs)
├── forms/           # Form components
└── hooks/           # Custom React hooks with SWR

pages/
├── api/            # Next.js API routes (proxy to backend)
├── _app.js         # App configuration with Material-UI theme
├── _document.js    # HTML document structure
└── index.js        # Main page

lib/
└── swr-config.js   # SWR configuration and utilities
```

### Key Components
- **Layout**: Responsive layout with header, footer, and main content
- **StatsCards**: Dashboard statistics display
- **QueryCard/QueryList**: Vulnerability query management
- **CVEDetailsDialog**: CVE information display
- **PerformanceMonitor**: Development performance tracking

## 🚀 Getting Started

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run analyze      # Analyze bundle size
```

### Docker Development
```bash
docker-compose up frontend
```

## 🔧 Configuration

### Environment Variables
- `NODE_ENV`: Environment (development/production)
- `BACKEND_URL`: Backend API URL (default: http://backend:3000)

### Next.js Configuration
- **Standalone Output**: Optimized for Docker deployment
- **Security Headers**: X-Frame-Options, X-Content-Type-Options
- **Performance**: SWC minification, code splitting
- **Bundle Analysis**: Built-in bundle size monitoring

## 📊 Performance Features

### SWR Data Fetching
- **Intelligent Caching**: Automatic background updates
- **Error Handling**: Retry logic and error boundaries
- **Deduplication**: Prevents duplicate requests
- **Optimistic Updates**: Immediate UI feedback

### Bundle Optimization
- **Code Splitting**: Automatic route-based splitting
- **Tree Shaking**: Unused code elimination
- **Image Optimization**: Next.js image optimization
- **Bundle Analysis**: `npm run analyze` for size monitoring

## 🐳 Docker Support

### Rootless Docker
- **Non-root User**: Runs as `nextjs:nodejs` (UID 1001)
- **Security**: No root privileges required
- **Compatibility**: Works with rootless Docker environments

### Multi-stage Build
- **Dependencies**: Separate layer for npm packages
- **Build**: Optimized Next.js build process
- **Runtime**: Minimal production image with standalone output

## 🔒 Security

### Dependencies
- **0 Vulnerabilities**: Clean security audit
- **Modern Stack**: Latest stable versions
- **No Legacy**: Removed react-scripts vulnerabilities

### Headers
- **X-Frame-Options**: DENY
- **X-Content-Type-Options**: nosniff
- **Referrer-Policy**: origin-when-cross-origin

## 📈 Monitoring

### Performance Metrics
- **Core Web Vitals**: Automatic monitoring in development
- **Bundle Size**: Real-time analysis with `npm run analyze`
- **SWR Metrics**: Request deduplication and caching stats

### Development Tools
- **ESLint**: Code quality and consistency
- **Performance Monitor**: Development-only performance tracking
- **Hot Reload**: Fast development iteration

## 🧹 Cleanup

### Removed Files
- ❌ `build/` - Old CRA build artifacts
- ❌ `src/index.js` - Old CRA entry point
- ❌ `public/index.html` - Old CRA template
- ❌ `public/manifest.json` - Old CRA manifest

### Benefits
- **Smaller Repository**: ~500KB+ reduction
- **Faster Builds**: Cleaner Docker context
- **Less Confusion**: Clear separation of old vs new

## 🚀 Migration Benefits

### Performance
- **Faster Builds**: Next.js optimizations vs CRA
- **Better Caching**: SWR intelligent data management
- **Code Splitting**: Automatic route-based optimization

### Security
- **0 Vulnerabilities**: Eliminated react-scripts issues
- **Modern Dependencies**: Latest stable versions
- **Security Headers**: Built-in protection

### Developer Experience
- **Hot Reload**: Faster development
- **Type Safety**: Better error catching
- **Modern Tooling**: Latest development tools

## 📝 Scripts

```bash
npm run dev              # Development server
npm run build            # Production build
npm run start            # Production server
npm run lint             # ESLint check
npm run lint:fix         # ESLint fix
npm run analyze          # Bundle analysis
npm run build:production # Production build with optimizations
npm run clean            # Clean build artifacts
```

## 🔗 Integration

### Backend API
- **Proxy Routes**: `/api/*` routes proxy to backend
- **Environment**: Automatic backend URL detection
- **Error Handling**: Graceful fallbacks

### Docker Compose
- **Development**: `docker-compose up`
- **Production**: `docker-compose -f docker-compose.production.yml up`
- **Health Checks**: Automatic service monitoring
