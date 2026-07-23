FROM node:20-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
# react-scripts 5.0.1의 peerOptional typescript 범위(^3.2.1||^4)가 설치된
# TypeScript 5.x와 충돌해서 --legacy-peer-deps 없이는 npm ci가 실패한다.
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
