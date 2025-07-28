module.exports = {
  apps: [
    {
      name: 'yt-dlpservice',
      script: 'npm',
      args: 'start',
      cwd: '/home/ubuntu/yt-dlpservice', // 根据实际用户和路径调整
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0'
      },
      log_file: './logs/app.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 10,
      kill_timeout: 5000,
      // 自动重启条件
      restart_delay: 4000,
      // 监控配置
      monitoring: false,
      // 实例配置
      exec_mode: 'fork',
      // 环境变量文件
      env_file: '.env'
    }
  ],

  // 部署配置 (可选)
  deploy: {
    production: {
      user: 'ubuntu',
      host: 'your-server-ip', // 替换为您的服务器IP
      ref: 'origin/main',
      repo: 'https://github.com/shrekai2025/yt-dlpservice.git', // 替换为您的GitHub仓库
      path: '/home/ubuntu/yt-dlpservice',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
}; 