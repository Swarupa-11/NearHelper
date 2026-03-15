let workerId = localStorage.getItem('workerId');
let workerData = null;
let allRequests = [];
let currentFilter = 'all';

if (!workerId) {
  alert('Please login first');
  window.location.href = '../../worker-auth/frontend/index.html';
}

// Load saved theme and language
const savedTheme = localStorage.getItem('theme') || 'light';
const savedLang = localStorage.getItem('language') || 'en';
document.body.className = savedTheme;

window.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('languageSelect');
  if (sel) sel.value = savedLang;
  applyTranslations(savedLang);
  loadWorkerProfile();
  loadRequestCount();
});

// Panel Navigation
function showPanel(panelName) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  
  document.getElementById(panelName + 'Panel').classList.add('active');
  event.target.closest('.nav-item').classList.add('active');
  
  if (panelName === 'requests') {
    loadRequests();
  }
}

// Load Worker Profile
async function loadWorkerProfile() {
  try {
    const response = await fetch(`${CONFIG.WORKER_DASHBOARD_URL}/api/worker/${workerId}`);
    workerData = await response.json();
    
    document.getElementById('workerName').textContent = workerData.name;
    document.getElementById('workerPhone').textContent = workerData.phone;
    document.getElementById('workerType').textContent = workerData.workerType;
    document.getElementById('workerSkills').textContent = workerData.skills.join(', ');
    document.getElementById('workerExperience').textContent = workerData.experience;
    document.getElementById('workerAddress').textContent = workerData.address;
    document.getElementById('workerRating').textContent = workerData.rating ? workerData.rating.toFixed(1) + '/5' : 'Not rated yet';
    
    document.getElementById('editSkills').value = workerData.skills.join(', ');
    document.getElementById('editExperience').value = workerData.experience;
    document.getElementById('editAddress').value = workerData.address;
    
    const availabilityRadio = document.querySelector(`input[value="${workerData.availability}"]`);
    if (availabilityRadio) availabilityRadio.checked = true;
    
    if (workerData.availability === 'busy') {
      document.getElementById('busySection').style.display = 'block';
    }
    
    if (workerData.location && workerData.location.coordinates) {
      document.getElementById('locationStatus').textContent = 
        `Current: ${workerData.location.coordinates[1].toFixed(4)}, ${workerData.location.coordinates[0].toFixed(4)}`;
    }
  } catch (err) {
    console.error('Error loading profile:', err);
  }
}

// Update Profile
async function updateProfile(e) {
  e.preventDefault();
  
  const skills = document.getElementById('editSkills').value.split(',').map(s => s.trim().toLowerCase());
  const experience = parseInt(document.getElementById('editExperience').value);
  const address = document.getElementById('editAddress').value;
  
  try {
    const response = await fetch(`${CONFIG.WORKER_DASHBOARD_URL}/api/worker/${workerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skills, experience, address })
    });
    
    if (response.ok) {
      alert('Profile updated successfully');
      loadWorkerProfile();
    }
  } catch (err) {
    alert('Error updating profile: ' + err.message);
  }
}

// Availability
function updateAvailability() {
  const availability = document.querySelector('input[name="availability"]:checked').value;
  
  if (availability === 'busy') {
    document.getElementById('busySection').style.display = 'block';
  } else {
    document.getElementById('busySection').style.display = 'none';
    saveAvailability(availability, null);
  }
}

async function setCompletionTime() {
  const completionTime = document.getElementById('completionTime').value;
  if (!completionTime) {
    alert('Please select completion time');
    return;
  }
  await saveAvailability('busy', completionTime);
}

async function saveAvailability(availability, completionTime) {
  try {
    const response = await fetch(`${CONFIG.WORKER_DASHBOARD_URL}/api/worker/${workerId}/availability`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ availability, expectedCompletionTime: completionTime })
    });
    
    if (response.ok) {
      alert('Availability updated successfully');
    }
  } catch (err) {
    alert('Error updating availability: ' + err.message);
  }
}

// Location
async function updateLocation() {
  if (!navigator.geolocation) {
    alert('Geolocation not supported');
    return;
  }
  
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const response = await fetch(`${CONFIG.WORKER_DASHBOARD_URL}/api/worker/${workerId}/location`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        });
        
        if (response.ok) {
          document.getElementById('locationStatus').textContent = 
            `✓ Location updated: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
          alert('Location updated successfully!');
        }
      } catch (err) {
        alert('Error updating location: ' + err.message);
      }
    },
    (error) => {
      alert('Unable to get location: ' + error.message);
    }
  );
}

