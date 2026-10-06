// Global Variables
let currentUser = null;
let userLocation = null;
let nearestPoliceStation = null;
let uploadedFiles = [];
let map = null;
let gpsWatchId = null; // For continuous GPS tracking
let locationUpdateInterval = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
    setupEventListeners();
});

function initializeApp() {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('snapnearn_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showDashboard();
    } else {
        showLoginPage();
    }
}

function setupEventListeners() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    // Register form
    document.getElementById('registerForm').addEventListener('submit', handleRegister);

    // File upload
    const fileInput = document.getElementById('fileInput');
    const uploadZone = document.getElementById('uploadZone');

    fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', handleDragOver);
    uploadZone.addEventListener('dragleave', handleDragLeave);
    uploadZone.addEventListener('drop', handleDrop);
}

// Authentication Functions
function showLoginForm() {
    document.getElementById('loginForm').classList.add('active');
    document.getElementById('registerForm').classList.remove('active');
    document.querySelectorAll('.tab-btn')[0].classList.add('active');
    document.querySelectorAll('.tab-btn')[1].classList.remove('active');
}

function showRegisterForm() {
    document.getElementById('registerForm').classList.add('active');
    document.getElementById('loginForm').classList.remove('active');
    document.querySelectorAll('.tab-btn')[1].classList.add('active');
    document.querySelectorAll('.tab-btn')[0].classList.remove('active');
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    const icon = button.querySelector('i');

    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    const submitBtn = e.target.querySelector('.auth-btn');
    const originalText = submitBtn.innerHTML;

    submitBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Logging in...';

    submitBtn.disabled = true;

    try {
        // Send login request to backend
        const response = await fetch(
            'https://snapnearn-backend.onrender.com/api/auth/login',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    identifier: email,
                    password: password
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || 'Login failed'
            );
        }

        // Make sure this is a normal citizen account
        if (data.user.role !== 'user') {
            throw new Error(
                'Please use the correct citizen account.'
            );
        }

        // Store JWT token
        localStorage.setItem(
            'snapnearn_token',
            data.token
        );

        // Store user information
        currentUser = {
            ...data.user,
            reports: data.user.totalReports || 0,
            earnings: data.user.totalEarnings || 0,
            rating: 0,
            petrolCount: 0
        };

        if (rememberMe) {
            localStorage.setItem(
                'snapnearn_user',
                JSON.stringify(currentUser)
            );
        }

        showSuccess(
            'Login successful! Welcome to SnapNEarn.'
        );

        setTimeout(() => {
            showDashboard();
        }, 1000);

    } catch (error) {

        console.error('Login error:', error);

        showError(
            error.message ||
            'Login failed. Please check your credentials.'
        );

    } finally {

        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;

    }
}

async function handleRegister(e) {
    e.preventDefault();

    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const phone = document.getElementById('registerPhone').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;

    const submitBtn = e.target.querySelector('.auth-btn');
    const originalText = submitBtn.innerHTML;

    if (password !== confirmPassword) {
        showError('Passwords do not match.');
        return;
    }

    if (!agreeTerms) {
        showError('Please agree to the terms and conditions.');
        return;
    }

    submitBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Creating account...';

    submitBtn.disabled = true;

    try {

        const response = await fetch(
            'https://snapnearn-backend.onrender.com/api/auth/register',
            {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({
                    name: name,
                    email: email,
                    phone: phone,
                    password: password
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || 'Registration failed'
            );
        }

        // Save JWT returned by backend
        localStorage.setItem(
            'snapnearn_token',
            data.token
        );

        // Save user information
        currentUser = {
            ...data.user,
            reports: 0,
            earnings: 0,
            rating: 0,
            petrolCount: 0
        };

        localStorage.setItem(
            'snapnearn_user',
            JSON.stringify(currentUser)
        );

        showSuccess(
            'Account created successfully! Welcome to SnapNEarn.'
        );

        setTimeout(() => {
            showDashboard();
        }, 1000);

    } catch (error) {

        console.error(
            'Registration error:',
            error
        );

        showError(
            error.message ||
            'Registration failed. Please try again.'
        );

    } finally {

        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;

    }
}
function logout() {
    localStorage.removeItem('snapnearn_user');
    currentUser = null;
    userLocation = null;
    nearestPoliceStation = null;
    showLoginPage();
    showSuccess('Logged out successfully!');
}

// Page Navigation
function showLoginPage() {
    document.getElementById('loginPage').classList.add('active');
    document.getElementById('dashboardPage').classList.remove('active');
}

function showDashboard() {
    document.getElementById('loginPage').classList.remove('active');
    document.getElementById('dashboardPage').classList.add('active');

    // Update user info
    document.getElementById('userName').textContent = `Welcome, ${currentUser.name}!`;

    // Update reward amount in navbar
    updateNavbarRewards();

    // Load recent reports
    loadRecentReports();

    // Initialize GPS and find police station
    initializeGPS();
}

function updateNavbarRewards() {
    const navRewardAmount = document.getElementById('navRewardAmount');
    if (currentUser && navRewardAmount) {
        const petrolUnits = currentUser.petrolCount || 0;
        navRewardAmount.innerHTML = `<i class="fas fa-gas-pump" style="font-size: 0.8rem; margin-right: 3px;"></i>${petrolUnits}/5`;
    }
}

// GPS and Location Functions
// GPS and Location Functions
async function initializeGPS() {
    const gpsStatus = document.getElementById('gpsStatus');

    // Show loading state
    gpsStatus.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Getting your location...</span>
        </div>
    `;

    try {
        const position = await getCurrentPosition();
        handleInfoSuccess(position);

        // Start continuous tracking
        startContinuousGPSTracking();

        // Find nearest police station
        findNearestPoliceStation(position.coords.latitude, position.coords.longitude);

    } catch (error) {
        handleGPSError(error);
    }
}

function handleInfoSuccess(position) {
    userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
    };

    updateGPSDisplay();
}

function handleGPSError(error) {
    const gpsStatus = document.getElementById('gpsStatus');
    let errorMessage = 'Location access denied';

    if (error.code === 2) errorMessage = 'Position unavailable'; // POSITION_UNAVAILABLE
    if (error.code === 3) errorMessage = 'Connection timeout'; // TIMEOUT

    gpsStatus.innerHTML = `
        <div class="gps-error" style="flex-direction: column; gap: 5px;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-exclamation-triangle"></i>
                <span>${errorMessage}</span>
            </div>
            <button onclick="initializeGPS()" style="border: 1px solid #dc3545; background: transparent; color: #dc3545; border-radius: 4px; padding: 2px 8px; font-size: 0.8rem; cursor: pointer; margin-top: 5px;">
                <i class="fas fa-redo"></i> Retry
            </button>
        </div>
    `;

    // Also fail the police station search if we don't have location
    const policeStationInfo = document.getElementById('policeStationInfo');
    policeStationInfo.innerHTML = `
        <div class="gps-error">
            <i class="fas fa-building-circle-xmark"></i>
            <span>Waiting for location...</span>
        </div>
    `;
}

function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
        }

        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        });
    });
}

// Start continuous GPS tracking
function startContinuousGPSTracking() {
    if (!navigator.geolocation) return;

    stopContinuousGPSTracking(); // Clear existing if any

    gpsWatchId = navigator.geolocation.watchPosition(
        (position) => {
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            updateGPSDisplay();
        },
        (error) => console.error('GPS Watch Error:', error),
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// Stop continuous GPS tracking
function stopContinuousGPSTracking() {
    if (gpsWatchId !== null) {
        navigator.geolocation.clearWatch(gpsWatchId);
        gpsWatchId = null;
    }
}

// Update GPS display with current location
function updateGPSDisplay() {
    const gpsStatus = document.getElementById('gpsStatus');
    if (!gpsStatus || !userLocation) return;

    gpsStatus.innerHTML = `
        <div class="gps-success" style="color: #28a745; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-location-arrow"></i>
            <span>${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}</span>
        </div>
    `;
}

async function findNearestPoliceStation(lat, lng) {
    const policeStationInfo = document.getElementById('policeStationInfo');

    if (!lat || !lng) {
        if (userLocation) {
            lat = userLocation.lat;
            lng = userLocation.lng;
        } else {
            return;
        }
    }

    policeStationInfo.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Finding nearest station...</span>
        </div>
    `;

    // Check if Google Maps API is loaded
    if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
        // Fallback checks allowing for script load time
        setTimeout(() => findNearestPoliceStation(lat, lng), 1000);
        return;
    }

    try {
        const userPoint = new google.maps.LatLng(lat, lng);
        const dummyNode = document.createElement('div');
        const service = new google.maps.places.PlacesService(dummyNode);

        const request = {
            location: userPoint,
            radius: '5000', // 5km radius
            type: ['police']
        };

        service.nearbySearch(request, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                const station = results[0];
                nearestPoliceStation = {
                    name: station.name,
                    address: station.vicinity,
                    lat: station.geometry.location.lat(),
                    lng: station.geometry.location.lng(),
                    place_id: station.place_id
                };

                const dist = calculateDistance(lat, lng, nearestPoliceStation.lat, nearestPoliceStation.lng);
                nearestPoliceStation.distance = dist.toFixed(1);

                policeStationInfo.innerHTML = `
                    <div class="station-success" style="display: flex; flex-direction: column;">
                        <div style="color: #28a745; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-shield-alt"></i>
                            <span>${nearestPoliceStation.name}</span>
                        </div>
                        <div style="font-size: 0.85rem; color: #666; margin-left: 24px;">
                            ${nearestPoliceStation.distance}km away
                        </div>
                    </div>
                `;
            } else {
                policeStationInfo.innerHTML = `
                    <div class="gps-error">
                        <i class="fas fa-building-circle-xmark"></i>
                        <span>No station found nearby</span>
                        <button onclick="findNearestPoliceStation(${lat}, ${lng})" style="border: 0; background: none; color: #667eea; cursor: pointer; text-decoration: underline; margin-left: 5px; font-size: 0.8rem;">
                            Retry
                        </button>
                    </div>
                `;
            }
        });

    } catch (error) {
        console.error("Police search error", error);
        policeStationInfo.innerHTML = `
            <div class="gps-error">
                <i class="fas fa-exclamation-circle"></i>
                <span>Search failed</span>
                <button onclick="findNearestPoliceStation(${lat}, ${lng})" style="border: 0; background: none; color: #667eea; cursor: pointer; text-decoration: underline; margin-left: 5px; font-size: 0.8rem;">
                    Retry
                </button>
            </div>
        `;
    }
}

