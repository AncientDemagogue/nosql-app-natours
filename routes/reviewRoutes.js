const express = require('express');


const reviewController = require('./../controllers/reviewController');
const authController = require('./../controllers/authController');

// why do we need mergeparams here? cos we have a nested route and by default
// every route has acess only to parameters in their specific route
// now reviewrouter has access to other parameters in other routes
const router = express.Router({
    mergeParams: true
});

// example


// GET /tour/tourid/reviews
// POST /reviews
// all match the ('/') route and the router has access to tourId, remember in  the tourrouter we have reRouted tour/tourId/review to the review routes

// no one can acess these routes before being authenicated
router.use(authController.protect);

router.route('/').get(reviewController.getAllReviews)
    .post(
        authController.restrictTo('user'),
        reviewController.setTourUserIds,
        reviewController.createReview);

router.route('/:id')
    .get(reviewController.getReview)
    .delete(authController.restrictTo('user', 'admin'), reviewController.deleteReview)
    .patch(authController.restrictTo('user', 'admin'), reviewController.updateReview);





module.exports = router;