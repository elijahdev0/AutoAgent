# Build stage
FROM ubuntu:22.04 as builder

WORKDIR /app

# Install miniconda
RUN apt-get update && \
    apt-get install -y wget && \
    wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O miniconda.sh && \
    bash miniconda.sh -b -p /opt/conda && \
    rm miniconda.sh

# Add conda to path
ENV PATH="/opt/conda/bin:${PATH}"

# Configure conda channels and install playwright
RUN conda config --add channels conda-forge && \
    conda config --add channels microsoft && \
    conda install -y pytest-playwright && \
    playwright install

COPY pyproject.toml setup.cfg ./
COPY autoagent ./autoagent/

# Install build dependencies and create wheels
RUN apt-get update && \
    apt-get install -y build-essential libsqlite3-dev python3-dev python3-pip && \
    pip install pysqlite3-binary && \
    pip wheel --no-cache-dir --wheel-dir /wheels . && \
    rm -rf /var/lib/apt/lists/*

# Final stage
FROM ubuntu:22.04

WORKDIR /app

# Install miniconda
RUN apt-get update && \
    apt-get install -y wget python3-pip python3-dev && \
    wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O miniconda.sh && \
    bash miniconda.sh -b -p /opt/conda && \
    rm miniconda.sh

# Add conda to path
ENV PATH="/opt/conda/bin:${PATH}"

# Configure conda channels and install playwright
RUN conda config --add channels conda-forge && \
    conda config --add channels microsoft && \
    conda install -y pytest-playwright && \
    playwright install

# Install runtime dependencies and wheels
COPY --from=builder /wheels /wheels
RUN apt-get update && \
    apt-get install -y ffmpeg sqlite3 libsqlite3-dev && \
    sqlite3 --version && \
    pip install --no-cache-dir /wheels/* && \
    rm -rf /var/lib/apt/lists/*

# Copy source code
COPY . .
RUN pip install -e .

CMD ["auto"]