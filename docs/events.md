# Contrato de eventos

Exchange: `mediaflow.events` (topic, durable)

## media.uploaded

Publicado por: Ingestion | Consumido por: Worker
{
"mediaId": "uuid",
"userId": "uuid",
"bucket": "media-uploads",
"objectKey": "uploads/{userId}/{mediaId}/{filename}",
"mimeType": "video/mp4",
"sizeBytes": 123456,
"occurredAt": "ISO-8601"
}

## media.progress.updated

Publicado por: Worker | Consumido por: Notification
{
"mediaId": "uuid",
"userId": "uuid",
"stage": "DOWNLOADING | EXTRACTING_AUDIO | TRANSCRIBING | SUMMARIZING | DONE | FAILED",
"progress": 0-100,
"message": "opcional",
"occurredAt": "ISO-8601"
}
