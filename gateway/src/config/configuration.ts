export default () => ({
  port: parseInt(process.env.GATEWAY_PORT ?? '3000', 10),
  database: {
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '24h',
  },
  // Internal URL to reach Ingestion. Inside Docker this will be
  // http://ingestion:3001; on the host machine, http://localhost:3001.
  ingestionUrl: process.env.INGESTION_URL ?? 'http://localhost:3001',
});
