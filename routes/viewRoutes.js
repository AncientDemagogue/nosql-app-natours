const express = require('express');
const viewsController = require('./../controllers/viewsController');
const authController = require('./../controllers/authController.js');



const router = express.Router()



// routes

router.get('/', authController.isLoggedIn, viewsController.getOverview);
router.get('/tour/:slug', authController.isLoggedIn, viewsController.getTour);


// login
router.get('/login', authController.isLoggedIn, viewsController.getLoginForm);

// signup didnt yet create a pug template
router.get('/signup', authController.isLoggedIn, viewsController.signup);

// user account route
router.get('/me', authController.protect, viewsController.getAccount);

router.post('/submit-user-data', authController.protect, viewsController.updateUserData)

module.exports = router;