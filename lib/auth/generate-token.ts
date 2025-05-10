const jwt = require('jsonwebtoken');

const token = jwt.sign(
  {
    userId: 'admin123',
    role: 'admin',
  },
  process.env.JWT_SECRET || 'shinu',
  {
    expiresIn: '1h',
  }
);

console.log('Your admin token:', token);