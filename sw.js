const CACHE_NAME = 'ponto-app-v2';
const urlsToCache = [
    '/appdeb2/',
    '/appdeb2/index.html',
    '/appdeb2/styles.css',
    '/appdeb2/app.js',
    '/appdeb2/manifest.json',
    '/appdeb2/create-icons.html',
    '/appdeb2/icons/icon-192x192.png',
    '/appdeb2/icons/icon-512x512.png'
];

// Instalar Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache aberto para versão v2');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('Todos os recursos foram cacheados');
                return self.skipWaiting();
            })
    );
});

// Ativar Service Worker
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deletando cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker ativado');
            return self.clients.claim();
        })
    );
});

// Interceptar requisições
self.addEventListener('fetch', event => {
    // Ignorar requisições de API e outros recursos dinâmicos
    if (event.request.url.includes('chrome-extension') || 
        event.request.url.includes('extension') ||
        event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Retornar do cache se disponível
                if (response) {
                    return response;
                }

                // Tentar buscar da rede
                return fetch(event.request)
                    .then(response => {
                        // Verificar se a resposta é válida
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clonar a resposta
                        const responseToCache = response.clone();

                        // Adicionar ao cache
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(() => {
                        // Se offline e não estiver no cache, retornar página offline
                        if (event.request.destination === 'document') {
                            return caches.match('/index.html');
                        }
                        
                        // Para outros recursos, retornar uma resposta vazia
                        return new Response('', {
                            status: 404,
                            statusText: 'Not Found'
                        });
                    });
            })
    );
});

// Sincronização em background (quando conexão retorna)
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

// Função para sincronização em background
function doBackgroundSync() {
    // Aqui você pode implementar sincronização com servidor
    console.log('Sincronização em background executada');
    
    // Notificar o cliente sobre a sincronização
    return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_COMPLETED',
                timestamp: new Date().toISOString()
            });
        });
    });
}

// Notificações push
self.addEventListener('push', event => {
    let options = {
        body: 'Novo horário registrado!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Ver detalhes',
                icon: '/icons/icon-96x96.png'
            },
            {
                action: 'close',
                title: 'Fechar',
                icon: '/icons/icon-96x96.png'
            }
        ],
        requireInteraction: false,
        silent: false
    };

    // Se há dados na notificação, usar eles
    if (event.data) {
        try {
            const data = event.data.json();
            options.body = data.body || options.body;
            options.title = data.title || 'Controle de Ponto';
        } catch (e) {
            options.body = event.data.text() || options.body;
        }
    }

    event.waitUntil(
        self.registration.showNotification('Controle de Ponto', options)
    );
});

// Clique em notificação
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    } else if (event.action === 'close') {
        // Apenas fechar a notificação
        return;
    } else {
        // Clique na notificação principal
        event.waitUntil(
            clients.matchAll({ type: 'window' }).then(clientList => {
                // Se já há uma janela aberta, focar nela
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Se não há janela aberta, abrir uma nova
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
        );
    }
});

// Fechar notificação
self.addEventListener('notificationclose', event => {
    console.log('Notificação fechada:', event.notification.tag);
});

// Mensagens do cliente
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
});

// Gerenciar cache
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'CACHE_URLS') {
        event.waitUntil(
            caches.open(CACHE_NAME)
                .then(cache => {
                    return cache.addAll(event.data.urls);
                })
        );
    }
});

// Atualização automática do cache
self.addEventListener('periodicsync', event => {
    if (event.tag === 'content-sync') {
        event.waitUntil(updateCache());
    }
});

async function updateCache() {
    try {
        const cache = await caches.open(CACHE_NAME);
        
        // Atualizar recursos principais
        for (const url of urlsToCache) {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    await cache.put(url, response);
                }
            } catch (error) {
                console.log('Erro ao atualizar cache para:', url, error);
            }
        }
        
        console.log('Cache atualizado com sucesso');
    } catch (error) {
        console.error('Erro ao atualizar cache:', error);
    }
}

// Interceptar erros
self.addEventListener('error', event => {
    console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
    console.error('Service Worker unhandled rejection:', event.reason);
}); 