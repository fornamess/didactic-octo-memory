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

# Создаем директории для БД и видео
RUN mkdir -p /app/public/videos/intro /app/public/videos/outro /app/public/videos/personal /app/public/videos/final
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Путь к FFmpeg (уже в системе)
ENV FFMPEG_PATH=/usr/bin/ffmpeg

# === Переменные окружения (можно переопределить при запуске) ===
# Безопасность
ENV JWT_SECRET=""
# API
ENV YES_AI_API_BASE="https://api.yesai.su/v2"
ENV YES_AI_TOKEN=""
# Админы
ENV ADMIN_EMAILS="system@gmail.com"
# Платежи
ENV BITBANKER_API_KEY=""
ENV BITBANKER_SECRET=""
# URL
ENV NEXT_PUBLIC_BASE_URL=""
# Поддержка
ENV SUPPORT_TELEGRAM="@your_support_bot"
ENV SUPPORT_EMAIL="support@your-domain.com"
# Настройки сервиса
ENV SERVICE_COST="0"
ENV VIDEO_EXPIRY_DAYS="7"
ENV GENERATION_TIMEOUT_MINUTES="15"

CMD ["node", "server.js"]
