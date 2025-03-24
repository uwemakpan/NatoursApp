const path = require('path');
const morgan = require('morgan');
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const { request, get } = require('http');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const compression = require('compression');
const cors = require('cors');

const globalErrorHandler = require('./controllers/errorController');
const AppError = require('./utils/appError');
const userRouter = require('./routes/userRoutes');
const tourRouter = require('./routes/tourRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const bookingController = require('./controllers/bookingController');
const viewRouter = require('./routes/viewRoutes');

const app = express();
app.enable('trust proxy'); // enabling the proxy
// sending a get request to the root URL
// app.get('/', (req, res) => {
//   res
//     .status(200)
//     .json({ message: 'Hello from the server side!🌍', app: 'Natours 🌴' });
// });

app.set('view engine', 'pug'); // setting the view engine to pug
app.set('views', path.join(__dirname, 'views')); // setting the views directory

// 1. GLOBAL MIDDLEWARES
// Implement CORS
app.use(cors());
// Access-Control-Allow-Origin *

app.options('*', cors()); // pre-flight phase

// Serving static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser()); // Parse data from cookies
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// app.use(helmet()); // Set security HTTP headers // 1. GLOBAL MIDDLEWARES
// app.use(helmet()); // Set security HTTP headers // 1. GLOBAL MIDDLEWARES

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        // ... other directives
        'script-src': [
          "'self'", // allow scripts from your own domain

          "'unsafe-inline'", // allow inline scripts (you may want to remove this depending on your needs)
          'https://api.mapbox.com https://cdnjs.cloudflare.com https://events.mapbox.com https://js.stripe.com/v3/', // allow scripts from the Mapbox CDN and Cloudflare CDN
        ],

        'frame-src': [
          "'self'", // allow scripts from your own domain
          "'unsafe-inline'", // allow inline scripts (you may want to remove this depending on your needs)
          'https://js.stripe.com', // allow scripts from the axios CDN
        ],

        'worker-src': [
          "'self'", // allow web workers from your own domain
          'http://localhost:8000', // allow web workers from the current host (development environment)
          'https://api.mapbox.com', // allow web workers from the Mapbox CDN
          'blob:', // allow web workers from blob URLs
        ],
        'connect-src': [
          "'self'", // allow connections to your own domain
          'https://api.mapbox.com', // allow connections to the Mapbox API
          'https://events.mapbox.com', // allow connections to Mapbox events
        ],
      },
    },
  })
);
// using the morgan middleware only in development mode
// console.log(process.env.NODE_ENV);
// Development Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// limiting the number of requests from the same IP address
const limiter = rateLimit({
  max: 100, // 100 requests
  windowMs: 60 * 60 * 1000, // per hour
  message: 'Too many requests from this IP, please try again in an hour!',
});
app.use('/api', limiter); // limiting the number of requests to the API

// Stripe webhook, BEFORE body-parser, because stripe needs the body as stream
app.post(
  '/webhook-checkout',
  express.raw({ type: 'application/json' }),
  bookingController.webhookCheckout
);

// informing the app to use the express.json middleware
// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' })); // limiting the body size to 10kb

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss()); // clean any user input from malicious HTML code

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

app.use(compression()); // compress all text sent to clients

// custom middle ware function
// app.use((req, res, next) => {
//   console.log('Hello from the middleware 👋');
//   next(); // calling the next middleware function
// });

// custom middle ware function to add a request time
// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(`Header info: `, req.headers);
  next();
});

// sending a post request to the root URL === server health check
// app.get('/', (req, res) => {
//   res.send('You can post to this endpoint...👍');
// });

// 3 ROUTES

// ROUTES RESOURCE
app.use('/', viewRouter);

app.use('/api/v1/tours', tourRouter); // mounting the tourRouter

// USERS RESOURCE
app.use('/api/v1/users', userRouter); // mounting the userRouter

// REVIEWS RESOURCE
app.use('/api/v1/reviews', reviewRouter); // mounting the reviewRouter

app.use('/api/v1/bookings', bookingRouter); // mounting the bookingRouter

// middleware to handle unhandled routes
app.all('*', (req, res, next) => {
  // calling the next middleware function with the error object
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// error handling middleware function to handle all errors in the app
app.use(globalErrorHandler); // mounting the global error handling middleware

module.exports = app;
