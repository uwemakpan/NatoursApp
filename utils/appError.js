class AppError extends Error {
  constructor(message, statusCode) {
    super(message); // this will set the message property of the Error class

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor); // this will not appear in the stack trace
  }
}

module.exports = AppError;
