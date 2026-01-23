// profile.js
const token = localStorage.getItem("token");

// Elements
const firstNameInput = document.getElementById("firstName");
const lastNameInput = document.getElementById("lastName");
const emailInput = document.getElementById("email");
const phoneInput = document.getElementById("phone");
const profileName = document.getElementById("profile-name");
const profileEmail = document.getElementById("profile-email");

const profilePicSpan = document.getElementById("profile-pic");
const profileImgTag = document.getElementById("profile-img-tag");
const uploadBtn = document.getElementById("upload-btn");
const cameraBtn = document.getElementById("camera-btn");
const saveBtn = document.getElementById("savebtn");
const photoInput = document.getElementById("photo-input");

// Dashboard elements (for updating header)
const dashboardProfileImg = document.getElementById("dashboard-profile-img");
const userInitial = document.getElementById("user-initial");
const usernameSpan = document.getElementById("username");

let selectedFile = null;

// ------------------------
// Fetch current user info
// ------------------------
async function fetchProfile() {
    try {
        const res = await fetch("http://127.0.0.1:8000/me", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!res.ok) {
            if (res.status === 401) {
                window.location.href = "login.html";
            }
            return;
        }

        const data = await res.json();

        // Fill inputs
        firstNameInput.value = data.first_name || "";
        lastNameInput.value = data.last_name || "";
        emailInput.value = data.email || "";
        phoneInput.value = data.phone || "";
        
        // Update profile header
        profileName.textContent = `${data.first_name || ""} ${data.last_name || ""}`.trim() || "User";
        profileEmail.textContent = data.email || "Loading...";
        
        // Update dashboard header
        if (usernameSpan) {
            usernameSpan.textContent = `${data.first_name || ""} ${data.last_name || ""}`.trim() || "User Account";
        }

        // Handle profile image
        updateProfileImage(data);
        
        // Update dashboard image
        updateDashboardImage(data);
        
        // Fetch stats
        fetchUserStats();
        
    } catch (error) {
        console.error("Error fetching profile:", error);
    }
}

// Update profile image display
function updateProfileImage(data) {
    if (data.profile_image && data.profile_image_mime) {
        profileImgTag.src = `data:${data.profile_image_mime};base64,${data.profile_image}`;
        profileImgTag.classList.remove("hidden");
        profilePicSpan.classList.add("hidden");
        
        // Set initials if no image
        const initials = (data.first_name?.[0] || "") + (data.last_name?.[0] || "");
        profilePicSpan.textContent = initials.toUpperCase() || "JD";
    } else {
        const initials = (data.first_name?.[0] || "") + (data.last_name?.[0] || "");
        profilePicSpan.textContent = initials.toUpperCase() || "JD";
        profileImgTag.classList.add("hidden");
        profilePicSpan.classList.remove("hidden");
    }
}

// Update dashboard image in header
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

// Fetch user stats
async function fetchUserStats() {
    try {
        const res = await fetch("http://127.0.0.1:8000/user/stats", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        
        if (res.ok) {
            const stats = await res.json();
            document.getElementById("reports-count").textContent = stats.active_reports || 0;
            document.getElementById("matches-count").textContent = stats.successful_matches || 0;
            
            // Update member since date
            if (stats.joined_date) {
                const date = new Date(stats.joined_date);
                const year = date.getFullYear();
                document.getElementById("member-since").textContent = `Since ${year}`;
            }
        }
    } catch (error) {
        console.error("Error fetching stats:", error);
    }
}

// ------------------------
// File upload handling
// ------------------------
function triggerFileInput() {
    photoInput.click();
}

// Connect both buttons to file input
if (cameraBtn) {
    cameraBtn.addEventListener("click", triggerFileInput);
}

if (uploadBtn) {
    uploadBtn.addEventListener("click", triggerFileInput);
}

// Handle file selection
if (photoInput) {
    photoInput.addEventListener("change", (e) => {
        selectedFile = e.target.files[0];
        if (!selectedFile) return;

        // Validate file type
        const validTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!validTypes.includes(selectedFile.type)) {
            alert("Please select a valid image file (JPG, PNG, or WEBP)");
            photoInput.value = "";
            selectedFile = null;
            return;
        }

        // Validate file size (5MB)
        if (selectedFile.size > 5 * 1024 * 1024) {
            alert("File size must be less than 5MB");
            photoInput.value = "";
            selectedFile = null;
            return;
        }

        // Preview image
        const reader = new FileReader();
        reader.onload = () => {
            profileImgTag.src = reader.result;
            profileImgTag.classList.remove("hidden");
            profilePicSpan.classList.add("hidden");
            
            // Show success message
            showToast("Photo uploaded successfully! Click 'Save Changes' to update.", "success");
        };
        reader.readAsDataURL(selectedFile);
    });
}

// ------------------------
// Save changes
// ------------------------
saveBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    // Show loading state
    saveBtn.disabled = true;
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-3"></i> Saving...';

    try {
        let profile_image_base64 = null;
        let mime_type = null;

        if (selectedFile) {
            // Convert file to base64
            const base64 = await fileToBase64(selectedFile);
            const splitData = base64.split(",");
            mime_type = splitData[0].match(/:(.*?);/)[1];
            profile_image_base64 = splitData[1];
        }

        await sendProfileUpdate(profile_image_base64, mime_type);
        
    } catch (error) {
        console.error("Error saving profile:", error);
        showToast("Failed to save profile. Please try again.", "error");
    } finally {
        // Reset button state
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
});

// Convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function sendProfileUpdate(imageBase64, mime) {
    const payload = {
        first_name: firstNameInput.value.trim(),
        last_name: lastNameInput.value.trim(),
        email: emailInput.value.trim(),
        phone: phoneInput.value.trim(),
        ...(imageBase64 && { profile_image: imageBase64 }),
        ...(mime && { profile_image_mime: mime })
    };

    const res = await fetch("http://127.0.0.1:8000/profile", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        showToast("Profile updated successfully!", "success");
        
        // Refresh profile data
        await fetchProfile();
        
        // Reset file selection
        selectedFile = null;
        if (photoInput) photoInput.value = "";
        
    } else {
        const error = await res.json();
        throw new Error(error.message || "Failed to update profile");
    }
}

// Toast notification function
function showToast(message, type = "success") {
    // Remove existing toast
    const existingToast = document.querySelector(".custom-toast");
    if (existingToast) existingToast.remove();

    // Create toast
    const toast = document.createElement("div");
    toast.className = `custom-toast fixed top-6 right-6 z-50 px-6 py-4 rounded-lg shadow-xl transform transition-all duration-300 ${
        type === "error" ? "bg-red-500" : 
        type === "success" ? "bg-green-500" : 
        "bg-blue-500"
    } text-white`;
    
    toast.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${type === "success" ? "fa-check-circle" : "fa-exclamation-circle"} mr-3"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(-20px)";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ------------------------
// Initial fetch
// ------------------------
document.addEventListener("DOMContentLoaded", () => {
    if (!token) {
        window.location.href = "login.html";
        return;
    }
    fetchProfile();
});