function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Upload Modal Functions
function openUploadModal(type) {
    if (!userLocation) {
        showError('Please wait for GPS to connect before uploading evidence.');
        return;
    }

    const modal = document.getElementById('uploadModal');
    const modalTitle = document.getElementById('modalTitle');
    const fileInput = document.getElementById('fileInput');

    modalTitle.textContent = type === 'photo'
        ? 'Upload Photo Evidence'
        : 'Upload Video Evidence';

    fileInput.accept = type === 'photo'
        ? 'image/*'
        : 'video/*';

    modal.classList.add('active');
    resetUploadModal();
}

function closeUploadModal() {
    document.getElementById('uploadModal').classList.remove('active');
    resetUploadModal();
}

function resetUploadModal() {
    uploadedFiles = [];
    document.getElementById('fileInput').value = '';
    document.getElementById('uploadPreview').style.display = 'none';
    document.getElementById('uploadPreview').innerHTML = '';
    document.getElementById('analysisResults').style.display = 'none';
    document.getElementById('analysisResults').innerHTML = '';
    document.getElementById('processBtn').disabled = true;

    const uploadZone = document.getElementById('uploadZone');
    uploadZone.style.display = 'block';
}

// File Upload Handlers
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    processFiles(files);
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');

    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
}

function processFiles(files) {
    uploadedFiles = files;

    if (files.length === 0) return;

    // Hide upload zone and show preview
    document.getElementById('uploadZone').style.display = 'none';
    const preview = document.getElementById('uploadPreview');
    preview.style.display = 'block';
    preview.innerHTML = '';

    files.forEach((file, index) => {
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';

        // Create thumbnail
        const thumbnail = document.createElement('img');
        thumbnail.className = 'preview-thumbnail';

        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                thumbnail.src = e.target.result;
            };
            reader.readAsDataURL(file);
        } else if (file.type.startsWith('video/')) {
            thumbnail.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiByeD0iOCIgZmlsbD0iIzY2N2VlYSIvPgo8cGF0aCBkPSJNMjQgMjBMMzYgMzBMMjQgNDBWMjBaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K';
        }

        const info = document.createElement('div');
        info.className = 'preview-info';
        info.innerHTML = `
            <div class="preview-name">${file.name}</div>
            <div class="preview-size">${formatFileSize(file.size)} • ${file.type}</div>
        `;

        previewItem.appendChild(thumbnail);
        previewItem.appendChild(info);
        preview.appendChild(previewItem);
    });

    // Enable process button
    document.getElementById('processBtn').disabled = false;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// AI Processing Functions
async function processUpload() {
    const processBtn = document.getElementById('processBtn');
    const originalText = processBtn.innerHTML;

    processBtn.innerHTML = '<i class="fas fa-cog fa-spin"></i> Processing...';
    processBtn.disabled = true;

    try {
        // Show analysis section
        const analysisResults = document.getElementById('analysisResults');
        analysisResults.style.display = 'block';

        // If multiple frames, analyze last 3
        let framesToAnalyze = uploadedFiles;
        let selectedFrameIndex = 0;

        if (uploadedFiles.length > 3) {
            framesToAnalyze = uploadedFiles.slice(-3); // Get last 3 frames
            selectedFrameIndex = uploadedFiles.length - 3;
        }

        analysisResults.innerHTML = `
            <div class="analysis-header">
                <i class="fas fa-brain"></i>
                <span>AI Analysis in Progress...</span>
            </div>
            <div class="loading" style="padding: 20px; text-align: center;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #667eea;"></i>
                <p style="margin-top: 15px; color: #666;">Analyzing last ${framesToAnalyze.length} frames to select the best...</p>
            </div>
        `;

        // Simulate AI processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Analyze each of the last 3 frames
        const frameAnalyses = [];
        for (let i = 0; i < framesToAnalyze.length; i++) {
            analysisResults.innerHTML = `
                <div class="analysis-header">
                    <i class="fas fa-brain"></i>
                    <span>AI Analysis in Progress...</span>
                </div>
                <div class="loading" style="padding: 20px; text-align: center;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #667eea;"></i>
                    <p style="margin-top: 15px; color: #666;">Analyzing Frame ${selectedFrameIndex + i + 1} of ${uploadedFiles.length}...</p>
                </div>
            `;

            const analysis = await simulateAIAnalysis(framesToAnalyze[i]);
            analysis.frameIndex = selectedFrameIndex + i;

            // Extract number plate using OCR
            analysisResults.innerHTML = `
                <div class="analysis-header">
                    <i class="fas fa-brain"></i>
                    <span>Extracting Number Plate...</span>
                </div>
                <div class="loading" style="padding: 20px; text-align: center;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #667eea;"></i>
                    <p style="margin-top: 15px; color: #666;">Reading text from Frame ${selectedFrameIndex + i + 1}...</p>
                </div>
            `;

            const extractedPlate = await extractNumberPlateText(framesToAnalyze[i]);
            if (extractedPlate && extractedPlate !== 'Not Detected' && extractedPlate !== 'OCR Failed') {
                analysis.numberPlate = extractedPlate;
            }

            frameAnalyses.push(analysis);

            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Select best frame based on combined confidence scores
        const bestFrame = frameAnalyses.reduce((best, current) => {
            const bestScore = best.confidence + best.plateConfidence;
            const currentScore = current.confidence + current.plateConfidence;
            return currentScore > bestScore ? current : best;
        });

        analysisResults.innerHTML = `
            <div class="analysis-header">
                <i class="fas fa-check-circle"></i>
                <span>Best Frame Selected: Frame ${bestFrame.frameIndex + 1}</span>
            </div>
            <div style="padding: 20px; text-align: center; background: #e8f5e8; border-radius: 8px; margin: 10px 0;">
                <p style="color: #155724; font-weight: 600;">
                    <i class="fas fa-star"></i> AI analyzed ${framesToAnalyze.length} frames and selected the clearest image
                </p>
            </div>
        `;

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Use best frame results and store frame image
        const results = bestFrame;

        // Get the selected frame file and convert to data URL for display
        const selectedFrameFile = framesToAnalyze[frameAnalyses.indexOf(bestFrame)];
        const frameImageUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(selectedFrameFile);
        });

        // Add frame image, timestamp, and verification stats to results
        results.frameImage = frameImageUrl;
        results.timestamp = new Date().toLocaleString();
        results.totalFramesAnalyzed = uploadedFiles.length;
        results.framesUsedForAI = framesToAnalyze.length;
        results.selectedFrameNumber = bestFrame.frameIndex + 1;
        results.aiScore = ((results.confidence + results.plateConfidence) / 2 * 100).toFixed(1);
        results.verificationStatus = 'Verified';

        displayAnalysisResults(results);

        // Keep analysis results visible for 5 seconds before generating challan
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Auto-generate challan after 5 seconds
        generateChallan(results);

    } catch (error) {
        showError('Analysis failed: ' + error.message);
        analysisResults.innerHTML = `
            <div class="analysis-header" style="color: #dc3545;">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Analysis Failed</span>
            </div>
            <p style="color: #dc3545; padding: 20px; text-align: center;">${error.message}</p>
        `;
    } finally {
        processBtn.innerHTML = originalText;
        processBtn.disabled = false;
    }
}

