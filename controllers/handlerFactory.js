const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError.js');
const APIFeatures = require('./../utils/apiFeatures');


// to make things more streamlined we have made another module that returns handler functions
// we have made it in such a way to reduce duplicate code
// it can be used for tours. users, reviews or any other model

exports.deleteOne = Model => catchAsync(async (req, res, next) => {

    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
        return next(new AppError('No doc found with that id', 404))
    }


    res.status(204).json({
        status: 'success',
        data: null,
    });

});


exports.updateOne = Model => catchAsync(async (req, res, next) => {

    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });
    // find the document, update it in req.body as the second parameter and
    // as the third parameter we specifythat we want the new document(updated one)
    // returned as well as running the validators on the patched document- i.e. the patch object that we are sending

    if (!doc) {
        return next(new AppError('No documet found with that id', 404))
    }


    res.status(200).json({
        status: 'success',
        data: {
            data: doc // shorthand for doc: doc as of es6
        },
    });

});

exports.createOne = Model => catchAsync(async (req, res, next) => {
    // first creting new document from the model and then using the save method on it
    // const newTour = new Tour({});
    // newTour.save()

    // below calling the create method right on the model itself
    const newDoc = await Model.create(req.body);

    res.status(201).json({
        status: 'success',
        data: {
            data: newDoc,
        },
    });

});

exports.getOne = (Model, popOptions) => catchAsync(async (req, res, next) => {

    let query = Model.findById(req.params.id);
    // this one takes populate options, since get one tour uses populate
    // to populate virtual reviews field, so if there is a populateOptions specified it 
    // is passesd in as well
    if (popOptions) query = query.populate(popOptions);

    const doc = await query;

    if (!doc) {
        return next(new AppError('No document found with that id', 404))
    }

    res.status(200).json({
        status: 'success',

        data: {
            data: doc,
        },
    });

});


exports.getAll = Model => catchAsync(async (req, res, next) => {


    // TO ALLOW FOR NESTED GET REVIEWS ON TOUR (a small hack, putting it another function would be too much work for just one little copy paste)
    let filter = {};
    // implementation of the nested route for getting a review for a specific tour id, so, if in the req.params there is not field named tourid that means that its a regular reoute, but if there is than its a re routed one and the tour id comes from the url so use it in the request to et the reviews for that particular tour
    if (req.params.tourId) filter = {
        tour: req.params.tourId
    };


    // EXECUTE QUERY
    const features = new APIFeatures(Model.find(filter), req.query)
        .filter()
        .sort()
        .limitFields()
        .paginate();
    const docs = await features.query;

    // just for ilustration use explain() method to get stats on queries
    // const docs = await features.query.explain();

    // SEND RESPONSE
    res.status(200).json({
        status: 'success',

        results: docs.length,
        data: {
            data: docs,
        },
    });

});