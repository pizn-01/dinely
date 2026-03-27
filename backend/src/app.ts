import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { corsOptions } from './config/cors';
import { errorHandler } from './middleware/errorHandler';

// Import routes
import authRoutes from './routes/auth.routes';
import organizationRoutes from './routes/organization.routes';
import tableRoutes from './routes/table.routes';
import reservationRoutes from './routes/reservation.routes';
import staffRoutes from './routes/staff.routes';
import apiKeyRoutes from './routes/apiKey.routes';
import dashboardRoutes from './routes/dashboard.routes';
import adminRoutes from './routes/admin.routes';
import customerRoutes from './routes/customer.routes';
import waitingListRoutes from './routes/waitingList.routes';
import publicRoutes from './routes/public.routes';
import { generalLimiter } from './middleware/rateLimiter';

const app = express();
app.set('trust proxy', 1);

// ─── Global Middleware ──────────────────────────────────

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ─── Health Check ───────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ─── API Routes ─────────────────────────────────────────

const API_PREFIX = '/api/v1';

// Apply general rate limit to all API routes
app.use(API_PREFIX, generalLimiter);

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/organizations`, organizationRoutes);
app.use(`${API_PREFIX}/organizations/:orgId/tables`, tableRoutes);
app.use(`${API_PREFIX}/organizations/:orgId/reservations`, reservationRoutes);
app.use(`${API_PREFIX}/organizations/:orgId/staff`, staffRoutes);
app.use(`${API_PREFIX}/organizations/:orgId/waiting-list`, waitingListRoutes);
app.use(`${API_PREFIX}/organizations/:orgId/customers`, customerRoutes);
app.use(`${API_PREFIX}/organizations/:orgId/api-keys`, apiKeyRoutes);
app.use(`${API_PREFIX}/organizations/:orgId/dashboard`, dashboardRoutes);
app.use(`${API_PREFIX}/customers`, customerRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/public`, publicRoutes);

// ─── 404 Handler ────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// ─── Global Error Handler ───────────────────────────────

app.use(errorHandler);

export default app;