async function simulateAIAnalysis(file) {
    // Simulate different analysis results with TN-44 number plates
    const scenarios = [
        {
            helmetDetected: false,
            confidence: 0.92,
            numberPlate: 'TN-44-AB-1234',
            plateConfidence: 0.88,
            violationType: 'No Helmet',
            fineAmount: 1000,
            rewardAmount: 100
        },
        {
            helmetDetected: false,
            confidence: 0.87,
            numberPlate: 'TN-44-CD-5678',
            plateConfidence: 0.91,
            violationType: 'No Helmet',
            fineAmount: 1000,
            rewardAmount: 100
        },
        {
            helmetDetected: true,
            confidence: 0.95,
            numberPlate: 'TN-44-EF-9012',
            plateConfidence: 0.85,
            violationType: 'No Violation Detected',
            fineAmount: 0,
            rewardAmount: 0
        }
    ];

    // Randomly select a scenario (80% chance of violation)
    const hasViolation = Math.random() < 0.8;
    const scenario = hasViolation ? scenarios[Math.floor(Math.random() * 2)] : scenarios[2];

    return scenario;
}

function displayAnalysisResults(results) {
    const analysisResults = document.getElementById('analysisResults');

    const helmetStatus = results.helmetDetected ? 'Helmet Detected' : 'No Helmet Detected';
    const helmetColor = results.helmetDetected ? '#28a745' : '#dc3545';

    analysisResults.innerHTML = `
        <div class="analysis-header">
            <i class="fas fa-check-circle"></i>
            <span>AI Analysis Complete</span>
        </div>
        
        <div class="detection-result">
            <div class="detection-title">
                <i class="fas fa-hard-hat"></i>
                Helmet Detection
            </div>
            <div class="detection-details">
                <p><strong>Status:</strong> <span style="color: ${helmetColor}; font-weight: 600;">${helmetStatus}</span></p>
                <p><strong>Confidence:</strong> ${(results.confidence * 100).toFixed(1)}%</p>
                <div class="confidence-bar">
                    <div class="confidence-fill" style="width: ${results.confidence * 100}%; background: ${helmetColor};"></div>
                </div>
            </div>
        </div>
        
        <div class="detection-result">
            <div class="detection-title">
                <i class="fas fa-id-card"></i>
                Number Plate Recognition
            </div>
            <div class="detection-details">
                <p><strong>Detected Plate:</strong> <span style="color: #667eea; font-weight: 600; font-family: monospace; font-size: 1.1em;">${results.numberPlate}</span></p>
                <p><strong>Confidence:</strong> ${(results.plateConfidence * 100).toFixed(1)}%</p>
                <div class="confidence-bar">
                    <div class="confidence-fill" style="width: ${results.plateConfidence * 100}%;"></div>
                </div>
            </div>
        </div>
        
        <div class="detection-result" style="border-left-color: ${results.helmetDetected ? '#28a745' : '#dc3545'};">
            <div class="detection-title">
                <i class="fas fa-gavel"></i>
                Violation Assessment
            </div>
            <div class="detection-details">
                <p><strong>Violation Type:</strong> <span style="color: ${results.helmetDetected ? '#28a745' : '#dc3545'}; font-weight: 600;">${results.violationType}</span></p>
                ${!results.helmetDetected ? `
                    <p><strong>Fine Amount:</strong> ₹${results.fineAmount}</p>
                    <p><strong>Your Reward:</strong> ₹${results.rewardAmount}</p>
                ` : '<p><strong>Status:</strong> <span style="color: #28a745;">No violation found</span></p>'}
            </div>
        </div>
    `;
}

