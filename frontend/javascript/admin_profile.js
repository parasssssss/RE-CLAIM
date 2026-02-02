// ✅ IIFE to prevent variable conflicts
(() => {
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
    const cameraBtn = document.getElementById("camera-btn");
    const saveBtn = document.getElementById("savebtn");
    const photoInput = document.getElementById("photo-input");

    // Dashboard elements
    const dashboardProfileImg = document.getElementById("dashboard-profile-img");
    const userInitial = document.getElementById("user-initial");
    const usernameSpan = document.getElementById("username");

    let selectedFile = null;

    // ===================== INITIAL LOAD =====================
    document.addEventListener("DOMContentLoaded", () => {
        if (!token) {
            window.location.href = "login.html";
            return;
        }
        fetchProfile();
    });

    // ===================== FETCH DATA =====================
    async function fetchProfile() {
        try {
            const res = await fetch("http://127.0.0.1:8000/users/me", {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!res.ok) {
                if (res.status === 401) window.location.href = "login.html";
                return;
            }

            const data = await res.json();

            // Fill inputs
            if(firstNameInput) firstNameInput.value = data.first_name || "";
            if(lastNameInput) lastNameInput.value = data.last_name || "";
            if(emailInput) emailInput.value = data.email || "";
            if(phoneInput) phoneInput.value = data.phone || "";
            
            // Update Headers
            const fullName = `${data.first_name || ""} ${data.last_name || ""}`.trim() || "User";
            if(profileName) profileName.textContent = fullName;
            if(profileEmail) profileEmail.textContent = data.email || "Loading...";
            if(usernameSpan) usernameSpan.textContent = fullName;

            // Images
            updateProfileImage(data);
            updateDashboardImage(data);
            
            // Stats
            fetchUserStats();
            
        } catch (error) {
            console.error("Error fetching profile:", error);
        }
    }

    function updateProfileImage(data) {
        if (!profileImgTag || !profilePicSpan) return;

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

    async function fetchUserStats() {
        try {
            const res = await fetch("http://127.0.0.1:8000/user/stats", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const stats = await res.json();
                const repCount = document.getElementById("reports-count");
                const matchCount = document.getElementById("matches-count");
                if(repCount) repCount.textContent = stats.active_reports || 0;
                if(matchCount) matchCount.textContent = stats.successful_matches || 0;
            }
        } catch (error) { console.error(error); }
    }

    // ===================== FILE UPLOAD =====================
    if (cameraBtn) cameraBtn.onclick = () => photoInput.click();
    if (photoInput) {
        photoInput.onchange = (e) => {
            selectedFile = e.target.files[0];
            if (!selectedFile) return;

            // Validate
            if (selectedFile.size > 5 * 1024 * 1024) {
                showToast("File size must be less than 5MB", "error");
                return;
            }

            // Preview
            const reader = new FileReader();
            reader.onload = () => {
                if(profileImgTag) {
                    profileImgTag.src = reader.result;
                    profileImgTag.classList.remove("hidden");
                    if(profilePicSpan) profilePicSpan.classList.add("hidden");
                }
                showToast("Photo selected. Click 'Save Changes' to apply.", "success");
            };
            reader.readAsDataURL(selectedFile);
        };
    }

    // ===================== SAVE =====================
    if(saveBtn) {
        saveBtn.onclick = async (e) => {
            e.preventDefault();
            saveBtn.disabled = true;
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            try {
                let profile_image_base64 = null;
                let mime_type = null;

                if (selectedFile) {
                    const base64 = await fileToBase64(selectedFile);
                    const splitData = base64.split(",");
                    mime_type = splitData[0].match(/:(.*?);/)[1];
                    profile_image_base64 = splitData[1];
                }

                await sendProfileUpdate(profile_image_base64, mime_type);
                
            } catch (error) {
                console.error(error);
                showToast("Failed to save changes.", "error");
            } finally {
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
            }
        };
    }

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

        const res = await fetch("http://127.0.0.1:8000/users/profile", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showToast("Profile updated successfully!", "success");
            await fetchProfile(); // Refresh
            selectedFile = null;
            if (photoInput) photoInput.value = "";
        } else {
            throw new Error("Failed to update");
        }
    }

    // ===================== TOAST =====================
    function showToast(message, type = "success") {
        const existingToast = document.querySelector(".custom-toast");
        if (existingToast) existingToast.remove();

        const toast = document.createElement("div");
        // Premium Dark/Gold Toast
        toast.className = `custom-toast fixed bottom-6 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 transform transition-all duration-500 translate-y-10 opacity-0 bg-gray-900 text-white border border-gray-800`;
        
        const iconColor = type === "success" ? "text-green-400" : "text-red-400";
        const iconClass = type === "success" ? "fa-check-circle" : "fa-exclamation-circle";

        toast.innerHTML = `
            <i class="fas ${iconClass} ${iconColor} text-lg"></i>
            <span class="font-medium text-sm">${message}</span>
        `;
        
        document.body.appendChild(toast);

        // Animate In
        requestAnimationFrame(() => {
            toast.classList.remove("translate-y-10", "opacity-0");
        });

        // Remove
        setTimeout(() => {
            toast.classList.add("translate-y-10", "opacity-0");
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }

})();