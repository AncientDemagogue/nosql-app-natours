module.exports = catchAsync = fn => {
    return (req, res, next) => {
        fn(req, res, next).catch(err => next(err))
    }
    // this allows us to call it without try catch block
    // it will return an annonimus function that takes req,res,next parameters, and calls the passing function with these parameters can be executed
    // dakle, passas creattour async itno catchasync on vrati anonimnu funkciju koja kad je executana calla createTour sa parametrima te kao je to async funkcijavrati promise koji ukoliko je error moze biti uhvacen u catch metodi
}
// now we have made a function wrapper around which we wrap around our async function createTour
// with th epurpose of catching async error, since async function returns a promise, the error is in the catch portion of a promisecd c 