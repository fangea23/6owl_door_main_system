/**
 * 產生 version.json 檔案
 * 每次建置時執行，確保版本號與前端一致
 */
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const version = new Date().toISOString();

const versionInfo = {
  version,
  buildTime: version,
  timestamp: Date.now(),
};

// 寫入到 public 目錄，這樣會被複製到 dist
const outputPath = resolve(__dirname, '../public/version.json');
writeFileSync(outputPath, JSON.stringify(versionInfo, null, 2));

console.log(`[Version] Generated version.json: ${version}`);
