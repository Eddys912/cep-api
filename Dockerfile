FROM node:20-bookworm

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm exec playwright@1.56.1 install --with-deps

RUN pnpm install

COPY . .

RUN pnpm run build

CMD [ "pnpm", "start" ]
