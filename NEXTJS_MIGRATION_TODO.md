# Next.js Migration Todo List

## Key Priorities:
- ✅ **Better Performance** - Next.js optimizations, code splitting, faster builds
- ✅ **Rootless Docker Compatibility** - Ensure all Docker configs work with rootless Docker
- ✅ **Security** - Eliminate react-scripts vulnerabilities
- ❌ **SEO** - Not a priority for internal services

## Migration Plan:

### Phase 1: Project Setup & Rootless Docker Compatibility
1. **Initialize Next.js project structure and configuration with rootless Docker compatibility**
   - Create Next.js app structure
   - Configure next.config.js for Docker builds
   - Set up environment variables for Docker
   - Ensure no root user requirements

2. **Replace react-scripts with Next.js dependencies (eliminate security vulnerabilities)**
   - Remove react-scripts and vulnerable dependencies
   - Add Next.js, @next packages
   - Update package.json scripts
   - Remove CRA-specific configurations

### Phase 2: Component Migration & Performance
3. **Migrate React components from CRA to Next.js structure**
   - Move components to `/components` directory
   - Convert App.js to Next.js page structure
   - Update component imports and exports

4. **Update Material-UI theming and styling for Next.js compatibility**
   - Migrate from CRA Material-UI setup to Next.js
   - Update theme provider configuration
   - Handle SSR styling issues

5. **Replace useEffect/axios with Next.js data fetching methods for better performance**
   - Convert API calls to Next.js patterns
   - Implement getServerSideProps for real-time data
   - Use SWR for client-side caching and performance
   - Optimize API calls

### Phase 3: Build & Rootless Docker Optimization
6. **Update Dockerfile and build process for Next.js with rootless Docker support**
   - Modify frontend Dockerfile for Next.js
   - Ensure no root user requirements
   - Optimize Docker image size
   - Handle Next.js static file serving

7. **Update docker-compose files for Next.js frontend with rootless Docker compatibility**
   - Modify docker-compose.yml
   - Update docker-compose.production.yml
   - Handle Next.js port configuration
   - Update health checks for rootless Docker

### Phase 4: Performance & Security
8. **Optimize Next.js build for better performance (code splitting, image optimization)**
   - Configure code splitting
   - Optimize bundle size
   - Implement image optimization
   - Configure caching strategies

9. **Test all functionality after migration**
   - Verify all components render correctly
   - Test API integration
   - Verify Material-UI theming
   - Test responsive design
   - Verify build process

10. **Run security audit on new Next.js setup**
    - Run npm audit on new dependencies
    - Verify no security vulnerabilities
    - Test production build

## Key Benefits After Migration:
- ✅ **Performance**: Next.js optimizations, code splitting, faster builds
- ✅ **Security**: Eliminate react-scripts vulnerabilities
- ✅ **Rootless Docker**: Full compatibility with rootless Docker environments
- ✅ **Modern Build System**: Better development experience
- ✅ **Internal Service Focus**: Optimized for internal tooling, not public SEO

## Current Status:
- Branch: `nextjs` (created)
- Ready to begin Phase 1
