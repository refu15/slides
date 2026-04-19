import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

export default defineConfig(({ mode }) => ({
  plugins: [preact()],
  build: {
    outDir: 'dist',
    lib: {
      entry: 'src/main.tsx',
      name: 'GLineChatbot',
      formats: ['iife'],
      fileName: () => 'widget.js',
    },
    minify: 'terser',
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        assetFileNames: (info) => {
          if (info.name?.endsWith('.css')) return 'widget.css'
          return 'assets/[name][extname]'
        },
      },
    },
  },
  define: {
    __API_URL__: JSON.stringify(
      mode === 'production'
        ? 'https://gline-chatbot-api.example.workers.dev'
        : 'http://localhost:8787'
    ),
  },
  server: {
    port: 5173,
  },
}))
