FROM node:10

WORKDIR /opt/nodeapp

COPY package.json .

RUN set -xe \
    && npm config set registry http://registry.npm.taobao.org/ \
    && npm install -ddd --no-optional \
    && npm cache clean -f

COPY server.js .
COPY public ./public

EXPOSE 80

CMD ["node", "server.js"]
