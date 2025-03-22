const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;

  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  console.log(`Duplicate error obj: ${err}`);
  const value = err.errorResponse.errmsg.match(/(["'])(\\?.)*?\1/)[0]; // reg exp to match xters inside quotes
  const message = `Duplicate field value: ${value}. Please use another value!`;

  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  // console.log(`DB error object called: ${err}`);
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors?.join('. ')}`;

  return new AppError(message, 400);
};

// handle JWTError
const handleJWTError = () => {
  return new AppError('Invalid token. Please login again!', 401);
};

const handleJWTExpiredError = () => {
  return new AppError('Your token has expired! Please login again.', 401);
};

const sendErrorDev = (err, req, res) => {
  // let vals = Object.values(err).filter((el) => typeof el === 'object')[0];
  // vals = Object.values(vals)[0].name;

  // let vals = err.name;
  // vals = Object.values(vals)[0].name;

  // API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
      // errName: vals,
    });
  }
  // RENDERED WEBSITE
  return res
    .status(err.statusCode)
    .render('error', { title: 'Something went wrong!', msg: err.message });
};

const sendErrorProd = (err, req, res) => {
  // Operational, trusted error: send message to client

  //API
  if (req.originalUrl.startsWith('/api')) {
    if (err.isOperational) {
      console.log(`Original error object ${err}`);
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message || 'Awaiting message',
      });
      console.log(`Custom message: ${err}`);
      // Programming or other unknown error: don't leak error details
    }
    // Log error
    console.error('ERROR 💥', err);

    // Send generic message
    return res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
      error: err,
    });
  }
  if (err.isOperational) {
    return res
      .status(err.statusCode)
      .render('error', { title: 'Something went wrong!', msg: err.message });
    // Programming or other unknown error: don't leak error details
  }
  // Log error
  console.error('ERROR 💥', err);

  // Send generic message
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: 'Please try again later',
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  // console.log(`The error object is ${err.value}`);

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;
    console.log('Production error');
    // const vals = Object.values(error).map((el) => el);
    // console.log(`Encountered:  ${vals}`);
    if (error?.name === 'CastError') error = handleCastErrorDB(error);

    if (error?.errorResponse?.code === 11000)
      error = handleDuplicateFieldsDB(error);

    if (error.name === 'ValidationError') {
      error = handleValidationErrorDB(error);
    }

    if (error.name === 'JsonWebTokenError') {
      error = handleJWTError();
    }

    if (error.name === 'TokenExpiredError') {
      error = handleJWTExpiredError();
    }
    sendErrorProd(error, req, res);
  }
};
