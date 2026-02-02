document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    
    // 1. Security Check: Redirect if not logged in
    if (!token) {
        window.location.href = 'landing.html';
        return;
    }

    // 2. Fetch User Data
    try {
        const response = await fetch('http://127.0.0.1:8000/users/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const userData = await response.json();
            console.log("✅ Settings Data Loaded:", userData);
            
            // 3. Fill the Form Fields
            populateSettingsForm(userData);
            
            // 4. Update the "Hero" Banner (Top section)
            updateSettingsBanner(userData);
            
            // 5. Update Profile Picture
            handleSettingsProfileImage(userData);
            
            // 6. Activate the Camera Upload Button
            initPhotoUpload(token);

        } else {
            console.error("❌ Failed to fetch user profile", response.status);
            if(response.status === 401) {
                window.location.href = 'landing.html';
            }
        }

    } catch (error) {
        console.error("❌ Error loading profile:", error);
    }
});

// --- Helper 1: Fill the Input Fields ---
function populateSettingsForm(user) {
    // Helper to set value safely
    const setVal = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value || '';
    };

    // These IDs match your admin_settings.html exactly
    setVal('firstName', user.first_name);
    setVal('lastName', user.last_name);
    setVal('email', user.email);
    setVal('phone', user.phone_number); 

    // Update the Stats Counters if API provides them
    if (document.getElementById('reports-count') && user.reports_count !== undefined) {
        document.getElementById('reports-count').textContent = user.reports_count;
    }
    if (document.getElementById('matches-count') && user.matches_count !== undefined) {
        document.getElementById('matches-count').textContent = user.matches_count;
    }
}

// --- Helper 2: Update the Top Banner Name/Email ---
function updateSettingsBanner(user) {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    const displayName = fullName || user.email.split('@')[0];
    
    const nameEl = document.getElementById('profile-name');
    const emailEl = document.getElementById('profile-email');
    
    if (nameEl) nameEl.textContent = displayName;
    if (emailEl) emailEl.textContent = user.email;
}

// --- Helper 3: Handle the Big Profile Picture ---
function handleSettingsProfileImage(user) {
    const imgTag = document.getElementById('profile-img-tag'); 
    const initialSpan = document.getElementById('profile-pic'); 
    
    // 1. Calculate Initials (e.g. "JD")
    const first = (user.first_name || user.email || 'U').charAt(0).toUpperCase();
    const last = (user.last_name || '').charAt(0).toUpperCase();
    if (initialSpan) initialSpan.textContent = first + last;

    // 2. Show Image if it exists
    if (user.profile_image) {
        let imageUrl = user.profile_image;
        
        // Handle base64 logic
        if (!imageUrl.startsWith('data:') && user.profile_image_mime) {
            imageUrl = `data:${user.profile_image_mime};base64,${user.profile_image}`;
        } else if (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
            imageUrl = `data:image/jpeg;base64,${user.profile_image}`;
        }

        if (imgTag) {
            imgTag.src = imageUrl;
            imgTag.classList.remove('hidden');
        }
        if (initialSpan) {
            initialSpan.style.display = 'none';
        }
    } else {
        // Reset to initials if no image
        if (imgTag) imgTag.classList.add('hidden');
        if (initialSpan) initialSpan.style.display = 'flex';
    }
}

// --- Helper 4: Enable Photo Uploading ---
function initPhotoUpload(token) {
    const cameraBtn = document.getElementById('camera-btn');
    const fileInput = document.getElementById('photo-input');

    if (!cameraBtn || !fileInput) return;

    // Click camera -> trigger invisible input
    cameraBtn.addEventListener('click', () => fileInput.click());

    // File selected -> Upload immediately
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file); 

        // Show spinner
        const originalIcon = cameraBtn.innerHTML;
        cameraBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        try {
            const response = await fetch('http://127.0.0.1:8000/users/me/profile-image', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (response.ok) {
                // Fetch the new user data to update the UI
                const updatedUser = await response.json();
                handleSettingsProfileImage(updatedUser);
                alert("Profile picture updated!");
                // Reload page to update the header dropdown too
                setTimeout(() => location.reload(), 1000); 
            } else {
                alert("Failed to upload image.");
            }
        } catch (err) {
            console.error("Upload error:", err);
            alert("Error uploading image.");
        } finally {
            cameraBtn.innerHTML = originalIcon;
        }
    });
}