FROM python:3.10-slim-buster

WORKDIR /app

COPY . /app/

RUN apt-get update && \
    apt-get install -y \
    libsqlite3-dev \
    ffmpeg && \
    rm -rf /var/lib/apt/lists/* && \
    pip install --no-cache-dir --upgrade pysqlite3 && \
    pip install --no-cache-dir -e .

CMD ["auto"]