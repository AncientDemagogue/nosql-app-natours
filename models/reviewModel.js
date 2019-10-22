// review model //#endregion
// review /rating /createdat/ ref to tour/ ref to user who wrote review
// 2 parent references


const mongoose = require('mongoose');
const User = require('./userModel.js');
const Tour = require('./tourModel.js');

const reviewSchema = new mongoose.Schema({
    review: {
        type: String,
        required: ['true', 'a review must contain text']
    },
    createdAt: {
        type: Date,
        default: Date.now()
    },
    rating: {
        type: Number,
        required: ['true', 'a review must be rated'],
        min: 1,
        max: 5
    },
    tour: [{
        type: mongoose.Schema.ObjectId,
        ref: 'Tour',
        required: [true, 'Review must belong to a tour']
    }],
    user: [{
        type: mongoose.Schema.ObjectId,
        ref: 'User', // mongose will look into that collection
        required: [true, 'Review must have a user']
    }]
}, {
    toJSON: {
        virtuals: true
    },
    toObject: {
        virtuals: true
    }
})

// we have made a combined index of tour and user, why? cos we don't want user posting multiple reviews on the same tour 
// we achieve that by making it unique, the combination of user and tour is UNIQUE 
reviewSchema.index({
    tour: 1,
    user: 1
}, {
    unique: true
});

reviewSchema.pre(/^find/, function (next) {
    // two populates one for tour and one for user
    // this.populate({
    //     path: 'tour',
    //     select: 'name' // select only the name
    // }).populate({
    //     path: 'user',
    //     select: 'name photo'
    // })

    // if we want to populate two fields in a query we will call populate once
    // behind the scenes mongoose is actually doing two queries, one for the user model adn one for the tour model

    // we have changed our query a bit, since review when queried will populate tour and user, and populated tour will populate guides, we are getting a chain of populates
    // so we have decided that we dont want to populate the tour field only the userModel
    // we still have parent referencing but we are not referencing it
    this.populate({
        path: "user",
        select: "name photo"
    });

    next();

});

// now we are making a static method, that will calculate average review nad numbe of reviews each time a review is updated, deleted or added

reviewSchema.statics.calcAverageRatings = async function (tourId) {
    // this now points to the model
    const stats = await this.aggregate([{
            $match: {
                tour: tourId
            }
        },
        {
            $group: {
                _id: '$tour',
                nRating: {
                    $sum: 1
                },
                avgRating: {
                    $avg: '$rating'
                }
            }
        }
    ]);
    // console.log(stats);

    /// we have calculated the avgRating and avgNum votes in the stats variable and now we are saving it to the document
    if (stats.length > 0) {
        // if there is a review on tour update the field
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: stats[0].nRating,
            ratingsAverage: stats[0].avgRating
        });
    } else {
        // if no reviews on tour let the fields be default
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: 0,
            ratingsAverage: 4.5
        });
    }

}

// we should use post and not pre, since before the save the review is not available to the database
reviewSchema.post('save', function () {
    // this points to the current review, this.tour is the tourId passed to the reviewSchema.statics.calcAverageRatings

    // constructor points to the model that created this document, this points to the document
    // we have to do it like this since Review below is not defined until later in the code and the code runs from top to  bottom so it would be undefined, but if we put it after the review is the defined that the reviewschmea wouldnt include this function
    this.constructor.calcAverageRatings(this.tour);

});

// findByIdAndUpdate
// findByIdAndDelete

// we are using regex cos behing the scenes both findByIdAndUpdate and findByIdAndDelete is a shorthand for findOneAnd...
reviewSchema.pre(/^findOneAnd/, async function (next) {
    // here this keyword is the current query
    // here we used a little trick cos in the query middleware we have only access tothe current query and not the document
    // so to get access to the document we execute this query findOne
    this.r = await this.findOne();
    // this is also a little trick to have acess to the tour id in the post middleware
    // we are creating a property where we are saving it
    // console.log(this.r);
    // this.r is the review (in form of an object) and the tourid is stored in the tour field
    next();
});

reviewSchema.post(/^findOneAnd/, async function () {
    // here this.r => review review.constructor => Review model and then we can execute the static method
    await this.r.constructor.calcAverageRatings(this.r.tour);

    // why we did it like this? 
    // await this.findOne() DOES NOT WORKS HERE, query has already executed
});

const Review = mongoose.model('Review', reviewSchema);



module.exports = Review;