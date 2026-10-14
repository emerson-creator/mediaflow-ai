<div align="center">

<img src="frontend/public/favicon.svg" alt="MediaFlow AI logo" width="88" height="88" />

# MediaFlow AI

**Distributed, asynchronous media processing — observable from end to end.**

A media-processing platform built with TypeScript, Python, and RabbitMQ, featuring a web interface,
service-based architecture, automated validation, and production observability.

<br />

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)

![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/Neon_PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![AWS S3](https://img.shields.io/badge/AWS_S3-569A31?style=for-the-badge&logo=amazons3&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)

![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)
![Prometheus](https://img.shields.io/badge/Prometheus-E6522C?style=for-the-badge&logo=prometheus&logoColor=white)
![Grafana](https://img.shields.io/badge/Grafana-F46800?style=for-the-badge&logo=grafana&logoColor=white)

<br />

![Gateway tests](https://img.shields.io/badge/gateway_tests-23_passing-brightgreen)
![Worker tests](https://img.shields.io/badge/worker_tests-36_passing-brightgreen)

[Preview](#preview) · [Architecture](#architecture) · [Observability](#observability) · [Testing](#testing) · [Local development](#local-development) · [CI/CD](#cicd)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Preview](#preview)
- [Architecture](#architecture)
- [Observability](#observability)
- [Testing](#testing)
- [Local development](#local-development)
- [CI/CD](#cicd)
- [Security considerations](#security-considerations)
- [Engineering focus](#engineering-focus)

## Overview

MediaFlow AI provides an asynchronous processing workflow for media files. Users submit media through a web interface, the platform publishes jobs to RabbitMQ, a Python worker processes them independently of incoming requests, and clients receive real-time notifications as work progresses.

The project focuses on backend engineering, asynchronous messaging, containerization, CI/CD, and operational monitoring.

## Preview

<!--
  GIF tips:
  - Keep each recording under ~15-20 seconds and ~8 MB.
  - Record at ~1280px wide and export at 800-900px.
  - Save them in docs/assets/ with the file names used below.
-->

### 🎬 Upload to result, in real time

Submit a media file, watch the job move through the pipeline, and receive the live notification when processing completes.

<p align="center">
  <img src="frontend/public/mediaflow-demo.gif" alt="MediaFlow AI: upload, processing, and real-time notification" width="900" />
</p>

### 📈 Observability stack

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

| Component      | Technology             | Responsibility                                                |
| -------------- | ---------------------- | ------------------------------------------------------------- |
| Frontend       | Web application, Nginx | User interface and API access                                 |
| API Gateway    | NestJS, TypeScript     | API entry point, authentication, request routing, and metrics |
| Ingestion      | Node.js, TypeScript    | Media ingestion and asynchronous job publishing               |
| Notification   | Node.js, Socket.IO     | Real-time client notifications                                |
| Worker         | Python, asyncio        | Asynchronous media-processing pipeline                        |
| Message broker | RabbitMQ               | Job distribution, retries, and dead-letter handling           |
| Database       | Neon PostgreSQL        | Persistent application data                                   |
| Object storage | AWS S3                 | Media and object storage                                      |
| Metrics        | Prometheus             | Metrics collection                                            |
| Dashboards     | Grafana                | Operational visualization                                     |

Services communicate through HTTP and asynchronous messaging where appropriate. RabbitMQ decouples job submission from processing, allowing workers to process jobs independently of incoming requests.

## Observability

MediaFlow AI includes a Prometheus and Grafana monitoring stack. Current instrumentation covers the API Gateway, Python worker, and RabbitMQ.

| Source         | What is measured                                       |
| -------------- | ------------------------------------------------------ |
| **Gateway**    | HTTP request metrics and application metrics           |
| **Worker**     | Job-processing metrics and retry-related metrics       |
| **RabbitMQ**   | Broker metrics exposed through its Prometheus plugin   |
| **Prometheus** | Periodic scraping of configured targets                |
| **Grafana**    | Dashboards for application and infrastructure behavior |

This setup helps investigate service availability, request activity, processing behavior, and messaging health.

## Testing

The project includes automated unit tests for important gateway and worker behavior.

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

## CI/CD

GitHub Actions provides an automated pipeline triggered by pushes to `main`:

```mermaid
flowchart LR
    A[Push to main] --> B[Validate]
    B --> C[Build Docker images]
    C --> D[Publish to GHCR]
    D --> E[Deploy to production server]
```

The pipeline validates application components, builds and publishes Docker images to GitHub Container Registry (GHCR), and deploys the resulting images to the production server after validation and publication succeed.

Gateway and worker tests are being integrated into the validation job so that test failures prevent downstream publication and deployment.

Production configuration and secrets are maintained separately from the repository. Never store production environment files, credentials, access tokens, or private keys in source control.

## Security considerations

- Keep environment files and credentials out of version control.
- Use environment-specific configuration for local and production deployments.
- Keep production secrets outside the repository.
- Restrict access to infrastructure management interfaces.
- Use HTTPS for public application access.
- Avoid exposing internal service ports unnecessarily.

## Engineering focus

MediaFlow AI demonstrates practical work with:

- Distributed service architecture
- Asynchronous job processing with RabbitMQ
- Retry handling and dead-letter queues
- REST APIs and real-time notifications
- Python and TypeScript services
- Docker and Docker Compose
- CI/CD with GitHub Actions and GHCR
- Metrics collection and dashboards with Prometheus and Grafana
- Automated testing and production operations

---

<div align="center">
  <sub>Built with TypeScript, Python, and RabbitMQ.</sub>
</div>
