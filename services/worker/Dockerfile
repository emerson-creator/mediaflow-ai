FROM python:3.12-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg curl libmagic1 ca-certificates unzip && \
    rm -rf /var/lib/apt/lists/*

# Install Deno for yt-dlp JavaScript challenge solving
RUN curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh && \
    /usr/local/bin/deno --version

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

RUN useradd --create-home worker && chown -R worker:worker /app
USER worker

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD find /tmp/worker_heartbeat -mmin -1 | grep -q . || exit 1

CMD ["python", "-m", "app.main"]