const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const WorkFinder = require('./models/WorkFinder');

const app = express();
const PORT = process.env.PORT || 3003;

connectDB();

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static('../frontend'));

// Explicit CORS headers for preflight
app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

// Register WorkFinder
app.post('/api/register', async (req, res) => {
  try {
    const { name, phone, userType, location, address } = req.body;
    
    const existingUser = await WorkFinder.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ message: 'Phone number already registered' });
    }

    const workFinder = new WorkFinder({
      name,
      phone,
      userType,
      location: {
        type: 'Point',
        coordinates: [location.lng, location.lat]
      },
      address
    });

    await workFinder.save();
    res.status(201).json({ message: 'Registration successful', workFinderId: workFinder._id.toString() });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
});

// Login WorkFinder
app.post('/api/login', async (req, res) => {
  try {
    const { phone } = req.body;
    const workFinder = await WorkFinder.findOne({ phone });
    
    if (!workFinder) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Login successful', workFinderId: workFinder._id.toString(), userType: workFinder.userType });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

// Verify OTP (simulated)
app.post('/api/verify-otp', async (req, res) => {
  const { phone, otp } = req.body;
  if (otp === '1234') {
    res.json({ message: 'OTP verified', verified: true });
  } else {
    res.status(400).json({ message: 'Invalid OTP' });
  }
});

app.listen(PORT, () => console.log(`WorkFinder Auth Server running on port ${PORT}`));
