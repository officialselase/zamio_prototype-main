FROM node:20-alpine
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY packages ./packages
COPY zamio_frontend ./zamio_frontend
COPY zamio_admin ./zamio_admin
COPY zamio_stations ./zamio_stations
COPY zamio_publisher ./zamio_publisher
RUN npm install
