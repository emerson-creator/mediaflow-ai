FROM python:3.12-slim

# ffmpeg viene de los repos de Debian
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

# Usuario no-root por seguridad
RUN useradd --create-home worker && chown -R worker:worker /app
USER worker

CMD ["python", "-m", "app.main"]