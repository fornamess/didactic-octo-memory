#!/bin/bash
set -e

echo "🔧 Исправление проблем деплоя..."

# 1. Исправляем git ownership
echo "📁 Исправляем git ownership..."
git config --global --add safe.directory /home/appuser/app

# 2. Переходим в директорию приложения
cd /home/appuser/app || exit 1

# 3. Получаем изменения
echo "📥 Получаем изменения из git..."
git pull

# 4. Устанавливаем зависимости
echo "📦 Устанавливаем зависимости..."
npm install

# 5. Собираем проект
echo "🔨 Собираем проект..."
npm run build

# 6. Полностью останавливаем PM2 и освобождаем порт 3000
echo "⏹️  Останавливаем все процессы PM2..."
pm2 stop all || true
pm2 delete all || true
pm2 kill || true

echo "🔄 Ждём завершения процессов..."
sleep 3

# 7. Агрессивно освобождаем порт 3000
echo "🔍 Ищем и останавливаем процессы на порту 3000..."

# Способ 1: через lsof
if command -v lsof &> /dev/null; then
  PIDS=$(lsof -ti:3000 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    echo "📌 Найдены процессы через lsof: $PIDS"
    echo "$PIDS" | xargs -r kill -9 || true
    sleep 2
  fi
fi

# Способ 2: через ss
PIDS=$(ss -tlnp 2>/dev/null | grep :3000 | awk '{print $6}' | sed 's/.*pid=\([0-9]*\).*/\1/' | sort -u || true)
if [ -n "$PIDS" ]; then
  echo "📌 Найдены процессы через ss: $PIDS"
  echo "$PIDS" | xargs -r kill -9 || true
  sleep 2
fi

# Способ 3: через netstat (если доступен)
if command -v netstat &> /dev/null; then
  PIDS=$(netstat -tlnp 2>/dev/null | grep :3000 | awk '{print $7}' | cut -d'/' -f1 | grep -E '^[0-9]+$' | sort -u || true)
  if [ -n "$PIDS" ]; then
    echo "📌 Найдены процессы через netstat: $PIDS"
    echo "$PIDS" | xargs -r kill -9 || true
    sleep 2
  fi
fi

# Способ 4: убиваем все Node.js процессы, связанные с Next.js
echo "🧹 Очищаем все процессы Next.js..."
pkill -9 -f "next start" || true
pkill -9 -f "node.*next" || true
pkill -9 -f "\.next" || true
killall -9 node 2>/dev/null || true

echo "⏳ Ждём освобождения порта..."
sleep 5

# 8. Проверяем, что порт свободен
if command -v ss &> /dev/null; then
  PORT_CHECK=$(ss -tlnp | grep :3000 || true)
  if [ -n "$PORT_CHECK" ]; then
    echo "⚠️  ПРЕДУПРЕЖДЕНИЕ: Порт 3000 всё ещё занят!"
    echo "Информация о порте:"
    ss -tlnp | grep :3000 || true
    echo "Попробуем продолжить..."
  else
    echo "✅ Порт 3000 свободен"
  fi
fi

# 9. Запускаем PM2 заново
echo "▶️  Запускаем PM2..."
pm2 start ecosystem.config.js --update-env

# 10. Сохраняем конфигурацию PM2
pm2 save

echo "✅ Готово!"
echo ""
echo "📊 Статус приложения:"
pm2 status
echo ""
echo "📝 Последние логи:"
pm2 logs ded-moroz-video --lines 20 --nostream
