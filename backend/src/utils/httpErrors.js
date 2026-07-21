export function httpStatusFromError(error, fallback = 500) {
  if (error.message?.startsWith('TIMEOUT')) return 504;
  return fallback;
}