// Job Requests
async function loadRequests() {
  try {
    const response = await fetch(`${CONFIG.WORKER_DASHBOARD_URL}/api/worker/${workerId}/requests`);
    allRequests = await response.json();
    displayRequests();
  } catch (err) {
    console.error('Error loading requests:', err);
  }
}

function filterRequests(filter) {
  currentFilter = filter;
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  event.target.classList.add('active');
  displayRequests();
}

function displayRequests() {
  const container = document.getElementById('requestsList');
  
  let filteredRequests = allRequests;
  if (currentFilter !== 'all') {
    filteredRequests = allRequests.filter(r => r.status === currentFilter);
  }
  
  if (filteredRequests.length === 0) {
    container.innerHTML = '<div class="no-results">No requests found.</div>';
    return;
  }
  
  container.innerHTML = filteredRequests.map(req => `
    <div class="request-card">
      <div class="request-header">
        <div class="worker-name-req">${req.workFinderId?.name || 'Work Finder'}</div>
        <span class="status-badge status-${req.status}">${req.status}</span>
      </div>
      
      <div class="worker-contact">
        <strong>📞 Contact:</strong> ${req.workFinderId?.phone || 'N/A'}
      </div>
      
      <div class="request-description">
        <strong>Work Description:</strong><br>
        ${req.description}
      </div>
      
      <div style="color:#999; font-size:14px; margin-top:10px;">
        📅 Requested: ${new Date(req.createdAt).toLocaleDateString()} ${new Date(req.createdAt).toLocaleTimeString()}
        ${req.completedAt ? `<br>✅ Completed: ${new Date(req.completedAt).toLocaleDateString()}` : ''}
      </div>
      
      ${req.status === 'pending' ? `
        <div style="display:flex; gap:10px; margin-top:15px;">
          <button class="btn-primary" onclick="updateRequestStatus('${req._id}', 'accepted')" style="flex:1; background:#4caf50;">
            ✓ Accept
          </button>
          <button class="btn-danger" onclick="updateRequestStatus('${req._id}', 'rejected')" style="flex:1;">
            ✗ Reject
          </button>
        </div>
      ` : ''}
      
      ${req.status === 'accepted' ? `
        <button class="btn-primary" onclick="updateRequestStatus('${req._id}', 'completed')" style="margin-top:15px; width:100%;">
          ✓ Mark as Completed
        </button>
      ` : ''}
    </div>
  `).join('');
}

