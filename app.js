const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const authRoutes = require('./routes/authRoutes');


const app = express();
// Limit requests from same API
const limiter = rateLimit({
    max: 100,
    windowMs: 60 * 60 * 1000,
    message: 'Too many requests from this IP, please try again in an hour!'
});

// White-list params
const whitelist = [
    'duration',
    'ratingsQuantity',
    'ratingsAverage',
    'maxGroupSize',
    'difficulty',
    'price'
]


/**
 * GLOBAL MIDDLEWARES
 * Morgan
 * Helmet
 * Limiter
 * Body parser
 * MongoSanitize
 * Data sanitization against XSS
 * Hpp
 */

// Development logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Set security HTTP headers
app.use(helmet());

app.use('/api', limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({whitelist})
);

// ROUTES HANDLER
const baseUrl = `/api/${process.env.APP_VERSION}/auth`
app.use(baseUrl,authRoutes)


module.exports = app;