async function generateChallan(results) {

    // If there is NO violation, don't create a challan/report
    if (results.helmetDetected) {
        showSuccess(
            'No violation detected. Thank you for helping keep roads safe!'
        );
        closeUploadModal();
        return;
    }

    // ============================================
    // SAVE REPORT TO MONGODB
    // ============================================

    try {
        const token = localStorage.getItem('snapnearn_token');

        if (!token) {
            console.warn('No authentication token found. Report not saved.');
            showError('Please login again before submitting a report.');
            return;
        }

        // Your GPS object uses lat/lng
        const latitude = Number(userLocation?.lat);
        const longitude = Number(userLocation?.lng);

        if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude)
        ) {
            console.error(
                'Invalid GPS coordinates:',
                userLocation
            );

            showError(
                'Unable to get your GPS location. Please enable location access and try again.'
            );

            return;
        }

        console.log('📍 GPS coordinates:', {
            latitude,
            longitude
        });

        // ============================================
        // REPORT DATA
        // ============================================

        const reportData = {
            violationType:
                results.violationType === 'No Helmet'
                    ? 'no_helmet'
                    : 'other',

            description:
                `Traffic violation detected: ${results.violationType}`,

            location: {
                type: 'Point',

                // MongoDB GeoJSON = [longitude, latitude]
                coordinates: [
                    longitude,
                    latitude
                ],

                address:
                    nearestPoliceStation?.address ||
                    'Location not available',

                landmark:
                    nearestPoliceStation?.name ||
                    ''
            },

            photos: results.frameImage
                ? [{
                    public_id: `evidence_${Date.now()}`,
                    url: results.frameImage
                }]
                : [],

            vehicleDetails: {
                numberPlate:
                    results.numberPlate ||
                    'NO NUMBERPLATE DETECTED',

                vehicleType: 'motorcycle'
            },

            priority: 'medium',

            isAnonymous: false,

            aiAnalysis: {
                numberPlateConfidence:
                    results.plateConfidence || 0,

                violationConfidence:
                    results.confidence || 0,

                imageQualityScore:
                    results.aiScore
                        ? parseFloat(results.aiScore)
                        : 0,

                processedAt:
                    new Date()
            }
        };

        console.log('📤 Sending report to MongoDB...');

        // ============================================
        // POST TO BACKEND
        // ============================================

        const response = await fetch(
            'https://snapnearn-backend.onrender.com/api/reports',
            {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json',

                    'Authorization':
                        `Bearer ${token}`
                },

                body: JSON.stringify(reportData)
            }
        );

        const data = await response.json();

        // ============================================
        // HANDLE RESPONSE
        // ============================================

        if (!response.ok || !data.success) {

            console.error(
                '❌ Failed to save report:',
                data
            );

            showError(
                data.message ||
                'Failed to save report to server.'
            );

            return;
        }

        console.log(
            '✅ Report saved to MongoDB:',
            data.data
        );

        showSuccess(
            'Report successfully submitted!'
        );

    } catch (error) {

        console.error(
            '❌ MongoDB report save error:',
            error
        );

        showError(
            'Unable to submit report. Please try again.'
        );

        return;
    }

    // ============================================
    // SHOW CHALLAN
    // ============================================

    closeUploadModal();

    const successModal =
        document.getElementById('successModal');

    document.getElementById('violationType').textContent =
        results.violationType;

    document.getElementById('vehicleNumber').textContent =
        results.numberPlate;

    document.getElementById('fineAmount').textContent =
        `₹${results.fineAmount}`;

    document.getElementById('rewardAmount').textContent =
        `₹${results.rewardAmount}`;

    // Timestamp
    document.getElementById(
        'violationTimestamp'
    ).textContent =
        results.timestamp ||
        new Date().toLocaleString();

    // AI score
    document.getElementById(
        'aiScore'
    ).textContent =
        `${results.aiScore || '90.0'}%`;

    // Violation image
    const violationImage =
        document.getElementById('violationImage');

    if (results.frameImage) {
        violationImage.src =
            results.frameImage;

        violationImage.style.display =
            'block';
    } else {
        violationImage.style.display =
            'none';
    }

    // Verification statistics
    document.getElementById(
        'totalFrames'
    ).textContent =
        results.totalFramesAnalyzed ||
        uploadedFiles.length ||
        20;

    document.getElementById(
        'framesAnalyzed'
    ).textContent =
        results.framesUsedForAI ||
        3;

    document.getElementById(
        'selectedFrame'
    ).textContent =
        `#${results.selectedFrameNumber || 1}`;

    document.getElementById(
        'verificationStatus'
    ).textContent =
        `✓ ${results.verificationStatus || 'Verified'}`;

    successModal.classList.add('active');

    // ============================================
    // UPDATE USER STATS
    // ============================================

    currentUser.reports =
        (currentUser.reports || 0) + 1;

    currentUser.earnings =
        (currentUser.earnings || 0) +
        results.rewardAmount;

    const currentRating =
        parseFloat(currentUser.rating) || 0;

    currentUser.rating =
        parseFloat(
            (currentRating + 0.1).toFixed(1)
        );

    currentUser.petrolCount =
        ((currentUser.petrolCount || 0) + 1) % 6;

    localStorage.setItem(
        'snapnearn_user',
        JSON.stringify(currentUser)
    );

    updateNavbarRewards();

    // ============================================
    // RECENT REPORT
    // ============================================

    addToRecentReports({
        id: Date.now(),

        type:
            results.violationType,

        vehicleNumber:
            results.numberPlate,

        fine:
            results.fineAmount,

        reward:
            results.rewardAmount,

        timestamp:
            new Date().toLocaleString(),

        status:
            'Processed'
    });

    // ============================================
    // REWARD HISTORY
    // ============================================

    addToRewardsHistory({
        id: Date.now(),

        type:
            results.violationType,

        amount:
            results.rewardAmount,

        vehicleNumber:
            results.numberPlate,

        timestamp:
            new Date().toLocaleString(),

        status:
            'Credited'
    });
}
function closeSuccessModal() {
    document.getElementById('successModal').classList.remove('active');

    // Reset violation image
    const violationImage = document.getElementById('violationImage');
    violationImage.src = '';
    violationImage.style.display = 'none';
}

function addToRecentReports(report) {
    const reportsContainer = document.getElementById('recentReports');

    // Remove "no reports" message if it exists
    const noReports = reportsContainer.querySelector('.no-reports');
    if (noReports) {
        noReports.remove();
    }

    // Save report to localStorage
    const savedReports = JSON.parse(localStorage.getItem('snapnearn_recent_reports') || '[]');
    savedReports.unshift(report); // Add to beginning

    // Keep only last 10 reports
    if (savedReports.length > 10) {
        savedReports.splice(10);
    }

    localStorage.setItem('snapnearn_recent_reports', JSON.stringify(savedReports));

    // Update display
    updateRecentReportsDisplay();
}

