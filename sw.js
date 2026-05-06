const CACHE = 'goshuin-v4';
const FILES = ['/', '/index.html', '/style.css', '/app.js', '/manifest.json', '/icon.png'];

// インストール時：即座に有効化する（待機しない）
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(FILES))
  );
  self.skipWaiting(); // 新しいSWをすぐに有効化
});

// 有効化時：古いキャッシュ削除 + 全タブを即座に制御下に置く
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim()) // 開いているページをすぐ制御
  );
});

// ネットワーク優先：常に最新を取得、失敗時はキャッシュを使用
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request)
      .then(res => {
        // 成功したらキャッシュも更新
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request)) // オフライン時はキャッシュ
  );
});
