// A página vem sempre da internet primeiro, para o app instalado nunca ficar
// preso numa versão velha depois de publicado; sem internet, usa a última
// cópia guardada. Os arquivos de /assets/ têm a versão no nome, então podem
// vir da cópia. Mudou este arquivo? Suba o número da versão.
const CACHE_NAME = 'rose-v2';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((nome) => nome !== CACHE_NAME).map((nome) => caches.delete(nome))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const pedido = event.request;
  if (pedido.method !== 'GET') return;
  const url = new URL(pedido.url);
  // Banco (Supabase), fontes e CDN vão direto, sem cópia.
  if (url.origin !== self.location.origin) return;

  if (pedido.mode === 'navigate') {
    event.respondWith(
      fetch(pedido)
        .then((resposta) => {
          const copia = resposta.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/', copia));
          return resposta;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(pedido).then((guardado) => guardado || fetch(pedido).then((resposta) => {
        const copia = resposta.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(pedido, copia));
        return resposta;
      }))
    );
  }
});
