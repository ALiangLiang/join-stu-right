# 學生權益網路參與平台

### 安裝說明

```sh
sudo apt-get update # install Redis
sudo apt-get install build-essential tcl
cd /tmp
curl -O http://download.redis.io/redis-stable.tar.gz
tar xzvf redis-stable.tar.gz
cd redis-stable
make
sudo mkdir /etc/redis
sudo cp /tmp/redis-stable/redis.conf /etc/redis
git clone https://github.com/ALiangLiang/join-stu-right.git # install this project
cd join-stu-right
npm i pm2 -g # install pm2 with global
npm i
cp db_config.example.json db_config.json
nano db_config.json
pm2 start ecosystem.config.js
```

### join_stu_right/configs

此 table 用來放置設定資料，在伺服器啟動時自動加進 app.locals 中。

```SQL
INSERT INTO `configs` (`id`, `key`, `value`, `type`, `createdAt`, `updatedAt`) VALUES
(1, 'webTitle', '網站名稱 ', 'string', CURRENT_DATE(), CURRENT_DATE()),
(2, 'threshold', '門檻數', 'number', CURRENT_DATE(), CURRENT_DATE()),
(3, 'app_id', 'app_id', 'string', CURRENT_DATE(), CURRENT_DATE()),
(4, 'page_id', '粉專ID', 'string', CURRENT_DATE(), CURRENT_DATE()),
(5, 'site_url', '網站網址(斜線結尾)', 'string', CURRENT_DATE(), CURRENT_DATE()),
(6, 'icon_url', 'icon網址', 'string', CURRENT_DATE(), CURRENT_DATE()),
(7, 'key', '憑證位址', 'string', CURRENT_DATE(), CURRENT_DATE()), 
(8, 'cert', '憑證位址', 'string', CURRENT_DATE(), CURRENT_DATE()), 
(9, 'ca', '憑證位址', 'string', CURRENT_DATE(), CURRENT_DATE()),
(10, 'account_domain', 'G suite 主機', 'string', CURRENT_DATE(), CURRENT_DATE()),
(11, 'cookie_secret', 'cookie_secret', 'string', CURRENT_DATE(), CURRENT_DATE()),
(12, 'redis_host', 'redis_host', 'string', CURRENT_DATE(), CURRENT_DATE()),
(13, 'redis_port', 'redis_port', 'number', CURRENT_DATE(), CURRENT_DATE()),
(14, 'response_day_limit', '回應限制天數', 'number', CURRENT_DATE(), CURRENT_DATE()),
(15, 'google_clientID', 'google app 的 clientID', 'string', CURRENT_DATE(), CURRENT_DATE()),
(16, 'google_clientSecret', 'google app 的 clientSecret', 'string', CURRENT_DATE(), CURRENT_DATE());
```