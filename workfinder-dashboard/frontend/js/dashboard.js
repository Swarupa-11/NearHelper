let workFinderId = localStorage.getItem('workFinderId');
let userLocation = null;
let workersData = [];
let allRequests = [];
let currentFilter = 'all';
let selectedRating = 0;
let currentReviewData = null;

if (!workFinderId) {
  alert('Please login first');
  window.location.href = '../../workfinder-auth/frontend/index.html';
}

// Load saved theme and language
const savedTheme = localStorage.getItem('theme') || 'light';
const savedLang = localStorage.getItem('language') || 'en';
document.body.className = savedTheme;
document.getElementById('languageSelect').value = savedLang;

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

// Load User Profile
async function loadUserProfile() {
  try {
    const response = await fetch(`${CONFIG.WORKFINDER_DASH_URL}/api/workfinder/${workFinderId}`);
    if (!response.ok) {
      const err = await response.json();
      alert('Failed to load profile: ' + err.message);
      return;
    }
    const user = await response.json();

    document.getElementById('userName').textContent = user.name || '';
    document.getElementById('userPhone').textContent = user.phone || 'N/A';
    document.getElementById('welcomeMsg').textContent = `Welcome, ${user.name}!`;

    if (user.location && user.location.coordinates && user.location.coordinates.length === 2) {
      userLocation = {
        lat: user.location.coordinates[1],
        lng: user.location.coordinates[0]
      };
      document.getElementById('userLocation').textContent =
        `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`;
    } else {
      getCurrentLocation();
    }
  } catch (err) {
    alert('Error loading profile: ' + err.message);
  }
}

function getCurrentLocation() {
  if (!navigator.geolocation) return;
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      document.getElementById('userLocation').textContent = 
        `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`;
    },
    () => {
      // fallback to last known DB location or default
      console.warn('GPS unavailable, using stored location');
    }
  );
}

async function updateFinderLocation() {
  if (!navigator.geolocation) {
    alert('Geolocation not supported');
    return;
  }
  
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      document.getElementById('userLocation').textContent = 
        `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`;
      alert('Location updated successfully!');
    }
  );
}

