const path = require('path');
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

const { NotFoundError } = require('./utils/customErrors');
const globalErrorHandler = require('./middleware/errorHandler');
const authRouter = require('./routes/authRoutes');
const urlRouter = require('./routes/urlRoutes');
const { redirectUrl } = require('./controllers/urlController');
const analyticsRouter = require('./routes/analyticsRoutes');

const app = express();

// 1. GLOBAL MIDDLEWARES

// Security HTTP headers
app.use(helmet({
  contentSecurityPolicy: false, // Turn off CSP during development if we are pulling CDNs/assets, or customize as needed
}));

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Implement CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5000',
  credentials: true,
}));

// Rate limiting: Limit requests from same IP
const limiter = rateLimit({
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 mins
  message: 'Too many requests from this IP, please try again in 15 minutes!',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use('/api', limiter);

// Body parser, reading data from body into req.body (limit size to 10kb to avoid DOS attacks)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Cookie parser
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// 2. ROUTES HOOKS
// Dummy test route for testing server and error flow
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy and running.'
  });
});

// Authentication Routes
app.use('/api/auth', authRouter);

// URL Shortening Routes
app.use('/api/url', urlRouter);

// Analytics Routes
app.use('/api/analytics', analyticsRouter);

// URL Redirect Engine (Root Level Redirection)
app.get('/:shortCode', redirectUrl);

// 404 Handler for undefined API routes
app.all('/api/*', (req, res, next) => {
  next(new NotFoundError(`API Route ${req.originalUrl} not found`));
});

// If no API route matches, send the frontend index.html (useful for Single Page Application routing if needed)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// 3. GLOBAL ERROR MIDDLEWARE
app.use(globalErrorHandler);

module.exports = app;
