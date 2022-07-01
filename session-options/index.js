const session = require('express-session');
const MongoStore = require('connect-mongo');
const { mongoUrl } = require('../constants');

module.exports = session({
    cookie: {
        httpOnly: true,
        maxAge: 43200000, // 12 hrs,
        sameSite: 'strict'
    },
    resave: false,
    saveUninitialized: false,
    secret: process.env.SECRET,
    store: MongoStore.create({ mongoUrl: mongoUrl })
});