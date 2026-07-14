function parseOrigins(value) {
  if (!value?.trim()) return ['http://localhost:5173'];
  return value.split(',').map((o) => o.trim()).filter(Boolean);
}

export function createCorsOptions() {
  const origins = parseOrigins(process.env.CORS_ORIGIN);

  return {
    origin(origin, callback) {
      if (!origin || origins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  };
}