function updateRecentReportsDisplay() {
    const reportsContainer = document.getElementById('recentReports');
    const savedReports = JSON.parse(localStorage.getItem('snapnearn_recent_reports') || '[]');

    if (savedReports.length === 0) {
        reportsContainer.innerHTML = `
            <div class="no-reports">
                <i class="fas fa-clipboard-list"></i>
                <p>No reports yet. Start by uploading evidence!</p>
            </div>
        `;
        return;
    }

    reportsContainer.innerHTML = '';

    savedReports.forEach(report => {
        const reportItem = document.createElement('div');
        reportItem.className = 'report-item';
        reportItem.style.cssText = `
            background: white;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 15px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border-left: 4px solid #667eea;
            animation: slideInLeft 0.3s ease;
        `;

        reportItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                <div>
                    <h4 style="color: #333; margin-bottom: 5px; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-exclamation-triangle" style="color: #dc3545; font-size: 0.9rem;"></i>
                        ${report.type}
                    </h4>
                    <p style="color: #666; font-size: 0.9rem;">Vehicle: <strong>${report.vehicleNumber}</strong></p>
                </div>
                <div style="text-align: right;">
                    <div style="background: #28a745; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; margin-bottom: 5px;">
                        <i class="fas fa-check"></i> ${report.status}
                    </div>
                    <div style="color: #666; font-size: 0.8rem;">${report.timestamp}</div>
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px solid #eee;">
                <span style="color: #dc3545; font-weight: 600;">
                    <i class="fas fa-gavel"></i> Fine: ₹${report.fine}
                </span>
                <span style="color: #28a745; font-weight: 600;">
                    <i class="fas fa-gas-pump"></i> +1 Petrol Unit
                </span>
            </div>
        `;

        reportsContainer.appendChild(reportItem);
    });
}

// Load recent reports on dashboard load
function loadRecentReports() {
    updateRecentReportsDisplay();
}

// Utility Functions
function showSuccess(message) {
    showNotification(message, 'success');
}

function showError(message) {
    showNotification(message, 'error');
}

function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : '#dc3545'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        z-index: 10000;
        font-weight: 600;
        max-width: 300px;
        animation: slideInRight 0.3s ease;
    `;

    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
        <span style="margin-left: 10px;">${message}</span>
    `;

    document.body.appendChild(notification);

    // Remove after 4 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 4000);
}

// Rewards Modal Functions
function openRewardsModal() {
    const modal = document.getElementById('rewardsModal');
    modal.classList.add('active');

    // Update rewards data
    updateRewardsDisplay();
}

function closeRewardsModal() {
    document.getElementById('rewardsModal').classList.remove('active');
}

function updateRewardsDisplay() {
    if (!currentUser) return;

    // Use petrolCount for current cycle (0-5)
    const petrolUnits = currentUser.petrolCount || 0;
    const canRedeem = petrolUnits >= 5;

    // Update summary cards
    document.getElementById('totalEarnings').textContent = `${petrolUnits}/5`;
    document.getElementById('pendingRewards').textContent = `${Math.max(0, 5 - petrolUnits)} more`;
    document.getElementById('totalReports').textContent = currentUser.reports || 0;

    // Update new reward cards
    const petrolRedeemedElement = document.getElementById('petrolRedeemed');
    const nextRewardElement = document.getElementById('nextReward');

    if (petrolRedeemedElement) {
        petrolRedeemedElement.textContent = `${currentUser.petrolRedeemed || 0}L`;
    }

    if (nextRewardElement) {
        const nextMilestone = Math.ceil((petrolUnits + 1) / 5) * 5;
        nextRewardElement.textContent = nextMilestone;
    }

    // Update petrol tank display
    updatePetrolTank(petrolUnits);

    // Update redeem button
    const withdrawBtn = document.getElementById('withdrawBtn');
    if (canRedeem) {
        withdrawBtn.disabled = false;
        withdrawBtn.innerHTML = '<i class="fas fa-gas-pump"></i> Redeem Petrol';
        withdrawBtn.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
    } else {
        withdrawBtn.disabled = true;
        withdrawBtn.innerHTML = `<i class="fas fa-gas-pump"></i> Need ${5 - petrolUnits} more rewards`;
        withdrawBtn.style.background = '#6c757d';
    }

    // Load rewards history
    loadRewardsHistory();
}

function updatePetrolTank(petrolUnits) {
    const tankFillPercentage = Math.min((petrolUnits / 5) * 100, 100);

    // Create or update petrol tank visual
    const petrolTankContainer = document.querySelector('.petrol-tank-container');
    if (petrolTankContainer) {
        const fillElement = petrolTankContainer.querySelector('.petrol-fill');
        if (fillElement) {
            fillElement.style.height = `${tankFillPercentage}%`;

            // Change color based on fill level
            if (tankFillPercentage >= 100) {
                fillElement.style.background = 'linear-gradient(180deg, #28a745, #20c997)';
            } else if (tankFillPercentage >= 60) {
                fillElement.style.background = 'linear-gradient(180deg, #ffc107, #ffed4e)';
            } else {
                fillElement.style.background = 'linear-gradient(180deg, #dc3545, #c82333)';
            }
        }
    }
}

function loadRewardsHistory() {
    const rewardsList = document.getElementById('rewardsList');
    const savedRewards = JSON.parse(localStorage.getItem('snapnearn_rewards') || '[]');

    if (savedRewards.length === 0) {
        rewardsList.innerHTML = `
            <div class="no-rewards">
                <i class="fas fa-coins"></i>
                <p>No rewards yet. Start reporting violations to earn rewards!</p>
            </div>
        `;
        return;
    }

    rewardsList.innerHTML = '';
    savedRewards.reverse().forEach(reward => {
        const rewardItem = document.createElement('div');
        rewardItem.className = 'reward-item';
        rewardItem.innerHTML = `
            <div class="reward-details">
                <h4>${reward.type} - ${reward.vehicleNumber}</h4>
                <p>${reward.timestamp} • Status: ${reward.status}</p>
            </div>
            <div class="reward-amount-item">+₹${reward.amount}</div>
        `;
        rewardsList.appendChild(rewardItem);
    });
}

function addToRewardsHistory(reward) {
    const savedRewards = JSON.parse(localStorage.getItem('snapnearn_rewards') || '[]');
    savedRewards.push(reward);
    localStorage.setItem('snapnearn_rewards', JSON.stringify(savedRewards));
}

function initiateWithdrawal() {
    const petrolUnits = currentUser.petrolCount || 0;

    if (petrolUnits < 5) {
        showError(`You need ${5 - petrolUnits} more rewards to redeem petrol!`);
        return;
    }

    // Calculate petrol amount (5 rewards = 2 liters of petrol)
    const petrolLiters = 2;
    const petrolValue = petrolLiters * 100; // ₹100 per liter

    showSuccess(`🛢️ Petrol Redeemed! ${petrolLiters} liters (worth ₹${petrolValue}) credited to your account!`);

    // Reset petrol counter to 0 after redemption
    currentUser.petrolCount = 0;
    currentUser.petrolRedeemed = (currentUser.petrolRedeemed || 0) + petrolLiters;

    localStorage.setItem('snapnearn_user', JSON.stringify(currentUser));
    updateNavbarRewards();
    updateRewardsDisplay();

    // Add redemption to history
    addToRewardsHistory({
        id: Date.now(),
        type: 'Petrol Redemption',
        amount: `${petrolLiters}L`,
        vehicleNumber: 'REDEEMED',
        timestamp: new Date().toLocaleString(),
        status: 'Completed'
    });

    setTimeout(() => {
        closeRewardsModal();
    }, 3000);
}

// Emergency Alert Functions
function triggerEmergencyAlert() {
    if (!userLocation) {
        showError('Location required for emergency alert. Please enable GPS.');
        return;
    }

    const modal = document.getElementById('alertModal');
    modal.classList.add('active');

    // Generate alert ID
    const alertId = 'ALERT-' + Date.now().toString().slice(-6);
    document.getElementById('alertId').textContent = alertId;

    // Set location
    const locationText = userLocation ?
        `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` :
        'Location unavailable';
    document.getElementById('alertLocation').textContent = locationText;

    // Set time
    document.getElementById('alertTime').textContent = new Date().toLocaleString();

    // Show success notification
    showSuccess('🚨 Emergency alert sent! Police are on their way.');

    // Simulate police response
    simulatePoliceResponse();
}

function simulatePoliceResponse() {
    // Send alert to police station
    setTimeout(() => {
        showSuccess('📞 Police station notified - Unit dispatched');
    }, 2000);

    setTimeout(() => {
        showSuccess('🚔 Police unit en route - ETA 3 minutes');
    }, 4000);

    setTimeout(() => {
        showSuccess('📍 Police unit nearby - Stay safe!');
    }, 8000);
}

function cancelAlert() {
    document.getElementById('alertModal').classList.remove('active');
    showSuccess('Emergency alert cancelled.');
}

function escalateAlert() {
    showSuccess('🚨 Your alert has been reached to police. We will be soon to your location.');

    // Show escalated status
    const alertSteps = document.querySelectorAll('.alert-step');
    alertSteps.forEach(step => {
        step.style.color = '#dc3545';
        step.style.fontWeight = '700';
    });

    setTimeout(() => {
        showSuccess('📞 Additional backup units have been notified for your safety.');
    }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ============================================
// VIDEO CAPTURE WITH FACE BLUR FUNCTIONALITY
// ============================================

let faceBlurModel = null;
let captureStream = null;
let captureRafId = null;
let isCapturing = false;
let mediaRecorder = null;
let recordedChunks = [];
let recordingTimer = null;
let recordingStartTime = 0;
let capturedFrames = []; // Store frames captured during recording
let frameIntervalId = null; // Interval for capturing frames
let recordingSeconds = 0;
let helmetDetected = false; // Helmet detection status
let detectedNumberPlate = ''; // Extracted number plate text
const MAX_RECORDING_TIME = 20000; // 20 seconds in milliseconds

// Open video capture modal and start preview immediately
async function openCaptureVideoModal() {
    const modal = document.getElementById('videoCaptureModal');
    modal.classList.add('active');

    // Load model and start preview immediately
    await loadFaceBlurModel();
    await startVideoPreview();
}

// Close video capture modal
function closeVideoCaptureModal() {
    // Stop everything
    isCapturing = false;

    if (recordingTimer) {
        clearTimeout(recordingTimer);
        recordingTimer = null;
    }

    if (captureRafId) {
        cancelAnimationFrame(captureRafId);
        captureRafId = null;
    }

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        mediaRecorder = null;
    }

    if (captureStream) {
        captureStream.getTracks().forEach(t => t.stop());
        captureStream = null;
    }

    // Clear canvas
    const canvas = document.getElementById('blurOverlay');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Reset UI
    const startBtn = document.getElementById('startCaptureBtn');
    const stopBtn = document.getElementById('stopCaptureBtn');
    const saveBtn = document.getElementById('saveCaptureBtn');
    startBtn.style.display = 'inline-block';
    stopBtn.style.display = 'none';
    saveBtn.style.display = 'none';

    recordedChunks = [];

    const modal = document.getElementById('videoCaptureModal');
    modal.classList.remove('active');
}

// Load BlazeFace model
async function loadFaceBlurModel() {
    const status = document.getElementById('captureStatus');

    if (!faceBlurModel) {
        status.textContent = 'Loading face blur model...';
        status.style.color = 'orange';
        try {
            faceBlurModel = await blazeface.load();
            status.textContent = 'Face blur model loaded ✅ - Ready to start';
            status.style.color = '#28a745';
        } catch (e) {
            console.error('Model load failed', e);
            status.textContent = 'Failed to load face blur model';
            status.style.color = '#dc3545';
        }
    } else {
        status.textContent = 'Face blur model ready ✅';
        status.style.color = '#28a745';
    }
}

// Start video preview with live blur (before recording)
async function startVideoPreview() {
    const video = document.getElementById('captureVideo');
    const canvas = document.getElementById('blurOverlay');
    const status = document.getElementById('captureStatus');

    try {
        // Get camera stream
        captureStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: 640, height: 480 },
            audio: true
        });
        video.srcObject = captureStream;

        // Wait for video to load
        await new Promise((resolve, reject) => {
            const onLoaded = () => {
                video.removeEventListener('loadeddata', onLoaded);
                resolve();
            };
            const onError = (err) => {
                video.removeEventListener('error', onError);
                reject(err);
            };
            video.addEventListener('loadeddata', onLoaded);
            video.addEventListener('error', onError);
        });

        // Play video
        try { await video.play(); } catch (e) { }

        // Sync canvas size
        syncCanvasSize();

        // Start blur detection immediately
        isCapturing = true;
        detectAndBlurFaces();

        status.textContent = 'Face Blur: ON 🟢 - Click Start to record';
        status.style.color = '#28a745';

    } catch (err) {
        console.error('Camera error:', err);
        status.textContent = 'Camera error: ' + (err.message || err);
        status.style.color = '#dc3545';
    }
}

// Sync canvas size with video
function syncCanvasSize() {
    const video = document.getElementById('captureVideo');
    const canvas = document.getElementById('blurOverlay');

    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    canvas.width = vw;
    canvas.height = vh;
    canvas.style.width = `${video.clientWidth}px`;
    canvas.style.height = `${video.clientHeight}px`;
}

// Clamp utility
function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
}

// Start video capture (recording)
async function startVideoCapture() {
    if (!captureStream) {
        showError('Camera not ready. Please wait.');
        return;
    }

    const video = document.getElementById('captureVideo');
    const status = document.getElementById('captureStatus');
    const startBtn = document.getElementById('startCaptureBtn');
    const stopBtn = document.getElementById('stopCaptureBtn');

    try {

        // Create a composite canvas that combines video + blur for recording
        const recordCanvas = document.createElement('canvas');
        recordCanvas.width = video.videoWidth;
        recordCanvas.height = video.videoHeight;
        const recordCtx = recordCanvas.getContext('2d');

        // Create a stream from the composite canvas
        const recordStream = recordCanvas.captureStream(30); // 30 FPS

        // Add audio track from original stream
        const audioTrack = captureStream.getAudioTracks()[0];
        if (audioTrack) {
            recordStream.addTrack(audioTrack);
        }

        // Function to draw composite frame (video + blur)
        function drawCompositeFrame() {
            if (!isCapturing) return;

            // Draw original video
            recordCtx.drawImage(video, 0, 0, recordCanvas.width, recordCanvas.height);

            // Draw blur overlay on top
            const blurCanvas = document.getElementById('blurOverlay');
            recordCtx.drawImage(blurCanvas, 0, 0, recordCanvas.width, recordCanvas.height);

            requestAnimationFrame(drawCompositeFrame);
        }

        // Start drawing composite frames
        drawCompositeFrame();

        // Now start recording with blur already active
        recordedChunks = [];
        const options = { mimeType: 'video/webm;codecs=vp9' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options.mimeType = 'video/webm';
        }

        mediaRecorder = new MediaRecorder(recordStream, options);

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.start();

        recordingStartTime = Date.now();
        recordingSeconds = 0;
        capturedFrames = [];

        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
        status.textContent = 'Face Blur: ON 🟢 Recording... (20s)';
        status.style.color = '#28a745';

        // Capture frames every 0.5 seconds (40 frames total for 20 second video)
        frameIntervalId = setInterval(() => {
            recordingSeconds++;

            // Capture frame from the composite canvas (with blur)
            recordCanvas.toBlob((blob) => {
                if (blob) {
                    capturedFrames.push(blob);
                    console.log(`Frame ${capturedFrames.length} captured`);
                }
            }, 'image/jpeg', 0.9);

            // Stop at 40 frames (20 seconds with 0.5s interval)
            if (recordingSeconds >= 40) {
                stopVideoCapture();
                showSuccess('Recording completed (20 seconds)');
            }
        }, 500);

        // Auto-stop after 20 seconds (backup)
        recordingTimer = setTimeout(() => {
            if (isCapturing) {
                stopVideoCapture();
                showSuccess('Recording completed (20 seconds)');
            }
        }, MAX_RECORDING_TIME);

        // Update timer display
        updateRecordingTimer();

    } catch (err) {
        console.error('Camera error:', err);
        status.textContent = 'Camera error: ' + (err.message || err);
        status.style.color = '#dc3545';
        stopVideoCapture();
    }
}

// Update recording timer display
function updateRecordingTimer() {
    if (!isCapturing) return;

    const elapsed = Date.now() - recordingStartTime;
    const remaining = Math.max(0, Math.ceil((MAX_RECORDING_TIME - elapsed) / 1000));
    const status = document.getElementById('captureStatus');
    status.textContent = `Face Blur: ON 🟢 Recording... (${remaining}s remaining)`;

    if (remaining > 0) {
        setTimeout(updateRecordingTimer, 1000);
    }
}

// Stop video capture
function stopVideoCapture() {
    isCapturing = false;

    if (recordingTimer) {
        clearTimeout(recordingTimer);
        recordingTimer = null;
    }

    if (frameIntervalId) {
        clearInterval(frameIntervalId);
        frameIntervalId = null;
    }

    if (captureRafId) {
        cancelAnimationFrame(captureRafId);
        captureRafId = null;
    }

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }

    if (captureStream) {
        captureStream.getTracks().forEach(t => t.stop());
        captureStream = null;
    }

    const canvas = document.getElementById('blurOverlay');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const startBtn = document.getElementById('startCaptureBtn');
    const stopBtn = document.getElementById('stopCaptureBtn');
    const saveBtn = document.getElementById('saveCaptureBtn');
    const status = document.getElementById('captureStatus');

    startBtn.style.display = 'inline-block';
    stopBtn.style.display = 'none';

    if (capturedFrames.length > 0) {
        saveBtn.style.display = 'inline-block';
        status.textContent = `Recording stopped - ${capturedFrames.length} frames captured ✅`;
        status.style.color = '#667eea';
    } else {
        saveBtn.style.display = 'none';
        status.textContent = 'Face Blur: OFF 🟠';
        status.style.color = 'orange';
    }
}

// Save captured video and use captured frames
async function saveCapturedVideo() {
    if (capturedFrames.length === 0) {
        showError('No frames captured');
        return;
    }

    const status = document.getElementById('captureStatus');
    status.textContent = `Processing ${capturedFrames.length} captured frames...`;
    status.style.color = '#667eea';

    // Convert frame blobs to File objects
    const frames = capturedFrames.map((blob, index) => {
        return new File(
            [blob],
            `frame_${index + 1}_${Date.now()}.jpg`,
            { type: 'image/jpeg' }
        );
    });

    // Close capture modal
    closeVideoCaptureModal();

    // Set frames as uploaded files
    uploadedFiles = frames;

    // Open upload modal to show preview
    const modal = document.getElementById('uploadModal');
    const modalTitle = document.getElementById('modalTitle');
    modalTitle.textContent = `Extracted ${frames.length} Frames for Analysis`;
    modal.classList.add('active');

    // Show preview of extracted frames with thumbnails
    const preview = document.getElementById('uploadPreview');
    preview.style.display = 'block';

    // Create image previews with grid layout
    const previewHTML = await Promise.all(frames.map(async (file, index) => {
        const imageUrl = URL.createObjectURL(file);
        return `
            <div class="frame-preview-item" style="border: 2px solid #ddd; border-radius: 8px; padding: 8px; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: transform 0.2s, box-shadow 0.2s;">
                <img src="${imageUrl}" alt="Frame ${index + 1}" style="width: 100%; height: 80px; object-fit: cover; border-radius: 4px; display: block; margin-bottom: 6px;">
                <div style="font-size: 11px; font-weight: 600; color: #333; text-align: center;">Frame ${index + 1}</div>
                <div style="font-size: 10px; color: #999; text-align: center;">${(file.size / 1024).toFixed(1)} KB</div>
            </div>
        `;
    }));

    preview.innerHTML = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; max-height: 400px; overflow-y: auto; padding: 10px;">${previewHTML.join('')}</div>`;

    document.getElementById('uploadZone').style.display = 'none';
    document.getElementById('processBtn').disabled = false;

    showSuccess(`Extracted ${frames.length} frames! AI will analyze last 3 frames to select the best.`);
}

// Extract frames from video blob
async function extractFramesFromVideo(videoBlob) {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const frames = [];

        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;

        video.onloadedmetadata = async () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const duration = video.duration;
            const frameInterval = duration / 10; // Extract 10 frames evenly distributed

            try {
                for (let i = 0; i < 10; i++) {
                    const time = i * frameInterval;

                    // Seek to specific time
                    await new Promise((seekResolve) => {
                        video.onseeked = () => seekResolve();
                        video.currentTime = time;
                    });

                    // Draw frame to canvas
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                    // Convert to blob
                    const frameBlob = await new Promise((blobResolve) => {
                        canvas.toBlob((blob) => blobResolve(blob), 'image/jpeg', 0.9);
                    });

                    // Create file from blob
                    const file = new File(
                        [frameBlob],
                        `frame_${i + 1}_${Date.now()}.jpg`,
                        { type: 'image/jpeg' }
                    );

                    frames.push(file);
                }

                resolve(frames);
            } catch (error) {
                console.error('Frame extraction error:', error);
                resolve(frames);
            }
        };

        video.onerror = () => {
            console.error('Video load error');
            resolve([]);
        };

        video.src = URL.createObjectURL(videoBlob);
    });
}

