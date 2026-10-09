const { validationResult } = require('express-validator');

// The submitted `value` is deliberately omitted: echoing it back (or into a
// log) would repeat passwords, tokens, or clinical free text.
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array().map(({ type, msg, path, location }) => ({ type, msg, path, location })),
    });
  }
  next();
};
