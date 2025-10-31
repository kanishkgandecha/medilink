module.exports = {
    accessTokenSecret: process.env.JWT_ACCESS_SECRET || 'your_access_secret_key',
    refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'your_refresh_secret_key',
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
  };
  