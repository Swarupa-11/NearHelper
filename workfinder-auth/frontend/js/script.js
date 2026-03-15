const translations = {
  en: { title: "Find Workers Near You", nameLabel: "Name", phoneLabel: "Phone Number", 
        userTypeLabel: "I am a", household: "Household Customer", farmer: "Farmer",
        addressLabel: "Address", submitBtn: "Register", loginBtn: "Login", 
        locationBtn: "Get My Location" },
  hi: { title: "अपने पास कार्यकर्ता खोजें", nameLabel: "नाम", phoneLabel: "फोन नंबर",
        userTypeLabel: "मैं हूँ", household: "घरेलू ग्राहक", farmer: "किसान",
        addressLabel: "पता", submitBtn: "पंजीकरण करें", loginBtn: "लॉगिन",
        locationBtn: "मेरा स्थान प्राप्त करें" },
  te: { title: "మీ దగ్గర కార్మికులను కనుగొనండి", nameLabel: "పేరు", phoneLabel: "ఫోన్ నంబర్",
        userTypeLabel: "నేను", household: "గృహ కస్టమర్", farmer: "రైతు",
        addressLabel: "చిరునామా", submitBtn: "సమర్పించు", loginBtn: "లాగిన్",
        locationBtn: "నా స్థానం పొందండి" },
  ta: { title: "உங்களுக்கு அருகில் தொழிலாளர்களைக் கண்டறியவும்", nameLabel: "பெயர்", phoneLabel: "தொலைபேசி எண்",
        userTypeLabel: "நான்", household: "வீட்டு வாடிக்கையாளர்", farmer: "விவசாயி",
        addressLabel: "முகவரி", submitBtn: "சமர்ப்பிக்கவும்", loginBtn: "உள்நுழைய",
        locationBtn: "எனது இடத்தைப் பெறுங்கள்" }
};

let currentLang = 'en';
let voiceEnabled = true;
let userLocation = null;
let recognition;

if ('webkitSpeechRecognition' in window) {
  recognition = new webkitSpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
}

function changeLanguage() {
  currentLang = document.getElementById('languageSelect').value;
  const t = translations[currentLang];
  
  document.getElementById('title').textContent = t.title;
  document.getElementById('nameLabel').textContent = t.nameLabel;
  document.getElementById('phoneLabel').textContent = t.phoneLabel;
  document.getElementById('userTypeLabel').textContent = t.userTypeLabel;
  document.getElementById('householdOption').textContent = t.household;
  document.getElementById('farmerOption').textContent = t.farmer;
  document.getElementById('addressLabel').textContent = t.addressLabel;
  document.getElementById('submitBtn').textContent = t.submitBtn;
  document.getElementById('loginBtn').textContent = t.loginBtn;
  document.getElementById('locationBtn').textContent = t.locationBtn;
  
  if (voiceEnabled) speak(t.title);
}

function speak(text) {
  if (!voiceEnabled) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = currentLang === 'en' ? 'en-US' : currentLang === 'hi' ? 'hi-IN' : 
                   currentLang === 'te' ? 'te-IN' : 'ta-IN';
  speechSynthesis.speak(utterance);
}

function toggleVoice() {
  voiceEnabled = !voiceEnabled;
  document.getElementById('voiceBtn').textContent = voiceEnabled ? '🔊 Voice ON' : '🔇 Voice OFF';
}

function startVoiceInput(fieldId) {
  if (!recognition) {
    alert('Voice input not supported in this browser');
    return;
  }
  
  recognition.lang = currentLang === 'en' ? 'en-US' : currentLang === 'hi' ? 'hi-IN' : 
                     currentLang === 'te' ? 'te-IN' : 'ta-IN';
  
  recognition.onresult = (event) => {
    document.getElementById(fieldId).value = event.results[0][0].transcript;
  };
  
  recognition.start();
  speak('Listening...');
}

function getLocation() {
  if (!navigator.geolocation) {
    alert('Geolocation not supported');
    return;
  }
  
  speak('Getting your location...');
  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      document.getElementById('locationStatus').textContent = 
        `✓ Location captured: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`;
      speak('Location captured successfully');
    },
    (error) => {
      alert('Unable to get location: ' + error.message);
    }
  );
}

function showTab(tab) {
  if (tab === 'register') {
    document.getElementById('registerForm').style.display = 'block';
    document.getElementById('loginForm').style.display = 'none';
    document.querySelectorAll('.tab')[0].classList.add('active');
    document.querySelectorAll('.tab')[1].classList.remove('active');
  } else {
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
    document.querySelectorAll('.tab')[1].classList.add('active');
    document.querySelectorAll('.tab')[0].classList.remove('active');
  }
}

