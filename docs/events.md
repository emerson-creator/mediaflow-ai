# Event contract

Exchange: `mediaflow.events` (topic, durable)

## media.uploaded

Published by: Ingestion | Consumed by: Worker
{
"eventId": "uuid", // NEW: unique per message, for tracing/DLQ
"mediaId": "uuid",
"userId": "uuid",
"bucket": "media-uploads",
"objectKey": "uploads/{userId}/{mediaId}/{filename}",
"mimeType": "video/mp4",
"sizeBytes": 123456,
"attempt": 1, // NEW: retry counter, starts at 1
"occurredAt": "ISO-8601"
}

## media.progress.updated

Published by: Worker | Consumed by: Notification
{
"mediaId": "uuid",
"userId": "uuid",
"stage": "DOWNLOADING | EXTRACTING_AUDIO | TRANSCRIBING | SUMMARIZING | DONE | FAILED",
"progress": 0-100,
"message": "optional",
"occurredAt": "ISO-8601"
}
