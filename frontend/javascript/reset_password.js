const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get("token"); // Read token from query string

      const form = document.getElementById("resetPasswordForm");
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const password = document.getElementById("password").value;
        const confirm_password = document.getElementById("confirm_password").value;

        if (password !== confirm_password) {
          alert("Passwords do not match!");
          return;
        }

        try {
          const res = await fetch("http://127.0.0.1:8000/auth/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, new_password: password })
          });

          const data = await res.json();
          if (res.ok) {
            alert("Password reset successfully!");
            window.location.href = "login.html";
          } else {
            alert("Error: " + data.detail);
          }
        } catch (err) {
          console.error(err);
          alert("Something went wrong!");
        }
      });