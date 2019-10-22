// const fs = require('fs');
const Tour = require('./../models/tourModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError.js');
const factory = require('./handlerFactory.js');


// from a time when we have loaded our file-database as a json
// const tours = JSON.parse(
//   fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
// );

// no longer needed function
// exports.checkID = (req, res, next, val) => {
//   console.log(`tour id is: ${val}`);
//   if (req.params.id * 1 > tours.length) {
//     return res.status(404).json({
//       status: 'Fail',
//       message: 'Invalid ID'
//     });
//     // having a return statement is important, if we didnt have the retrurn
//     // statement the function would continue and would hit the next method which would send the req,res
//     // object to another middleware, in this case that could couse sending multiple responses
//     // which is not allowed
//     // having a return ensures that
//   }
//   next();
// };

// exports.checkBody = (req, res, next) => {
//   if (req.body.name && req.body.price) {
//     console.log(req.body);
//   } else {
//     return res.status(400).json({
//       status: 'Fail',
//       message: 'The tour is not properly defined'
//     });
//     // having a return statement is important, if we didnt have the retrurn
//     // statement the function would continue and would hit the next method which would send the req,res
//     // object to another middleware, in this case that could couse sending multiple responses
//     // which is not allowed
//     // having a return ensures that
//   }
//   next();
// };

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,difficulty';
  next();
};
// this function prefills the query string for the user

exports.getAllTours = factory.getAll(Tour);

// here we are passing in the object that will be used in the populate method
// in factory.getone 
exports.getTour = factory.getOne(Tour, {
  path: 'reviews'
})




exports.createTour = factory.createOne(Tour);

exports.updateTour = factory.updateOne(Tour);


exports.deleteTour = factory.deleteOne(Tour);


// exports.deleteTour = catchAsync(async (req, res, next) => {

//   const tour = await Tour.findByIdAndDelete(req.params.id);

//   if (!tour) {
//     return next(new AppError('No tour found with that id', 404))
//   }


//   res.status(204).json({
//     status: 'success',
//     data: null,
//   });

// });

exports.getTourStats = catchAsync(async (req, res, next) => {

  const stats = await Tour.aggregate([{
      $match: {
        ratingsAverage: {
          $gte: 4.5
        }
      },
    },
    {
      $group: {
        _id: {
          $toUpper: '$difficulty'
        },
        avgRating: {
          $avg: '$ratingsAverage'
        },
        avgPrice: {
          $avg: '$price'
        },
        minPrice: {
          $min: '$price'
        },
        maxPrice: {
          $max: '$price'
        },
        numRatings: {
          $sum: '$ratingsQuantity'
        },
        numTours: {
          $sum: 1 // for each of the documetns going throught the pipleine 1 will be added to the sum
        }
      },

    },
    {
      $sort: {
        avgPrice: 1 // sort by avgPrice ascending
      }
    },

  ]);

  res.status(200).json({
    status: 'success',

    data: {
      stats,
    },
  });

});


exports.getMonthlyPlan = catchAsync(async (req, res, next) => {

  const year = req.params.year * 1; // 2021
  const plan = await Tour.aggregate([{
      $unwind: '$startDates'
    }, {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: {
          $month: '$startDates'

        },
        numTourStarts: {
          $sum: 1
        },
        tours: {
          $push: '$name'
        }
      }

    },
    {
      $addFields: {
        month: '$_id'
      }
    },
    {
      $project: {
        _id: 0 // if no longer shows up
      }
    }, {
      $sort: {
        numTourStarts: -1 // descending, from highest to lowest
      }
    }, {
      $limit: 12 // limit by 12 documents/outputs, here grouped by momths and only gor reference purposes
    }
  ]);
  res.status(200).json({
    status: 'success',

    data: {
      plan
    },
  });
});

//we could specify the tour from the landlong of lat,long(where you are) with so and so parameters
// tours-within?distance=233&latlong=-48,45&unit=mi
// but instead we will specify it like this and it is much cleaner
// tours-within/233/center/-48,45/unit/mi
// working with geospacial data in mongo
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const {
    distance,
    latlong,
    unit
  } = req.params;

  const [lat, long] = latlong.split(',');

  // radius in radians is distance divided by radius of the Earth, it is different ofcourse for miles and kilometres

  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !long) {
    next(new AppError('Please specify the latitude and longitude in the format lat,long', 400));
  }

  // center sphere expects the cneter of thesphere and the radius has to be in radians, centersphere first goes with longtitude and latitude, the format of the datahas to be exact
  const tours = await Tour.find({
    startLocation: {
      $geoWithin: {
        $centerSphere: [
          [long, lat], radius
        ]
      }
    }
  });

  console.log(lat, long, unit);
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours
    }
  })
});

exports.getDistances = catchAsync(async (req, res, next) => {

  const {
    latlong,
    unit
  } = req.params;

  const [lat, long] = latlong.split(',');

  // this multiplier depends do we want distances in miles or kilometres
  // the final result that the query gives us is in meters
  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !long) {
    next(new AppError('Please specify the latitude and longitude in the format lat,long', 400));
  }

  // in order to the calculations we always use aggregate, and aggreate is done on teh model
  const distances = await Tour.aggregate([{
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [long * 1, lat * 1]
        },
        // this is the field that is gonna be created in the document which we are calling distance, it is gonna contain teh distance from the specify point
        distanceField: 'distance',
        distanceMultiplier: multiplier // convert it to km
      }
    },
    {
      $project: {
        distance: 1,
        name: 1
      }
    }
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      data: distances
    }
  })
});