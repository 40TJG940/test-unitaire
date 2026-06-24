# Backend Go + front embarqué — à builder depuis la RACINE.
FROM golang:1.23 AS build
WORKDIR /src
COPY Back_go/ ./
RUN CGO_ENABLED=0 go build -o /calc .

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app/Back_go
COPY --from=build /calc /usr/local/bin/calc
COPY public /app/public
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=5s \
    CMD curl -sf http://localhost:3000/ || exit 1
CMD ["calc"]
