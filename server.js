const
  https = require('https'),
  fs = require('fs'),
  request = require('request'),
  passport = require('passport'),
  GoogleStrategy = require('passport-google-oauth').OAuth2Strategy,
  LocalStrategy = require('passport-local').Strategy,
  express = require('express'),
  app = express(),
  pad = require('pad-left'),
  cookieParser = require('cookie-parser'),
  session = require('express-session'),
  RedisStore = require('connect-redis')(session),
  bodyParser = require('body-parser'),
  Sequelize = require('sequelize'),
  multer = require('multer'),
  RSS = require('rss'),
  DB_CONFIG = require('./db_config.json'),
  upload = multer({
    dest: 'assets/uploads',
    mimetype: 'image/*',
    fileFilter: function fileFilter(req, file, cb) {
      if (['image/jpeg', 'image/png', 'image/gif'].find((type) => type === file.mimetype)) cb(null, true);
      else cb(null, false);
    }
  });

const
  sequelize = new Sequelize(DB_CONFIG.db_name, DB_CONFIG.db_account, DB_CONFIG.db_password, {
    dialect: 'mysql',
    dialectOptions: {
      multipleStatements: true
    }
  }),
  User = sequelize.define('user', {
    id: {
      type: Sequelize.CHAR(32),
      primaryKey: true
    },
    googleId: Sequelize.CHAR(32),
    email: Sequelize.STRING,
    displayName: Sequelize.TEXT('tiny'),
    familyName: Sequelize.TEXT('tiny'),
    givenName: Sequelize.TEXT('tiny'),
    photos: Sequelize.TEXT('tiny'),
    gender: Sequelize.ENUM('male', 'female'),
    isAdmin: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    }
  }),
  Case = sequelize.define('case', {
    title: Sequelize.STRING,
    content: Sequelize.STRING,
    image: Sequelize.STRING,
    type: {
      type: Sequelize.ENUM('suggest', 'appeal'),
      allowNull: false
    },
    isAnonymous: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    step: {
      type: Sequelize.INTEGER,
      defaultValue: 2,
      allowNull: false,
      validate: {
        max: 4,
        min: 1
      }
    },
    secondStepCompletedAt: {
      type: Sequelize.DATE
    },
    thirdStepCompletedAt: {
      type: Sequelize.DATE
    },
    fourthStepCompletedAt: {
      type: Sequelize.DATE
    }
  }, {
    deletedAt: 'deletedAt',
    paranoid: true
  }),
  Response = sequelize.define('response', {
    content: Sequelize.STRING
  }, {
    hooks: {
      afterCreate: function(instance) {
        const caseId = instance.get('caseId');
        Attention.findAll({
            where: {
              caseId: caseId
            }
          })
          .then((instances) => {
            const records = instances.map((instance) => {
              return {
                attentionId: instance.get('id'),
                content: '已有新回應'
              };
            });
            return News.bulkCreate(records);
          });
      }
    }
  }),
  Attention = sequelize.define('attention', void 0, {
    indexes: [{
      fields: ['caseId', 'userId'],
      unique: true
    }]
  }),
  Endorse = sequelize.define('endorse', void 0, {
    indexes: [{
      fields: ['caseId', 'userId'],
      unique: true
    }],
    hooks: {
      afterCreate: function(instance) {
        const caseId = instance.get('caseId');
        Endorse.count({
            where: {
              caseId: caseId
            }
          })
          .then((count) => {
            if (count >= app.locals.threshold) {
              Case.update({
                  step: 3,
                  secondStepCompletedAt: sequelize.fn('NOW')
                }, {
                  where: {
                    id: caseId
                  }
                })
                .then(() =>
                  Attention.findAll({
                    where: {
                      caseId: caseId
                    }
                  })
                  .then((instances) => {
                    const records = instances.map((instance) => {
                      return {
                        attentionId: instance.get('id'),
                        content: '已過門檻'
                      };
                    });
                    return News.bulkCreate(records);
                  }));
            }
          });
      }
    }
  }),
  News = sequelize.define('news', {
    content: Sequelize.STRING
  }, {
    deletedAt: 'deletedAt',
    paranoid: true
  }),
  Faq = sequelize.define('faq', {
    title: Sequelize.STRING,
    content: Sequelize.STRING(2047)
  }),
  Config = sequelize.define('config', {
    key: Sequelize.STRING,
    value: Sequelize.STRING,
    type: Sequelize.ENUM('string', 'number')
  });

