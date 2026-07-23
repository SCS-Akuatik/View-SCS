const CACHE_NAME = 'scs-app-v1';

// Saat diinstal, langsung aktifkan
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// Hapus cache lama kalau ada update versi
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('Menghapus cache lama:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// Strategi: Network First, fallback to Cache
self.addEventListener('fetch', (event) => {
    // Hanya proses request GET (jangan cache POST form pendaftaran)
    if (event.request.method !== 'GET') return;

    // Abaikan request dari chrome-extension atau API luar
    if (!event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Kalau internet nyala, simpan copy-annya ke Cache
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return response;
            })
            .catch(() => {
                // Kalau internet mati / offline, ambil dari Cache
                return caches.match(event.request);
            })
    );
});
