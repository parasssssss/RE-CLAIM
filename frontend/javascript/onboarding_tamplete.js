const getStartedBtn = document.getElementById("getStartedBtn");
const onboardingModal = document.getElementById("onboardingModal");
const closeModal = document.getElementById("closeModal");

const step1 = document.getElementById("step1");
const step2 = document.getElementById("step2");

const nextToStep2 = document.getElementById("nextToStep2");
const backToStep1 = document.getElementById("backToStep1");

// Open modal
getStartedBtn.addEventListener("click", () => {
    onboardingModal.classList.remove("hidden");
});

// Close modal
closeModal.addEventListener("click", () => {
    onboardingModal.classList.add("hidden");
});

// Step navigation
nextToStep2.addEventListener("click", () => {
    step1.classList.add("hidden");
    step2.classList.remove("hidden");
    progressBar.style.width = '100%';
});

backToStep1.addEventListener("click", () => {
    step2.classList.add("hidden");
    step1.classList.remove("hidden");
    progressBar.style.width = '50%';
});

// Razorpay Demo Payment (JS-only)
const checkoutBtn = document.getElementById("checkoutBtn");

checkoutBtn.addEventListener("click", async () => {
    // Gather form data
    const payload = {
        business: {
            name: document.getElementById("businessName").value,
            address: document.getElementById("businessAddress").value,
            email: document.getElementById("businessEmail").value
        },
        admin: {
            name: document.getElementById("adminName").value,
            email: document.getElementById("adminEmail").value,
            password: document.getElementById("adminPassword").value
        }
    };

    try {
        // Step 1: Start onboarding and get registration token
        const startRes = await fetch("http://127.0.0.1:8000/onboarding/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const startData = await startRes.json();
        const registration_token = startData.registration_token;

        // Step 2: Razorpay JS-only demo payment
        const options = {
            key: "", // Your Razorpay test/demo key
            amount: 149900, // ₹499 in paise
            currency: "INR",
            name: payload.business.name,
            description: "Demo Payment",
            handler: async function (response) {
                alert("✅ Payment success! Payment ID: " + response.razorpay_payment_id);

                // Step 3: Complete onboarding
                const completeRes = await fetch(`http://127.0.0.1:8000/onboarding/complete?token=${registration_token}`, {
                    method: "POST"
                });
                const completeData = await completeRes.json();
                alert(completeData.message + "\nBusiness ID: " + completeData.business_id);

                onboardingModal.classList.add("hidden");
            },
            prefill: {
                name: payload.admin.name,
                email: payload.admin.email
            },
            theme: { color: "#F37254" }
        };

        const rzp = new Razorpay(options);

        // Optional event listeners
        rzp.on("payment.failed", function (response) {
            alert("❌ Payment failed: " + response.error.description);
        });

        rzp.on("modal.closed", function () {
            console.log("User closed Razorpay popup");
        });

        // Open Razorpay modal
        rzp.open();

    } catch (err) {
        console.error(err);
        alert("Something went wrong. Please try again.");
    }
});
