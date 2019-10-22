const path = require('path');
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize')
const xss = require('xss-clean')
const hpp = require('hpp');

const app = express();
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes.js');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController.js');


app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));


app.use(express.static(path.join(__dirname, 'public')));

// GLOBAL middleware

// set secure http headers
app.use(helmet());
// this call returns a function that will be waiting until needed, in app use we are always using functions not function calls

console.log(process.env.NODE_ENV);

// develoment login
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
// limiting the number of request coming from a single ip adress to 100 per hour
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!'
});


// parsing the data from cookie
app.use(cookieParser());



app.use('/api', limiter);

// body parser, reading data from the body into req.body
app.use(express.json({
  limit: '10kb'
}));
app.use(express.urlencoded({
  extended: true,
  limit: '10kb'
}));


// data sanitization against noSQL query injection
app.use(mongoSanitize());

// data sanitazation against cross site scripting attacks
app.use(xss())
// removing html code from requests

// prevent parameter polution - removes duplicate parameters, whitelist is an array where we are allowing duplicate entries
app.use(hpp({
  whitelist: ['duration', 'ratingsQuantity', 'ratingsAverage', 'maxGroupSize', 'difficulty', 'price']
}));

// app.use for using middleware
// in express you can thin kthat everything is middleware
// the entire logic is built on request response cycle
//with middleware executed lienary, like in a pipelne
// so order matters!
// the code is executed lineary from top to bottom

// in the middleware we have a reference to the req and res functions
// as well as teh next method

// serving static files
// app.use(express.static(`${__dirname}/public`));

// middleware epress.static that allows us to use static files
// in the function body pass the directory to the folder with the files

// unless we specify the route, this middleware is applied to each and every request
// the order of the code MATTERS! ;)

// test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // we have added a property on a request object called requestTime
  // and it is date now converted to a readable string


  next();
});

//  ROUTE HANDLERS

// app.get('/api/v1/tours', getAllTours);
// app.get('/api/v1/tours/:id', getTour);
// app.post('/api/v1/tours', createTour);
// app.patch('/api/v1/tours/:id', updateTour);
// app.delete('/api/v1/tours/:id', deleteTour);



app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

app.all('*', (req, res, next) => {



  next(new AppError(`Can't find the ${req.originalUrl} that was requested`, 404));
  // creating an error and passing it to next function, when something is passed into next function it is presumed that is the error so it will go straight to the error middleware and bypass any other middleware
});

// this route handler is for all teh unmatched url routes, so it has to be at the end
// start server

app.use(globalErrorHandler);

module.exports = app;