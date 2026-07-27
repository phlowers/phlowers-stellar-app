ARG DEFAULT_LANGUAGE=fr

FROM node:22-alpine AS build

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /usr/src/app

COPY . /usr/src/app

RUN npm install

RUN uv python install 3.13

RUN npm run set-up-mechaphlowers

RUN npm run build

FROM nginx:latest

ARG DEFAULT_LANGUAGE=fr

COPY --from=build /usr/src/app/dist /usr/share/nginx/html

RUN echo "{\"defaultLang\": \"${DEFAULT_LANGUAGE}\"}" \
    > /usr/share/nginx/html/assets/config/app-config.json

EXPOSE 80