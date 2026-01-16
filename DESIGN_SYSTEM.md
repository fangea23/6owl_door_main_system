# 六扇門企業服務入口 - 統一設計系統

## 🎨 設計理念

六扇門企業服務入口採用現代、專業且溫暖的設計語言，以紅色為品牌主色，搭配石色（Stone）作為中性背景，營造出專業但不失親和力的企業形象。

---

## 📐 色彩系統

### 主要色彩 (Primary Colors)

#### 紅色系 - 品牌主色
```css
red-500: #ef4444  /* 主要強調色 */
red-600: #dc2626  /* 主要按鈕、連結 */
red-700: #b91c1c  /* 深色強調、hover */
red-800: #991b1b  /* 更深的強調 */
red-900: #7f1d1d  /* 最深的紅色，用於背景 */
```

**使用場景：**
- 主要按鈕 (CTA)
- 導航選中狀態
- 重要圖示和強調
- 漸層背景的主要色

#### 琥珀色系 - 輔助強調色
```css
amber-300: #fcd34d  /* 淡黃強調 */
amber-500: #f59e0b  /* 主要琥珀色 */
amber-600: #d97706  /* 較深的琥珀色 */
```

**使用場景：**
- 漸層的第二色 (from-red-600 to-amber-500)
- 特殊標籤和徽章
- 裝飾性元素
- 光暈效果

### 中性色彩 (Neutral Colors)

#### 石色系 - 主要中性色
```css
stone-50:  #fafaf9  /* 頁面背景 */
stone-100: #f5f5f4  /* 卡片淡背景 */
stone-200: #e7e5e4  /* 邊框、分隔線 */
stone-300: #d6d3d1  /* 較深邊框 */
stone-400: #a8a29e  /* 禁用狀態 */
stone-500: #78716c  /* 次要文字 */
stone-600: #57534e  /* 正文文字 */
stone-700: #44403c  /* 主要文字 */
stone-800: #292524  /* 標題文字 */
```

**使用場景：**
- 頁面背景: stone-50
- 卡片背景: white 或 stone-100
- 邊框: stone-200
- 正文: stone-600 ~ stone-700
- 標題: stone-800

### 狀態色彩 (State Colors)

```css
/* 成功 */
green-500: #22c55e
green-600: #16a34a

/* 警告 */
yellow-500: #eab308
amber-500: #f59e0b

/* 錯誤 */
red-500: #ef4444
red-600: #dc2626

/* 資訊 */
blue-500: #3b82f6
blue-600: #2563eb
```

---

## 🔘 按鈕樣式

### 主要按鈕 (Primary Button)
```jsx
className="
  px-4 sm:px-5 py-2.5 sm:py-3
  bg-gradient-to-r from-red-600 to-red-700
  hover:from-red-700 hover:to-red-800
  active:from-red-800 active:to-red-900
  text-white font-bold
  rounded-xl
  shadow-lg shadow-red-500/20
  hover:shadow-xl hover:shadow-red-500/30
  active:shadow-md
  transition-all duration-300
  touch-manipulation
"
```

### 次要按鈕 (Secondary Button)
```jsx
className="
  px-4 sm:px-5 py-2.5 sm:py-3
  bg-white border border-stone-200
  hover:border-red-300 hover:bg-red-50
  active:border-red-400 active:bg-red-100
  text-stone-700
  font-semibold
  rounded-xl
  shadow-sm
  hover:shadow-md
  transition-all duration-300
  touch-manipulation
"
```

### 文字按鈕 (Text Button)
```jsx
className="
  text-red-600
  hover:text-red-700
  active:text-red-800
  font-medium
  underline decoration-2 underline-offset-4
  transition-colors
"
```

---

## 📦 卡片樣式

### 標準卡片
```jsx
className="
  bg-white
  border border-stone-200
  rounded-xl sm:rounded-2xl
  shadow-sm
  hover:shadow-lg hover:shadow-stone-200/50
  hover:-translate-y-1
  transition-all duration-300
  p-4 sm:p-6
"
```

