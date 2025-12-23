document.getElementById("registerBtn").addEventListener("click", async (e) => {
    e.preventDefault();

    const data = {
        business_id: document.getElementById("businessId").value || null,
        first_name: document.getElementById("firstName").value,
        email: document.getElementById("email").value,
        password: document.getElementById("password").value
    };

    try {
        const res = await fetch("http://127.0.0.1:8000/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        const result = await res.json();
        if (res.ok) {
            alert("Registration successful! User ID: " + result.user_id);
            window.location.href = "login.html"; // redirect to login page
        } else {
            alert("Error: " + result.detail);
        }
    } catch (err) {
        console.error(err);
        alert("Something went wrong!");
    }
});