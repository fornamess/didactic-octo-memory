#!/bin/bash
set -e

echo "🚨 СРОЧНАЯ ОЧИСТКА ПОРТА 3000"

# Переходим в директорию приложения
cd /home/appuser/app || exit 1

# 1. Останавливаем PM2 полностью
echo "⏹️  Останавливаем PM2..."
pm2 stop all || true
pm2 delete all || true
pm2 kill || true
sleep 2

# 2. Находим и убиваем все процессы на порту 3000
echo "🔍 Ищем процессы на порту 3000..."

# Функция для поиска и убийства процессов
kill_port_processes() {
  # Через lsof
  if command -v lsof &> /dev/null; then
    PIDS=$(lsof -ti:3000 2>/dev/null || true)
    if [ -n "$PIDS" ]; then
      echo "📌 Найдены через lsof: $PIDS"
      echo "$PIDS" | xargs -r kill -9 || true
    fi
  fi

  # Через ss
  PIDS=$(ss -tlnp 2>/dev/null | grep :3000 | awk '{print $6}' | sed 's/.*pid=\([0-9]*\).*/\1/' | sort -u || true)
  if [ -n "$PIDS" ]; then
    echo "📌 Найдены через ss: $PIDS"
    echo "$PIDS" | xargs -r kill -9 || true
  fi

  # Через netstat
  if command -v netstat &> /dev/null; then
    PIDS=$(netstat -tlnp 2>/dev/null | grep :3000 | awk '{print $7}' | cut -d'/' -f1 | grep -E '^[0-9]+$' | sort -u || true)
    if [ -n "$PIDS" ]; then
      echo "📌 Найдены через netstat: $PIDS"
      echo "$PIDS" | xargs -r kill -9 || true
    fi
  fi
}

# Выполняем поиск и убийство несколько раз
for i in {1..3}; do
  echo "Попытка $i из 3..."
  kill_port_processes
  sleep 2
done

# 3. Убиваем все Node.js процессы
echo "🧹 Убиваем все Node.js процессы..."
pkill -9 -f "next start" || true
pkill -9 -f "node.*next" || true
pkill -9 -f "\.next" || true
killall -9 node 2>/dev/null || true

sleep 3

# 4. Проверяем результат
echo ""
echo "🔍 Проверяем статус порта 3000..."
if command -v ss &> /dev/null; then
  PORT_STATUS=$(ss -tlnp | grep :3000 || echo "")
  if [ -z "$PORT_STATUS" ]; then
    echo "✅ Порт 3000 свободен!"
  else
    echo "⚠️  Порт 3000 всё ещё занят:"
    ss -tlnp | grep :3000
    echo ""
    echo "Попробуйте выполнить вручную:"
    echo "  ss -tlnp | grep :3000"
    echo "  kill -9 <PID>"
  fi
fi

echo ""
echo "🔄 Теперь можно запустить PM2:"
echo "  pm2 start ecosystem.config.js --update-env"
