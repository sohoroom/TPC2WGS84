const CACHE_NAME = 'tpc-conv-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  'https://cdnjs.cloudflare.com/ajax/libs/proj4js/2.15.0/proj4.js'
];

// 安裝並快取資源
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// 離線優先策略
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});