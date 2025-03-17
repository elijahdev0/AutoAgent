FROM python:3.10-slim-buster

WORKDIR /app

COPY . /app/

RUN pip install --no-cache-dir -e .

CMD ["auto"]