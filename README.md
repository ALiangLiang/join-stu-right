# 學生權益參與系統

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