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
            // Save token in localStorage
            const token = result.access_token;
    console.log("JWT Token:", token);
            localStorage.setItem("token", result.access_token);
            alert("Login successful! User ID: " + result.user_id);

            // Redirect to dashboard page
            window.location.href = "dashboard_normie.html";
        } else {
            alert("Error: " + result.detail);
        }
    } catch (err) {
        console.error(err);
        alert("Something went wrong!");
    }
});
