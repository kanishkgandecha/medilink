// Format date
exports.formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  // Generate random string
  exports.generateRandomString = (length = 10) => {
    return Math.random().toString(36).substring(2, length + 2);
  };
  
  // Calculate age from date of birth
  exports.calculateAge = (dateOfBirth) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };
  
  // Paginate results
  exports.paginate = (page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    return { skip, limit: parseInt(limit) };
  };
  
  // Format phone number
  exports.formatPhoneNumber = (phoneNumber) => {
    const cleaned = ('' + phoneNumber).replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return '(' + match[1] + ') ' + match[2] + '-' + match[3];
    }
    return phoneNumber;
  };
  
  // Validate email
  exports.isValidEmail = (email) => {
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    return emailRegex.test(email);
  };
  
  // Generate OTP
  exports.generateOTP = (length = 6) => {
    return Math.floor(Math.random() * Math.pow(10, length)).toString().padStart(length, '0');
  };
  
  // Sleep function
  exports.sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };
  