### 強調卡片 (Featured Card)
```jsx
className="
  bg-gradient-to-br from-red-600 to-red-800
  rounded-xl sm:rounded-2xl
  shadow-xl shadow-red-500/20
  text-white
  p-6 sm:p-8
  relative overflow-hidden
"
```

### 空狀態卡片
```jsx
className="
  bg-white/50
  border-2 border-dashed border-red-100
  rounded-xl sm:rounded-2xl
  text-center
  py-12 sm:py-16
  px-4
"
```

---

## 📝 輸入框樣式

### 標準輸入框
```jsx
className="
  w-full
  px-3 sm:px-4
  py-2.5 sm:py-3
  text-sm sm:text-base
  border border-stone-200
  rounded-lg sm:rounded-xl
  bg-stone-50
  focus:outline-none
  focus:bg-white
  focus:ring-2 focus:ring-red-500/20
  focus:border-red-500
  hover:border-stone-300
  transition-all
"
```

### 輸入框標籤
```jsx
className="
  block
  text-xs sm:text-sm
  font-semibold
  text-stone-700
  mb-1.5 sm:mb-2
"
```

---

## 🎭 圖示與裝飾

### 圖示尺寸
```css
/* 超小 */
w-4 h-4 (16px)

/* 小 */
w-5 h-5 (20px)

/* 中 */
w-6 h-6 (24px)

/* 大 */
w-8 h-8 (32px)

/* 超大 */
w-10 h-10 (40px)
w-12 h-12 (48px)
```

### 漸層背景常用組合
```jsx
/* 主要品牌漸層 */
bg-gradient-to-br from-red-600 to-red-800

/* 暖色漸層 */
bg-gradient-to-r from-red-600 to-amber-500

/* 深色背景漸層 */
bg-gradient-to-r from-red-900 via-red-800 to-rose-900

/* 淡色背景漸層 */
bg-gradient-to-r from-red-50 to-amber-50
```

### 陰影系統
```jsx
/* 小陰影 */
shadow-sm

/* 標準陰影 */
shadow-lg shadow-stone-200/50

/* 紅色發光陰影 */
shadow-lg shadow-red-500/20
shadow-xl shadow-red-500/30

/* 深色陰影 */
shadow-2xl shadow-stone-900/20
```

---

## 📏 間距系統

### 響應式間距模式
```jsx
/* 小間距 */
gap-2 sm:gap-3       /* 8px -> 12px */
p-3 sm:p-4           /* 12px -> 16px */

/* 標準間距 */
gap-4 sm:gap-5       /* 16px -> 20px */
p-4 sm:p-6           /* 16px -> 24px */

/* 大間距 */
gap-5 sm:gap-6       /* 20px -> 24px */
p-6 sm:p-8           /* 24px -> 32px */

/* 超大間距 */
mb-10 sm:mb-12       /* 40px -> 48px */
```

### 圓角系統
```css
rounded-lg          /* 8px */
rounded-xl          /* 12px */
rounded-2xl         /* 16px */
rounded-3xl         /* 24px */

/* 響應式圓角 */
rounded-xl sm:rounded-2xl   /* 12px -> 16px */
```

---

## 📱 響應式斷點

```css
/* 手機 (預設) */
< 640px

/* 小平板 */
sm: 640px

/* 平板 */
md: 768px

/* 桌面 */
lg: 1024px

/* 大桌面 */
xl: 1280px

/* 超大桌面 */
2xl: 1536px
```

### 響應式設計原則
1. **Mobile First** - 從小螢幕開始設計
2. **漸進增強** - 大螢幕添加更多細節
3. **觸控友好** - 按鈕最小 44x44px
4. **文字可讀** - 最小 12px (text-xs)
5. **間距適中** - 手機版間距較小

---

## 🎯 字體系統

### 字體大小
```jsx
/* 超小文字 */
text-[10px]              /* 10px */

/* 小文字 */
text-xs                  /* 12px */
text-xs sm:text-sm       /* 12px -> 14px */

/* 正文 */
text-sm                  /* 14px */
text-sm sm:text-base     /* 14px -> 16px */

/* 標題 */
text-lg sm:text-xl       /* 18px -> 20px */
text-xl sm:text-2xl      /* 20px -> 24px */
text-2xl sm:text-3xl     /* 24px -> 30px */
```

