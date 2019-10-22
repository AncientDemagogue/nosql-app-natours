const Review = require('./../models/reviewModel.js');
const APIFeatures = require('./../utils/apiFeatures.js');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory.js');






// to allow for creating a factory create review, with nested routes we have created
// another middleware function that will first set data and then 
// call the now factory made create review
// we have done it to decouple data and make our code more clean

exports.setTourUserIds = (req, res, next) => {
    // ALLOW NESTED ROUTES

    // if there is no tour field in the request body get the tour field from the request parameter in the url
    if (!req.body.tour) req.body.tour = req.params.tourId;

    // here its a bit different, we get the user and user id from the 
    // authocntroller.protect middleware which appends it to the request and from the we get the curently logged in user and his id
    if (!req.body.user) req.body.user = req.user.id;

    next();
}




exports.getAllReviews = factory.getAll(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);
exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);