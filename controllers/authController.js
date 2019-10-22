const {
    promisify
} = require('util');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const jwt = require('jsonwebtoken');
const AppError = require('./../utils/appError');
const sendEmail = require('./../utils/email');
const crypto = require('crypto');

const signToken = id => {
    return jwt.sign({
        id: id
    }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
}

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id)
    const cookieOptions = {
        // TURNING IT INTO MILISECONDS
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 1000),

        httpOnly: true

    };
    if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
    // only when were in production were gonna use secure true option  = https
    res.cookie('jwt', token, cookieOptions)

    user.password = undefined;
    // remove the password from teh output
    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user
        }
    })
}

exports.logout = (req, res) => {
    res.cookie('jwt', 'loggedout', {
        expires: new Date(Date.now() - 10 * 1000),
        httpOnly: true

    })
    res.status(200).json({
        status: 'success'
    })
}

exports.signup = catchAsync(async (req, res, next) => {
    // const newUser = await User.create(req.body);
    // the line above works, BUT FOR SECURITY reasons needs to be changed, now everyone can login as admin
    // we wil change it into     
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        role: req.body.role,
    });
    // now we allow only the data that we need to be stored in the new user
    // before the enire body was being sent to the user model
    // now someone cannot insert a row in the req.body and use it for some nefarious reasons, like register as an admin

    // const token = signToken(newUser._id);
    // // get the _id as is stored in mongodb as a payload
    // // jwt takes payload and a secret string for security authentication

    // // i could have replaced it with a createsend token function but i liked the explanation and comments that i wrote

    // res.status(201.).json({
    //     status: 'success',
    //     token, // that is equal to token: token
    //     data: {
    //         user: newUser
    //     }
    // });
    createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
    const {
        email,
        password
    } = req.body; // using object destructuring it is the same as const email = req.body.email

    // 1. check if email and password exist
    if (!email || !password) {
        return next(new AppError('Please provide email and password', 400));
        // once again using return is very important since the code will otherwise keep executing and will hit the res.send and thus send two responses which is not allowed, by using return we ensure that the route sends response and exits right away

    }


    // 2. check if user exists a nd the password is correct
    const user = await User.findOne({
        email: email
    }).select('+password');
    // select with + explicity selects a field that is otherwise specified as unselecteble in database


    // if the user doenst exist then the right wont even run, but if it exists then it will run the checking of the password
    if (!user || !await user.correctPassword(password, user.password)) {
        return next(new AppError('Incorrect email or password', 401));
    }

    // 3. if everything is ok, send token to client
    createSendToken(user, 200, res);

});

exports.protect = catchAsync(async (req, res, next) => {

    // 1. getting the token and check if its there
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
        // take the part after the Bearer
        // ex Bearer wrewrewrwer => wrewrewrwer
    } else if (req.cookies.jwt) {
        token = req.cookies.jwt;
    }


    if (!token) return next(new AppError('You are not logged in! please log in to get access', 401));

    // 2. VERIFICATION

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET)
    console.log(decoded);
    // we promisify jwt.verify function and then call it with parameters

    // 3. check if user still exists
    const currentUser = await User.findById(decoded.id);
    // if there is the token, but the user has been deleted from the database
    if (!currentUser) {
        return next(new AppError('The user belonging to this token does not exist', 401));
    }

    // 4. check if user changed password after jwt was issued

    if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next(new AppError('User recently chagned password! Please log in again', 401));
    };

    // GRANT ACCESS TO PROTECTED ROUTE, next middleware
    req.user = currentUser;
    res.locals.user = currentUser;

    next();
});


// Only for rendered pages, no errors! check if user is logged in, the token will always come from the cookie
exports.isLoggedIn = catchAsync(async (req, res, next) => {

    if (req.cookies.jwt) {
        // 1. verify token

        const decoded = await promisify(jwt.verify)(
            req.cookies.jwt,
            process.env.JWT_SECRET);

        // we promisify jwt.verify function and then call it with parameters

        // 2. check if user still exists
        const currentUser = await User.findById(decoded.id);
        // if there is the token, but the user has been deleted from the database
        if (!currentUser) {
            return next();
        }

        // 3 check if user changed password after jwt was issued

        if (currentUser.changedPasswordAfter(decoded.iat)) {
            return next();
        };

        // THERE IS A LOGGED IN USER
        // to pass value to templates we store it in res.locals
        // every pug template has access to res.locals !!!
        res.locals.user = currentUser;
        return next();
    }
    next();
});


exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        // roles is an array it uses the spread operator roles['admin','lead-guide']
        // also we have made a function that takes parameters and returns the middlware function with the classic req, res, next setup, but it has access to the parameters in the function that it wrapped around because of closure, we had to do it like that since middlware functions cannot take any paramaters
        if (!roles.includes(req.user.role)) {
            // since this middleware runs after protect middlware it has access to req.user since it is created in the protect middlware, the role of the user is stores in the role field user.role
            return next(new AppError('You do not have permission to perform this action', 403));
        }

        return next();
    }
}

exports.forgotPassword = catchAsync(async (req, res, next) => {
    // 1. get user based on posted email
    const user = await User.findOne({
        email: req.body.email
    })
    if (!user) {
        return next(new AppError('There is no user with email adress', 404));
    }

    //2 generate the random reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({
        validateBeforeSave: false
    });
    // this turns off the validators before saving, since we are sending the route to l

    // 3 send it to users email
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;

    const message = ` 'Forgot your password? Submit a PATCH request with your new password and passowrdConfirm to: ${resetURL}.\n If You didn't forget your password please ignore this email`
    try {
        await sendEmail({
            email: user.email,
            subject: 'Your password reset token (valid for 10 min)',
            message
        });
    } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        // the lines above modify the data but theydo not sae it so we call save with turned off validators 
        await user.save({
            validateBeforeSave: false
        });

        return next(new AppError('There was an error sending the email. Try again later plox!', 500));

    }


    res.status(200).json({
        status: 'success',
        message: 'token  sent to mail'
    })
});
exports.resetPassword = catchAsync(async (req, res, next) => {

    // 1. get user based on the token   
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: {
            $gt: Date.now(),
        }
    });

    // 2. id token has not epoired, and ther is user , set the password
    if (!user) {
        return next(new AppError('Token is invalid or has expired', 500));
    }

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // 3. update changedpasswordat property for the user


    // 4. log the user in, send JWT 
    createSendToken(user, 200, res);

});

exports.updatePassword = catchAsync(async (req, res, next) => {
    //1. get user from collection

    const user = await User.findById(req.user.id).select('+password');


    // 2. check if posted current password is correctPassword
    if (!await (user.correctPassword(req.body.passwordCurrent, user.password))) {
        return next(new AppError('Your current password is not correct! Try again', 403));
    }

    // 3. if correct update teh passwordConfirm
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save(); // here we want validators, to check if password is the same as password confirm
    // user.findByIdAndUpdate will NOT WORK AS INTENDED, the validators work only on save, as well as pre save instance methods as well not on update!

    // 4. log user in, send JWT
    createSendToken(user, 200, res);


});