// Search Workers
async function searchWorkers() {
  if (!userLocation) {
    alert('Getting your location, please try again in a moment.');
    getCurrentLocation();
    return;
  }
  
  const workerType = document.getElementById('workerType').value;
  const radius = parseInt(document.getElementById('radius').value) || 500;
  const skillsInput = document.getElementById('skills').value;
  const skills = skillsInput ? skillsInput.split(',').map(s => s.trim().toLowerCase()) : [];
  
  try {
    const response = await fetch(`${CONFIG.WORKFINDER_DASH_URL}/api/search-workers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: userLocation.lat,
        lng: userLocation.lng,
        radius,
        workerType,
        skills
      })
    });
    
    if (!response.ok) {
      alert('Server error: ' + response.status + '. Make sure backend is running on port 3004.');
      return;
    }

    workersData = await response.json();
    displayWorkers(workersData);
  } catch (err) {
    alert('Cannot connect to server. Make sure backend is running on port 3004.');
  }
}

function displayWorkers(workers) {
  const workersList = document.getElementById('workersList');
  const resultCount = document.getElementById('resultCount');
  
  if (workers.length === 0) {
    workersList.innerHTML = '<div class="no-results">No workers found. Try increasing the search radius.</div>';
    resultCount.textContent = '(0)';
    return;
  }
  
  resultCount.textContent = `(${workers.length})`;
  
  workersList.innerHTML = workers.map(worker => `
    <div class="worker-card" onclick="showWorkerDetails('${worker._id}')">
      <div class="worker-header">
        <div class="worker-name">${worker.name}</div>
        <div class="worker-distance">📍 ${worker.distance} km</div>
      </div>
      <div class="worker-type">${worker.workerType === 'domestic' ? 'Domestic Worker' : 'Agricultural Worker'}</div>
      <div class="worker-skills"><strong>Skills:</strong> ${worker.skills.join(', ')}</div>
      <div class="worker-experience"><strong>Experience:</strong> ${worker.experience} years</div>
      <div class="worker-rating"><strong>⭐ Rating:</strong> ${worker.rating ? worker.rating.toFixed(1) + '/5' : 'Not rated yet'}</div>
    </div>
  `).join('');
}

async function showWorkerDetails(workerId) {
  try {
    const response = await fetch(`${CONFIG.WORKFINDER_DASH_URL}/api/worker/${workerId}`);
    const worker = await response.json();
    
    const reviewsResponse = await fetch(`${CONFIG.WORKER_DASHBOARD_URL}/api/worker/${workerId}/reviews`);
    const reviews = await reviewsResponse.json();
    
    const distance = workersData.find(w => w._id === workerId)?.distance || 'N/A';
    
    let reviewsHtml = '';
    if (reviews.length > 0) {
      reviewsHtml = `
        <div style="margin-top:15px; padding:10px; background:#f9f9f9; border-radius:8px;">
          <strong>Reviews (${reviews.length}):</strong>
          ${reviews.slice(0, 3).map(r => `
            <div style="margin:10px 0; padding:8px; background:white; border-radius:5px;">
              <div>⭐ ${r.rating}/5 - ${r.workFinderId?.name || 'Anonymous'}</div>
              <div style="color:#666; font-size:14px;">${r.comment || 'No comment'}</div>
              <div style="color:#999; font-size:12px;">${new Date(r.createdAt).toLocaleDateString()}</div>
            </div>
          `).join('')}
          ${reviews.length > 3 ? `<div style="color:#666; font-size:14px;">+ ${reviews.length - 3} more reviews</div>` : ''}
        </div>
      `;
    }
    
    document.getElementById('workerDetails').innerHTML = `
      <p><strong>Name:</strong> ${worker.name}</p>
      <p><strong>Phone:</strong> ${worker.phone}</p>
      <p><strong>Type:</strong> ${worker.workerType === 'domestic' ? 'Domestic Worker' : 'Agricultural Worker'}</p>
      <p><strong>Skills:</strong> ${worker.skills.join(', ')}</p>
      <p><strong>Experience:</strong> ${worker.experience} years</p>
      <p><strong>Languages:</strong> ${worker.languages.join(', ')}</p>
      <p><strong>Address:</strong> ${worker.address}</p>
      <p><strong>Distance:</strong> ${distance} km away</p>
      <p><strong>⭐ Average Rating:</strong> ${worker.rating ? worker.rating.toFixed(1) + '/5' : 'Not rated yet'} ${reviews.length > 0 ? `(${reviews.length} reviews)` : ''}</p>
      <p><strong>Verified:</strong> ${worker.verified ? '✓ Yes' : '✗ No'}</p>
      ${reviewsHtml}
      <button onclick="sendRequest('${worker._id}', '${worker.name}')" class="btn-primary">Send Work Request</button>
    `;
    
    document.getElementById('workerModal').style.display = 'block';
  } catch (err) {
    alert('Error loading worker details: ' + err.message);
  }
}

function closeModal() {
  document.getElementById('workerModal').style.display = 'none';
}

async function sendRequest(workerId, workerName) {
  const description = prompt(`Describe the work you need from ${workerName}:`);
  if (!description) return;
  
  try {
    const response = await fetch(`${CONFIG.WORKFINDER_DASH_URL}/api/job-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workerId,
        workFinderId,
        description
      })
    });
    
    if (response.ok) {
      alert('Request sent successfully!');
      closeModal();
      loadRequestCount();
    } else {
      alert('Failed to send request');
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// Requests
async function loadRequests() {
  try {
    const response = await fetch(`${CONFIG.WORKFINDER_DASH_URL}/api/workfinder/${workFinderId}/requests`);
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
        <div class="worker-name-req">${req.workerId?.name || 'Worker'}</div>
        <span class="status-badge status-${req.status}">${req.status}</span>
      </div>
      <div class="worker-contact">
        <strong>📞 Contact:</strong> ${req.workerId?.phone || 'N/A'}
      </div>
      <div class="request-description">${req.description}</div>
      <div style="color:#999; font-size:14px; margin-top:10px;">
        📅 ${new Date(req.createdAt).toLocaleDateString()}
        ${req.completedAt ? ` | ✅ Completed: ${new Date(req.completedAt).toLocaleDateString()}` : ''}
      </div>
      ${req.status === 'completed' ? `
        <button class="btn-primary" onclick="openReviewModal('${req._id}', '${req.workerId._id}')" style="margin-top:10px;">
          Leave Review
        </button>
      ` : ''}
    </div>
  `).join('');
}

async function loadRequestCount() {
  try {
    const response = await fetch(`${CONFIG.WORKFINDER_DASH_URL}/api/workfinder/${workFinderId}/requests`);
    const requests = await response.json();
    const badge = document.getElementById('requestBadge');
    if (requests.length > 0) {
      badge.textContent = requests.length;
      badge.style.display = 'inline-block';
    }
  } catch (err) {
    console.error('Error loading requests:', err);
  }
}

// Review
function openReviewModal(jobRequestId, workerId) {
  currentReviewData = { jobRequestId, workerId, workFinderId };
  selectedRating = 0;
  document.querySelectorAll('.star').forEach(star => star.classList.remove('active'));
  document.getElementById('reviewComment').value = '';
  document.getElementById('reviewModal').style.display = 'block';
}

function closeReviewModal() {
  document.getElementById('reviewModal').style.display = 'none';
}

function setRating(rating) {
  selectedRating = rating;
  document.querySelectorAll('.star').forEach((star, i) => {
    star.classList.toggle('active', i < rating);
  });
}

async function submitReview() {
  if (selectedRating === 0) {
    alert('Please select a rating');
    return;
  }
  
  try {
    const response = await fetch(`${CONFIG.WORKFINDER_DASH_URL}/api/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workerId: currentReviewData.workerId,
        workFinderId: currentReviewData.workFinderId,
        jobRequestId: currentReviewData.jobRequestId,
        rating: selectedRating,
        comment: document.getElementById('reviewComment').value
      })
    });
    
    if (response.ok) {
      alert('Review submitted successfully!');
      closeReviewModal();
      loadRequests();
    } else {
      alert('Failed to submit review');
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// Translations
const translations = {
  en: {
    profile: 'Profile', search: 'Search Workers', requests: 'My Requests', settings: 'Settings',
    name: 'Name', phone: 'Phone', location: 'Location', updateLocation: 'Update Location',
    workerType: 'Worker Type', domestic: 'Domestic', agricultural: 'Agricultural',
    radius: 'Search Radius', skills: 'Skills (comma separated)', searchBtn: 'Search Workers',
    results: 'Search Results', noResults: 'No workers found. Try increasing the search radius.',
    allRequests: 'All', pending: 'Pending', accepted: 'Accepted', rejected: 'Rejected', completed: 'Completed',
    noRequests: 'No requests found.', leaveReview: 'Leave Review', submitReview: 'Submit Review',
    rating: 'Rating', comment: 'Comment (optional)', language: 'Language', theme: 'Theme',
    light: 'Light', dark: 'Dark', blue: 'Blue', green: 'Green', deleteAccount: 'Delete Account', logout: 'Logout'
  },
  hi: {
    profile: 'प्रोफ़ाइल', search: 'कामगार खोजें', requests: 'मेरे अनुरोध', settings: 'सेटिंग्स',
    name: 'नाम', phone: 'फ़ोन', location: 'स्थान', updateLocation: 'स्थान अपडेट करें',
    workerType: 'कामगार प्रकार', domestic: 'घरेलू', agricultural: 'कृषि',
    radius: 'खोज त्रिज्या', skills: 'कौशल (अल्पविराम से अलग)', searchBtn: 'कामगार खोजें',
    results: 'खोज परिणाम', noResults: 'कोई कामगार नहीं मिला। त्रिज्या बढ़ाने का प्रयास करें।',
    allRequests: 'सभी', pending: 'लंबित', accepted: 'स्वीकृत', rejected: 'अस्वीकृत', completed: 'पूर्ण',
    noRequests: 'कोई अनुरोध नहीं मिला।', leaveReview: 'समीक्षा दें', submitReview: 'समीक्षा सबमिट करें',
    rating: 'रेटिंग', comment: 'टिप्पणी (वैकल्पिक)', language: 'भाषा', theme: 'थीम',
    light: 'हल्का', dark: 'गहरा', blue: 'नीला', green: 'हरा', deleteAccount: 'खाता हटाएं', logout: 'लॉगआउट'
  },
  te: {
    profile: 'ప్రొఫైల్', search: 'కార్మికులను వెతకండి', requests: 'నా అభ్యర్థనలు', settings: 'సెట్టింగ్‌లు',
    name: 'పేరు', phone: 'ఫోన్', location: 'స్థానం', updateLocation: 'స్థానం నవీకరించండి',
    workerType: 'కార్మిక రకం', domestic: 'గృహ', agricultural: 'వ్యవసాయ',
    radius: 'శోధన వ్యాసార్థం', skills: 'నైపుణ్యాలు (కామాతో వేరు చేయండి)', searchBtn: 'కార్మికులను వెతకండి',
    results: 'శోధన ఫలితాలు', noResults: 'కార్మికులు కనుగొనబడలేదు. వ్యాసార్థం పెంచండి.',
    allRequests: 'అన్నీ', pending: 'పెండింగ్', accepted: 'అంగీకరించబడింది', rejected: 'తిరస్కరించబడింది', completed: 'పూర్తయింది',
    noRequests: 'అభ్యర్థనలు కనుగొనబడలేదు.', leaveReview: 'సమీక్ష వ్రాయండి', submitReview: 'సమీక్ష సమర్పించండి',
    rating: 'రేటింగ్', comment: 'వ్యాఖ్య (ఐచ్ఛికం)', language: 'భాష', theme: 'థీమ్',
    light: 'లైట్', dark: 'డార్క్', blue: 'బ్లూ', green: 'గ్రీన్', deleteAccount: 'ఖాతా తొలగించండి', logout: 'లాగౌట్'
  },
  ta: {
    profile: 'சுயவிவரம்', search: 'தொழிலாளர்களைத் தேடு', requests: 'எனது கோரிக்கைகள்', settings: 'அமைப்புகள்',
    name: 'பெயர்', phone: 'தொலைபேசி', location: 'இடம்', updateLocation: 'இடத்தைப் புதுப்பிக்கவும்',
    workerType: 'தொழிலாளர் வகை', domestic: 'வீட்டு', agricultural: 'விவசாய',
    radius: 'தேடல் ஆரம்', skills: 'திறன்கள் (காற்புள்ளியால் பிரிக்கவும்)', searchBtn: 'தொழிலாளர்களைத் தேடு',
    results: 'தேடல் முடிவுகள்', noResults: 'தொழிலாளர்கள் கிடைக்கவில்லை. ஆரத்தை அதிகரிக்கவும்.',
    allRequests: 'அனைத்தும்', pending: 'நிலுவையில்', accepted: 'ஏற்றுக்கொள்ளப்பட்டது', rejected: 'நிராகரிக்கப்பட்டது', completed: 'முடிந்தது',
    noRequests: 'கோரிக்கைகள் கிடைக்கவில்லை.', leaveReview: 'மதிப்பாய்வு எழுதவும்', submitReview: 'மதிப்பாய்வு சமர்ப்பிக்கவும்',
    rating: 'மதிப்பீடு', comment: 'கருத்து (விருப்பமானது)', language: 'மொழி', theme: 'தீம்',
    light: 'லைட்', dark: 'டார்க்', blue: 'ப்ளூ', green: 'க்ரீன்', deleteAccount: 'கணக்கை நீக்கு', logout: 'வெளியேறு'
  },
  kn: {
    profile: 'ಪ್ರೊಫೈಲ್', search: 'ಕಾರ್ಮಿಕರನ್ನು ಹುಡುಕಿ', requests: 'ನನ್ನ ವಿನಂತಿಗಳು', settings: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
    name: 'ಹೆಸರು', phone: 'ಫೋನ್', location: 'ಸ್ಥಳ', updateLocation: 'ಸ್ಥಳವನ್ನು ನವೀಕರಿಸಿ',
    workerType: 'ಕಾರ್ಮಿಕ ಪ್ರಕಾರ', domestic: 'ಗೃಹ', agricultural: 'ಕೃಷಿ',
    radius: 'ಹುಡುಕಾಟ ತ್ರಿಜ್ಯ', skills: 'ಕೌಶಲ್ಯಗಳು (ಅಲ್ಪವಿರಾಮದಿಂದ ಪ್ರತ್ಯೇಕಿಸಿ)', searchBtn: 'ಕಾರ್ಮಿಕರನ್ನು ಹುಡುಕಿ',
    results: 'ಹುಡುಕಾಟ ಫಲಿತಾಂಶಗಳು', noResults: 'ಕಾರ್ಮಿಕರು ಕಂಡುಬಂದಿಲ್ಲ. ತ್ರಿಜ್ಯವನ್ನು ಹೆಚ್ಚಿಸಿ.',
    allRequests: 'ಎಲ್ಲಾ', pending: 'ಬಾಕಿ', accepted: 'ಸ್ವೀಕರಿಸಲಾಗಿದೆ', rejected: 'ತಿರಸ್ಕರಿಸಲಾಗಿದೆ', completed: 'ಪೂರ್ಣಗೊಂಡಿದೆ',
    noRequests: 'ವಿನಂತಿಗಳು ಕಂಡುಬಂದಿಲ್ಲ.', leaveReview: 'ವಿಮರ್ಶೆ ಬರೆಯಿರಿ', submitReview: 'ವಿಮರ್ಶೆ ಸಲ್ಲಿಸಿ',
    rating: 'ರೇಟಿಂಗ್', comment: 'ಕಾಮೆಂಟ್ (ಐಚ್ಛಿಕ)', language: 'ಭಾಷೆ', theme: 'ಥೀಮ್',
    light: 'ಲೈಟ್', dark: 'ಡಾರ್ಕ್', blue: 'ಬ್ಲೂ', green: 'ಗ್ರೀನ್', deleteAccount: 'ಖಾತೆ ಅಳಿಸಿ', logout: 'ಲಾಗೌಟ್'
  },
  ml: {
    profile: 'പ്രൊഫൈൽ', search: 'തൊഴിലാളികളെ തിരയുക', requests: 'എന്റെ അഭ്യർത്ഥനകൾ', settings: 'ക്രമീകരണങ്ങൾ',
    name: 'പേര്', phone: 'ഫോൺ', location: 'സ്ഥലം', updateLocation: 'സ്ഥലം അപ്ഡേറ്റ് ചെയ്യുക',
    workerType: 'തൊഴിലാളി തരം', domestic: 'ഗാർഹിക', agricultural: 'കാർഷിക',
    radius: 'തിരയൽ ദൂരം', skills: 'കഴിവുകൾ (കോമയാൽ വേർതിരിക്കുക)', searchBtn: 'തൊഴിലാളികളെ തിരയുക',
    results: 'തിരയൽ ഫലങ്ങൾ', noResults: 'തൊഴിലാളികളെ കണ്ടെത്തിയില്ല. ദൂരം വർദ്ധിപ്പിക്കുക.',
    allRequests: 'എല്ലാം', pending: 'തീർപ്പാക്കാത്തത്', accepted: 'സ്വീകരിച്ചു', rejected: 'നിരസിച്ചു', completed: 'പൂർത്തിയായി',
    noRequests: 'അഭ്യർത്ഥനകൾ കണ്ടെത്തിയില്ല.', leaveReview: 'അവലോകനം എഴുതുക', submitReview: 'അവലോകനം സമർപ്പിക്കുക',
    rating: 'റേറ്റിംഗ്', comment: 'അഭിപ്രായം (ഓപ്ഷണൽ)', language: 'ഭാഷ', theme: 'തീം',
    light: 'ലൈറ്റ്', dark: 'ഡാർക്ക്', blue: 'ബ്ലൂ', green: 'ഗ്രീൻ', deleteAccount: 'അക്കൗണ്ട് ഇല്ലാതാക്കുക', logout: 'ലോഗൗട്ട്'
  }
};

function applyTranslations(lang) {
  const t = translations[lang];
  document.querySelectorAll('[data-translate]').forEach(el => {
    const key = el.getAttribute('data-translate');
    if (t[key]) el.textContent = t[key];
  });
  document.querySelectorAll('[data-translate-placeholder]').forEach(el => {
    const key = el.getAttribute('data-translate-placeholder');
    if (t[key]) el.placeholder = t[key];
  });
}

// Settings
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
    const response = await fetch(`${CONFIG.WORKFINDER_DASH_URL}/api/workfinder/${workFinderId}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      alert('Account deleted successfully');
      localStorage.removeItem('workFinderId');
      window.location.href = '../../workfinder-auth/frontend/index.html';
    } else {
      alert('Failed to delete account');
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

function logout() {
  localStorage.removeItem('workFinderId');
  window.location.href = '../../workfinder-auth/frontend/index.html';
}

// Modal close on outside click
window.onclick = function(event) {
  const workerModal = document.getElementById('workerModal');
  const reviewModal = document.getElementById('reviewModal');
  if (event.target === workerModal) closeModal();
  if (event.target === reviewModal) closeReviewModal();
}

// Initialize
applyTranslations(savedLang);
loadUserProfile();
loadRequestCount();
