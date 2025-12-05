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
      max_memory_restart: '1G',
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.next'],
    },
  ],
};
