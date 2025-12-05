module.exports = {
  apps: [
    {
      name: 'ded-moroz-video',
      // Используем обычный next start вместо standalone для простоты
      // Standalone режим требует дополнительной настройки путей
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: process.cwd(),
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Next.js автоматически загружает .env файлы из корня проекта
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      restart_delay: 5000, // Задержка 5 секунд перед перезапуском
      max_restarts: 5, // Максимум 5 перезапусков
      min_uptime: '10s', // Минимальное время работы, чтобы считать запуск успешным
      max_memory_restart: '1G',
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.next'],
      // Останавливаем перезапуски, если приложение падает слишком часто
      exp_backoff_restart_delay: 100,
      stop_exit_codes: [0], // Перезапускать только при ненулевом коде выхода
    },
  ],
};
