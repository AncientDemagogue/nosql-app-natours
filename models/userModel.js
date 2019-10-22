const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto')


// name, email, photo, password, passwordConfirmation
// create a User schema

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please tell us your name']
    },
    email: {
        type: String,
        required: [true, 'Please provide a valid email'],
        unique: true,
        lowercase: true, // transforming email to a lowercase
        validate: [validator.isEmail, 'Pleasae provide a valid email']
    },
    photo: {
        type: String,
        default: 'default.jpg'

    },
    role: {
        type: String,
        enum: ['user', 'guide', 'lead-guide', 'admin'],
        default: 'user',
    },
    password: {
        type: String,
        required: [true, 'Please provide us with your password'],
        minlength: 8,
        select: false // by using select false we ensure that the password field will not be send to the client in any output
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Please confirm your password'],
        validate: {
            validator: function (el) {
                return el === this.password;
                // returns true or false if the userpassword confirm(el) is the same as the password field
                // NB: this will work ONLY ON CREATE AND SAVE!
            }
        },
        message: 'The passwords are not the same'
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
        type: Boolean,
        default: true,
        select: false
    }
});

userSchema.pre('save', function (next) {
    if (!this.isModified('password') || this.isNew) return next();

    this.passwordChangedAt = Date.now() - 1000;
    // we are putting this field one second in the past since there cna be delay between writing to the database and issuing the token
    // by doing that we have ensured that the token is created always after the password has been changed
    next();
});



//not we are creating pre save middlware to save encrypted passwords and not in plain text
// this one runs between getting the data and saving to the database
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    // if the password field is not modified do nothing, go to the next middleware

    this.password = await bcrypt.hash(this.password, 12); // second parameter is the one that specifies how cpu intensive hashing will be, other option is the put the salt manually, salt is a string that gets added before hashing to make it more harder to break and for making the same passwords when hashed different
    // we have to use await since the result of the hashing function is a promise, by defailt the hash function is async
    this.passwordConfirm = undefined;
    // now we can delete the password confirm field since we do not need it in database
    next();
});

userSchema.pre(/^find/, function (next) {
    // this is a query middleware, this points to current query
    this.find({
        active: {
            $ne: false
        }
    });
    // if i pass in active: false, i wont get shown any documents who don't have explicitly set active field to true, but here i say that the active field shount not equal to false as a filter

    next();
});


// now we are creating an intance method
// instance method is available on all instances, its like static method in OOP you rememember, here its probably in the prototype object

userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
    // candidae password is the password coming from the user and the userpassword is the hashed password in the datavase not we are hashing the pass and comparing tothe stored password in the database
    // we use async await since it is async function, check documentation yo!
}

// the isntance method belongs to the schema models, the isntance is the document


userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);

        return JWTTimestamp < changedTimestamp;
    }

    // false means NOT changed
    return false;
}

userSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString('hex'); // create a reset token


    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex'); // hash it and store it
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    console.log({
            resetToken
        },
        this.passwordResetToken
    );
    return resetToken;
}

const User = mongoose.model('User', userSchema);

module.exports = User;