// Face detection and blur loop
async function detectAndBlurFaces() {
    if (!isCapturing || !faceBlurModel) return;

    const video = document.getElementById('captureVideo');
    const canvas = document.getElementById('blurOverlay');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        syncCanvasSize();
    }

    try {
        const predictions = await faceBlurModel.estimateFaces(video, false);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (predictions && predictions.length) {
            for (let i = 0; i < predictions.length; i++) {
                const pred = predictions[i];

                const tl = Array.isArray(pred.topLeft) ? pred.topLeft : pred.topLeft.arraySync?.() || [0, 0];
                const br = Array.isArray(pred.bottomRight) ? pred.bottomRight : pred.bottomRight.arraySync?.() || [0, 0];

                let x = Math.round(tl[0]);
                let y = Math.round(tl[1]);
                let x2 = Math.round(br[0]);
                let y2 = Math.round(br[1]);

                let w = x2 - x;
                let h = y2 - y;

                const padX = Math.round(w * 0.15);
                const padY = Math.round(h * 0.2);
                x = clamp(x - padX, 0, canvas.width - 1);
                y = clamp(y - padY, 0, canvas.height - 1);
                w = clamp(w + padX * 2, 1, canvas.width - x);
                h = clamp(h + padY * 2, 1, canvas.height - y);

                if (w <= 0 || h <= 0) continue;

                const tmp = document.createElement('canvas');
                const tctx = tmp.getContext('2d');
                const scale = 0.12;
                tmp.width = Math.max(1, Math.floor(w * scale));
                tmp.height = Math.max(1, Math.floor(h * scale));

                tctx.drawImage(video, x, y, w, h, 0, 0, tmp.width, tmp.height);

                // Helmet detection logic - check for ORANGE COLOR above face
                const helmetCheckHeight = Math.round(h * 0.5); // Check 50% above face
                const helmetCheckY = Math.max(0, y - helmetCheckHeight);
                const helmetCheckWidth = Math.round(w * 0.9); // Check 90% width
                const helmetCheckX = x + Math.round(w * 0.05);

                helmetDetected = false; // Default: no helmet

                try {
                    const sampleWidth = Math.max(1, Math.min(helmetCheckWidth, video.videoWidth - helmetCheckX));
                    const sampleHeight = Math.max(1, Math.min(helmetCheckHeight, video.videoHeight - helmetCheckY));

                    if (sampleHeight > 0 && sampleWidth > 0) {
                        // Create temporary canvas to sample pixels from VIDEO (not canvas)
                        const helmetCanvas = document.createElement('canvas');
                        const helmetCtx = helmetCanvas.getContext('2d');
                        helmetCanvas.width = sampleWidth;
                        helmetCanvas.height = sampleHeight;

                        // Draw the helmet region from video
                        helmetCtx.drawImage(video, helmetCheckX, helmetCheckY, sampleWidth, sampleHeight, 0, 0, sampleWidth, sampleHeight);

                        // Get pixel data
                        const imageData = helmetCtx.getImageData(0, 0, sampleWidth, sampleHeight);
                        const pixels = imageData.data;
                        let orangePixelCount = 0;
                        let totalPixels = 0;

                        // Check for orange color (bright orange helmet)
                        for (let i = 0; i < pixels.length; i += 16) { // Sample every 4th pixel
                            const r = pixels[i];
                            const g = pixels[i + 1];
                            const b = pixels[i + 2];

                            // Orange color detection (wider range for better detection):
                            // R: 150-255 (high red)
                            // G: 50-200 (medium green)
                            // B: 0-130 (low blue)
                            const isOrange = (
                                r > 150 && r <= 255 &&      // High red (wider range)
                                g > 40 && g < 210 &&        // Medium green (wider range)
                                b >= 0 && b < 140 &&        // Low blue (wider range)
                                r > (g + 30) &&             // Red significantly higher than green
                                r > (b + 50)                // Red significantly higher than blue
                            );

                            if (isOrange) {
                                orangePixelCount++;
                            }
                            totalPixels++;
                        }

                        // If more than 10% orange pixels above face → Helmet detected (lowered threshold)
                        const orangeRatio = orangePixelCount / totalPixels;
                        helmetDetected = orangeRatio > 0.10;

                        // Debug logging for each face
                        console.log(`Face ${i + 1}: Orange pixels: ${orangePixelCount}/${totalPixels} (${(orangeRatio * 100).toFixed(1)}%) - ${helmetDetected ? 'HELMET DETECTED' : 'NO HELMET'}`);
                    }
                } catch (e) {
                    helmetDetected = false;
                }

                // ONLY BLUR FACE IF NO HELMET DETECTED
                if (!helmetDetected) {
                    ctx.save();
                    ctx.filter = 'blur(10px)';
                    ctx.drawImage(tmp, 0, 0, tmp.width, tmp.height, x, y, w, h);
                    ctx.restore();
                }
                // If helmet detected, face remains unblurred (clear)

                // Draw helmet detection status near face
                const statusText = helmetDetected ? '✓ Helmet Detected' : '✗ No Helmet Detected';
                const statusBg = helmetDetected ? 'rgba(40, 167, 69, 0.9)' : 'rgba(220, 53, 69, 0.9)';

                // Draw status box above face
                ctx.save();
                ctx.font = 'bold 16px Arial';
                const textWidth = ctx.measureText(statusText).width;
                const boxX = x + (w - textWidth - 20) / 2;
                const boxY = y - 40;
                const boxWidth = textWidth + 20;
                const boxHeight = 30;

                // Draw background box
                ctx.fillStyle = statusBg;
                ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

                // Draw text
                ctx.fillStyle = '#fff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(statusText, boxX + boxWidth / 2, boxY + boxHeight / 2);
                ctx.restore();
            }
        }
    } catch (err) {
        console.error('Detection error:', err);
    }

    captureRafId = requestAnimationFrame(detectAndBlurFaces);
}

