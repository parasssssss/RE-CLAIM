/* ================= 1. STYLE & ANIMATION INJECTOR ================= */
const addGlobalStyles = () => {
    if (!document.getElementById('profile-dynamic-styles')) {
        const style = document.createElement('style');
        style.id = 'profile-dynamic-styles';
        style.textContent = `
            /* Toast Animations */
            @keyframes slideInToast {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes fadeOutToast {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(10px); opacity: 0; }
            }
            .toast-enter { animation: slideInToast 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            .toast-exit { animation: fadeOutToast 0.4s ease-in forwards; }

            /* Loading Spinner */
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            .animate-spin { animation: spin 1s linear infinite; }
            
            /* Entry Animation */
            @keyframes entry { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            .animate-entry { animation: entry 0.4s ease-out forwards; }
        `;
        document.head.appendChild(style);
    }
};

addGlobalStyles();

/* ================= 2. TOAST NOTIFICATION SYSTEM ================= */
const ToastManager = {
    container: null,
    init() {
        if (!document.getElementById('toast-container')) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none';
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('toast-container');
        }
    },
    show(message, type = 'success') {
        this.init();
        const toast = document.createElement('div');
        const isError = type === 'error';
        const borderClass = isError ? 'border-red-500' : 'border-green-500';
        const iconColor = isError ? 'text-red-600 bg-red-100' : 'text-green-600 bg-green-100';
        const title = isError ? 'Action Failed' : 'Success';
        
        const iconSvg = isError 
            ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>'
            : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>';

        toast.className = `pointer-events-auto toast-enter flex items-start gap-4 p-4 min-w-[320px] max-w-sm bg-white rounded-xl shadow-lg border-l-4 ${borderClass}`;
        
        toast.innerHTML = `
            <div class="flex-shrink-0"><div class="${iconColor} rounded-full p-2"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">${iconSvg}</svg></div></div>
            <div class="flex-1 pt-0.5">
                <h3 class="font-serif font-bold text-slate-800 text-sm leading-5">${title}</h3>
                <p class="mt-1 text-sm text-slate-500 leading-relaxed">${message}</p>
            </div>
            <button onclick="this.parentElement.remove()" class="ml-4 text-slate-400 hover:text-slate-600"><svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg></button>
        `;
        this.container.appendChild(toast);
        setTimeout(() => {
            if(toast.parentElement) {
                toast.classList.replace('toast-enter', 'toast-exit');
                toast.addEventListener('animationend', () => toast.remove());
            }
        }, 5000);
    }
};

/* ================= 3. LOADING MANAGER ================= */
const LoadingManager = {
    show(button, text = 'Processing...') {
        if (!button) return;
        button.dataset.originalHTML = button.innerHTML;
        button.disabled = true;
        button.innerHTML = `
            <span class="flex items-center justify-center">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                ${text}
            </span>
        `;
        button.classList.add('opacity-75', 'cursor-not-allowed');
    },
    hide(button) {
        if (!button) return;
        button.innerHTML = button.dataset.originalHTML || 'Save Changes';
        button.disabled = false;
        button.classList.remove('opacity-75', 'cursor-not-allowed');
    }
};

