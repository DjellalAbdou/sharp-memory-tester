FROM node:18.15.0-slim

RUN set -eux; \
  apt-get update; \
  apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev libjemalloc2; \
  rm -rf /var/lib/apt/lists/*

ENV LD_PRELOAD=libjemalloc.so.2

WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package.json yarn.lock .yarnrc.yml ./
RUN corepack enable
RUN yarn install --immutable

COPY . .
RUN yarn build
RUN mkdir -p dist/output
# Copy the script and images to the app directory

CMD ["node", "dist/index.js"]
# Run the Node.js script