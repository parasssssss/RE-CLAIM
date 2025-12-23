
async function loadUser() {
    const token = localStorage.getItem("token");
    
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    const res = await fetch("http://127.0.0.1:8000/me", {
        headers: {
            "Authorization": "Bearer " + token
        }
    });

    if (!res.ok) {
        window.location.href = "login.html";  
        return;
    }

    const user = await res.json();

    // Set name
    document.getElementById("username").textContent = user.first_name;

    // Set Initial
    const initial = user.first_name.charAt(0).toUpperCase();
    document.getElementById("user-initial").textContent = initial;
    document.getElementById("dashboard-profile-img").classList.add("hidden");

    // If profile image exists, set it
    if (user.profile_image && user.profile_image_mime) {
        const imgTag = document.getElementById("dashboard-profile-img");
        imgTag.src = `data:${user.profile_image_mime};base64,${user.profile_image}`;
        imgTag.classList.remove("hidden");
        document.getElementById("user-initial").classList.add("hidden");
    }


    // Logout button functionality
    document.getElementById("logoutbtn").addEventListener("click", () => {
        localStorage.removeItem("token");
        window.location.href = "landing.html";
    });
}

loadUser();
