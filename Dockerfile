ARG DEFAULT_LANGUAGE=fr

FROM node:alpine as build

ARG DEFAULT_LANGUAGE

ENV LANGUAGE=${DEFAULT_LANGUAGE}

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /usr/src/app

COPY . /usr/src/app

RUN npm install

RUN uv python install 3.12

RUN npm run set-up-mechaphlowers

RUN npm run build:$LANGUAGE

FROM nginx:latest

ARG DEFAULT_LANGUAGE
ARG BACKEND_API_URL

ENV LANGUAGE=${DEFAULT_LANGUAGE}

ENV API_URL=${BACKEND_API_URL}

COPY --from=build /usr/src/app/dist/$LANGUAGE /usr/share/nginx/html

EXPOSE 80