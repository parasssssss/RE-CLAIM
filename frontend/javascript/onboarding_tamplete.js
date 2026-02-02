// --- DOM ELEMENTS ---
    const getStartedBtn = document.getElementById("getStartedBtn"); // Ensure this ID exists on your main page button
    const onboardingModal = document.getElementById("onboardingModal");
    const modalBackdrop = document.getElementById("modalBackdrop");
    const modalContent = document.getElementById("modalContent");
    const closeModal = document.getElementById("closeModal");
    const progressBar = document.getElementById("progressBar");

    const step1 = document.getElementById("step1");
    const step2 = document.getElementById("step2");

    const nextToStep2 = document.getElementById("nextToStep2");
    const backToStep1 = document.getElementById("backToStep1");
    const generateCodeBtn = document.getElementById("generateCodeBtn");
    const businessCodeInput = document.getElementById("businessCode");

    // --- MODAL ANIMATIONS ---
    function openModal() {
        onboardingModal.classList.remove("hidden");
        // Small delay to allow display:block to apply before opacity transition
        setTimeout(() => {
            modalBackdrop.classList.remove("opacity-0");
            modalContent.classList.remove("opacity-0", "scale-95");
            modalContent.classList.add("scale-100");
        }, 10);
    }

    function hideModal() {
        modalBackdrop.classList.add("opacity-0");
        modalContent.classList.add("opacity-0", "scale-95");
        modalContent.classList.remove("scale-100");
        setTimeout(() => {
            onboardingModal.classList.add("hidden");
        }, 300);
    }

    if(getStartedBtn) getStartedBtn.addEventListener("click", openModal);
    if(closeModal) closeModal.addEventListener("click", hideModal);

    // --- RANDOM CODE GENERATOR ---
    generateCodeBtn.addEventListener("click", () => {
        // Generate random format: BIZ-XXXX-XXXX
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let part1 = "";
        let part2 = "";
        for(let i=0; i<4; i++) part1 += chars.charAt(Math.floor(Math.random() * chars.length));
        for(let i=0; i<4; i++) part2 += chars.charAt(Math.floor(Math.random() * chars.length));
        
        const code = `BIZ-${part1}-${part2}`;
        
        // Typing effect
        businessCodeInput.value = "";
        let i = 0;
        const typeWriter = setInterval(() => {
            if (i < code.length) {
                businessCodeInput.value += code.charAt(i);
                i++;
            } else {
                clearInterval(typeWriter);
                businessCodeInput.classList.remove("text-gray-500");
                businessCodeInput.classList.add("text-indigo-600", "font-bold");
            }
        }, 30);
    });

    // --- VALIDATION HELPER ---
    function validateInput(id) {
        const el = document.getElementById(id);
        if(!el.value.trim()) {
            el.classList.add("border-red-500", "bg-red-50");
            // Remove error style after 2 seconds
            setTimeout(() => el.classList.remove("border-red-500", "bg-red-50"), 2000);
            return false;
        }
        return true;
    }

    // --- NAVIGATION ---
    nextToStep2.addEventListener("click", () => {
        // Validate Step 1
        const v1 = validateInput("businessName");
        const v2 = validateInput("businessAddress");
        const v3 = validateInput("businessEmail");
        const v4 = validateInput("businessCode");

        if(!v1 || !v2 || !v3 || !v4) {
            // Shake button if invalid
            nextToStep2.classList.add("animate-shake", "bg-red-600");
            setTimeout(() => nextToStep2.classList.remove("animate-shake", "bg-red-600"), 300);
            return;
        }

        // Proceed
        step1.classList.add("hidden");
        step2.classList.remove("hidden");
        step2.classList.add("step-enter"); // Add animation class
        progressBar.style.width = '100%';
    });

    backToStep1.addEventListener("click", () => {
        step2.classList.add("hidden");
        step2.classList.remove("step-enter");
        step1.classList.remove("hidden");
        step1.classList.add("step-enter");
        progressBar.style.width = '50%';
    });

    // --- PAYMENT & API LOGIC (UNCHANGED) ---
    const checkoutBtn = document.getElementById("checkoutBtn");

    checkoutBtn.addEventListener("click", async () => {
        
        // Validate Step 2
        const v1 = validateInput("adminName");
        const v2 = validateInput("adminEmail");
        const v3 = validateInput("adminPassword");
        
        if(!v1 || !v2 || !v3) {
            checkoutBtn.classList.add("animate-shake");
            setTimeout(() => checkoutBtn.classList.remove("animate-shake"), 300);
            return;
        }

        checkoutBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Processing...';
        
        // Gather form data
        const payload = {
            business: {
                name: document.getElementById("businessName").value,
                address: document.getElementById("businessAddress").value,
                email: document.getElementById("businessEmail").value,
                code: document.getElementById("businessCode").value // Added this field to payload if your API expects it
            },
            admin: {
                name: document.getElementById("adminName").value,
                email: document.getElementById("adminEmail").value,
                password: document.getElementById("adminPassword").value
            }
        };

        try {
            // Step 1: Start onboarding
            const startRes = await fetch("http://127.0.0.1:8000/onboarding/onboarding/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const startData = await startRes.json();
            
            if(!startRes.ok) throw new Error(startData.detail || "Setup failed");

            const registration_token = startData.registration_token;

            // Step 2: Razorpay
            const options = {
                key: "", // ENTER YOUR RAZORPAY KEY HERE
                amount: 149900,
                currency: "INR",
                name: payload.business.name,
                description: "Pro Plan Subscription",
                handler: async function (response) {
                    // Step 3: Complete
                    const completeRes = await fetch(`http://127.0.0.1:8000/onboarding/onboarding/complete?token=${registration_token}`, {
                        method: "POST"
                    });
                    const completeData = await completeRes.json();
                    
                    // Success UI
                    modalContent.innerHTML = `
                        <div class="p-12 text-center">
                            <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <i class="fas fa-check text-3xl text-green-600"></i>
                            </div>
                            <h2 class="text-3xl font-bold text-gray-900 mb-2">Setup Complete!</h2>
                            <p class="text-gray-500 mb-8">Your dashboard is ready. Business ID: <span class="font-mono font-bold text-gray-900">${completeData.business_id}</span></p>
                            <button onclick="location.reload()" class="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold shadow-lg hover:scale-105 transition">
                                Go to Dashboard
                            </button>
                        </div>
                    `;
                },
                prefill: {
                    name: payload.admin.name,
                    email: payload.admin.email
                },
                theme: { color: "#4F46E5" },
                modal: {
                    ondismiss: function() {
                        checkoutBtn.innerHTML = '<span>Complete Setup</span><div class="w-px h-4 bg-gray-700"></div><span class="text-indigo-400">₹1,499</span>';
                    }
                }
            };

            const rzp = new Razorpay(options);
            rzp.on("payment.failed", function (response) {
                alert("Payment failed: " + response.error.description);
                checkoutBtn.innerHTML = '<span>Complete Setup</span><div class="w-px h-4 bg-gray-700"></div><span class="text-indigo-400">₹1,499</span>';
            });
            rzp.open();

        } catch (err) {
            console.error(err);
            alert("Error: " + err.message);
            checkoutBtn.innerHTML = '<span>Complete Setup</span><div class="w-px h-4 bg-gray-700"></div><span class="text-indigo-400">₹1,499</span>';
        }
    });