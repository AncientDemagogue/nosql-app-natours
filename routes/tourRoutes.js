const express = require('express');
const router = express.Router();
const tourController = require('./../controllers/tourController');
const authController = require('./../controllers/authController');
const reviewRouter = require('./../routes/reviewRoutes.js');

// router.param('id', tourController.checkID);

// create a checkBdoy middleware
//check if body contains the name and price property
// if not send back 400 (bad request)
// add it to the post handler stack



// for this specific route use reviewRouter
router.use('/:tourId/reviews', reviewRouter);


router.route('/top-5-cheap').get(tourController.aliasTopTours, tourController.getAllTours);
// prefilling the query string with the toptour function and calling the route

router.route('/tour-stats').get(tourController.getTourStats);
router.route('/monthly-plan/:year').get(authController.protect,
  authController.restrictTo('admin', 'lead-guide', 'guide'),
  tourController.getMonthlyPlan);


router.route('/tours-within/:distance/center/:latlong/unit/:unit')
  .get(tourController.getToursWithin);

router.route('/distances/:latlong/unit/:unit')
  .get(tourController.getDistances);

router
  .route('/')
  .get(tourController.getAllTours)
  .post(authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour);

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.updateTour)
  .delete(authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour);




// first implementation of the nested tour route
// router.route('/:tourId/reviews')
//   .post(authController.protect,
//     authController.restrictTo('user'),
//     reviewController.createReview);


module.exports = router;