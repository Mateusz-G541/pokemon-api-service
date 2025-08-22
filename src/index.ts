import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import pokemonRoutes from './routes/pokemon.routes';
import pkg from '../package.json';

// Load environment variables
dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '20275', 10);
const host = process.env.HOST || '0.0.0.0';

// CORS configuration - allow your Vercel frontend
const allowedOrigins = [
  'https://pokedex-87cl.vercel.app',
  'https://pokedex-n7cs.vercel.app',
  'http://localhost:3000', // for local development
  'http://localhost:5173', // for Vite dev server
];

// Middleware
app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
    optionsSuccessStatus: 200,
  }),
);

// Security headers
// Allow cross-origin image embedding (frontend is on a different origin)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
});

app.use(limiter);
app.use(express.json());

// Serve static images
app.use('/images', express.static(path.join(__dirname, '..', 'images')));

// Service metadata (for health/version responses)
type PackageInfo = { name: string; version: string };
const { name: serviceName, version: serviceVersion } = pkg as PackageInfo;

// Health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  res.status(200).json({
    status: 'ok',
    message: `${serviceName} v${serviceVersion}`,
    name: serviceName,
    version: serviceVersion,
    service: 'Pokemon API Service',
    timestamp: new Date().toISOString(),
  });
});

// Version endpoint (root-level)
app.get('/version', (_req: express.Request, res: express.Response) => {
  res.status(200).json({
    name: serviceName,
    version: serviceVersion,
    env: process.env.NODE_ENV || 'development',
  });
});

// Version under API namespace as well
app.get('/api/v2/version', (_req: express.Request, res: express.Response) => {
  res.status(200).json({
    name: serviceName,
    version: serviceVersion,
    env: process.env.NODE_ENV || 'development',
  });
});

// API routes
app.use('/api/v2', pokemonRoutes);

// 404 handler
app.use('*', (req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(port, host, () => {
  console.log(`🚀 Pokemon API Service running on http://${host}:${port}`);
  console.log(`📊 Health check: http://${host}:${port}/health`);
  console.log(`🎯 API endpoint: http://${host}:${port}/api/v2`);
});
