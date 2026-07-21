export function requestTimeout(ms = 9_000) {
  return (req, res, next) => {
    if (res.headersSent) return next();

    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          error: 'Tiempo de espera agotado. Intenta de nuevo en unos segundos.',
        });
      }
    }, ms);

    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));
    next();
  };
}

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      if (res.headersSent) return next(error);
      const status = error.message?.startsWith('TIMEOUT')
        ? 504
        : 500;
      res.status(status).json({
        error: error.message || 'Error interno del servidor',
      });
    });
  };
}
