//const { tmBotService } = require('../services');

const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    //console.log(req)
    //tmBotService.send([
    //  `REQUEST ERROR`,
    //  req.originalUrl,
    //  err.message
    //])
    next(err)
  });
};

module.exports = catchAsync;