// OCR function to extract number plate text from image
async function extractNumberPlateText(imageFile) {
    try {
        const result = await Tesseract.recognize(
            imageFile,
            'eng',
            {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                    }
                }
            }
        );

        // Extract and clean text
        let text = result.data.text.trim().toUpperCase();

        console.log('OCR Detected Text:', text);

        // Check if "TN 44" or "TN44" is present in the text
        const tn44Pattern = /TN[\s\-]?44/i;
        const hasTN44 = tn44Pattern.test(text);

        if (hasTN44) {
            // TN 44 detected - try to extract full plate or return TN-44
            const fullPlatePattern = /TN[-\s]?44[-\s]?[A-Z]{1,2}[-\s]?\d{4}/gi;
            const fullMatch = text.match(fullPlatePattern);

            if (fullMatch && fullMatch.length > 0) {
                // Full plate found (e.g., TN 44 AB 1234)
                return fullMatch[0].replace(/\s+/g, '-').toUpperCase();
            } else {
                // Only TN 44 found, return as TN-44
                return 'TN-44';
            }
        } else {
            // No TN 44 detected
            return 'No Numberplate Detected';
        }
    } catch (error) {
        console.error('OCR Error:', error);
        return 'OCR Failed';
    }
}

// Upload Video Modal Function
function openUploadVideoModal() {
    // Create a hidden file input for video upload
    const videoInput = document.createElement('input');
    videoInput.type = 'file';
    videoInput.accept = 'video/mp4,video/webm,video/mov,video/avi,video/*';
    videoInput.style.display = 'none';

    videoInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file is a video
        if (!file.type.startsWith('video/')) {
            showError('Please select a valid video file.');
            return;
        }

        // Show processing notification
        showSuccess('Processing video... Extracting frames for analysis.');

        try {
            // Extract frames from video
            const frames = await extractFramesFromUploadedVideo(file);

            if (frames.length === 0) {
                showError('Failed to extract frames from video. Please try another video.');
                return;
            }

            // Set frames as uploaded files
            uploadedFiles = frames;

            // Open upload modal to show preview
            const modal = document.getElementById('uploadModal');
            const modalTitle = document.getElementById('modalTitle');
            modalTitle.textContent = `Extracted ${frames.length} Frames from Video`;
            modal.classList.add('active');

            // Show preview of extracted frames with thumbnails
            const preview = document.getElementById('uploadPreview');
            preview.style.display = 'block';

            // Create image previews with grid layout
            const previewHTML = await Promise.all(frames.map(async (file, index) => {
                const imageUrl = URL.createObjectURL(file);
                return `
                    <div class="frame-preview-item" style="border: 2px solid #ddd; border-radius: 8px; padding: 8px; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: transform 0.2s, box-shadow 0.2s;">
                        <img src="${imageUrl}" alt="Frame ${index + 1}" style="width: 100%; height: 80px; object-fit: cover; border-radius: 4px; display: block; margin-bottom: 6px;">
                        <div style="font-size: 11px; font-weight: 600; color: #333; text-align: center;">Frame ${index + 1}</div>
                        <div style="font-size: 10px; color: #999; text-align: center;">${(file.size / 1024).toFixed(1)} KB</div>
                    </div>
                `;
            }));

            preview.innerHTML = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; max-height: 400px; overflow-y: auto; padding: 10px;">${previewHTML.join('')}</div>`;

            document.getElementById('uploadZone').style.display = 'none';
            document.getElementById('processBtn').disabled = false;

            showSuccess(`Successfully extracted ${frames.length} frames! Ready for AI analysis.`);

        } catch (error) {
            console.error('Video processing error:', error);
            showError('Failed to process video: ' + error.message);
        }
    });

    // Trigger file selection
    document.body.appendChild(videoInput);
    videoInput.click();

    // Clean up after selection
    setTimeout(() => {
        document.body.removeChild(videoInput);
    }, 100);
}

