const express = require('express');
const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController.js');
const reviewController = require('./../controllers/reviewController');



const router = express.Router();


router.post('/signup', authController.signup); // user signup is a bit special, we are only posting data
router.post('/login', authController.login);
router.get('/logout', authController.logout);

router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);



// what this will do is use authController.protect on all routes below this point
// remembe that router is basically like a mini app and we here ae using middleware on it
// middleware RUNS ON SEQUENCE
router.use(authController.protect);

router.patch('/updateMyPassword', authController.updatePassword);
router.patch('/updateMe', userController.uploadUserPhoto, userController.updateMe);
router.delete('/deleteMe', userController.deleteMe);


router.get('/me',
  userController.getMe,
  userController.getUser)

// restrict all routes to admin who are below this line
router.use(authController.restrictTo('admin'));

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);




module.exports = router;