const Tour = require('./../models/tourModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const User = require('./../models/userModel');




exports.getOverview = catchAsync(async (req, res) => {

    // 1 get tour data from collection
    const tours = await Tour.find();


    // 2 build template

    // 3 render template using tour data from 1.

    res.status(200).render('overview', {
        title: "All Tours",
        tours: tours
    });
});

exports.getTour = catchAsync(async (req, res, next) => {
    // 1. get the data for the requested tour (including reviews and guides)
    const slug = req.params.slug;
    const tour = await Tour.findOne({
        "slug": slug
    }).populate({
        path: 'reviews',
        fields: 'review rating user'
    });

    if (!tour) {
        return next(new AppError('There is no tour with that name', 404))
    }

    // 2. build template

    // 3. render template using the data from 1
    res.status(200).render('tour', {
        title: `${tour.name} Tour`,
        tour: tour
    });
});

exports.getLoginForm = catchAsync(async (req, res) => {
    res.status(200).render('login', {
        title: 'Log into your account'
    })
});

exports.signup = catchAsync(async (req, res) => {
    res.status(200).render('signUp', {
        title: 'Sign up for your account!'
    })

});

exports.getAccount = (req, res) => {
    console.log(res.locals.user);
    res.status(200).render('account', {
        title: 'Welcome to your account page'
    })
};

exports.updateUserData = catchAsync(async (req, res, next) => {
    const updatedUser = await User.findByIdAndUpdate(req.user.id, {
        name: req.body.name,
        email: req.body.email
    }, {
        new: true,
        runValidators: true
    });

    res.status(200).render('account', {
        title: 'Welcome to your account page',
        user: updatedUser
    })
});