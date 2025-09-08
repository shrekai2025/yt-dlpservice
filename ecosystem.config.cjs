const path = require('path');
const os = require('os');

module.exports = {
  apps: [
    {
      name: 'yt-dlpservice',
      script: 'npm',
      args: 'start',
      cwd: process.cwd(), // 使用当前工作目录
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0'
      },
      // 添加资源限制，减少对其他服务的影响
      node_args: '--max-old-space-size=1024', // 限制内存使用到1GB
      max_restarts: 10,
      min_uptime: '10s',
      
      // 日志配置 - 使用相对路径
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_file: './logs/combined.log',
      time: true,
      
      // 进程优先级设置
      exec_mode: 'fork',
      nice: 10, // 降低进程优先级
      
      // 监控配置
      monitoring: true,
      pmx: true,
      
      // 优雅关闭
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // 环境变量
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
        // 添加Node.js性能优化
        NODE_OPTIONS: '--max-old-space-size=1024 --optimize-for-size',
        UV_THREADPOOL_SIZE: 4 // 限制线程池大小
      }
    },
    {
      name: 'yt-dlp-auto-updater',
      script: 'node',
      args: 'scripts/smart-ytdlp-updater.js',
      cwd: process.cwd(),
      instances: 1,
      autorestart: false, // 任务完成后不自动重启
      watch: false,
      
      // 定时任务配置 - 每天凌晨3点执行
      cron_restart: '0 3 * * *',
      
      // 日志配置 - 独立的更新日志
      out_file: './logs/updater-out.log',
      error_file: './logs/updater-error.log',
      log_file: './logs/updater-combined.log',
      time: true,
      
      // 资源限制
      max_memory_restart: '256M',
      node_args: '--max-old-space-size=256',
      
      // 优雅关闭配置
      kill_timeout: 30000, // 30秒超时，给更新过程足够时间
      listen_timeout: 5000,
      
      // 进程优先级 - 更新任务优先级较低
      nice: 15,
      
      // 环境变量
      env: {
        NODE_ENV: 'production',
        TEMP_DIR: './temp',
        DATABASE_URL: 'file:./data/app.db'
      },
      env_production: {
        NODE_ENV: 'production',
        TEMP_DIR: './temp',
        DATABASE_URL: 'file:./data/app.db'
      },
      
      // 禁用一些不需要的功能
      monitoring: false,
      pmx: false
    }
  ],

  // 部署配置 (可选) - 根据系统类型调整
  deploy: {
    production: {
      user: os.platform() === 'darwin' ? os.userInfo().username : 'ubuntu',
      host: 'your-server-ip', // 替换为您的服务器IP
      ref: 'origin/main',
      repo: 'https://github.com/shrekai2025/yt-dlpservice.git',
      path: os.platform() === 'darwin' ? process.cwd() : '/home/ubuntu/yt-dlpservice',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
}; 