let regOtpCooldown = null;

async function sendRegOTP(type) {
  const phone = document.getElementById('phone').value;
  if (!phone || phone.length !== 10) {
    alert('Please enter a valid 10-digit phone number first');
    return;
  }
  const url = type === 'worker' ? CONFIG.WORKER_AUTH_URL : CONFIG.WORKFINDER_AUTH_URL;

  // Check if phone already registered
  try {
    const checkRes = await fetch(`${url}/api/check-phone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    if (!checkRes.ok) {
      const d = await checkRes.json();
      alert(d.message);
      return;
    }
  } catch (err) {
    alert('Error checking phone: ' + err.message);
    return;
  }

  try {
    const res = await fetch(`${url}/api/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    const data = await res.json();
    if (!res.ok) { alert('Failed to send OTP: ' + data.message); return; }
    alert('OTP sent to your phone!');
    startRegOtpCooldown();
  } catch (err) {
    alert('Error sending OTP: ' + err.message);
  }
}

function startRegOtpCooldown() {
  const sendBtn = document.getElementById('sendRegOtpBtn');
  const resendBtn = document.getElementById('resendRegOtpBtn');
  const timer = document.getElementById('regOtpTimer');
  sendBtn.style.display = 'none';
  resendBtn.style.display = 'block';
  resendBtn.disabled = true;
  let seconds = 30;
  timer.textContent = `Resend in ${seconds}s`;
  clearInterval(regOtpCooldown);
  regOtpCooldown = setInterval(() => {
    seconds--;
    if (seconds <= 0) {
      clearInterval(regOtpCooldown);
      resendBtn.disabled = false;
      timer.textContent = '';
    } else {
      timer.textContent = `Resend in ${seconds}s`;
    }
  }, 1000);
}

async function registerUser(e) {
  e.preventDefault();
  
  if (!userLocation) {
    alert('Please capture your location first');
    return;
  }

  const phone = document.getElementById('phone').value;
  const regOtp = document.getElementById('regOtp').value;
  if (!regOtp) { alert('Please enter the OTP sent to your phone'); return; }

  try {
    const otpRes = await fetch(`${CONFIG.WORKFINDER_AUTH_URL}/api/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp: regOtp })
    });
    const otpData = await otpRes.json();
    if (!otpRes.ok) { alert('Invalid OTP: ' + (otpData.error || otpData.message)); return; }
  } catch (err) {
    alert('OTP verification failed: ' + err.message);
    return;
  }

  const data = {
    name: document.getElementById('name').value,
    phone: document.getElementById('phone').value,
    userType: document.getElementById('userType').value,
    location: userLocation,
    address: document.getElementById('address').value
  };
  
  try {
    const response = await fetch(`${CONFIG.WORKFINDER_AUTH_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      speak('Registration successful');
      alert('Registration successful!');
      localStorage.setItem('workFinderId', result.workFinderId);
      window.location.href = '../../workfinder-dashboard/frontend/dashboard.html';
    } else {
      alert('Registration failed: ' + result.message);
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function sendOTP(type) {
  const phone = document.getElementById('loginPhone').value;
  if (!phone || phone.length !== 10) {
    alert('Please enter a valid 10-digit phone number first');
    return;
  }
  try {
    const url = type === 'worker' ? CONFIG.WORKER_AUTH_URL : CONFIG.WORKFINDER_AUTH_URL;
    const res = await fetch(`${url}/api/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    const data = await res.json();
    if (res.ok) {
      alert('OTP sent to your phone!');
    } else {
      alert('Failed to send OTP: ' + data.message);
    }
  } catch (err) {
    alert('Error sending OTP: ' + err.message);
  }
}

async function loginUser(e) {
  e.preventDefault();
  
  const phone = document.getElementById('loginPhone').value;
  const otp = document.getElementById('otp').value;
  
  try {
    const otpResponse = await fetch(`${CONFIG.WORKFINDER_AUTH_URL}/api/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp })
    });
    
    if (!otpResponse.ok) {
      alert('Invalid OTP');
      return;
    }
    
    const response = await fetch(`${CONFIG.WORKFINDER_AUTH_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      speak('Login successful');
      alert('Login successful!');
      localStorage.setItem('workFinderId', result.workFinderId);
      window.location.href = '../../workfinder-dashboard/frontend/dashboard.html';
    } else {
      alert('Login failed: ' + result.message);
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}
