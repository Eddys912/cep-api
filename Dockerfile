FROM mcr.microsoft.com/playwright/node:lts

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install

COPY . .

RUN pnpm run build

CMD [ "pnpm", "start" ]
