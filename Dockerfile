FROM node:20-bookworm

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install

RUN pnpm exec playwright install --with-deps

COPY . .

RUN pnpm run build

CMD [ "pnpm", "start" ]
