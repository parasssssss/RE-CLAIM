
      const form = document.getElementById("forgotPasswordForm");
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("email").value;

        try {
          const res = await fetch("http://127.0.0.1:8000/auth/forgot-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
          });

          const data = await res.json();
          if (res.ok) {
            alert("Reset link sent! Check your email.");
          } else {
            alert("Error: " + data.detail);
          }
        } catch (err) {
          console.error(err);
          alert("Something went wrong!");
        }
      });
 