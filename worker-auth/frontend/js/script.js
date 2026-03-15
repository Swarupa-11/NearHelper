const translations = {
  en: { title: "Worker Registration", nameLabel: "Name", phoneLabel: "Phone Number", workerTypeLabel: "Worker Type", 
        domestic: "Domestic Worker", agricultural: "Agricultural Worker", skillsLabel: "Skills", 
        experienceLabel: "Experience (years)", addressLabel: "Address", submitBtn: "Register", 
        loginBtn: "Login", locationBtn: "Get My Location" },
  hi: { title: "कार्यकर्ता पंजीकरण", nameLabel: "नाम", phoneLabel: "फोन नंबर", workerTypeLabel: "कार्यकर्ता प्रकार",
        domestic: "घरेलू कार्यकर्ता", agricultural: "कृषि कार्यकर्ता", skillsLabel: "कौशल",
        experienceLabel: "अनुभव (वर्ष)", addressLabel: "पता", submitBtn: "पंजीकरण करें",
        loginBtn: "लॉगिन", locationBtn: "मेरा स्थान प्राप्त करें" },
  te: { title: "కార్మికుడి నమోదు", nameLabel: "పేరు", phoneLabel: "ఫోన్ నంబర్", workerTypeLabel: "కార్మికుడి రకం",
        domestic: "గృహ కార్మికుడు", agricultural: "వ్యవసాయ కార్మికుడు", skillsLabel: "నైపుణ్యాలు",
        experienceLabel: "అనుభవం (సంవత్సరాలు)", addressLabel: "చిరునామా", submitBtn: "సమర్పించు",
        loginBtn: "లాగిన్", locationBtn: "నా స్థానం పొందండి" },
  ta: { title: "தொழிலாளர் பதிவு", nameLabel: "பெயர்", phoneLabel: "தொலைபேசி எண்", workerTypeLabel: "தொழிலாளர் வகை",
        domestic: "வீட்டு தொழிலாளி", agricultural: "விவசாய தொழிலாளி", skillsLabel: "திறன்கள்",
        experienceLabel: "அனுபவம் (ஆண்டுகள்)", addressLabel: "முகவரி", submitBtn: "சமர்ப்பிக்கவும்",
        loginBtn: "உள்நுழைய", locationBtn: "எனது இடத்தைப் பெறுங்கள்" }
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
  document.getElementById('workerTypeLabel').textContent = t.workerTypeLabel;
  document.getElementById('domesticOption').textContent = t.domestic;
  document.getElementById('agriculturalOption').textContent = t.agricultural;
  document.getElementById('skillsLabel').textContent = t.skillsLabel;
  document.getElementById('experienceLabel').textContent = t.experienceLabel;
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

async function registerWorker(e) {
  e.preventDefault();
  
  if (!userLocation) {
    alert('Please capture your location first');
    return;
  }
  
  const data = {
    name: document.getElementById('name').value,
    phone: document.getElementById('phone').value,
    workerType: document.getElementById('workerType').value,
    skills: document.getElementById('skills').value.split(',').map(s => s.trim()),
    experience: parseInt(document.getElementById('experience').value),
    languages: [currentLang],
    location: userLocation,
    address: document.getElementById('address').value
  };
  
  try {
    const response = await fetch(`${CONFIG.WORKER_AUTH_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      speak('Registration successful');
      alert('Registration successful! Worker ID: ' + result.workerId);
      localStorage.setItem('workerId', result.workerId);
      window.location.href = '../../worker-dashboard/frontend/dashboard.html';
    } else {
      alert('Registration failed: ' + result.message);
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function loginWorker(e) {
  e.preventDefault();
  
  const phone = document.getElementById('loginPhone').value;
  const otp = document.getElementById('otp').value;
  
  try {
    const otpResponse = await fetch(`${CONFIG.WORKER_AUTH_URL}/api/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp })
    });
    
    if (!otpResponse.ok) {
      alert('Invalid OTP');
      return;
    }
    
    const response = await fetch(`${CONFIG.WORKER_AUTH_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      speak('Login successful');
      alert('Login successful!');
      localStorage.setItem('workerId', result.workerId);
      window.location.href = '../../worker-dashboard/frontend/dashboard.html';
    } else {
      alert('Login failed: ' + result.message);
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}