async function updateRequestStatus(requestId, status) {
  try {
    const response = await fetch(`${CONFIG.WORKER_DASHBOARD_URL}/api/job-request/${requestId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    
    if (response.ok) {
      alert(`Request ${status} successfully!`);
      loadRequests();
      loadRequestCount();
    } else {
      alert('Failed to update request');
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function loadRequestCount() {
  try {
    const response = await fetch(`${CONFIG.WORKER_DASHBOARD_URL}/api/worker/${workerId}/requests`);
    const requests = await response.json();
    const pendingRequests = requests.filter(r => r.status === 'pending');
    const badge = document.getElementById('requestBadge');
    if (pendingRequests.length > 0) {
      badge.textContent = pendingRequests.length;
      badge.style.display = 'inline-block';
    }
  } catch (err) {
    console.error('Error loading requests:', err);
  }
}

// Settings
const translations = {
  en: {
    profile: 'Profile', requests: 'Job Requests', availability: 'Availability & Location', settings: 'Settings', logout: 'Logout',
    myProfile: 'My Profile', phone: 'Phone', type: 'Type', skills: 'Skills', experience: 'Experience', address: 'Address', rating: 'Rating',
    editProfile: 'Edit Profile', skillsEdit: 'Skills (comma separated)', experienceEdit: 'Experience (years)', updateProfile: 'Update Profile',
    jobRequests: 'Job Requests', all: 'All', pending: 'Pending', accepted: 'Accepted', completed: 'Completed',
    availabilityTitle: 'Availability & Location', availabilityStatus: 'Availability Status', available: 'Available', busy: 'Busy',
    completionTime: 'Expected Completion Time', setTime: 'Set Time', updateLocation: 'Update My Current Location',
    settingsTitle: 'Settings', language: 'Language', theme: 'Theme', light: 'Light', dark: 'Dark', blue: 'Blue', green: 'Green',
    deleteAccount: 'Delete Account', deleteWarning: 'Once you delete your account, there is no going back. Please be certain.'
  },
  hi: {
    profile: 'प्रोफ़ाइल', requests: 'काम के अनुरोध', availability: 'उपलब्धता और स्थान', settings: 'सेटिंग्स', logout: 'लॉगआउट',
    myProfile: 'मेरी प्रोफ़ाइल', phone: 'फ़ोन', type: 'प्रकार', skills: 'कौशल', experience: 'अनुभव', address: 'पता', rating: 'रेटिंग',
    editProfile: 'प्रोफ़ाइल संपादित करें', skillsEdit: 'कौशल (अल्पविराम से अलग)', experienceEdit: 'अनुभव (वर्ष)', updateProfile: 'प्रोफ़ाइल अपडेट करें',
    jobRequests: 'काम के अनुरोध', all: 'सभी', pending: 'लंबित', accepted: 'स्वीकृत', completed: 'पूर्ण',
    availabilityTitle: 'उपलब्धता और स्थान', availabilityStatus: 'उपलब्धता स्थिति', available: 'उपलब्ध', busy: 'व्यस्त',
    completionTime: 'अपेक्षित समापन समय', setTime: 'समय सेट करें', updateLocation: 'मेरा वर्तमान स्थान अपडेट करें',
    settingsTitle: 'सेटिंग्स', language: 'भाषा', theme: 'थीम', light: 'हल्का', dark: 'गहरा', blue: 'नीला', green: 'हरा',
    deleteAccount: 'खाता हटाएं', deleteWarning: 'एक बार खाता हटाने के बाद वापस नहीं जा सकते।'
  },
  te: {
    profile: 'ప్రొఫైల్', requests: 'జాబ్ అభ్యర్థనలు', availability: 'అందుబాటు & స్థానం', settings: 'సెట్టింగ్లు', logout: 'లాగౌట్',
    myProfile: 'నా ప్రొఫైల్', phone: 'ఫోన్', type: 'రకం', skills: 'నైపుణ్యాలు', experience: 'అనుభవం', address: 'చిరునామా', rating: 'రేటింగ్',
    editProfile: 'ప్రొఫైల్ సవరించు', skillsEdit: 'నైపుణ్యాలు (కామాతో వేరు చేయండి)', experienceEdit: 'అనుభవం (సంవత్సరాలు)', updateProfile: 'ప్రొఫైల్ నవీకరించు',
    jobRequests: 'జాబ్ అభ్యర్థనలు', all: 'అన్నీ', pending: 'పెండింగ్', accepted: 'అంగీకరించబడింది', completed: 'పూర్తయింది',
    availabilityTitle: 'అందుబాటు & స్థానం', availabilityStatus: 'అందుబాటు స్థితి', available: 'అందుబాటులో', busy: 'బిజీ',
    completionTime: 'అంచనా పూర్తి సమయం', setTime: 'సమయం సెట్ చేయి', updateLocation: 'నా ప్రస్తుత స్థానం నవీకరించు',
    settingsTitle: 'సెట్టింగ్లు', language: 'భాష', theme: 'థీమ్', light: 'లైట్', dark: 'డార్క్', blue: 'బ్లూ', green: 'గ్రీన్',
    deleteAccount: 'ఖాతా తొలగించు', deleteWarning: 'ఖాతా తొలగించిన తర్వాత వెనక్కి వెళ్ళలేరు.'
  },
  ta: {
    profile: 'சுயவிவரம்', requests: 'வேலை கோரிக்கைகள்', availability: 'கிடைக்கும் தன்மை & இடம்', settings: 'அமைப்புகள்', logout: 'வெளியேறு',
    myProfile: 'என் சுயவிவரம்', phone: 'தொலைபேசி', type: 'வகை', skills: 'திறன்கள்', experience: 'அனுபவம்', address: 'முகவரி', rating: 'மதிப்பீடு',
    editProfile: 'சுயவிவரம் திருத்து', skillsEdit: 'திறன்கள் (காற்புள்ளியால் பிரிக்கவும்)', experienceEdit: 'அனுபவம் (ஆண்டுகள்)', updateProfile: 'சுயவிவரம் புதுப்பி',
    jobRequests: 'வேலை கோரிக்கைகள்', all: 'அனைத்தும்', pending: 'நிலுவையில்', accepted: 'ஏற்றுக்கொள்ளப்பட்டது', completed: 'முடிந்தது',
    availabilityTitle: 'கிடைக்கும் தன்மை & இடம்', availabilityStatus: 'கிடைக்கும் நிலை', available: 'கிடைக்கும்', busy: 'பிஸி',
    completionTime: 'எதிர்பார்க்கப்படும் முடிவு நேரம்', setTime: 'நேரம் அமை', updateLocation: 'என் தற்போதைய இடத்தை புதுப்பி',
    settingsTitle: 'அமைப்புகள்', language: 'மொழி', theme: 'தீம்', light: 'லைட்', dark: 'டார்க்', blue: 'ப்ளூ', green: 'க்ரீன்',
    deleteAccount: 'கணக்கை நீக்கு', deleteWarning: 'கணக்கை நீக்கிய பிறகு திரும்ப முடியாது.'
  },
  kn: {
    profile: 'ಪ್ರೊಫೈಲ್', requests: 'ಕೆಲಸದ ವಿನಂತಿಗಳು', availability: 'ಲಭ್ಯತೆ & ಸ್ಥಳ', settings: 'ಸೆಟ್ಟಿಂಗ್ಗಳು', logout: 'ಲಾಗೌಟ್',
    myProfile: 'ನನ್ನ ಪ್ರೊಫೈಲ್', phone: 'ಫೋನ್', type: 'ಪ್ರಕಾರ', skills: 'ಕೌಶಲ್ಯಗಳು', experience: 'ಅನುಭವ', address: 'ವಿಳಾಸ', rating: 'ರೇಟಿಂಗ್',
    editProfile: 'ಪ್ರೊಫೈಲ್ ಸಂಪಾದಿಸಿ', skillsEdit: 'ಕೌಶಲ್ಯಗಳು (ಅಲ್ಪವಿರಾಮದಿಂದ ಪ್ರತ್ಯೇಕಿಸಿ)', experienceEdit: 'ಅನುಭವ (ವರ್ಷಗಳು)', updateProfile: 'ಪ್ರೊಫೈಲ್ ನವೀಕರಿಸಿ',
    jobRequests: 'ಕೆಲಸದ ವಿನಂತಿಗಳು', all: 'ಎಲ್ಲಾ', pending: 'ಬಾಕಿ', accepted: 'ಸ್ವೀಕರಿಸಲಾಗಿದೆ', completed: 'ಪೂರ್ಣಗೊಂಡಿದೆ',
    availabilityTitle: 'ಲಭ್ಯತೆ & ಸ್ಥಳ', availabilityStatus: 'ಲಭ್ಯತೆ ಸ್ಥಿತಿ', available: 'ಲಭ್ಯವಿದೆ', busy: 'ಬ್ಯುಸಿ',
    completionTime: 'ನಿರೀಕ್ಷಿತ ಪೂರ್ಣಗೊಳಿಸುವ ಸಮಯ', setTime: 'ಸಮಯ ಹೊಂದಿಸಿ', updateLocation: 'ನನ್ನ ಪ್ರಸ್ತುತ ಸ್ಥಳ ನವೀಕರಿಸಿ',
    settingsTitle: 'ಸೆಟ್ಟಿಂಗ್ಗಳು', language: 'ಭಾಷೆ', theme: 'ಥೀಮ್', light: 'ಲೈಟ್', dark: 'ಡಾರ್ಕ್', blue: 'ಬ್ಲೂ', green: 'ಗ್ರೀನ್',
    deleteAccount: 'ಖಾತೆ ಅಳಿಸಿ', deleteWarning: 'ಖಾತೆ ಅಳಿಸಿದ ನಂತರ ಹಿಂತಿರುಗಲು ಸಾಧ್ಯವಿಲ್ಲ.'
  },
  ml: {
    profile: 'പ്രൊഫൈൽ', requests: 'ജോബ് അഭ്യർത്ഥനകൾ', availability: 'ലഭ്യത & സ്ഥലം', settings: 'ക്രമീകരണങ്ങൾ', logout: 'ലോഗൗട്ട്',
    myProfile: 'എന്റെ പ്രൊഫൈൽ', phone: 'ഫോൺ', type: 'തരം', skills: 'കഴിവുകൾ', experience: 'അനുഭവം', address: 'വിലാസം', rating: 'റേറ്റിംഗ്',
    editProfile: 'പ്രൊഫൈൽ എഡിറ്റ് ചെയ്യുക', skillsEdit: 'കഴിവുകൾ (കോമയാൽ വേർതിരിക്കുക)', experienceEdit: 'അനുഭവം (വർഷങ്ങൾ)', updateProfile: 'പ്രൊഫൈൽ അപ്ഡേറ്റ് ചെയ്യുക',
    jobRequests: 'ജോബ് അഭ്യർത്ഥനകൾ', all: 'എല്ലാം', pending: 'തീർപ്പാക്കാത്തത്', accepted: 'സ്വീകരിച്ചു', completed: 'പൂർത്തിയായി',
    availabilityTitle: 'ലഭ്യത & സ്ഥലം', availabilityStatus: 'ലഭ്യതാ നില', available: 'ലഭ്യമാണ്', busy: 'ബിസി',
    completionTime: 'പ്രതീക്ഷിത പൂർത്തീകരണ സമയം', setTime: 'സമയം സജ്ജമാക്കുക', updateLocation: 'എന്റെ നിലവിലെ സ്ഥലം അപ്ഡേറ്റ് ചെയ്യുക',
    settingsTitle: 'ക്രമീകരണങ്ങൾ', language: 'ഭാഷ', theme: 'തീം', light: 'ലൈറ്റ്', dark: 'ഡാർക്ക്', blue: 'ബ്ലൂ', green: 'ഗ്രീൻ',
    deleteAccount: 'അക്കൗണ്ട് ഇല്ലാതാക്കുക', deleteWarning: 'അക്കൗണ്ട് ഇല്ലാതാക്കിയ ശേഷം തിരിച്ചുപോകാൻ കഴിയില്ല.'
  }
};

function applyTranslations(lang) {
  const t = translations[lang];
  document.querySelectorAll('[data-translate]').forEach(el => {
    const key = el.getAttribute('data-translate');
    if (t[key]) el.textContent = t[key];
  });
}

function changeLanguage() {
  const lang = document.getElementById('languageSelect').value;
  localStorage.setItem('language', lang);
  applyTranslations(lang);
}

function changeTheme(theme) {
  document.body.className = theme;
  localStorage.setItem('theme', theme);
}

async function deleteAccount() {
  const confirm = prompt('Type "DELETE" to confirm account deletion:');
  if (confirm !== 'DELETE') return;
  
  try {
    const response = await fetch(`${CONFIG.WORKER_DASHBOARD_URL}/api/worker/${workerId}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      alert('Account deleted successfully');
      localStorage.removeItem('workerId');
      window.location.href = '../../worker-auth/frontend/index.html';
    } else {
      alert('Failed to delete account');
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

function logout() {
  localStorage.removeItem('workerId');
  window.location.href = '../../worker-auth/frontend/index.html';
}

// Initialize