### 字重 (Font Weight)
```css
font-normal    /* 400 - 正文 */
font-medium    /* 500 - 次要強調 */
font-semibold  /* 600 - 中等強調 */
font-bold      /* 700 - 主要標題、按鈕 */
```

---

## ⚡ 動畫與過渡

### 標準過渡
```jsx
/* 所有屬性 */
transition-all duration-300

/* 特定屬性 */
transition-colors
transition-transform
transition-opacity
```

### Hover 效果
```jsx
/* 位移 */
hover:-translate-y-1

/* 縮放 */
hover:scale-110
group-hover:scale-110

/* 陰影增強 */
hover:shadow-lg hover:shadow-red-500/20
```

### Active 效果
```jsx
/* 位移回彈 */
active:translate-y-0

/* 陰影減弱 */
active:shadow-md

/* 顏色加深 */
active:bg-red-800
```

---

## 🔨 實用工具類

### 觸控優化
```jsx
touch-manipulation  /* 優化觸控響應 */
```

### 文字處理
```jsx
truncate           /* 單行截斷 */
break-all          /* 允許任意換行 */
leading-relaxed    /* 行高 1.625 */
tracking-tight     /* 字距緊湊 */
tracking-wide      /* 字距寬鬆 */
```

### 定位與層級
```jsx
relative z-10      /* 相對定位，層級 10 */
absolute inset-0   /* 絕對定位，填滿父元素 */
fixed top-0 z-50   /* 固定定位，層級 50 */
```

---

## 🎪 特殊效果

### 背景紋理
```jsx
/* 六角形紋理 (呼應六扇門) */
bg-pattern-hex

/* 對角線紋理 */
bg-pattern-diagonal
```

### 毛玻璃效果
```jsx
backdrop-blur-sm   /* 輕微模糊 */
backdrop-blur-md   /* 中度模糊 */
bg-white/90        /* 半透明白色 */
```

### 光暈效果
```jsx
/* 發光陰影 */
shadow-[0_0_8px_rgba(239,68,68,0.6)]

/* 模糊圓形光暈 */
blur-[60px] sm:blur-[80px]
```

---

## 📋 組件檢查清單

當創建新組件時，請確保：

- [ ] 使用 Stone 色系作為中性色（不要用 Gray）
- [ ] 使用 Red/Amber 作為強調色（不要用 Blue）
- [ ] 圓角統一使用 rounded-xl 或 rounded-2xl
- [ ] 所有尺寸都有響應式變化 (sm:, md:, lg:)
- [ ] 按鈕添加 touch-manipulation
- [ ] 陰影使用 shadow-red-500/20 而非普通灰色陰影
- [ ] 文字大小適配手機 (text-sm sm:text-base)
- [ ] 間距適配手機 (gap-3 sm:gap-4)
- [ ] Hover 和 Active 狀態完整
- [ ] 使用漸層而非純色（適當情況下）

---

## 🚀 快速參考

### 典型卡片結構
```jsx
<div className="bg-white border border-stone-200 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 p-4 sm:p-6">
  {/* 內容 */}
</div>
```

### 典型標題結構
```jsx
<div className="flex items-center gap-2.5 sm:gap-3 mb-5 sm:mb-6">
  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-red-600 to-amber-500 flex items-center justify-center shadow-lg shadow-red-500/20">
    {/* 圖示 */}
  </div>
  <div>
    <h2 className="text-lg sm:text-xl font-bold text-stone-800">標題</h2>
    <p className="text-xs sm:text-sm text-stone-500">描述</p>
  </div>
</div>
```

### 典型按鈕
```jsx
<button className="px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 active:from-red-800 active:to-red-900 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 hover:shadow-xl transition-all duration-300 touch-manipulation">
  按鈕文字
</button>
```

---

## 📚 參考資源

- [Tailwind CSS 文檔](https://tailwindcss.com/docs)
- [Lucide Icons](https://lucide.dev/)
- [Headless UI](https://headlessui.com/)

---

**最後更新：** 2026-01-16
**版本：** 1.0.0
**維護者：** 六扇門開發團隊
