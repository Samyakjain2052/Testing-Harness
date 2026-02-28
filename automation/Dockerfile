# Use full Debian so that `npx playwright install --with-deps` can
# install Chromium/Firefox/WebKit OS-level dependencies via apt-get.
FROM node:22-bookworm

WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY automation/package.json automation/

RUN npm ci --workspace=shared --workspace=automation

# Install Playwright browsers that match the exact @playwright/test version
# in node_modules. --with-deps handles all required OS-level libraries.
RUN npx playwright install --with-deps

COPY shared/ shared/
COPY automation/ automation/
COPY tsconfig.base.json tsconfig.json ./

# tsc --build handles the shared project reference automatically
RUN npm run build -w automation

CMD ["node", "automation/dist/index.js"]
