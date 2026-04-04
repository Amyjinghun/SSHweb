FROM node:18-alpine

WORKDIR /app

# 设置镜像源加速
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories
RUN npm config set registry https://registry.npmmirror.com

# 复制所有文件
COPY server ./server
COPY client ./client

# 安装后端依赖
RUN cd server && npm install --production

# 安装前端依赖并构建
RUN cd client && npm install && npm run build

# 创建数据目录
RUN mkdir -p /app/server/data /app/server/uploads

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "server/index.js"]
