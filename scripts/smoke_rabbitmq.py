"""Prueba de humo: publica un mensaje persistente y lo consume con ack manual.

Requisitos: pip install pika
Uso:        python scripts/smoke_rabbitmq.py
Lee RABBITMQ_USER / RABBITMQ_PASSWORD del entorno (o usa los del .env.example).
"""
import json
import os

import pika

USER = os.getenv("RABBITMQ_USER", "mediaflow")
PASSWORD = os.getenv("RABBITMQ_PASSWORD", "cambia_esto_rabbit")
HOST = os.getenv("RABBITMQ_HOST", "localhost")
QUEUE = "smoke.test"

params = pika.ConnectionParameters(
    host=HOST, credentials=pika.PlainCredentials(USER, PASSWORD)
)
conn = pika.BlockingConnection(params)
ch = conn.channel()

# Cola durable + mensaje persistente: sobreviven a un reinicio del broker.
ch.queue_declare(queue=QUEUE, durable=True)

body = json.dumps({"event": "smoke.test", "msg": "hola MediaFlow"})
ch.basic_publish(
    exchange="",
    routing_key=QUEUE,
    body=body,
    properties=pika.BasicProperties(delivery_mode=pika.DeliveryMode.Persistent),
)
print("Publicado:", body)

method, _props, received = ch.basic_get(queue=QUEUE, auto_ack=False)
if method is None:
    raise SystemExit("No llegó ningún mensaje")
print("Consumido:", received.decode())
ch.basic_ack(method.delivery_tag)  # ack manual: recién aquí sale de la cola
print("OK: RabbitMQ funciona")
conn.close()
