// ✅ WRAPPED IN CLOSURE TO PREVENT CONFLICTS
(() => {
    /* ================= 1. PRIVATE UTILITIES (Scoped to this file) ================= */

    // Style Injector
    const addGlobalStyles = () => {
        if (!document.getElementById('billing-dynamic-styles')) {
            const style = document.createElement('style');
            style.id = 'billing-dynamic-styles';
            style.textContent = `
                /* Toast Animations */
                @keyframes slideInToast {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes fadeOutToast {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(10px); opacity: 0; }
                }
                .toast-enter { animation: slideInToast 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .toast-exit { animation: fadeOutToast 0.4s ease-in forwards; }

                /* Loading Spinner */
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin { animation: spin 1s linear infinite; }

                /* Table Entry Animation */
                @keyframes entry { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-entry { animation: entry 0.3s ease-out forwards; }
            `;
            document.head.appendChild(style);
        }
    };

    // Toast Manager
    const ToastManager = {
        container: null,
        init() {
            if (!document.getElementById('toast-container')) {
                this.container = document.createElement('div');
                this.container.id = 'toast-container';
                this.container.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none';
                document.body.appendChild(this.container);
            } else {
                this.container = document.getElementById('toast-container');
            }
        },
        show(message, type = 'success') {
            this.init();
            const toast = document.createElement('div');
            const isError = type === 'error';
            const borderClass = isError ? 'border-red-500' : 'border-green-500';
            const iconColor = isError ? 'text-red-600 bg-red-100' : 'text-green-600 bg-green-100';
            const title = isError ? 'Action Failed' : 'Success';
            
            const iconSvg = isError 
                ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>'
                : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>';

            toast.className = `pointer-events-auto toast-enter flex items-start gap-4 p-4 min-w-[320px] max-w-sm bg-white rounded-xl shadow-lg border-l-4 ${borderClass}`;
            
            toast.innerHTML = `
                <div class="flex-shrink-0"><div class="${iconColor} rounded-full p-2"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">${iconSvg}</svg></div></div>
                <div class="flex-1 pt-0.5">
                    <h3 class="font-serif font-bold text-slate-800 text-sm leading-5">${title}</h3>
                    <p class="mt-1 text-sm text-slate-500 leading-relaxed">${message}</p>
                </div>
                <button onclick="this.parentElement.remove()" class="ml-4 text-slate-400 hover:text-slate-600"><svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg></button>
            `;
            this.container.appendChild(toast);
            setTimeout(() => {
                if(toast.parentElement) {
                    toast.classList.replace('toast-enter', 'toast-exit');
                    toast.addEventListener('animationend', () => toast.remove());
                }
            }, 5000);
        }
    };

    // Loading Manager
    const LoadingManager = {
        show(button, text = 'Processing...') {
            if (!button) return;
            button.dataset.originalHTML = button.innerHTML;
            button.disabled = true;
            button.innerHTML = `
                <span class="flex items-center justify-center">
                    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    ${text}
                </span>
            `;
            button.classList.add('opacity-75', 'cursor-not-allowed');
        },
        hide(button) {
            if (!button) return;
            button.innerHTML = button.dataset.originalHTML || 'Submit';
            button.disabled = false;
            button.classList.remove('opacity-75', 'cursor-not-allowed');
        }
    };

    // Init styles
    addGlobalStyles();

    /* ================= 2. MAIN LOGIC ================= */

    const API_BASE_URL = "http://127.0.0.1:8000";

    document.addEventListener("DOMContentLoaded", () => {
        loadBillingData();
    });

    // =======================
    // 1. LOAD DATA & REVEAL
    // =======================
    async function loadBillingData() {
        const token = localStorage.getItem("token");
        if (!token) return window.location.href = "landing.html";
        if (token) {
        loadBusinessCode(token);
    }

        const headers = { "Authorization": `Bearer ${token}` };

        try {
            // A. Fetch Current Subscription
            const subRes = await fetch(`${API_BASE_URL}/billing/current`, { headers });
            if(!subRes.ok) throw new Error("Could not load subscription");
            const subData = await subRes.json();
            
            // Update UI (Hidden DOM)
            const planNameEl = document.getElementById("currentPlanName");
            if(planNameEl) planNameEl.textContent = subData.plan_name;

            const statusBadge = document.getElementById("planStatusBadge");
            if(statusBadge) {
                statusBadge.textContent = subData.status;
                if(subData.status === 'ACTIVE') {
                    statusBadge.className = "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-green-100 text-green-700 border border-green-200";
                } else {
                    statusBadge.className = "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-100 text-red-700 border border-red-200";
                }
            }
            
            const renewalEl = document.getElementById("renewalDate");
            if(renewalEl) {
                if (subData.end_date) {
                    const date = new Date(subData.end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                    renewalEl.textContent = `${date}`;
                } else {
                    renewalEl.textContent = "No expiration";
                }
            }

            // B. Fetch Plans
            const plansRes = await fetch(`${API_BASE_URL}/billing/plans`, { headers });
            if(plansRes.ok) {
                const plansData = await plansRes.json();
                renderPlans(plansData, subData.plan_name);
            }

            // C. Fetch History
            const histRes = await fetch(`${API_BASE_URL}/billing/history`, { headers });
            if (histRes.ok) {
                const histData = await histRes.json();
                renderHistory(histData);
            }

            // --- ANIMATION STEP ---
            revealBilling();

        } catch (err) {
            console.error("Billing Error:", err);
            ToastManager.show("Error loading billing details.", "error");
            revealBilling(); 
        }
    }

    // Handle Transition from Skeleton to Content
    function revealBilling() {
        const skeleton = document.getElementById("billing-skeleton");
        const content = document.getElementById("billing-content");

        if(skeleton) skeleton.style.display = 'none';
        if(content) {
            content.classList.remove("hidden");
            // Small timeout to allow the remove("hidden") to paint before fading in
            setTimeout(() => {
                content.classList.remove("opacity-0");
            }, 50);
        }
    }

    // =======================
    // 2. RENDER PLANS
    // =======================
    function renderPlans(plans, currentPlanName) {
        const container = document.getElementById("plansContainer");
        if(!container) return;
        container.innerHTML = "";

        plans.forEach((plan, index) => {
            const isCurrent = plan.name === currentPlanName;
            const features = plan.features ? plan.features.split(",") : ["Standard Support", "Basic Analytics", "Email Support"];
            
            // Pass 'this' to the function to capture the button element
            let btnHtml = isCurrent 
                ? `<button disabled class="w-full bg-gray-100 border border-gray-200 rounded-xl py-3 text-sm font-bold text-gray-400 cursor-not-allowed shadow-inner">Current Plan</button>`
                : `<button onclick="window.initiateUpgrade(this, ${plan.plan_id}, '${plan.name}', ${plan.price})" class="w-full bg-gray-900 border border-transparent rounded-xl py-3 text-sm font-bold text-white hover:bg-gray-800 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">Upgrade to ${plan.name}</button>`;

            const highlightClass = isCurrent ? "ring-2 ring-yellow-500 ring-offset-2" : "hover:border-yellow-400/50";
            const badgeHtml = isCurrent ? `<div class="absolute top-0 right-0 bg-yellow-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl uppercase tracking-widest shadow-sm">Active</div>` : "";

            // Add staggered animation delay
            const style = `style="animation-delay: ${index * 100}ms"`;
            const animClass = "animate-entry";

            const html = `
            <div class="relative flex flex-col p-8 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-300 ${highlightClass} ${animClass}" ${style}>
                ${badgeHtml}
                <div class="flex-1">
                    <h3 class="text-xl font-serif font-bold text-gray-900">${plan.name}</h3>
                    <p class="mt-4 flex items-baseline text-gray-900">
                        <span class="text-4xl font-serif font-bold tracking-tight">₹${plan.price}</span>
                        <span class="ml-1 text-sm font-semibold text-gray-500">/month</span>
                    </p>
                    <p class="mt-6 text-sm text-gray-500 leading-relaxed">${plan.description || "Unlock full potential with this plan."}</p>
                    <div class="h-px w-full bg-gray-100 my-6"></div>
                    <ul role="list" class="space-y-4 mb-8">
                        ${features.map(f => `
                            <li class="flex items-start">
                                <div class="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                                    <i class="fas fa-check text-green-600 text-[10px]"></i>
                                </div>
                                <span class="ml-3 text-sm text-gray-600 font-medium">${f.trim()}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
                ${btnHtml}
            </div>
            `;
            container.innerHTML += html;
        });
    }

    // =======================
    // 3. RENDER HISTORY
    // =======================
function renderHistory(history) {
    const tbody = document.getElementById("billingHistoryBody");
    if(!tbody) return;
    tbody.innerHTML = "";

    if (history.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-12 text-center text-gray-400">No payment history found.</td></tr>`;
        return;
    }

    history.forEach((item, index) => {
        const dateStr = new Date(item.date).toLocaleDateString();
        
        let statusBadge = `<span class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-600">Pending</span>`;
        if(item.status === 'PAID') statusBadge = `<span class="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-bold text-green-700 border border-green-100">Paid</span>`;
        if(item.status === 'FAILED') statusBadge = `<span class="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700 border border-red-100">Failed</span>`;

        // Staggered Animation
        const delayStyle = `style="animation-delay: ${index * 50}ms"`;

        const row = `
            <tr class="hover:bg-gray-50 transition border-b border-gray-50 last:border-b-0 animate-entry" ${delayStyle}>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${dateStr}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${item.description}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">₹${item.amount}</td>
                <td class="px-6 py-4 whitespace-nowrap">${statusBadge}</td>
                
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="downloadInvoice(${item.payment_id})" class="text-gray-400 hover:text-indigo-600 transition" title="Download Invoice">
                        <i class="fas fa-download"></i>
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}
    // =======================
    // 4. RAZORPAY & ACTIONS
    // =======================
    
    // Exposed to Global Scope for HTML onclick
    window.initiateUpgrade = async function(btnElement, planId, planName, planPrice) {
        const token = localStorage.getItem("token");
        if (!token) return window.location.href = "landing.html";

        // Show loading spinner on the button
        LoadingManager.show(btnElement, "Processing...");

        const options = {
            "key": "rzp_test_tiQfaO957FrfXO",
            "amount": planPrice * 100, 
            "currency": "INR",
            "name": "ReClaim Admin",
            "description": `Upgrade to ${planName}`,
            "image": "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
            "handler": async function (response) {
                await confirmUpgrade(planId, response.razorpay_payment_id);
                LoadingManager.hide(btnElement);
            },
            "prefill": { "email": "admin@business.com" },
            "theme": { "color": "#EAB308" },
            "modal": {
                // If user closes modal, reset button
                "ondismiss": function(){
                    LoadingManager.hide(btnElement);
                }
            }
        };

        try {
            const rzp1 = new Razorpay(options);
            rzp1.on('payment.failed', function (response){
                ToastManager.show(`Payment Failed: ${response.error.description}`, "error");
                LoadingManager.hide(btnElement);
            });
            rzp1.open();
        } catch (e) {
            console.error(e);
            ToastManager.show("Error launching payment gateway. Check console.", "error");
            LoadingManager.hide(btnElement);
        }
    }

    async function confirmUpgrade(planId, paymentId) {
        const token = localStorage.getItem("token");
        try {
            const res = await fetch(`${API_BASE_URL}/billing/upgrade`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ plan_id: planId, payment_id: paymentId })
            });

            const data = await res.json();
            
            if (res.ok) {
                ToastManager.show("🎉 Upgrade Successful! Reloading...");
                setTimeout(() => location.reload(), 2000);
            } else {
                ToastManager.show(`Upgrade failed: ${data.detail || "Unknown error"}`, "error");
            }
        } catch (err) {
            console.error(err);
            ToastManager.show("Network error during verification.", "error");
        }
    }

    window.cancelSubscription = function() {
        if(confirm("Are you sure you want to cancel your subscription?")) {
            // Placeholder for actual cancellation logic
            ToastManager.show("Cancellation request sent.", "success");
        }
    }


    window.downloadInvoice = async function(paymentId) {
    const token = localStorage.getItem("token");
    
    // Direct link trigger for file download
    try {
        const response = await fetch(`http://127.0.0.1:8000/billing/invoice/${paymentId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
            // Convert to Blob and Trigger Download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Invoice_${paymentId}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } else {
            alert("Failed to download invoice.");
        }
    } catch (err) {
        console.error("Download error:", err);
    }
}

// ===================== FETCH BUSINESS CODE =====================
    async function loadBusinessCode(token) {
        try {
            const res = await fetch("http://127.0.0.1:8000/users/me/business-code", {
                headers: { 
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (res.ok) {
                const data = await res.json();
                const codeEl = document.getElementById("header-business-code");
                const containerEl = document.getElementById("business-info-display");

                if (data.business_code) {
                    if(codeEl) codeEl.textContent = data.business_code;
                    // Show the container if it was hidden
                    if(containerEl) containerEl.classList.remove("hidden");
                    // Ensure the flex layout works if previously hidden
                    if(containerEl) containerEl.classList.add("flex"); 
                }
            } else {
                console.warn(`Business Code API returned ${res.status}`);
            }
        } catch (err) {
            console.error("❌ Network error loading Business Code:", err);
        }
    }
})();