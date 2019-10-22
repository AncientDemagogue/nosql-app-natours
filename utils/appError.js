class AppError extends Error {
    constructor(message, statusCode) {
        super(message);

        this.statusCode = statusCode
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error'
        this.isOperational = true // setting this isOperational property so that we can test if the error is ours, operational

        Error.captureStackTrace(this, this.constructor) // when a new error is called and created that stack trace is not gonna be collaed and thus it will not polute the stack captureStackTrace



    }
}

module.exports = AppError;