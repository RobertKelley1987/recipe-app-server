const ExpressError = require("./util/express-error")

const isLoggedIn = (req, res, next) => {
    if(!req.session.userId) {
        throw new ExpressError(401, 'Not authorized to access this route');
    }
    next();
}

module.exports = isLoggedIn;