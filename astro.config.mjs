import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://istone-you.github.io',
  base: '/keiba-db',
  output: 'static',
  trailingSlash: 'always',
  // Fetch the next page on hover/touch so navigation feels instant.
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  build: { inlineStylesheets: 'always' },
});
