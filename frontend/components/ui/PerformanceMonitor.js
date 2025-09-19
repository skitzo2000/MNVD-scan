import { useEffect } from 'react';

const PerformanceMonitor = () => {
  useEffect(() => {
    // Performance monitoring for development
    if (process.env.NODE_ENV === 'development') {
      // Monitor Core Web Vitals
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.log('Performance metric:', entry.name, entry.value);
        }
      });

      observer.observe({ entryTypes: ['measure', 'navigation', 'paint'] });

      // Monitor bundle size
      if (typeof window !== 'undefined' && window.performance) {
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
          console.log('Page load time:', navigation.loadEventEnd - navigation.loadEventStart);
        }
      }

      return () => observer.disconnect();
    }
  }, []);

  return null; // This component doesn't render anything
};

export default PerformanceMonitor;
