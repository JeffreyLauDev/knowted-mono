# Multi-stage build for NestJS application
FROM node:24.3.0-alpine3.22
RUN mkdir -p /home/node/app
# Set working directory
WORKDIR /home/node/app
RUN chmod 755 -R /home/node/app
RUN chown -R node /home/node/app
RUN apk update
RUN apk add --no-cache python3 make g++ bash

# Install pnpm
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml /home/node/app/
RUN pnpm install --frozen-lockfile
COPY . /home/node/app
RUN pnpm run build
EXPOSE 3000
USER node

CMD ["pnpm", "run", "start:prod"] 