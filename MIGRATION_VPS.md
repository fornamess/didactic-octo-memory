# Инструкция по миграции с Amvera Cloud на VPS (Prohoster)

## 📋 Подготовка

### 1. Скачайте данные с Amvera

**Через SSH или панель управления Amvera:**

```bash
# Скачайте базу данных
# Путь: /data/app.db

# Скачайте видео файлы
# Путь: /data/videos/

# Скачайте .env файл или список переменных окружения
```

**Важно сохранить:**
- База данных SQLite (`/data/app.db`)
- Видео файлы (`/data/videos/`)
- Все переменные окружения из панели Amvera

---

## 🖥️ Настройка VPS

### 2. Подключитесь к VPS

```bash
ssh root@ваш-ip-адрес
# или
ssh root@ваш-домен.com
```

### 3. Обновите систему

```bash
# Для Ubuntu/Debian
apt update && apt upgrade -y

# Для CentOS/RHEL
yum update -y
```

### 4. Установите необходимые пакеты

```bash
# Для Ubuntu/Debian
apt install -y curl wget git build-essential ffmpeg nginx

# Для CentOS/RHEL
yum install -y curl wget git gcc gcc-c++ make ffmpeg nginx
```

### 5. Установите Node.js 20.x

```bash
# Используем NodeSource репозиторий
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Проверьте версию
node -v  # Должно быть v20.x.x
npm -v
```

### 6. Установите PM2 (менеджер процессов)

```bash
npm install -g pm2
```

---

## 📦 Развертывание приложения

### 7. Создайте пользователя для приложения

```bash
adduser appuser
usermod -aG sudo appuser
su - appuser
```

### 8. Создайте структуру директорий

```bash
mkdir -p /home/appuser/app
mkdir -p /home/appuser/app/data
mkdir -p /home/appuser/app/data/videos
mkdir -p /home/appuser/app/data/videos/final
mkdir -p /home/appuser/app/data/videos/personal
mkdir -p /home/appuser/app/data/videos/images
```

### 9. Загрузите код приложения

**Вариант 1: Через Git (если есть репозиторий)**
```bash
cd /home/appuser/app
git clone https://ваш-репозиторий.git .
```

**Вариант 2: Через SCP (с локального компьютера)**
```bash
# С вашего компьютера
scp -r ded-moroz-video/* appuser@ваш-ip:/home/appuser/app/
```

**Вариант 3: Через SFTP (FileZilla, WinSCP)**
- Подключитесь к VPS
- Загрузите все файлы проекта в `/home/appuser/app/`

### 10. Установите зависимости

```bash
cd /home/appuser/app
npm install
```

### 11. Настройте переменные окружения

```bash
cd /home/appuser/app
nano .env.local
```

**Добавьте все переменные из Amvera:**

```env
# База данных
DATABASE_PATH=/home/appuser/app/data/app.db

# Видео хранилище
VIDEO_STORAGE_PATH=/home/appuser/app/data/videos
VIDEO_PUBLIC_PATH=/home/appuser/app/public/videos

# URL приложения
NEXT_PUBLIC_BASE_URL=https://ваш-домен.com

# JWT секрет
JWT_SECRET=ваш-секретный-ключ

# Yes AI API
YES_AI_API_BASE=https://api.yesai.su/v2
YES_AI_TOKEN=ваш-токен

# Bitbanker
BITBANKER_API_KEY=W2RWHOK4ag1ua0GRFjnU3C6YR7xKWQ1d
BITBANKER_SECRET=2x3OZDFxD6GZFDT53Er2iTbEXZslwEkIHJbmnERhsz3ZDwuo_vEL6mzRCQV35NvmrGOnYvpqrD31FObO8kHwMizU8tOf7D9xuQLXcqRR6FHlBtAkeedCMAp_MiBGFL5A

# Администраторы
ADMIN_EMAILS=ваш-email@admin.com

# Настройки сервиса
SERVICE_COST=0
VIDEO_EXPIRY_DAYS=7
GENERATION_TIMEOUT_MINUTES=15

# FFmpeg
FFMPEG_PATH=/usr/bin/ffmpeg

# Поддержка
SUPPORT_TELEGRAM=@ваш-бот
SUPPORT_EMAIL=support@ваш-домен.com
```

**Сохраните:** `Ctrl+O`, `Enter`, `Ctrl+X`

### 12. Загрузите базу данных и видео

```bash
# Загрузите базу данных
# С вашего компьютера:
scp /путь/к/app.db appuser@ваш-ip:/home/appuser/app/data/app.db

# Или через SFTP загрузите app.db в /home/appuser/app/data/

# Загрузите видео файлы
# С вашего компьютера:
scp -r /путь/к/videos/* appuser@ваш-ip:/home/appuser/app/data/videos/

# Или через SFTP загрузите все видео в /home/appuser/app/data/videos/
```

### 13. Установите права доступа

```bash
cd /home/appuser/app
chown -R appuser:appuser /home/appuser/app
chmod -R 755 /home/appuser/app/data
```

### 14. Соберите приложение

```bash
cd /home/appuser/app
npm run build
```

---

## 🔧 Настройка PM2

### 15. Создайте конфигурацию PM2

```bash
cd /home/appuser/app
nano ecosystem.config.js
```

**Добавьте:**

```javascript
module.exports = {
  apps: [{
    name: 'ded-moroz-video',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/home/appuser/app',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    error_file: '/home/appuser/app/logs/err.log',
    out_file: '/home/appuser/app/logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G',
  }]
};
```

