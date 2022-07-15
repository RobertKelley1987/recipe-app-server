require('dotenv').config();

const express = require('express');
const app = express();
const mongoose = require('mongoose');
const { mongoUrl } = require('./constants');
const session = require('./session-options');

mongoose.connect(mongoUrl, { useNewUrlParser: true });
app.use(session);
app.use(express.json());

const indexRoutes = require('./routes/index');
const listRoutes = require('./routes/lists');
const favoriteRoutes = require('./routes/favorites');

app.use('/', indexRoutes);
app.use('/users/:userId/lists', listRoutes);
app.use('/users/:userId/favorites', favoriteRoutes);

// ERROR HANDLING
app.use((err, req, res, next) => {
    if(err.statusCode === 401) {
        return res.send({ userId: null, err: err });
    }

    if(err.statusCode === 400) {
        return res.send({ userId: null, err: err });
    }

    if(err.statusCode === 404) {
        return res.send({ err: err });
    }

})

app.listen(3001, () => console.log('The server listens...'));