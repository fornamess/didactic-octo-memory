#!/bin/bash
set -e

echo "🔍 Ищем процесс на порту 3000..."

# Находим процесс на порту 3000
PID=$(lsof -ti:3000 || netstat -tlnp 2>/dev/null | grep :3000 | awk '{print $7}' | cut -d'/' -f1 | head -1)

if [ -z "$PID" ]; then
  echo "❌ Процесс на порту 3000 не найден через lsof/netstat"
  echo "Пробуем через ss..."
  PID=$(ss -tlnp | grep :3000 | awk '{print $6}' | cut -d',' -f2 | cut -d'=' -f2 | head -1)
fi

if [ -n "$PID" ]; then
  echo "📌 Найден процесс PID: $PID"
  echo "Информация о процессе:"
  ps aux | grep $PID | grep -v grep || true

  echo ""
  read -p "Остановить процесс $PID? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🛑 Останавливаем процесс $PID..."
    kill -9 $PID || true
    sleep 2
    echo "✅ Процесс остановлен"
  else
    echo "❌ Отменено"
    exit 1
  fi
else
  echo "⚠️  Процесс не найден, но порт может быть занят"
  echo "Попробуем остановить все процессы Next.js..."
  pkill -f "next start" || true
  pkill -f "node.*next" || true
  sleep 2
fi

echo ""
echo "🔄 Перезапускаем PM2..."
pm2 stop ded-moroz-video || true
pm2 delete ded-moroz-video || true
sleep 1
pm2 start ecosystem.config.js --update-env
pm2 save

echo ""
echo "✅ Готово!"
pm2 status