User.hasMany(Case);
User.hasMany(Endorse);
Case.hasMany(Endorse);
User.hasMany(Response);
Case.hasMany(Response);
Case.hasMany(Attention);
User.hasMany(Attention);
Attention.hasMany(News);

Case.belongsTo(User);
Endorse.belongsTo(User);
Endorse.belongsTo(Case);
Response.belongsTo(User);
Response.belongsTo(Case);
Attention.belongsTo(Case);
Attention.belongsTo(User);
News.belongsTo(Attention);

sequelize.sync()
  // .then(function() {
  //   const fs = require('fs');
  //   return sequelize.query(fs.readFileSync('test.sql', 'utf8'));
  // })
  .then(() =>
    Config.findAll()
    .then((instances) =>
      instances.forEach((instance) => {
        if (instance.get('type') === 'string')
          app.locals[instance.get('key')] = instance.get('value');
        else if (instance.get('type') === 'number')
          app.locals[instance.get('key')] = Number(instance.get('value'));
      })))
  .then(() => main());

function main() {
  app.set('view engine', 'ejs');

  const padTo2 = (str) => pad(str, 2, 0);
  app.locals.formatDate = (date) => (date) ? `${date.getYear() + 1900}-${padTo2(date.getMonth() + 1)}-${padTo2(date.getDate())}` : '';
  app.locals.formatTime = (date) => (date) ? `${app.locals.formatDate(date)} ${padTo2(date.getHours())}:${padTo2(date.getMinutes())}:${padTo2(date.getSeconds())}` : '';

  app.use(express.static('assets'));
  app.use(cookieParser());
  app.use(session({
    secret: app.locals.cookie_secret,
    resave: true,
    saveUninitialized: true,
    cookie: {
      secure: true
    },
    store: new RedisStore({
      host: app.locals.redis_host,
      port: app.locals.redis_port
    }),
  }));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({
    extended: true
  }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(function(req, res, next) {
    res.locals.login = req.isAuthenticated();
    if (req.user)
      res.locals.user = req.user;
    next();
  });

  passport.serializeUser(function(user, done) {
    done(null, user);
  });
  passport.deserializeUser(function(obj, done) {
    done(null, obj);
  });
  passport.use(new GoogleStrategy({
      clientID: app.locals.google_clientID,
      clientSecret: app.locals.google_clientSecret,
      callbackURL: app.locals.site_url + 'auth/google/callback',
      passReqToCallback: true
    },
    function(req, accessToken, refreshToken, profile, done) {
      if (!profile._json.domain || !profile._json.domain === app.locals.account_domain)
        return done(null, false, {
          message: 'Wrong domain!'
        });
      const id = profile.emails[0].value.match(/^[a-z][0-9]{7}/)[0];
      return User.findCreateFind({
          where: {
            id: id
          },
          defaults: {
            id: id,
            googleId: profile.id,
            email: profile.emails[0].value,
            displayName: profile.displayName,
            familyName: profile.name.familyName,
            givenName: profile.name.givenName,
            photos: profile.photos[0].value
          }
        })
        .then((instances) => done(null, instances[0].toJSON()), (err) => done(err, false));
    }));
  passport.use(new LocalStrategy({
      usernameField: 'id',
      passwordField: 'password',
      passReqToCallback: true,
      session: true
    },
    function(req, id, password, done) {
      new Promise((resolve, reject) =>
          request({
            url: 'http://ccweb.ncue.edu.tw/ADV/images/api.php',
            method: 'post',
            headers: {
              Origin: 'https://ccweb.ncue.edu.tw',
              Host: 'ccweb.ncue.edu.tw',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36',
            },
            form: {
              server: 'mail.ncue.edu.tw',
              id: id.toLowerCase(),
              pwd: password
            },
            timeout: 20000
          }, (err, res, body) => resolve([err, res, body])))
        .then(([err, res, body]) => {
          if (body)
            return JSON.parse(body);
          return Promise.reject();
        })
        .then((json) => {
          if (!json.result)
            return Promise.reject(json.error);
          return User.findCreateFind({
              where: {
                id: id
              },
              defaults: {
                id: id,
                email: id + '@' + app.locals.account_domain
              }
            })
            .then((instances) => done(null, instances[0].toJSON()));
        })
        .catch(() => done(null, false));
    }));

  function verification(req, res, next) {
    if (!req.isAuthenticated())
      res.status(302).send(`前往登入畫面。<script>document.location='/login'</script>`);
    else
      next();
  }

  function verifyAdmin(req, res, next) {
    User.findOne({
        where: {
          id: req.user.id,
          isAdmin: true
        }
      })
      .then((instance) => {
        if (!instance)
          res.status(404).send('Cannot GET ' + req.path);
        else
          next();
      });
  }

  app.get('/auth/google', passport.authenticate('google', {
    scope: ['email', 'profile'],
    hd: app.locals.account_domain,
  }));

  app.get('/auth/google/callback', passport.authenticate('google', {
    successReturnToOrRedirect: '/',
    failureRedirect: '/login',
  }));

  app.post('/auth/ncue',
    passport.authenticate('local', {
      failureRedirect: '/login'
    }),
    function(req, res) {
      res.redirect('/');
    });

  app.get('/login', function(req, res) {
    req.session.returnTo = req.get('Referer');
    const returnTo = (req.session.returnTo) ? req.session.returnTo : '/';
    if (req.isAuthenticated())
      res.redirect(returnTo);
    else
      res.render('login', {
        data: {
          url: getUrl(req),
        }
      });
  });

  app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
  });

  const router_root = express.Router();

  router_root.get('/', function(req, res) {
    const
      keyword = req.query.keyword,
      where = (keyword) ? {
        title: {
          $like: `%${keyword}%`
        }
      } : void 0;
    Case.findAll({
        where: where,
        include: [{
          model: User
        }, {
          model: Endorse,
          or: true
        }],
        order: 'createdAt DESC'
      })
      .then((instances) => {
        const
          cases = instances.map((instance) => {
            const aCase = instance.toJSON();
            aCase.endorse_number = aCase.endorses.length;
            return aCase;
          }),
          appealCases = cases.filter((e) => e.type === 'appeal'),
          suggestCases = cases.filter((e) => e.type === 'suggest'),
          appealCasesCount = appealCases.length,
          suggestCasesCount = suggestCases.length;
        res.render('index', {
          data: {
            appeal_cases: (keyword) ? appealCases : appealCases.splice(0, 3),
            appeal_cases_count: appealCasesCount,
            suggest_cases: (keyword) ? suggestCases : suggestCases.splice(0, 3),
            suggest_cases_count: suggestCasesCount,
            url: getUrl(req),
          }
        });
      });
  });

  router_root.get('/about', function(req, res) {
    res.render('about', {
      data: {
        url: getUrl(req)
      }
    });
  });

  router_root.get(['/appeal', '/suggest'], function(req, res) {
    const
      type = req.path.match(/(appeal|suggest)/)[0],
      typeZh = (type === 'appeal') ? '申訴' : '建議',
      btnTheme = (type === 'appeal') ? 'warning' : 'info';
    Case.findAll({
        where: {
          type: type
        },
        include: [{
          model: User
        }, {
          model: Endorse,
          or: true
        }],
        order: 'createdAt DESC'
      })
      .then((instances) => {
        const cases = instances.map((instance) => instance.toJSON());
        cases.forEach((e) => e.endorse_number = e.endorses.length);
        res.render('join/index', {
          data: {
            title: typeZh,
            type: type,
            cases: cases,
            url: getUrl(req),
            btnTheme: btnTheme
          }
        });
      });
  });

  router_root.get('/detail/:caseId', function(req, res) {
    const
      caseId = req.params.caseId,
      url = getUrl(req);
    Case.findOne({
        where: {
          id: caseId
        },
        include: [User, Endorse, Response, Attention]
      })
      .then((instance) => {
        if (instance) {
          const aCase = instance.toJSON();
          console.log(aCase);
          aCase.endorse_number = aCase.endorses.length;
          res.render('join/detail', {
            data: Object.assign(aCase, {
              type: aCase.type,
              typeZh: (aCase.type === 'appeal') ? '申訴' : '建議',
              url: url,
              rssUrl: url.replace(/detail/, 'detail.rss.xml'),
              isAttention: (req.user) ? Boolean(aCase.attentions.find((attention) => attention.userId = req.user.id)) : void 0
            })
          });
        } else
          res.redirect('/appeal');
      });
  });
  // router_root.get('/detail.rss.xml ', function(req, res) {
  //   const
  //     appealId = req.query.appealId,
  //     appeal_case = appeal_cases.find((e) => e.id === Number(appealId)),
  //     feed = new RSS({
  //       title: appeal_case.title,
  //       description: appeal_case.content,
  //       site_url: app.locals.site_url,
  //       image_url: app.locals.icon_url,
  //       managingEditor: '彰師大學生會',
  //       webMaster: '彰師大學生會',
  //       copyright: '2016 國立彰化師範大學 學生會',
  //       language: 'zh_tw',
  //       pubDate: appeal_case.date,
  //       ttl: '60'
  //     });
  //   res.set('Content-Type', 'application/rss+xml');
  //   res.send(feed.xml());
  // });
  router_root.post('/endorse', verification, function(req, res) {
    const caseId = req.body.caseId;
    Endorse.create({
        caseId: caseId,
        userId: req.user.id,
        onDuplicate: 'updatedAt'
      })
      .catch(() => void 0)
      .then(() => res.redirect(`/detail/${caseId}`));
  });

  router_root.get(['/propose/appeal', '/propose/suggest'], verification, function(req, res) {
    const
      type = req.path.match(/(appeal|suggest)/)[0],
      typeZh = (type === 'appeal') ? '申訴' : '建議';
    res.render('join/propose', {
      data: {
        title: '我要' + typeZh,
        type: type,
        typeZh: typeZh,
        url: getUrl(req),
      }
    });
  });

  router_root.post(['/propose/appeal', '/propose/suggest'], verification, upload.single('image'), function(req, res) {
    const type = req.path.match(/(appeal|suggest)/)[0];
    Case.create({
        userId: req.user.id,
        title: req.body.title,
        content: req.body.content,
        image: (req.file) ? '/uploads/' + req.file.filename : void 0,
        type: type,
        isAnonymous: (req.body.isAnonymous === 'on' || !req.user.givenName)
      }, {
        include: [User]
      })
      .then((instance) => res.redirect(`/detail/${instance.get('id')}`));
  });

  router_root.get('/attention/:caseId/add', verification, function(req, res) {
    const caseId = req.params.caseId;
    Attention.create({
        caseId: caseId,
        userId: req.user.id
      })
      .catch(() => void 0)
      .then(() => res.redirect('/detail/' + caseId));
  });

  router_root.get('/attention/:caseId/delete', verification, function(req, res) {
    const caseId = req.params.caseId;
    Attention.destroy({
        where: {
          caseId: caseId,
          userId: req.user.id
        }
      })
      .catch(() => void 0)
      .then(() => res.redirect('/detail/' + caseId));
  });

  router_root.get('/news', verification, function(req, res) {
    News.findAll({
        include: [{
          model: Attention,
          where: {
            userId: req.user.id
          },
          include: [Case]
        }]
      })
      .then((instances) => {
        res.send(instances.map((instance) => {
          const
            formatDate = (date) => `${date.getYear() + 1900}-${date.getMonth() + 1}-${date.getDate()}`,
            json = instance.toJSON();
          return {
            title: json.content,
            content: `「${json.attention.case.title}」於${formatDate(json.createdAt)}${json.content}`,
            url: '/detail/' + json.attention.case.id
          };
        }));
        return instances.map((instance) => instance.destroy());
      });
  });

  const router_faqs = express.Router();

  router_faqs.get('/', function(req, res) {
    Faq.findAll()
      .then((instances) =>
        res.render('faqs/index', {
          data: {
            url: getUrl(req),
            title: '常見問題',
            faqs: instances.map((instance) => instance.toJSON())
          }
        }));
  });

  router_faqs.get('/detail/:id', function(req, res) {
    Faq.findOne({
        where: {
          id: req.params.id
        }
      })
      .then((instance) =>
        res.render('faqs/detail', {
          data: instance.toJSON()
        }));
  });

  const router_admin = express.Router();
  router_admin.use(verification, verifyAdmin);

  router_admin.get('/', function(req, res) {
    const where = (req.query.view === 'all') ? void 0 : {
      step: {
        $ne: 4
      }
    };
    Case.findAll({
        where: where,
        include: [User, Endorse, Response]
      })
      .then((instances) =>
        res.render('admin/index', {
          data: {
            title: '後台',
            cases: instances.map((instance) => instance.toJSON())
          }
        }));
  });

  router_admin.post('/response', function(req, res) {
    /* 回應 */
    Response.create({
        userId: req.user.id,
        caseId: req.body.caseId,
        content: req.body.content
      })
      /* 完成案件���回應階段 */
      .then(() =>
        Case.update({
          step: 4,
          thirdStepCompletedAt: sequelize.fn('NOW'),
          fourthStepCompletedAt: sequelize.fn('NOW')
        }, {
          where: {
            id: req.body.caseId
          }
        }))
      .catch(() => void 0)
      .then(() => res.redirect('/admin'));
  });

  router_admin.post('/response/delete', function(req, res) {
    /* 找出乾回應 */
    Response.findOne({
        where: {
          id: req.body.responseId
        }
      })
      /* 記下回應的案件ID，並刪除回應 */
      .then((instance) => {
        const caseId = instance.get('caseId');
        return instance.destroy()
          .then(() => caseId);
      })
      /* 找出回應 */
      .then((caseId) =>
        Case.findOne({
          where: {
            id: caseId
          },
          include: [Response]
        }))
      /* 如果該案件的回應數為零，將第三階段完成時間設為null */
      .then((instance) => {
        if (instance.get('responses').length === 0) {
          return instance.update({
            thirdStepCompletedAt: null
          });
        }
        return;
      })
      .catch(() => void 0)
      .then(() => res.redirect('/admin'));
  });

  router_admin.post('/threshold', function(req, res) {
    app.locals.threshold = req.body.threshold;
    /* 變更資料庫中的門檻設��� */
    Config.update({
        value: app.locals.threshold
      }, {
        where: {
          key: 'threshold'
        }
      })
      .then(() => Case.findAll({
        include: [{
          model: Endorse
        }]
      }))
      /* 重新計算所有案件是否達到門檻 */
      .then((instances) => {
        return instances.map((instance) => {
          const
            endorsesCount = instance.get('endorses').length,
            threshold = app.locals.threshold;
          if (endorsesCount >= threshold) {
            return instance.update({
              secondStepCompletedAt: sequelize.fn('NOW')
            });
          } else if (endorsesCount < threshold && !instance.get('thirdStepCompletedAt') && !instance.get('fourthStepCompletedAt')) {
            return instance.update({
              secondStepCompletedAt: null
            });
          }
        });
      })
      .catch(() => void 0)
      .then(() => res.redirect('/admin'));
  });

  router_admin.post('/day_limit', function(req, res) {
    app.locals.response_day_limit = req.body.response_day_limit;
    /* 變更資料庫中的回應天數限制設定 */
    Config.update({
        value: app.locals.response_day_limit
      }, {
        where: {
          key: 'response_day_limit'
        }
      })
      .catch(() => void 0)
      .then(() => res.redirect('/admin'));
  });

  router_admin.get('/complete/:caseId', function(req, res) {
    /* 結案 */
    Case.update({
        fourthStepCompletedAt: sequelize.fn('NOW')
      }, {
        where: {
          id: req.params.caseId
        }
      })
      .then(() => res.redirect('/admin'));
  });

  router_admin.get('/remove/:caseId', function(req, res) {
    Case.destroy({
        where: {
          id: req.params.caseId
        }
      })
      .then(() => res.redirect('/admin'));
  });

  router_admin.get('/admin', function(req, res) {
    User.findAll({
        where: {
          isAdmin: true
        }
      })
      .then((instances) => {
        res.render('admin/admin', {
          data: {
            title: '管理員設定',
            admins: instances.map((instance) => instance.toJSON())
          }
        });

      });
  });

  router_admin.post('/admin/add', function(req, res) {
    User.update({
        isAdmin: true
      }, {
        where: {
          email: req.body.userId.toLowerCase() + '@' + app.locals.account_domain
        }
      })
      .catch(() => void 0)
      .then(() => res.redirect('/admin/admin'));
  });

  router_admin.get('/admin/remove/:userId', function(req, res) {
    User.update({
        isAdmin: false
      }, {
        where: {
          id: req.params.userId
        }
      })
      .then(() => res.redirect('/admin/admin'));
  });

  router_admin.get('/faqs', function(req, res) {
    Faq.findAll()
      .then((instances) => res.render('admin/faqs', {
        data: {
          title: '常見問題管理',
          faqs: instances.map((instance) => instance.toJSON())
        }
      }));
  });

  router_admin.get('/faqs/remove/:id', function(req, res, next) {
    const id = req.params.id;
    if (Number.isNaN(Number(id)))
      return next();
    Faq.destroy({
        where: {
          id: id
        }
      })
      .then(() => res.redirect('/admin/faqs'));
  });

  router_admin.get('/editor', function(req, res) {
    res.render('admin/editor');
  });

  router_admin.get('/editor/:id', function(req, res) {
    Faq.findOne({
        where: {
          id: req.params.id
        }
      })
      .then((instance) =>
        res.render('admin/editor', {
          data: instance.toJSON()
        }));
  });

  router_admin.post('/editor', function(req, res) {
    Faq.create({
        title: req.body.title,
        content: req.body.content
      })
      .then((instance) => res.redirect('/faqs/detail/' + instance.get('id')));
  });

  router_admin.post('/editor/:id', function(req, res, next) {
    const id = req.params.id;
    if (Number.isNaN(Number(id)))
      return next();
    Faq.update({
        title: req.body.title,
        content: req.body.content
      }, {
        where: {
          id: id
        }
      })
      .then(() => res.redirect('/faqs/detail/' + id));
  });

  router_admin.post('/editor/upload-file', upload.single('upload'), function(req, res) {
    res.send({
      fileName: req.file.filename,
      uploaded: 1,
      url: `/uploads/${req.file.filename}`
    });
  });

  router_admin.post('/editor/upload-image', upload.single('upload'), function(req, res) {
    res.send(`<script type = "text/javascript" >
  window.parent.CKEDITOR.tools.callFunction("0", "/uploads/${req.file.filename}", ""); 
</script>`);
  });

  app.use('/', router_root);
  app.use('/faqs', router_faqs);
  app.use('/admin', router_admin);

  // app.use(function(req, res) {
  //   if (req.accepts('html'))
  //     return res.redirect('/');
  // });

  const
    server = https.createServer({
        key: fs.readFileSync(app.locals.key),
        cert: fs.readFileSync(app.locals.cert),
        ca: fs.readFileSync(app.locals.ca),
      },
      app);
  server.listen(8000);

  function getUrl(req) {
    return req.protocol + '://' + req.get('host') + req.originalUrl;
  }
}
