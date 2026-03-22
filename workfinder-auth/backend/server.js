const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/database');
const WorkFinder = require('./models/WorkFinder');
const twilio = require('twilio');

const app = express();
const PORT = process.env.PORT || 3003;

const VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SID;
function getTwilioClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

connectDB();

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static('../frontend'));

app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

// Check phone uniqueness (registration)
app.post('/api/check-phone', async (req, res) => {
  const { phone } = req.body;
  const existing = await WorkFinder.findOne({ phone });
  if (existing) return res.status(400).json({ message: 'Phone number already registered' });
  res.json({ available: true });
});

// Check phone exists (forgot password)
app.post('/api/check-phone-exists', async (req, res) => {
  const { phone } = req.body;
  const user = await WorkFinder.findOne({ phone });
  if (!user) return res.status(404).json({ message: 'Mobile number not registered' });
  res.json({ exists: true });
});

// Send OTP
app.post('/api/send-otp', async (req, res) => {
  const { phone } = req.body;
  try {
    await getTwilioClient().verify.v2.services(VERIFY_SERVICE_SID)
      .verifications.create({ to: `+91${phone}`, channel: 'sms' });
    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send OTP', error: err.message });
  }
});

// Verify OTP
app.post('/api/verify-otp', async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ message: 'Phone and OTP are required' });
  try {
    const result = await getTwilioClient().verify.v2.services(VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: `+91${phone}`, code: String(otp).trim() });
    if (result.status === 'approved') {
      res.json({ message: 'OTP verified', verified: true });
    } else {
      res.status(400).json({ message: 'Invalid or expired OTP. Please try again.' });
    }
  } catch (err) {
    const msg = err.code === 20404 ? 'OTP expired or already used. Please resend.' : 'Verification failed. Please resend OTP.';
    res.status(400).json({ message: msg, error: err.message });
  }
});

// Register WorkFinder (with password)
app.post('/api/register', async (req, res) => {
  try {
    const { name, phone, userType, location, address, password } = req.body;
    const existingUser = await WorkFinder.findOne({ phone });
    if (existingUser) return res.status(400).json({ message: 'Phone number already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const workFinder = new WorkFinder({
      name, phone, userType,
      location: { type: 'Point', coordinates: [location.lng, location.lat] },
      address,
      password: hashedPassword
    });
    await workFinder.save();
    res.status(201).json({ message: 'Registration successful', workFinderId: workFinder._id.toString() });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
});

// Login WorkFinder (phone + OTP)
app.post('/api/login', async (req, res) => {
  try {
    const { phone } = req.body;
    const workFinder = await WorkFinder.findOne({ phone });
    if (!workFinder) return res.status(404).json({ message: 'Mobile number not registered' });
    res.json({ message: 'Login successful', workFinderId: workFinder._id.toString(), userType: workFinder.userType });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

// Reset Password
app.post('/api/reset-password', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const workFinder = await WorkFinder.findOne({ phone });
    if (!workFinder) return res.status(404).json({ message: 'Mobile number not registered' });
    workFinder.password = await bcrypt.hash(password, 10);
    await workFinder.save();
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Reset failed', error: err.message });
  }
});

app.listen(PORT, () => console.log(`WorkFinder Auth Server running on port ${PORT}`));
