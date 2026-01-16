/* eslint-disable no-restricted-globals */
// Service Worker for 六扇門企業服務入口 PWA
// 版本號：更新此版本號以強制更新快取
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `6owl-door-${CACHE_VERSION}`;

// 需要快取的靜態資源
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/logo.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// API 快取名稱
const API_CACHE_NAME = `6owl-door-api-${CACHE_VERSION}`;

// 不需要快取的路徑
const SKIP_CACHE_PATHS = [
  '/api/auth/',
  '/api/logout',
];

// Install 事件 - 快取靜態資源
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker...', event);

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Precaching App Shell');
        // 快取核心資源，忽略失敗的資源
        return cache.addAll(STATIC_CACHE_URLS.map(url => new Request(url, { cache: 'reload' })))
          .catch((error) => {
            console.warn('[Service Worker] Failed to cache some resources:', error);
          });
      })
      .then(() => {
        // 強制激活新的 Service Worker
        return self.skipWaiting();
      })
  );
});

// Activate 事件 - 清理舊快取
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Service Worker...', event);

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // 刪除舊版本的快取
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
              console.log('[Service Worker] Removing old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // 立即控制所有頁面
        return self.clients.claim();
      })
  );
});

// Fetch 事件 - 攔截請求並實作快取策略
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只處理同源請求
  if (url.origin !== location.origin) {
    return;
  }

  // 檢查是否需要跳過快取
  const shouldSkipCache = SKIP_CACHE_PATHS.some(path => url.pathname.startsWith(path));
  if (shouldSkipCache) {
    return; // 直接請求網路，不快取
  }

  // 根據請求類型選擇快取策略
  if (request.method === 'GET') {
    // 靜態資源：Cache First 策略
    if (isStaticResource(url.pathname)) {
      event.respondWith(cacheFirst(request));
    }
    // API 請求：Network First 策略
    else if (url.pathname.startsWith('/api/')) {
      event.respondWith(networkFirst(request));
    }
    // HTML 頁面：Network First 策略
    else {
      event.respondWith(networkFirst(request));
    }
  }
});

// Cache First 策略：優先使用快取
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    console.log('[Service Worker] Cache hit:', request.url);
    return cached;
  }

  try {
    const response = await fetch(request);
    // 只快取成功的回應
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[Service Worker] Fetch failed, no cache available:', error);
    // 返回離線頁面（如果有的話）
    return caches.match('/offline.html') || new Response('離線模式', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain; charset=utf-8'
      })
    });
  }
}

// Network First 策略：優先使用網路
async function networkFirst(request) {
  const cache = await caches.open(request.url.startsWith('/api/') ? API_CACHE_NAME : CACHE_NAME);

  try {
    const response = await fetch(request);

    // 快取成功的 API 回應
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.warn('[Service Worker] Network request failed, trying cache:', error);
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    // 如果是導航請求，返回首頁快取
    if (request.mode === 'navigate') {
      const indexCache = await cache.match('/');
      if (indexCache) {
        return indexCache;
      }
    }

    throw error;
  }
}

// 判斷是否為靜態資源
function isStaticResource(pathname) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.woff', '.woff2', '.ttf', '.ico'];
  return staticExtensions.some(ext => pathname.endsWith(ext));
}

// 推送通知事件
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received:', event);

  let data = {
    title: '六扇門通知',
    body: '您有新的訊息',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (error) {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icons/icon-192x192.png',
      badge: data.badge || '/icons/icon-72x72.png',
      vibrate: [200, 100, 200],
      tag: 'notification-tag',
      requireInteraction: false,
      data: data.url,
    })
  );
});

// 通知點擊事件
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);

  event.notification.close();

  const urlToOpen = event.notification.data || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // 如果已有窗口打開，聚焦到該窗口
        for (let client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // 否則打開新窗口
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// 後台同步事件（可選）
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event);

  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

// 同步數據函數（示例）
async function syncData() {
  try {
    // 在這裡實作數據同步邏輯
    console.log('[Service Worker] Syncing data...');
    // const response = await fetch('/api/sync');
    // return response.json();
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
    throw error;
  }
}

// 訊息事件 - 允許頁面與 Service Worker 通訊
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

console.log('[Service Worker] Service Worker loaded successfully');
