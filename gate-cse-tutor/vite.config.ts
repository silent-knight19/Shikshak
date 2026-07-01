import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'shikshak-logo.png',
        'icons/shikshak-logo-*.png',
        'icons.svg',
        'favicon.svg',
      ],
      manifest: false,
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: [
          '**/assets/mermaid-*.js',
          '**/assets/shiki-*.js',
          '**/assets/recharts-*.js',
          '**/assets/katex-*.js',
          '**/assets/cpp-*.js',
          '**/assets/javascript-*.js',
          '**/assets/typescript-*.js',
          '**/assets/tsx-*.js',
          '**/assets/jsx-*.js',
          '**/assets/markdown-*.js',
          '**/assets/firebase-*.js',
          '**/assets/wolfram-*.js',
          '**/assets/python-*.js',
        ],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/identitytoolkit\.googleapis\.com\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^\/api\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  build: {
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/mermaid')) {
            return 'mermaid';
          }
          if (id.includes('node_modules/katex')) {
            return 'katex';
          }
          if (id.includes('node_modules/recharts')) {
            return 'recharts';
          }
          if (id.includes('node_modules/react-shiki') || id.includes('node_modules/shiki')) {
            return 'shiki';
          }
          if (id.includes('node_modules/react-markdown') || id.includes('node_modules/remark-') || id.includes('node_modules/rehype-') || id.includes('node_modules/mdast-') || id.includes('node_modules/unist-') || id.includes('node_modules/unified') || id.includes('node_modules/trim-') || id.includes('node_modules/vfile') || id.includes('node_modules/bail') || id.includes('node_modules/trough') || id.includes('node_modules/property-') || id.includes('node_modules/hast-') || id.includes('node_modules/html-') || id.includes('node_modules/ccount') || id.includes('node_modules/comma-') || id.includes('node_modules/fault') || id.includes('node_modules/parse-') || id.includes('node_modules/space-') || id.includes('node_modules/stringi') || id.includes('node_modules/micromark') || id.includes('node_modules/decode-')) {
            return 'markdown';
          }
          if (id.includes('node_modules/firebase')) {
            return 'firebase';
          }
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
