// profile.js
const token = localStorage.getItem("token"); // assuming you store JWT in localStorage

// Elements
const firstNameInput = document.getElementById("firstName");
const lastNameInput = document.getElementById("lastName");
const emailInput = document.getElementById("email");
const phoneInput = document.getElementById("phone");

const profilePicSpan = document.getElementById("profile-pic");
const profileImgTag = document.getElementById("profile-img-tag");
const profileContainer = document.getElementById("profile-image-container");
const uploadBtn = document.getElementById("upload-btn");
const saveBtn = document.getElementById("savebtn");

let selectedFile = null;

// ------------------------
// Fetch current user info
// ------------------------
async function fetchProfile() {
    const res = await fetch("http://127.0.0.1:8000/me", {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    if (!res.ok) {
        window.location.href = "login.html"; 
        return;
    }

    const data = await res.json();

    // Fill inputs
    firstNameInput.value = data.first_name || "";
    lastNameInput.value = data.last_name || "";
    emailInput.value = data.email || "";
    phoneInput.value = data.phone || "";

    // Handle profile image / initials
    if (data.profile_image && data.profile_image_mime) {
        profileImgTag.src = `data:${data.profile_image_mime};base64,${data.profile_image}`;
        profileImgTag.classList.remove("hidden");
        profilePicSpan.classList.add("hidden");
    } else {
        const initials = (data.first_name[0] || "") + (data.last_name ? data.last_name[0] : "");
        profilePicSpan.textContent = initials.toUpperCase();
        profileImgTag.classList.add("hidden");
        profilePicSpan.classList.remove("hidden");
    }
}

// ------------------------
// Upload new profile image
// ------------------------
uploadBtn.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
        selectedFile = input.files[0];
        const reader = new FileReader();
        reader.onload = () => {
            profileImgTag.src = reader.result;
            profileImgTag.classList.remove("hidden");
            profilePicSpan.classList.add("hidden");
        };
        reader.readAsDataURL(selectedFile);
    };
    input.click();
});

// ------------------------
// Save changes
// ------------------------
saveBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    let profile_image_base64 = null;
    let mime_type = null;

    if (selectedFile) {
        const reader = new FileReader();
        reader.onloadend = async () => {
            const result = reader.result;
            const splitData = result.split(",");
            mime_type = splitData[0].match(/:(.*?);/)[1];
            profile_image_base64 = splitData[1];

            await sendProfileUpdate(profile_image_base64, mime_type);
        };
        reader.readAsDataURL(selectedFile);
    } else {
        await sendProfileUpdate(null, null);
    }
});

async function sendProfileUpdate(imageBase64, mime) {
    const payload = {
        first_name: firstNameInput.value,  // add this
        last_name: lastNameInput.value,
        email: emailInput.value,           // add this
        phone: phoneInput.value,
        profile_image: imageBase64,
        profile_image_mime: mime
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
        alert("Profile updated successfully!");
        fetchProfile(); // refresh profile display
    } else {
        alert("Failed to update profile");
    }
}
// Initial fetch
fetchProfile();
