/* global fetch */
/* global registration */
/* global clients */
self.addEventListener('message', function(event) {
    notify(event.data.title, event.data.content)
});

function checkNews() {
    fetch('/news', {
            credentials: 'include'
        })
        .then((response) => {
            if (response.status === 302)
                return Promise.reject();
            return response.json();
        })
        .then((news) => news.forEach((aNews) => notify(aNews.title, aNews.content, aNews.url)));
}
checkNews();
/* 每小時檢查一次 */
setInterval(checkNews, 60 * 1000);

self.addEventListener('notificationclick', function(event) {
    if(event.notification.data.url)
    clients.openWindow(event.notification.data.url);
});

function notify(title, body, url) {
    return registration.showNotification(title, {
        body: body,
        icon: '/icon.jpg',
        vibrate: [200, 100, 200, 100, 200, 100, 200],
        data: {
            url: url
        }
    });
}
