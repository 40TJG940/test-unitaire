# --- Etape build ---
FROM gcc:13-bookworm AS builder
WORKDIR /app
COPY calculator.h calculator.c server.c ./
RUN gcc -O2 -Wall -Wextra -std=c11 -o calculator-backend server.c calculator.c -lm

# --- Etape production ---
FROM debian:bookworm-slim AS production
WORKDIR /app
COPY --from=builder /app/calculator-backend /usr/local/bin/calculator-backend
ENV PORT=3000
EXPOSE 3000
CMD ["calculator-backend"]