**Создайте директорию для логов:**
```bash
mkdir -p /home/appuser/app/logs
```

### 16. Запустите приложение через PM2

```bash
cd /home/appuser/app
pm2 start ecosystem.config.js
pm2 save
pm2 startup
# Выполните команду, которую покажет pm2 startup
```

**Полезные команды PM2:**
```bash
pm2 status          # Статус приложения
pm2 logs            # Просмотр логов
pm2 restart ded-moroz-video  # Перезапуск
pm2 stop ded-moroz-video     # Остановка
pm2 monit           # Мониторинг
```

---

## 🌐 Настройка Nginx

### 17. Создайте конфигурацию Nginx

```bash
sudo nano /etc/nginx/sites-available/ded-moroz-video
```

**Добавьте:**

```nginx
server {
    listen 80;
    server_name ваш-домен.com www.ваш-домен.com;

    # Редирект на HTTPS (после настройки SSL)
    # return 301 https://$server_name$request_uri;

    client_max_body_size 100M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Для статических файлов
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }

    # Для видео файлов
    location /api/videos {
        proxy_pass http://localhost:3000;
        proxy_buffering off;
        proxy_request_buffering off;
    }
}
```

### 18. Активируйте конфигурацию

```bash
sudo ln -s /etc/nginx/sites-available/ded-moroz-video /etc/nginx/sites-enabled/
sudo nginx -t  # Проверка конфигурации
sudo systemctl restart nginx
```

---

## 🔒 Настройка SSL (Let's Encrypt)

### 19. Установите Certbot

```bash
# Ubuntu/Debian
sudo apt install -y certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum install -y certbot python3-certbot-nginx
```

### 20. Получите SSL сертификат

```bash
sudo certbot --nginx -d ваш-домен.com -d www.ваш-домен.com
```

**Следуйте инструкциям:**
- Введите email
- Согласитесь с условиями
- Выберите редирект на HTTPS (2)

### 21. Автоматическое обновление сертификата

```bash
sudo certbot renew --dry-run
```

---

## 🔄 Настройка домена

### 22. Настройте DNS записи

В панели управления доменом добавьте:

```
A запись:
@ → IP адрес вашего VPS

A запись:
www → IP адрес вашего VPS
```

**Подождите 5-30 минут** для распространения DNS.

---

## ✅ Проверка работы

### 23. Проверьте приложение

```bash
# Проверьте статус PM2
pm2 status

# Проверьте логи
pm2 logs ded-moroz-video

# Проверьте Nginx
sudo systemctl status nginx

# Проверьте доступность
curl http://localhost:3000
```

### 24. Откройте в браузере

```
https://ваш-домен.com
```

---

## 🔧 Дополнительные настройки

### 25. Настройка файрвола

```bash
# Ubuntu/Debian (UFW)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 26. Автоматическая очистка видео (опционально)

Создайте cron задачу для очистки истекших видео:

```bash
crontab -e
```

Добавьте (запуск каждый день в 3:00):

```cron
0 3 * * * curl -X POST https://ваш-домен.com/api/admin/cleanup-videos -H "Authorization: Bearer ваш-токен-админа" > /dev/null 2>&1
```

---

## 📝 Обновление приложения

### 27. Процесс обновления

```bash
cd /home/appuser/app

# Остановите приложение
pm2 stop ded-moroz-video

# Обновите код (если через Git)
git pull

# Или загрузите новые файлы через SFTP

# Установите зависимости
npm install

# Пересоберите
npm run build

# Запустите
pm2 restart ded-moroz-video
```

---

## 🆘 Решение проблем

### Проблема: Приложение не запускается

```bash
# Проверьте логи
pm2 logs ded-moroz-video --lines 50

# Проверьте переменные окружения
cd /home/appuser/app
cat .env.local

# Проверьте права доступа
ls -la /home/appuser/app/data/
```

### Проблема: База данных не работает

```bash
# Проверьте путь к БД
ls -la /home/appuser/app/data/app.db

# Проверьте права
chmod 644 /home/appuser/app/data/app.db
chown appuser:appuser /home/appuser/app/data/app.db
```

### Проблема: Видео не загружаются

```bash
# Проверьте директорию
ls -la /home/appuser/app/data/videos/

# Проверьте права
chmod -R 755 /home/appuser/app/data/videos/
chown -R appuser:appuser /home/appuser/app/data/videos/
```

### Проблема: Nginx не работает

```bash
# Проверьте конфигурацию
sudo nginx -t

# Проверьте логи
sudo tail -f /var/log/nginx/error.log

# Перезапустите
sudo systemctl restart nginx
```

---

## 📞 Поддержка

Если возникли проблемы:
1. Проверьте логи PM2: `pm2 logs`
2. Проверьте логи Nginx: `sudo tail -f /var/log/nginx/error.log`
3. Проверьте системные логи: `journalctl -u nginx`

---

## ✅ Чеклист миграции

- [ ] Скачаны данные с Amvera (БД, видео, env)
- [ ] Настроен VPS (Node.js, FFmpeg, Nginx)
- [ ] Загружен код приложения
- [ ] Настроены переменные окружения
- [ ] Загружена база данных
- [ ] Загружены видео файлы
- [ ] Приложение собрано и запущено через PM2
- [ ] Настроен Nginx
- [ ] Настроен SSL сертификат
- [ ] Настроены DNS записи
- [ ] Приложение работает и доступно по домену
- [ ] Протестированы основные функции

---

**Готово!** Ваше приложение должно работать на VPS. 🎉