// Extract frames from uploaded video file
async function extractFramesFromUploadedVideo(videoFile) {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const frames = [];

        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;

        video.onloadedmetadata = async () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const duration = video.duration;
            const frameCount = Math.min(Math.floor(duration * 2), 100); // Extract 2 frames per second, max 100 frames
            const frameInterval = duration / frameCount;

            console.log(`Video duration: ${duration}s, extracting ${frameCount} frames (every 0.5s)`);

            try {
                for (let i = 0; i < frameCount; i++) {
                    const time = i * frameInterval;

                    // Seek to specific time
                    await new Promise((seekResolve) => {
                        const onSeeked = () => {
                            video.removeEventListener('seeked', onSeeked);
                            seekResolve();
                        };
                        video.addEventListener('seeked', onSeeked);
                        video.currentTime = time;
                    });

                    // Small delay to ensure frame is rendered
                    await new Promise(r => setTimeout(r, 50));

                    // Draw frame to canvas
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                    // Convert to blob
                    const frameBlob = await new Promise((blobResolve) => {
                        canvas.toBlob((blob) => blobResolve(blob), 'image/jpeg', 0.9);
                    });

                    if (frameBlob) {
                        // Create file from blob
                        const file = new File(
                            [frameBlob],
                            `uploaded_frame_${i + 1}_${Date.now()}.jpg`,
                            { type: 'image/jpeg' }
                        );

                        frames.push(file);
                        console.log(`Frame ${i + 1}/${frameCount} extracted`);
                    }
                }

                console.log(`Total frames extracted: ${frames.length}`);
                resolve(frames);
            } catch (error) {
                console.error('Frame extraction error:', error);
                resolve(frames); // Return whatever frames we got
            }
        };

        video.onerror = (e) => {
            console.error('Video load error:', e);
            showError('Failed to load video. Please check the file format.');
            resolve([]);
        };

        // Load video from file
        video.src = URL.createObjectURL(videoFile);
    });
}

// Event listeners for video capture buttons
document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('startCaptureBtn');
    const stopBtn = document.getElementById('stopCaptureBtn');
    const saveBtn = document.getElementById('saveCaptureBtn');

    if (startBtn) startBtn.addEventListener('click', startVideoCapture);
    if (stopBtn) stopBtn.addEventListener('click', stopVideoCapture);
    if (saveBtn) saveBtn.addEventListener('click', saveCapturedVideo);
});


