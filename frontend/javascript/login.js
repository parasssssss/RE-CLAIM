document.getElementById("loginBtn").addEventListener("click", async (e) => {
    e.preventDefault();

    const data = {
        email: document.getElementById("loginEmail").value,
        password: document.getElementById("loginPassword").value,
    };

    try {
        const res = await fetch("http://127.0.0.1:8000/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        const result = await res.json();

        if (res.ok) {
    const token = result.access_token;
    console.log("JWT Token:", token);
    localStorage.setItem("token", token);

    // Ensure roleId is integer
    const roleId = parseInt(result.role_id, 10);
    localStorage.setItem("role_id", roleId);

    alert("Login successful! User ID: " + result.user_id);

    // Redirect based on role
    if (roleId === 2) {
        window.location.href = "dashboard_admin.html";
    } else if (roleId === 3) {
        window.location.href = "dashboard_staff.html";
    } else {
        window.location.href = "dashboard_normie.html";
    }
}
    

    } catch (err) {
        console.error(err);
        alert("Something went wrong!");
    }
});
