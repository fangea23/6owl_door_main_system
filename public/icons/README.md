# PWA 圖標生成指南

此目錄用於存放 PWA (Progressive Web App) 所需的各種尺寸圖標。

## 需要的圖標尺寸

根據 `manifest.json` 的設定，需要以下尺寸的圖標：

- **72x72** - 小型圖標
- **96x96** - Android 圖標
- **128x128** - Chrome Web Store
- **144x144** - Microsoft Tile
- **152x152** - iOS 圖標
- **192x192** - Android 啟動畫面（推薦）
- **384x384** - Android 啟動畫面
- **512x512** - Android 啟動畫面（推薦）

## 快速生成方法

### 方法 1: 使用在線工具（推薦）

1. 訪問 [PWA Icon Generator](https://www.pwabuilder.com/imageGenerator)
2. 上傳您的 logo 圖片（建議 512x512 以上）
3. 下載生成的圖標包
4. 將所有圖標複製到此目錄

### 方法 2: 使用 ImageMagick（命令行）

如果您已安裝 ImageMagick，可以使用以下命令從源圖片生成所有尺寸：

```bash
# 假設您的源圖片是 logo.png（建議至少 1024x1024）
SOURCE="logo.png"

convert $SOURCE -resize 72x72 icon-72x72.png
convert $SOURCE -resize 96x96 icon-96x96.png
convert $SOURCE -resize 128x128 icon-128x128.png
convert $SOURCE -resize 144x144 icon-144x144.png
convert $SOURCE -resize 152x152 icon-152x152.png
convert $SOURCE -resize 192x192 icon-192x192.png
convert $SOURCE -resize 384x384 icon-384x384.png
convert $SOURCE -resize 512x512 icon-512x512.png
```

### 方法 3: 使用 Node.js 腳本

安裝 `sharp` 套件後，可以使用此腳本：

```bash
npm install sharp
node generate-icons.js
```

## 暫時解決方案

如果您還沒有準備好所有圖標，可以暫時使用以下方法：

1. 將現有的 logo 圖片複製為所有需要的尺寸名稱
2. 瀏覽器會自動調整圖片大小（但可能影響質量）

```bash
# 使用現有 logo 作為臨時圖標
cp ../assets/logo.png icon-72x72.png
cp ../assets/logo.png icon-96x96.png
cp ../assets/logo.png icon-128x128.png
cp ../assets/logo.png icon-144x144.png
cp ../assets/logo.png icon-152x152.png
cp ../assets/logo.png icon-192x192.png
cp ../assets/logo.png icon-384x384.png
cp ../assets/logo.png icon-512x512.png
```

## 設計建議

- **安全區域**: 為了適應不同平台的遮罩，重要內容應保持在中心 80% 的區域
- **背景**: 建議使用與品牌色相符的純色背景
- **簡潔**: 圖標應該簡潔清晰，在小尺寸下也能識別
- **顏色**: 使用與 manifest.json 中 `theme_color` 一致的顏色方案

## 測試

生成圖標後，在瀏覽器中測試：

1. 打開 Chrome DevTools
2. 前往 Application > Manifest
3. 檢查所有圖標是否正確顯示

## 目前狀態

⚠️ **需要生成圖標** - 請使用上述方法之一生成所需的 PWA 圖標。
