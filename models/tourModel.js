const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
const User = require('./userModel');

const tourSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A tour must have a name'],
    unique: true,
    trim: true,
    maxlength: [40, 'A tour name must shorter then 40 character'],
    minlength: [10, 'A tour must have more or equal then 10 characters'],
    // validate: [validator.isAlpha, 'A tour name must only contain characters'] // not realy useful in this case, esier to use regular epressions
  },
  slug: String,
  duration: {
    type: Number,
    required: [true, 'A tour must have a duration'],

  },
  maxGroupSize: {
    type: Number,
    required: [true, "A tour must have a group size"]
  },
  difficulty: {
    type: String,
    required: [true, 'A tour must have a difficulty'],
    enum: {
      values: ['easy', 'medium', 'difficult'],
      message: 'A tour difficulty must be either easy,medium or hard'
    }
  },
  ratingsAverage: {
    type: Number,
    default: 4.5,
    min: [1, 'Rating must be above 1.0'],
    max: [5, 'The rating must be below 5.0'],
    set: val => Math.round(val * 10) / 10 // this setter function is gonna run each time that there is a new value for ratings average field, val is the value of the field and we are multiplying it by 10 to inceae the accuracy to 1 decimas, round is rounding to the nearest integer 
  },
  ratingsQuantity: {
    type: Number,
    default: 6
  },
  rating: {
    type: Number,
    default: 4.5
  },
  price: {
    type: Number,
    required: [true, 'A tour must have a price']
  },
  priceDiscount: {
    type: Number,
    validate: {
      // this validor will run only on document creation not on document update
      // this only points to current doc on NEW document creation
      validator: function (val) {
        return val > this.price ? false : true
      },
      message: 'A tour discount price ({VALUE}) cannot be greater then the tour price'
    }


  },
  summary: {
    type: String,
    trim: true,
    required: [true, 'A tour must have a description']
  },
  description: {
    type: String,
    trim: true
  },
  imageCover: {
    type: String,
    required: [true, 'A tour must have a cover image']
  },
  images: [String],
  createdAt: {
    type: Date,
    default: Date.now(),
    createdAt: false // hide the createdAt field
  },
  startDates: [Date],
  secretTour: {
    type: Boolean,
    default: false
  },
  startLocation: {
    // GeoJSON
    type: {
      type: String,
      default: 'Point',
      enum: ['Point']
      // we make that it can only be point
    },
    coordinates: [Number],
    adress: String,
    description: String
  },
  locations: [{
    type: {
      type: String,
      default: 'Point',
      enum: ['Point']
    },
    coordinates: [Number],
    adress: String,
    description: String,
    day: Number
  }],
  guides: [{
    type: mongoose.Schema.ObjectId, // this has to be typed correctly
    ref: 'User' // this is how we establish references in mongooose
  }],
}, {
  toJSON: {
    virtuals: true
  },
  toObject: {
    virtuals: true
  }

});

// creating a single field index on price
// tourSchema.index({
//   price: 1
// });
// creating a coumpung index on price and ratingsAverage(the indexes for ratings average are in descening order that is why -1, 1 is ascending)
// indexes are basically making an sorted field that is easirer to query
// the compound index works if we are quering for one of the fields individually, such as price or ratingsAverage
tourSchema.index({
  price: 1,
  ratingsAverage: -1
});

tourSchema.index({
  slug: 1
})

// in order to query geospacial data we need to specify an index for the startLocation
// if we are using real geodata then it has to be set to '2sphere' or it can be '2dindex' for fixional points 
tourSchema.index({
  startLocation: '2dsphere'
})

// make a virtual field - it will not be stored in teh database, but this one is calculated
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7; // we use regular function cos arrow function doesnt have it own this , and we need the this keywrod since wew eill be going over documetns
})
// virtual fields cannot be used in a query since they are not part of the database


// here below we make a virtual populate on tour model for reviews
// meaning we are making virtual fields referencing the reviews, but they are not persistent in the database

tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour', // name of the field in the other model where the reference to the current model (tour ) is stored
  localField: '_id' // this _id as is called in the local model *in tour is called tour in the foreign field(review) , basically thi is something like join in sql, connect two fields on their fields (ids in this case)
})


// DOCUMENT PRE MIDDLEWARE, it will be called before the document is saved in the database
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, {
    lower: true
  }) // currently processed document
  next();
})

// this code is for embedding guides, but if the guide data changes then we have to change every tout with that guide (and first query  tours for that guide)which is a LOT Of work
// hence we have decided to go to referencing route

// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(async id => await User.findById(id));
//   // since were quering that's asyncrounes so we have to use await
//   // but the resolt will be a promise so guidepromises is actually an array of Promises
//   // so we simply await it
//   this.guides = await Promise.all(guidesPromises);
//   // now we have overwritten behind thes scenes the guides field with our queried guides
//   // meaning => user types in guides id and we return queried guides, remember guiedes is model is defined as an Array


//   next();
// });



// tourSchema.pre('save', function (next) {
//   console.log('Will save document');
//   next();
// })

// // POST MIDDLEWARE , executed after all the pre middleware function have completed
// tourSchema.post('save', function (doc, next) {
//   console.log(doc);
//   next();
// })


// QUERY MIDDLEWARE

// find all tours and show only those that are not secret, down we have a regular expression that pre hooks to find as well as to findone so that we dont have to duplicate code
tourSchema.pre(/^find/, function (next) {
  this.find({
    secretTour: {
      $ne: true
    }
  });
  this.start = Date.now();
  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt'
  });

  // populate will fill the field guides with the references guides, we have made a guides be an array with referenced objects
  // this will populate it in the query not in the actual data
  // path is the name of the field, and in select with minus sign we say that we dont want to show __v field and paswordChagnedat field
  next();
});


tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start} miliseconds`);
  next();

});



// AGGREGATION MIDDLEWARE : we want to exclude secret tour from the aggrefate function 
tourSchema.pre('aggregate', function (next) {
  // this ads another match statement to the aggregate object the filters out all the tours that are not secret, by passing a matching object
  this.pipeline().unshift({
    $match: {
      secretTour: {
        $ne: true
      }
    }
  })
  // console.log(this.pipeline());
  next();
});

const Tour = mongoose.model('Tour', tourSchema)

module.exports = Tour;