/* ================= 4. MAIN LOGIC (IIFE) ================= */
(() => {
    // Configuration
    const API_BASE_URL = "http://127.0.0.1:8000";

    // State
    let selectedFile = null;

    // DOM Elements (Assigned in DOMContentLoaded)
    let firstNameInput, lastNameInput, emailInput, phoneInput;
    let profileName, profileEmail;
    let profilePicSpan, profileImgTag, uploadBtn, cameraBtn, saveBtn, photoInput;
    let dashboardProfileImg, userInitial, usernameSpan;

    // ===================== INITIAL LOAD =====================
    document.addEventListener("DOMContentLoaded", () => {
        const token = localStorage.getItem("token");
        if (!token) {
            window.location.href = "login.html";
            return;
        }

        // Initialize Elements
        firstNameInput = document.getElementById("firstName");
        lastNameInput = document.getElementById("lastName");
        emailInput = document.getElementById("email");
        phoneInput = document.getElementById("phone");
        profileName = document.getElementById("profile-name");
        profileEmail = document.getElementById("profile-email");

        profilePicSpan = document.getElementById("profile-pic");
        profileImgTag = document.getElementById("profile-img-tag");
        uploadBtn = document.getElementById("upload-btn");
        cameraBtn = document.getElementById("camera-btn");
        saveBtn = document.getElementById("savebtn");
        photoInput = document.getElementById("photo-input");

        // Dashboard elements
        dashboardProfileImg = document.getElementById("dashboard-profile-img");
        userInitial = document.getElementById("user-initial");
        usernameSpan = document.getElementById("username");

        // Event Listeners
        if (cameraBtn) cameraBtn.addEventListener("click", () => photoInput.click());
        if (uploadBtn) uploadBtn.addEventListener("click", () => photoInput.click());
        if (photoInput) photoInput.addEventListener("change", handleFileSelect);
        if (saveBtn) saveBtn.addEventListener("click", handleSaveProfile);

        // Fetch Data
        fetchProfile(token);
    });

    // ===================== FETCH DATA =====================
    async function fetchProfile(token) {
        try {
            const res = await fetch(`${API_BASE_URL}/users/me`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!res.ok) {
                if (res.status === 401) window.location.href = "login.html";
                throw new Error("Failed to fetch profile");
            }

            const data = await res.json();

            // Populate Form
            if(firstNameInput) firstNameInput.value = data.first_name || "";
            if(lastNameInput) lastNameInput.value = data.last_name || "";
            if(emailInput) emailInput.value = data.email || "";
            if(phoneInput) phoneInput.value = data.phone || "";
            
            // Update Headers
            if(profileName) profileName.textContent = `${data.first_name || ""} ${data.last_name || ""}`.trim() || "User";
            if(profileEmail) profileEmail.textContent = data.email || "Loading...";
            if (usernameSpan) usernameSpan.textContent = `${data.first_name || ""} ${data.last_name || ""}`.trim() || "Account";

            // Images
            updateProfileImage(data);
            updateDashboardImage(data);
            
            // Stats
            fetchUserStats(token);
            
        } catch (error) {
            console.error("Error fetching profile:", error);
            ToastManager.show("Could not load profile data.", "error");
        }
    }

    async function fetchUserStats(token) {
        try {
            const res = await fetch(`${API_BASE_URL}/user/stats`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            
            if (res.ok) {
                const stats = await res.json();
                const reportsCount = document.getElementById("reports-count");
                const matchesCount = document.getElementById("matches-count");
                const memberSince = document.getElementById("member-since");

                if(reportsCount) reportsCount.textContent = stats.active_reports || 0;
                if(matchesCount) matchesCount.textContent = stats.successful_matches || 0;
                
                if (stats.joined_date && memberSince) {
                    const date = new Date(stats.joined_date);
                    memberSince.textContent = `Since ${date.getFullYear()}`;
                }
            }
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    }

    // ===================== IMAGE LOGIC =====================
    function updateProfileImage(data) {
        if(!profileImgTag || !profilePicSpan) return;

        if (data.profile_image && data.profile_image_mime) {
            profileImgTag.src = `data:${data.profile_image_mime};base64,${data.profile_image}`;
            profileImgTag.classList.remove("hidden");
            profilePicSpan.classList.add("hidden");
        } else {
            const initials = (data.first_name?.[0] || "") + (data.last_name?.[0] || "");
            profilePicSpan.textContent = initials.toUpperCase() || "JD";
            profileImgTag.classList.add("hidden");
            profilePicSpan.classList.remove("hidden");
        }
    }

    function updateDashboardImage(data) {
        if (!dashboardProfileImg || !userInitial) return;
        
        if (data.profile_image && data.profile_image_mime) {
            dashboardProfileImg.src = `data:${data.profile_image_mime};base64,${data.profile_image}`;
            dashboardProfileImg.classList.remove("hidden");
            userInitial.classList.add("hidden");
        } else {
            const initials = (data.first_name?.[0] || "") + (data.last_name?.[0] || "");
            userInitial.textContent = initials.toUpperCase() || "U";
            dashboardProfileImg.classList.add("hidden");
            userInitial.classList.remove("hidden");
        }
    }

    // ===================== FILE HANDLING =====================
    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validation
        const validTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!validTypes.includes(file.type)) {
            ToastManager.show("Please select a valid image (JPG, PNG, WEBP)", "error");
            e.target.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB
            ToastManager.show("File size must be less than 5MB", "error");
            e.target.value = "";
            return;
        }

        selectedFile = file;

        // Preview
        const reader = new FileReader();
        reader.onload = () => {
            if(profileImgTag && profilePicSpan) {
                profileImgTag.src = reader.result;
                profileImgTag.classList.remove("hidden");
                profilePicSpan.classList.add("hidden");
                ToastManager.show("Photo selected. Click 'Save Changes' to apply.", "success");
            }
        };
        reader.readAsDataURL(file);
    }

    // ===================== SAVE LOGIC =====================
    async function handleSaveProfile(e) {
        e.preventDefault();
        
        LoadingManager.show(saveBtn, "Saving Profile...");

        try {
            const token = localStorage.getItem("token");
            let profile_image_base64 = null;
            let mime_type = null;

            if (selectedFile) {
                const base64 = await fileToBase64(selectedFile);
                const splitData = base64.split(",");
                mime_type = splitData[0].match(/:(.*?);/)[1];
                profile_image_base64 = splitData[1];
            }

            const payload = {
                first_name: firstNameInput.value.trim(),
                last_name: lastNameInput.value.trim(),
                email: emailInput.value.trim(),
                phone: phoneInput.value.trim(),
                ...(profile_image_base64 && { profile_image: profile_image_base64 }),
                ...(mime_type && { profile_image_mime: mime_type })
            };

            const res = await fetch(`${API_BASE_URL}/users/profile`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to update profile");
            }

            ToastManager.show("Profile updated successfully!", "success");
            
            // Refresh to ensure all data is consistent
            await fetchProfile(token);
            
            // Reset state
            selectedFile = null;
            if (photoInput) photoInput.value = "";

        } catch (error) {
            console.error("Error saving profile:", error);
            ToastManager.show(error.message || "Failed to save profile.", "error");
        } finally {
            LoadingManager.hide(saveBtn);
        }
    }

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

})();