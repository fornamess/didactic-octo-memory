#!/bin/sh
set -e

# Создаём директории в персистентном хранилище /data
mkdir -p /data
mkdir -p /data/videos/intro
mkdir -p /data/videos/outro
mkdir -p /data/videos/personal
mkdir -p /data/videos/final

# Убеждаемся что директория для БД существует
# БД будет создана автоматически при первом запуске
echo "Initialized /data directories for persistent storage"

# Создаём симлинк из public/videos в /data/videos
# Это нужно чтобы Next.js мог раздавать видео как статику

# Если это уже симлинк на правильное место - ничего не делаем
if [ -L /app/public/videos ] && [ "$(readlink /app/public/videos)" = "/data/videos" ]; then
  echo "Symlink already exists: /app/public/videos -> /data/videos"
else
  # Удаляем что бы там ни было (папка или неправильный симлинк)
  rm -rf /app/public/videos 2>/dev/null || true
  # Создаём симлинк
  ln -s /data/videos /app/public/videos
  echo "Created symlink: /app/public/videos -> /data/videos"
fi

# Запускаем приложение
exec node server.js
