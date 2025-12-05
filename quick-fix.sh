#!/bin/bash
# Быстрое исправление проблемы с портом 3000
cd /home/appuser/app && \
pm2 stop all 2>/dev/null; pm2 delete all 2>/dev/null; pm2 kill 2>/dev/null; sleep 3 && \
lsof -ti:3000 2>/dev/null | xargs -r kill -9 2>/dev/null; \
ss -tlnp 2>/dev/null | grep :3000 | awk '{print $6}' | sed 's/.*pid=\([0-9]*\).*/\1/' | xargs -r kill -9 2>/dev/null; \
pkill -9 -f "next start" 2>/dev/null; pkill -9 -f "node.*next" 2>/dev/null; killall -9 node 2>/dev/null; \
sleep 5 && \
pm2 start ecosystem.config.js --update-env && pm2 save && \
echo "✅ Готово! Проверяем статус:" && pm2 status
