# MediaFlow AI

MediaFlow AI is a distributed media-processing platform built with TypeScript, Python, and RabbitMQ. It provides an asynchronous processing workflow for media files, with a web interface, service-based architecture, automated validation, and production observability.

The project focuses on backend engineering, asynchronous messaging, containerization, CI/CD, and operational monitoring.

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

MediaFlow AI includes a Prometheus and Grafana monitoring stack.

Current instrumentation covers the API Gateway, Python worker, and RabbitMQ.

- **Gateway:** HTTP request metrics and application metrics.
- **Worker:** job-processing metrics and retry-related metrics.
- **RabbitMQ:** broker metrics exposed through its Prometheus plugin.
- **Prometheus:** periodic scraping of configured targets.
- **Grafana:** dashboards for inspecting application and infrastructure behavior.

This setup helps investigate service availability, request activity, processing behavior, and messaging health.

## Testing

The project includes automated unit tests for important gateway and worker behavior.

### API Gateway

Requirements: Node.js and npm.

```powershell
cd gateway
npm ci
npm test
npm run build
```

The gateway test suite currently contains 23 tests covering authentication, metrics, and media-proxy behavior.

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

The worker test suite currently contains 36 tests covering validation, retry behavior, pipeline execution, and message-consumer behavior.

The environment values above are placeholders for local test execution. They are not production credentials.

## Local development

The local Compose configuration exposes the following endpoints:

| Service     | Local URL               |
| ----------- | ----------------------- |
| Frontend    | `http://localhost:8080` |
| API Gateway | `http://localhost:3000` |
| Prometheus  | `http://localhost:9090` |
| Grafana     | `http://localhost:3001` |

Grafana listens on port `3000` inside its container and is published on host port `3001` to avoid conflicting with the API Gateway.

### Prerequisites

- Docker Desktop with Docker Compose
- Node.js and npm for running gateway tests locally
- Python for running worker tests locally
- A local `.env` file configured for the Compose environment

### Configuration

Create or configure the root `.env` file using the variables referenced by `infra/compose/docker-compose.local.yml`.

Provide the appropriate database, authentication, RabbitMQ, AWS, and frontend demo configuration for your environment. Never commit real credentials or production secrets.

### Start the local environment

From the repository root:

```powershell
docker compose --env-file .\.env -f .\infra\compose\docker-compose.local.yml up -d --build
```

Check the running services:

```powershell
docker compose --env-file .\.env -f .\infra\compose\docker-compose.local.yml ps
```

Inspect logs:

```powershell
docker compose --env-file .\.env -f .\infra\compose\docker-compose.local.yml logs -f
```

Stop the local environment:

```powershell
docker compose --env-file .\.env -f .\infra\compose\docker-compose.local.yml down
```

The local Compose configuration publishes the frontend on port `8080`, the gateway on port `3000`, Prometheus on port `9090`, and Grafana on port `3000` as configured by the local monitoring setup. Check the Compose port mappings before opening services, since port conflicts can prevent containers from starting.

## CI/CD

GitHub Actions provides an automated pipeline triggered by pushes to `main`.

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
