FROM ghcr.io/puppeteer/puppeteer:24.2.1
ENV DBUS_SESSION_BUS_ADDRESS=autolaunch:

USER root
ARG HOST_UID=1001
ARG HOST_GID=1002
RUN usermod -u $HOST_UID pptruser && groupmod -g $HOST_GID pptruser && chown -R $HOST_UID:$HOST_GID /home/pptruser

USER pptruser
WORKDIR /home/pptruser

ENV PUPPETEER_CHROME_USER_DATA_DIR=/home/pptruser/chrome_data
ENV PUPPETEER_USER_QRCODE_IMG_DIR=/home/pptruser/qrcode_img

RUN mkdir -p $PUPPETEER_CHROME_USER_DATA_DIR $PUPPETEER_USER_QRCODE_IMG_DIR

VOLUME ["/home/pptruser/chrome_data"]
VOLUME ["/home/pptruser/qrcode_img"]

COPY package*.json ./
RUN npm install --omit=dev