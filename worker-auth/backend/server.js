const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/database');
const Worker = require('./models/Worker');
const twilio = require('twilio');

const app = express();
const PORT = process.env.PORT || 3001;

const VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SID;
function getTwilioClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

connectDB();

// Uploads directory
const uploadDir = path.join(__dirname, '../frontend/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_'))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('../frontend'));

app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

// Check phone uniqueness
app.post('/api/check-phone', async (req, res) => {
  const { phone } = req.body;
  const existing = await Worker.findOne({ phone });
  if (existing) return res.status(400).json({ message: 'Phone number already registered' });
  res.json({ available: true });
});

// Send OTP (registration & forgot password)
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

// Register Worker (multipart/form-data with profile photo)
app.post('/api/register', upload.single('profilePhoto'), async (req, res) => {
  try {
    const { name, phone, workerType, skills, address, availability, expectedCompletionTime, lat, lng, password } = req.body;

    const existingWorker = await Worker.findOne({ phone });
    if (existingWorker) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Phone number already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const worker = new Worker({
      name,
      phone,
      workerType,
      skills: JSON.parse(skills || '[]'),
      location: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
      address,
      availability: availability || 'available',
      expectedCompletionTime: expectedCompletionTime || null,
      profilePhoto: req.file ? '/uploads/' + req.file.filename : null,
      password: hashedPassword
    });

    await worker.save();
    res.status(201).json({ message: 'Registration successful', workerId: worker._id });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
});

// Login Worker
app.post('/api/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const worker = await Worker.findOne({ phone });
    if (!worker) return res.status(404).json({ message: 'Mobile number not registered' });

    if (!worker.password) return res.status(401).json({ message: 'Account has no password set. Please use Forgot Password to set one.' });

    const match = await bcrypt.compare(password, worker.password);
    if (!match) return res.status(401).json({ message: 'Incorrect password' });

    res.json({ message: 'Login successful', workerId: worker._id, workerType: worker.workerType });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

// Check phone exists (for forgot password)
app.post('/api/check-phone-exists', async (req, res) => {
  const { phone } = req.body;
  const worker = await Worker.findOne({ phone });
  if (!worker) return res.status(404).json({ message: 'Mobile number not registered' });
  res.json({ exists: true });
});

// Reset Password
app.post('/api/reset-password', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const worker = await Worker.findOne({ phone });
    if (!worker) return res.status(404).json({ message: 'Mobile number not registered' });

    worker.password = await bcrypt.hash(password, 10);
    await worker.save();
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Reset failed', error: err.message });
  }
});

app.listen(PORT, () => console.log(`Worker Auth Server running on port ${PORT}`));
