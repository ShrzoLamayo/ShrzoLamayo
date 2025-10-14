import http from 'node:http';
import app from './app.js';
import { config } from './config/env.js';

const port = config.server.port;

const server = http.createServer(app);

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Urban Planning API listening on port ${port}`);
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
