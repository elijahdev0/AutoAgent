# Build stage
FROM python:3.10-slim-buster as builder

WORKDIR /app
COPY pyproject.toml setup.cfg ./
COPY autoagent ./autoagent/

# Install build dependencies and create wheels
RUN apt-get update && \
    apt-get install -y build-essential libsqlite3-dev && \
    pip install pysqlite3-binary && \
    pip wheel --no-cache-dir --wheel-dir /wheels . && \
    rm -rf /var/lib/apt/lists/*

# Final stage
FROM python:3.10-slim-buster

WORKDIR /app

# Install runtime dependencies and wheels
COPY --from=builder /wheels /wheels
RUN apt-get update && \
    apt-get install -y ffmpeg sqlite3 libsqlite3-dev && \
    sqlite3 --version && \
    apt-get install -y software-properties-common && \
    add-apt-repository ppa:sergey-dryabzhinsky/sqlite3 -y && \
    apt-get update && \
    apt-get install -y sqlite3 libsqlite3-dev && \
    sqlite3 --version && \
    pip install --no-cache-dir /wheels/* && \
    rm -rf /var/lib/apt/lists/*

# Copy source code
COPY . .
RUN pip install -e .

CMD ["auto"]