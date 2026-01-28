import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // 1. 引入插件

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // 2. 加入插件列表
  ],
  build: {
    // 確保每次打包都產生不同的檔名 hash
    rollupOptions: {
      output: {
        // 入口檔案
        entryFileNames: 'assets/[name]-[hash].js',
        // chunk 檔案
        chunkFileNames: 'assets/[name]-[hash].js',
        // 資源檔案 (CSS, 圖片等)
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  // 定義建置時間作為版本號
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
})