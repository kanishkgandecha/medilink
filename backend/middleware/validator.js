const validateRegistration = (req, res, next) => {
    const { email, password, firstName, lastName, phoneNumber } = req.body;
  
    if (!email || !password || !firstName || !lastName || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }
  
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }
  
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters',
      });
    }
  
    next();
  };
  
  const validateLogin = (req, res, next) => {
    const { email, password } = req.body;
  
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }
  
    next();
  };
  
  module.exports = {
    validateRegistration,
    validateLogin,
  };
  