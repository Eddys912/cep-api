FROM node:20-bookworm

RUN pnpm exec playwright@1.56.1 install --with-deps

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install

COPY . .

RUN pnpm run build

CMD [ "pnpm", "start" ]
