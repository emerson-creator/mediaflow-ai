<div align="center">

<img src="frontend/public/favicon.svg" alt="MediaFlow AI logo" width="88" height="88" />

# MediaFlow AI

**Distributed, asynchronous media processing — observable from end to end.**

Turn audio, video, and YouTube links into transcripts, summaries, and keywords. Built with TypeScript, Python, and RabbitMQ,
and running in production on a VPS I provisioned, hardened, and deploy to myself.

<br />

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)

![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/Neon_PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![AWS S3](https://img.shields.io/badge/AWS_S3-569A31?style=for-the-badge&logo=amazons3&logoColor=white)
![FFmpeg](https://img.shields.io/badge/FFmpeg-007808?style=for-the-badge&logo=ffmpeg&logoColor=white)

![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)
![DigitalOcean](https://img.shields.io/badge/DigitalOcean-0080FF?style=for-the-badge&logo=digitalocean&logoColor=white)
![Let's Encrypt](https://img.shields.io/badge/Let's_Encrypt-003A70?style=for-the-badge&logo=letsencrypt&logoColor=white)

![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)
![Prometheus](https://img.shields.io/badge/Prometheus-E6522C?style=for-the-badge&logo=prometheus&logoColor=white)
![Grafana](https://img.shields.io/badge/Grafana-F46800?style=for-the-badge&logo=grafana&logoColor=white)

<br />

![Live](https://img.shields.io/badge/live-mediaflow.emersonic.dev-brightgreen)
![Gateway tests](https://img.shields.io/badge/gateway_tests-23_passing-brightgreen)
![Worker tests](https://img.shields.io/badge/worker_tests-36_passing-brightgreen)

[Live demo](https://mediaflow.emersonic.dev) · [Preview](#preview) · [Architecture](#architecture) · [Design decisions](#key-design-decisions) · [Production](#production-deployment) · [Observability](#observability) · [Testing](#testing) · [Local development](#local-development)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Preview](#preview)
- [Architecture](#architecture)
- [Key design decisions](#key-design-decisions)
- [Production deployment](#production-deployment)
- [Observability](#observability)
- [Testing](#testing)
- [Local development](#local-development)
- [Known limitations](#known-limitations)
- [Engineering focus](#engineering-focus)

## Overview

MediaFlow AI is an asynchronous processing platform for media files. Users upload audio or video (up to about 500 MB) or submit a YouTube link through a web interface. The platform publishes a job to RabbitMQ, a Python worker processes it independently of incoming requests, and the browser receives live progress as the work advances.

Each job produces a timestamped transcript, a summary, and keywords, with in-browser playback of the original media.

The project is built the way a production system would be: heavy work never blocks a request, failures are retried instead of lost, every release is traceable to a commit, and a failed deploy rolls itself back.

## Preview

### Upload to result, in real time

Submit a media file, watch the job move through the pipeline, and receive the live notification when processing completes.

<p align="center">
  <img src="frontend/public/mediaflow-demo.gif" alt="MediaFlow AI: upload, processing, and real-time notification" width="900" />
</p>

### Observability stack

Grafana dashboards, Prometheus targets, and RabbitMQ metrics reacting to live traffic.

<p align="center">
  <img src="frontend/public/mediaflow-observability.gif" alt="MediaFlow AI observability: Grafana, Prometheus and RabbitMQ" width="900" />
</p>

## Architecture

```mermaid
flowchart TD
    U[User] --> F[Frontend - Nginx]
    F --> G[API Gateway - NestJS]
    F <--> N[Notification Service]

    subgraph Services
        G --> I[Ingestion Service]
        W[Python Worker]
        N
    end

    subgraph Messaging
        R{{RabbitMQ}}
    end

    subgraph Data
        D[(Neon PostgreSQL)]
        S[(AWS S3)]
    end

    I -->|publish job| R
    R -->|consume job| W
    N <--> R

    G --> D
    I --> D
    W --> D
    W --> S

    subgraph Observability
        P[Prometheus] --> GR[Grafana]
    end

    P -.->|scrape| G
    P -.->|scrape| W
    P -.->|scrape| R
```

### Core services

| Component      | Technology                   | Responsibility                                                |
| -------------- | ---------------------------- | ------------------------------------------------------------- |
| Frontend       | React, Vite, Tailwind, Nginx | User interface, API and WebSocket reverse proxy               |
| API Gateway    | NestJS, TypeScript           | API entry point, authentication, request routing, and metrics |
| Ingestion      | Node.js, TypeScript          | Media registration and asynchronous job publishing            |
| Notification   | Node.js, Socket.IO           | Real-time client notifications                                |
| Worker         | Python, asyncio, FFmpeg      | Audio extraction, transcription, summary, and keywords        |
| Message broker | RabbitMQ                     | Job distribution, retries, and dead-letter handling           |
| Database       | Neon PostgreSQL              | Persistent application data                                   |
| Object storage | AWS S3                       | Media and object storage                                      |
| Metrics        | Prometheus                   | Metrics collection                                            |
| Dashboards     | Grafana                      | Operational visualization                                     |

### Event flow

```mermaid
sequenceDiagram
    participant B as Browser
    participant A as API (gateway + ingestion)
    participant S as AWS S3
    participant R as RabbitMQ
    participant W as Python worker
    participant N as Notification service

    B->>A: Request upload URL
    A-->>B: Presigned URL
    B->>S: Upload file directly (up to ~500 MB)
    B->>A: Register media
    A->>R: Publish media.uploaded
    A-->>B: Accepted (responds immediately)
    R->>W: Deliver job
    W->>S: Read media
    loop Pipeline stages
        W->>R: Publish progress event
        R->>N: Progress event
        N-->>B: Live update (Socket.IO)
    end
```

## Key design decisions

**Direct-to-storage uploads.** The API never touches the file. It issues a presigned S3 URL, the browser uploads straight to storage, and the API only registers the media. Files of hundreds of megabytes don't consume the API's memory, bandwidth, or request time.

**Decoupled by a message broker.** After an upload, the API publishes a `media.uploaded` event and responds immediately. The worker consumes jobs when it has capacity, so slow processing never blocks users. Failed jobs are retried and, when they keep failing, land in a dead-letter queue instead of disappearing. The worker is designed to tolerate redelivery, which makes retries safe.

**The right runtime for each service.** NestJS for authentication and ingestion, Python for the processing pipeline (FFmpeg, transcription, summary, keywords), and a small Node service with Socket.IO for real-time delivery.

**Live progress without polling.** The worker publishes progress events as it goes. The notification service relays each one to the browser over Socket.IO, so users watch the job advance instead of refreshing a page.

**Immutable, traceable releases.** Every service is built into an image tagged with its commit SHA, never `latest`. Any release maps to a commit, and a rollback is a tag change.

**One public entry point.** Nginx serves the frontend and reverse-proxies the API and WebSocket traffic under a single domain. It is the only service exposed to the internet.

## Production deployment

MediaFlow is live at [mediaflow.emersonic.dev](https://mediaflow.emersonic.dev), on a DigitalOcean VPS that I provisioned and hardened myself.

```mermaid
flowchart LR
    A[Push to main] --> B[Gateway + worker tests]
    B --> C[Build images, tagged by commit SHA]
    C --> D[Publish to GHCR]
    D --> E[SSH deploy to VPS]
    E --> F{Healthchecks pass?}
    F -->|yes| G[Live]
    F -->|no| H[Roll back to previous image tag]
```

**Pipeline.** GitHub Actions runs the gateway and worker tests, builds the five service images, publishes them to GitHub Container Registry (GHCR), and deploys over SSH with Docker Compose. A failing test stops the pipeline before any image is built. If the new containers don't pass their healthchecks, the deploy rolls back to the previously running image tag.

**Runtime.** Every service runs under Docker Compose with healthchecks, restart policies, resource limits, and internal networks. Only Nginx is exposed publicly.

**Edge.** Nginx terminates TLS with Certbot certificates (auto-renewed), redirects HTTP to HTTPS, sends HSTS, and allows only TLS 1.2 and 1.3.

**Server hardening.**

- SSH key authentication only, root login disabled, non-default port
- Firewall allowing only 80, 443, and SSH, plus fail2ban against brute force
- Automatic security updates
- Dedicated non-root deploy user
- Secrets kept on the server, never in the repository

The managed PostgreSQL database runs on Neon, and media lives in AWS S3.

## Observability

MediaFlow AI includes a Prometheus and Grafana monitoring stack. Instrumentation covers the API Gateway, the Python worker, and RabbitMQ.

| Source         | What is measured                                       |
| -------------- | ------------------------------------------------------ |
| **Gateway**    | HTTP request metrics and application metrics           |
| **Worker**     | Job-processing metrics and retry-related metrics       |
| **RabbitMQ**   | Broker metrics, including queue depth                  |
| **Prometheus** | Periodic scraping of configured targets                |
| **Grafana**    | Dashboards for application and infrastructure behavior |

A stuck pipeline shows up on a dashboard: queue depth grows while the worker's processing metrics flatten. Together with the container healthchecks, that covers service availability, request activity, processing behavior, and messaging health.

## Testing

The project includes automated unit tests for important gateway and worker behavior. **They run in the CI pipeline on every push to `main`, and a failure blocks the build and the deploy.**

| Suite       | Tests | Covers                                                 |
| ----------- | :---: | ------------------------------------------------------ |
| API Gateway |  23   | Authentication, metrics, and media-proxy behavior      |
| Worker      |  36   | Validation, retry behavior, pipeline, message consumer |

### API Gateway

Requirements: Node.js and npm.

```powershell
cd gateway
npm ci
npm test
npm run build
```

### Python Worker

Requirements: Python 3.12 or a compatible environment supported by the dependencies.

From the repository root:

```powershell
python -m pip install -r services/worker/requirements-dev.txt

$env:PYTHONPATH = (Resolve-Path .\services\worker).Path
$env:DATABASE_URL = "postgresql://test:test@localhost:5432/test"
$env:RABBITMQ_USER = "test"
$env:RABBITMQ_PASSWORD = "test"
$env:AWS_ACCESS_KEY_ID = "test"
$env:AWS_SECRET_ACCESS_KEY = "test"
$env:OPENAI_API_KEY = "test"

python -m pytest .\services\worker\test -v
```

> The environment values above are placeholders for local test execution. They are not production credentials.

## Local development

The local Compose configuration exposes the following endpoints:

| Service     | Local URL               |
| ----------- | ----------------------- |
| Frontend    | `http://localhost:8080` |
| API Gateway | `http://localhost:3000` |
| Prometheus  | `http://localhost:9090` |
| Grafana     | `http://localhost:3001` |

> Grafana listens on port `3000` inside its container and is published on host port `3001` to avoid conflicting with the API Gateway. If a container fails to start, check the Compose port mappings for conflicts.

### Prerequisites

- Docker Desktop with Docker Compose
- Node.js and npm for running gateway tests locally
- Python for running worker tests locally
- A local `.env` file configured for the Compose environment

### Configuration

Create or configure the root `.env` file using the variables referenced by `infra/compose/docker-compose.local.yml`.

Provide the appropriate database, authentication, RabbitMQ, AWS, and frontend demo configuration for your environment. **Never commit real credentials or production secrets.**

### Commands

All commands run from the repository root.

```powershell
# Start the local environment
docker compose --env-file .\.env -f .\infra\compose\docker-compose.local.yml up -d --build

# Check the running services
docker compose --env-file .\.env -f .\infra\compose\docker-compose.local.yml ps

# Follow the logs
docker compose --env-file .\.env -f .\infra\compose\docker-compose.local.yml logs -f

# Stop the local environment
docker compose --env-file .\.env -f .\infra\compose\docker-compose.local.yml down
```

## Known limitations

- **Single VPS.** Production runs on one server with Docker Compose. That keeps operations simple and cheap, but there is no redundancy. Managed orchestration would be the next step for real scale.
- **Rollback restores images, not data.** Changes to message formats and the database schema have to stay compatible with the previous release.
- **External AI providers.** Transcription and summaries depend on third-party providers, so latency and cost follow theirs. A provider abstraction in front of them would make them swappable.

## Engineering focus

MediaFlow AI demonstrates practical work with:

- Distributed service architecture
- Asynchronous job processing with RabbitMQ, retries, and dead-letter queues
- Direct-to-storage uploads with presigned URLs
- REST APIs and real-time notifications over Socket.IO
- Python and TypeScript services
- Docker and Docker Compose with healthchecks and resource limits
- CI/CD with GitHub Actions and GHCR: tests, commit-tagged images, automatic rollback
- VPS provisioning and hardening, Nginx, and TLS with Certbot
- Metrics collection and dashboards with Prometheus and Grafana
- Automated testing in the delivery pipeline

---

<div align="center">
  <sub>Built with TypeScript, Python, and RabbitMQ.</sub>
</div>
