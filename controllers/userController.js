const express = require('express');
const User = require('./../models/userModel.js');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError.js');
const factory = require('./handlerFactory.js');


// multer is a module for working with files with node
// requiring multer, making the upload and creating a middleware
const multer = require('multer');




const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/img/users');
  },
  filename: (req, file, cb) => {
    // user-userId-timestamp.jpeg
    const ext = file.mimetype.split('/')[1];
    cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
  }
})

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true)
  } else {
    cb(new AppError('Not an image, please upload an image', 400), false)
  }
}



const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

exports.uploadUserPhoto = upload.single('photo');



const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) {
      newObj[el] = obj[el];
    }
  });
  return newObj;
};

// for getting the current user, we are passing in the id from the protect middleware and then tothe get one factory function, it's visible in the routes, here we just defined teh middleware that passes the id
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {


  // 1. create and error if the user tries to post password data

  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is nto for password updates! Please use /updateMyPassowrd',
        400
      )
    );
  }
  // 2. if not update the user document

  const filteredBody = filterObj(req.body, 'name', 'email');
  // we want to keep only name nad email and filter all the rest

  // for uploading uploadUserPhoto
  if (req.file) filteredBody.photo = req.file.filename;

  // filtered out unwanted fields
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });
  // new is set to true so that it returns the new object, updated one, instead ofthe old one, the third parameter is the options, the second is the stuff that is updatedUser

  // update the user and return updated user
  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, {
    active: false,
  });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined and never will be. Please use signup instead',
  });
};

// do not UPDATE PASSWORDS WITH THIS, find and update does not activate the save hook!
exports.updateUser = factory.updateOne(User);

exports.getAllUsers = factory.getAll(User);
exports.deleteUser = factory.deleteOne(User);
exports.getUser = factory.getOne(User);