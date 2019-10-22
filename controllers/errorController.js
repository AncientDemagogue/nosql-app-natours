const AppError = require('./../utils/appError.js');

const handleDuplicateFieldsDB = (err) => {
    const value = err.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0];
    console.log(value);
    const message = `Duplicate field value: ${value}, Please use another value!`
    return new AppError(message, 400);
}

const handleValidationErrorDB = err => {
    const errors = Object.values(err.errors).map(el => el.message)

    const message = `Invalid input data. ${errors.join('. ')}`;
    return new AppError(message, 400);
}

const handleCastErrorDB = (err) => {
    const message = `Invalid ${err.path}: ${err.value}`
    return new AppError(message, 400);
}



const sendErrorDev = (err, req, res) => {
    // A) if still working with the api
    if (req.originalUrl.startsWith('/api')) {
        return res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
            error: err,
            stack: err.stack
        });
    } else {
        // B) if RENDERED WEBSITE
        console.error('Error !!!', err);
        return res.status(err.statusCode).render('error', {
            title: 'Something went wrong bruv!',
            msg: err.message
        });
    }
}



const handleJWTError = err => new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = err => new AppError('Your token has expired. Please log in again', 401);


const sendErrorProd = (err, req, res) => {

    // A) error when working with the api

    if (req.originalUrl.startsWith('/api')) {
        if (err.isOperational) {
            return res.status(err.statusCode).json({
                status: err.status,
                message: err.message,

            });
            // programming or other unknown error: don't leak error details
        } else {
            // 1. log error
            console.error('ERROR ! :o', err)

            // 2 send generic message
            return res.status(500).json({
                status: 'error',
                message: 'Something went very wrong'
            })
        }
    } else {

        // B) for the rendered website
        if (err.isOperational) {
            return res.status(err.statusCode).render('error', {
                title: 'Something went wrong bruv!',
                msg: err.message
            });
            // programming or other unknown error: don't leak error details
        } else {
            // 1. log error
            console.error('ERROR ! :o', err)

            // 2 send generic message
            return res.status(err.statusCode).render('error', {
                title: 'Something went wrong bruv!',
                msg: 'Please try again later.'
            });
        }
    }


}



module.exports = (err, req, res, next) => {

    // console.log(err.stack)
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';


    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, req, res)

    } else if (process.env.NODE_ENV === 'production') {
        // object destructuring, copying all object fields from err and copying them to our error
        let error = {
            ...err

        }
        // for some reason err.message doesn't get copied so we will manually copy it
        error.message = err.message;

        if (error.name === 'CastError') error = handleCastErrorDB(error);
        if (error.code === 11000) error = handleDuplicateFieldsDB(error);
        if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
        if (error.name === 'JsonWebTokenError') error = handleJWTError(error);
        if (error.name === 'TokenExpiredError') error = handleJWTExpiredError(error);

        sendErrorProd(error, req, res)
    }


}