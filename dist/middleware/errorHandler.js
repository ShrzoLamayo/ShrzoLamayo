export function errorHandler(err, _req, res, _next) {
    const status = err?.status || 500;
    const message = err?.message || 'Internal Server Error';
    if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error(err);
    }
    res.status(status).json({ error: { message, status } });
}
//# sourceMappingURL=errorHandler.js.map