const mongoose = require('mongoose');

const dotenv = require('dotenv');
dotenv.config({
  path: './config.env'
});

process.on('uncaughtException', err => {
  console.log(err);
  console.log(err.name, err.message);
  console.log('UNHANDLED EXCEPTION! Shutting down zia process');
  //gracefully shutting down, give the server time to finish everythign before shutting down

  process.exit(1);
  // exit the process
})


const app = require('./app');

// console.log(app.get('env')); // gets the environment variable, set to default to development
// console.log(process.env);
// get the list of node environment variables

// now we are connecting to database and replacing password in local env

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  })
  .then(con => {
    console.log('DB conection succesful!');
  });
// connect method returns a promise, and the resolve method has access to connection object

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

// this one is a last safety net for catching errors. it listens for unhandledReejection
process.on('unhandledRejection', err => {
  console.log(err);

  console.log('UNHANDLED REJECTION! Shutting down zia process');
  //gracefully shutting down, give the server time to finish everythign before shutting down
  server.close(() => {
    process.exit(1)
  }); // exit the process

});