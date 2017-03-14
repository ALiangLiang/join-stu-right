window.fetch(`https://graph.facebook.com/?id=${encodeURIComponent(document.location.href)}`)
  .then((response) => response.json())
  .then((json) => {
    const fbShareNum = document.getElementById('fb-share-num');
    fbShareNum.innerText = (json.share) ? json.share.share_count : 0;
  });

const fbShare = document.getElementById('fb-share');
fbShare.href = `https://www.facebook.com/share.php?u=${document.location.href}`;

const attentionBtn = document.getElementById('attention-btn');
attentionBtn.onclick = function() {
  if (window.Notification.permission !== 'granted')
    window.Notification.requestPermission()
    .then(function(result) {
      console.log(result);
      if (result === 'denied') {
        console.log('Permission wasn\'t granted. Allow a retry.');
        return;
      }
      if (result === 'default') {
        console.log('The permission request was dismissed.');
        return;
      }
      document.attention.submit();
      window.navigator.serviceWorker.controller.postMessage({
        title: '學生權益 網路參與平台',
        content: '成功開啟通知權限，接下來當此議題有動態時，將隨時通知您。'
      });
    });
  else
    document.attention.submit();
};

window.$('[data-toggle="tooltip"]').tooltip();
