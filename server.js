const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });
const app = require('./app');

process.on('uncaughtException', err => {
    console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    process.exit(1);
});
const port = process.env.PORT || 3000;
const DB = process.env.DATABASE.replace(
    '<password>',
    process.env.DATABASE_PASSWORD
);

const server = app.listen(port, async () => {
    console.log(`App running on port ${port}...`);
    try {
        await mongoose
            .connect(DB, {
                useNewUrlParser: true,
                useCreateIndex: true,
                useFindAndModify: false
            })
        console.log('DB connection successful!')
    } catch (error) {
        console.log("Can't establish the connection to the database.", error)
    }

});

process.on('unhandledRejection', err => {
    console.log('UNHANDLED REJECTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
});