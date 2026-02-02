(() => {
    document.addEventListener("DOMContentLoaded", () => {
        loadBillingData();
    });

    // =======================
    // 1. LOAD DATA & REVEAL
    // =======================
    async function loadBillingData() {
        const token = localStorage.getItem("token");
        if (!token) return window.location.href = "landing.html";

        const headers = { "Authorization": `Bearer ${token}` };

        try {
            // Fetch everything in parallel for speed, or sequentially (as below)
            
            // A. Fetch Current Subscription
            const subRes = await fetch("http://127.0.0.1:8000/billing/current", { headers });
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
            const plansRes = await fetch("http://127.0.0.1:8000/billing/plans", { headers });
            const plansData = await plansRes.json();
            renderPlans(plansData, subData.plan_name);

            // C. Fetch History
            const histRes = await fetch("http://127.0.0.1:8000/billing/history", { headers });
            if (histRes.ok) {
                const histData = await histRes.json();
                renderHistory(histData);
            }

            // --- ANIMATION STEP ---
            // Simulate a tiny delay if data loads instantly (prevents flickering)
            await new Promise(r => setTimeout(r, 600)); 
            revealBilling();

        } catch (err) {
            console.error("Billing Error:", err);
            // Even if error, reveal content (maybe show error state)
            revealBilling(); 
        }
    }

    // New Function to handle the transition
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

        plans.forEach(plan => {
            const isCurrent = plan.name === currentPlanName;
            const features = plan.features ? plan.features.split(",") : ["Standard Support", "Basic Analytics", "Email Support"];
            
            let btnHtml = isCurrent 
                ? `<button disabled class="w-full bg-gray-100 border border-gray-200 rounded-xl py-3 text-sm font-bold text-gray-400 cursor-not-allowed shadow-inner">Current Plan</button>`
                : `<button onclick="initiateUpgrade(${plan.plan_id}, '${plan.name}', ${plan.price})" class="w-full bg-gray-900 border border-transparent rounded-xl py-3 text-sm font-bold text-white hover:bg-gray-800 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">Upgrade to ${plan.name}</button>`;

            const highlightClass = isCurrent ? "ring-2 ring-yellow-500 ring-offset-2" : "hover:border-yellow-400/50";
            const badgeHtml = isCurrent ? `<div class="absolute top-0 right-0 bg-yellow-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl uppercase tracking-widest shadow-sm">Active</div>` : "";

            const html = `
            <div class="relative flex flex-col p-8 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-300 ${highlightClass}">
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

        history.forEach(item => {
            const dateStr = new Date(item.date).toLocaleDateString();
            
            let statusBadge = `<span class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-600">Pending</span>`;
            if(item.status === 'PAID') statusBadge = `<span class="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-bold text-green-700 border border-green-100">Paid</span>`;
            if(item.status === 'FAILED') statusBadge = `<span class="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700 border border-red-100">Failed</span>`;

            const row = `
                <tr class="hover:bg-gray-50 transition border-b border-gray-50 last:border-b-0 animate-entry">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${dateStr}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${item.description}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">₹${item.amount}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${statusBadge}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button class="text-gray-400 hover:text-indigo-600 transition">
                            <i class="fas fa-download"></i>
                        </button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    }

    // =======================
    // 4. RAZORPAY & UTILS (Keep your existing functions here)
    // =======================
    window.initiateUpgrade = async function(planId, planName, planPrice) {
        // ... (Keep existing logic) ...
         const token = localStorage.getItem("token");
        if (!token) return window.location.href = "landing.html";

        const options = {
            "key": "rzp_test_tiQfaO957FrfXO",
            "amount": planPrice * 100, 
            "currency": "INR",
            "name": "ReClaim Admin",
            "description": `Upgrade to ${planName}`,
            "image": "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
            "handler": async function (response) {
                await confirmUpgrade(planId, response.razorpay_payment_id);
            },
            "prefill": { "email": "admin@business.com" },
            "theme": { "color": "#EAB308" }
        };

        try {
            const rzp1 = new Razorpay(options);
            rzp1.on('payment.failed', function (response){
                alert("Payment Failed: " + response.error.description);
            });
            rzp1.open();
        } catch (e) {
            alert("Error launching payment gateway.");
        }
    }

    async function confirmUpgrade(planId, paymentId) {
        // ... (Keep existing logic) ...
        const token = localStorage.getItem("token");
        try {
            const res = await fetch("http://127.0.0.1:8000/billing/upgrade", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ plan_id: planId, payment_id: paymentId })
            });
            const data = await res.json();
            if (res.ok) {
                alert("🎉 Upgrade Successful!");
                location.reload(); 
            } else {
                alert("Server update failed: " + (data.detail || "Error"));
            }
        } catch (err) {
            console.error(err);
            alert("Network error.");
        }
    }

    window.cancelSubscription = function() {
        if(confirm("Are you sure you want to cancel?")) {
            alert("Subscription cancellation request sent.");
        }
    }

})();