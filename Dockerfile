# Dockerfile для Дед Мороз видео сервиса
FROM node:20-alpine AS base

# Установка FFmpeg для склейки видео
RUN apk add --no-cache ffmpeg

# Установка зависимостей
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Сборка приложения
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Отключаем телеметрию Next.js
ENV NEXT_TELEMETRY_DISABLED=1

# Сборка Next.js приложения
RUN npm run build

# Production образ
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Создаем пользователя для безопасности
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Копируем необходимые файлы
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Удаляем папку videos - она будет создана как симлинк в entrypoint
RUN rm -rf /app/public/videos

# Копируем entrypoint скрипт
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Создаем директории и выдаём права
RUN mkdir -p /app/public
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Путь к FFmpeg (уже в системе)
ENV FFMPEG_PATH=/usr/bin/ffmpeg

# Примечание: Все остальные переменные окружения должны быть установлены
# при запуске контейнера через docker-compose или настройки хостинга (Amvera)
# Не устанавливаем их здесь, чтобы избежать конфликтов с реальными значениями

# Используем entrypoint скрипт для инициализации хранилища
ENTRYPOINT ["/app/entrypoint.sh"]
