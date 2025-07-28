# YT-DLP Service Dockerfile (可选部署方式)
FROM node:20-bullseye-slim

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# 安装 yt-dlp
RUN python3 -m pip install --user yt-dlp

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装 Node.js 依赖
RUN npm ci --only=production

# 复制应用代码
COPY . .

# 生成 Prisma Client
RUN npx prisma generate

# 构建应用
RUN npm run build

# 创建必要的目录
RUN mkdir -p data logs /tmp/yt-dlpservice

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

# 启动应用
CMD ["npm", "start"] 