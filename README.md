# MediaFlow AI

Plataforma de procesamiento multimedia con IA basada en microservicios y eventos.

## Fase 0: infraestructura local

```bash
cp .env.example .env            # ajusta las contraseñas
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml ps
```

| Servicio   | URL / puerto                     |
|------------|----------------------------------|
| RabbitMQ   | http://localhost:15672 (panel)   |
| MinIO      | http://localhost:9001 (consola)  |
| PostgreSQL | localhost:5432                   |
| Redis      | localhost:6379                   |

Prueba de humo de RabbitMQ:

```bash
pip install pika
set -a && source .env && set +a
python scripts/smoke_rabbitmq.py
```
