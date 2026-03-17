const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const Worker = require('./models/Worker');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3001;

const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY;
const otpStore = {};

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendSMS(phone, otp) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      hostname: 'www.fast2sms.com',
      path: '/dev/bulkV2',
      headers: { authorization: FAST2SMS_API_KEY, 'Content-Type': 'application/json' }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const parsed = JSON.parse(data);
        if (parsed.return) resolve(parsed);
        else reject(new Error(parsed.message || 'SMS failed'));
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify({ route: 'otp', variables_values: otp, numbers: phone }));
    req.end();
  });
}

connectDB();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static('../frontend'));

app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

// Register Worker
app.post('/api/register', async (req, res) => {
  try {
    const { name, phone, workerType, skills, experience, languages, location, address, availability, expectedCompletionTime, profilePhoto, equipmentPhotos } = req.body;
    
    const existingWorker = await Worker.findOne({ phone });
    if (existingWorker) {
      return res.status(400).json({ message: 'Phone number already registered' });
    }

    const worker = new Worker({
      name, phone, workerType, skills, experience, languages,
      location: { type: 'Point', coordinates: [location.lng, location.lat] },
      address,
      availability: availability || 'available',
      expectedCompletionTime: expectedCompletionTime || null,
      profilePhoto: profilePhoto || null,
      equipmentPhotos: equipmentPhotos || []
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
    const { phone } = req.body;
    const worker = await Worker.findOne({ phone });
    if (!worker) return res.status(404).json({ message: 'Worker not found' });
    res.json({ message: 'Login successful', workerId: worker._id, workerType: worker.workerType });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

// Check phone uniqueness
app.post('/api/check-phone', async (req, res) => {
  const { phone } = req.body;
  const existing = await Worker.findOne({ phone });
  if (existing) return res.status(400).json({ message: 'Phone number already registered' });
  res.json({ available: true });
});

// Send OTP
app.post('/api/send-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ message: 'Phone is required' });
  const otp = generateOTP();
  otpStore[phone] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 };
  try {
    await sendSMS(phone, otp);
    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error('Fast2SMS error:', err.message);
    res.status(500).json({ message: 'Failed to send OTP', error: err.message });
  }
});

// Verify OTP
app.post('/api/verify-otp', async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ message: 'Phone and OTP are required' });
  const record = otpStore[phone];
  if (!record) return res.status(400).json({ message: 'OTP not sent or expired. Please resend.' });
  if (Date.now() > record.expiresAt) {
    delete otpStore[phone];
    return res.status(400).json({ message: 'OTP expired. Please resend.' });
  }
  if (record.otp !== String(otp).trim()) {
    return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
  }
  delete otpStore[phone];
  res.json({ message: 'OTP verified', verified: true });
});

app.listen(PORT, () => console.log(`Worker Auth Server running on port ${PORT}`));
