const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log to console for the developer
  console.error(err.stack);

  // Mongoose Bad ObjectId (CastError)
  // Triggered when someone requests /api/v1/requests/123 instead of a valid 24-character MongoDB ID
  if (err.name === 'CastError') {
    const message = `Resource not found with ID of ${err.value}`;
    error = { statusCode: 404, message };
  }

  // Mongoose Duplicate Key (Code 11000)
  // Triggered when a student tries to register an email that is already in the database
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { statusCode: 400, message };
  }

  // Mongoose Validation Error
  // Triggered when required fields (like a service name or request payload) are missing
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { statusCode: 400, message };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error'
  });
};

module.exports = errorHandler;