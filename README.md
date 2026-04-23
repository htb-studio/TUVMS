# TUVMS

Monorepo يحتوي على:

- `client/`: Next.js (TypeScript) لواجهة المستخدم.
- `server/`: Express (TypeScript) لواجهات الـ API والتكامل مع Supabase/Firebase/AI.

## المتطلبات

- Node.js 18+
- npm 9+

## إعداد متغيرات البيئة

- أنشئ ملفات البيئة من الأمثلة:

### Frontend

انسخ `client/.env.local.example` إلى `client/.env.local` ثم املأ القيم.

### Backend

انسخ `server/.env.example` إلى `server/.env` ثم املأ القيم.

## التشغيل محليًا

### تثبيت الحزم

```bash
npm install
```

### تشغيل وضع التطوير

```bash
npm run dev
```

- Frontend: http://localhost:3000
- API: http://localhost:4002

## التشغيل في السيرفر (Production) عبر PM2

> الهدف: بعد أي Restart للسيرفر يكون الموقع شغال تلقائيًا.

### Build (مرة بعد كل تعديل)

```bash
npm install
npm run build -w server
npm run build -w client
```

### تشغيل الخدمات عبر PM2

```bash
pm2 start "npm run start -w server" --name tuvms-api
pm2 start "npm run start -w client" --name tuvms-web
pm2 save
```

### تشغيل تلقائي بعد إعادة التشغيل (systemd)

نفّذ مرة واحدة فقط:

```bash
pm2 startup
```

ثم انسخ الأمر الذي يظهر لك (يبدأ بـ `sudo env ...`) ونفّذه كما هو، وبعدها:

```bash
pm2 save
```

### أوامر مفيدة

```bash
pm2 list
pm2 logs tuvms-web
pm2 logs tuvms-api
pm2 restart tuvms-web
pm2 restart tuvms-api
pm2 stop all
pm2 delete all
```

## Nginx (مهم لملفات Next.js)

في `athar.it.com` لازم يمرر Nginx الـ URI كما هو (مهم لمسارات مثل `%5BeventId%5D`):

```nginx
proxy_pass http://127.0.0.1:3000$request_uri;
```

وفي `api.athar.it.com`:

```nginx
proxy_pass http://127.0.0.1:4002$request_uri;
```

## ملاحظات

- لا تضع مفاتيح حقيقية داخل المستودع.
- Endpoint التجربة: `POST http://localhost:4002/api/attendance/submit`
