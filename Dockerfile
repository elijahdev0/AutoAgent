# Build stage
FROM python:3.10-slim-buster as builder

WORKDIR /app
COPY pyproject.toml setup.cfg ./
COPY autoagent ./autoagent/

# Install build dependencies and create wheels
RUN apt-get update && \
    apt-get install -y build-essential libsqlite3-dev && \
    pip wheel --no-cache-dir --wheel-dir /wheels . pysqlite3-binary && \
    rm -rf /var/lib/apt/lists/*

# Final stage
FROM python:3.10-slim-buster

WORKDIR /app

# Install runtime dependencies and wheels
COPY --from=builder /wheels /wheels
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    pip install --no-cache-dir /wheels/* && \
    rm -rf /wheels /var/lib/apt/lists/*

# Copy source code
COPY . .
RUN pip install -e .

CMD ["auto"]