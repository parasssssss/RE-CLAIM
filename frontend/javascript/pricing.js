// Global variable to store selected plan
let selectedPlanData = null;

document.addEventListener("DOMContentLoaded", async () => {
    const container = document.getElementById("plansContainer");
    if(!container) return;

    try {
        // 1. Fetch Real Data
        const res = await fetch("http://127.0.0.1:8000/billing/plans");
        const plans = await res.json();

        container.innerHTML = ""; // Clear loader

        // 2. Render Premium Cards
        plans.forEach(plan => {
            // Logic to highlight the "Gold" or most expensive plan
            // You can adjust this logic (e.g., check plan.name or price)
            const isPremium = plan.price > 0 && plan.price < 5000; // Example logic
            
            // Premium Styles
            const cardClasses = isPremium 
                ? "bg-gray-900/80 border-yellow-500/50 shadow-[0_0_50px_-12px_rgba(234,179,8,0.3)] scale-105 z-10" 
                : "bg-gray-900/40 border-gray-800 hover:border-gray-700";
            
            const btnClasses = isPremium
                ? "bg-gradient-to-r from-yellow-500 to-amber-600 text-black shadow-lg shadow-yellow-500/20 hover:scale-[1.02]"
                : "bg-white/5 border border-white/10 text-white hover:bg-white/10";

            const badge = isPremium 
                ? `<div class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-yellow-500 text-black text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">Most Popular</div>` 
                : "";

            // Format Features
            const featuresList = plan.features ? plan.features.split(',').map(f => 
                `<li class="flex items-center gap-3 text-sm text-gray-300">
                    <i class="fas fa-check-circle ${isPremium ? 'text-yellow-500' : 'text-gray-600'}"></i>
                    ${f.trim()}
                </li>`
            ).join('') : '';

            // Generate HTML
            const card = `
                <div class="relative flex flex-col p-8 backdrop-blur-xl rounded-3xl border transition-all duration-300 group ${cardClasses}">
                    ${badge}
                    
                    <div class="mb-6">
                        <h3 class="text-lg font-medium ${isPremium ? 'text-yellow-400' : 'text-gray-400'}">${plan.name}</h3>
                        <div class="flex items-baseline gap-1 mt-2">
                            <span class="text-4xl font-bold text-white font-serif">₹${plan.price}</span>
                            <span class="text-sm text-gray-500">/${plan.duration_days} days</span>
                        </div>
                        <p class="text-sm text-gray-500 mt-2">${plan.description || 'Perfect for growing businesses.'}</p>
                    </div>

                    <ul class="space-y-4 mb-8 flex-1">
                        ${featuresList}
                    </ul>

                    <button onclick="selectPlan(${plan.plan_id}, '${plan.name}', ${plan.price})" 
                        class="w-full py-4 rounded-xl font-bold text-sm transition-all duration-300 ${btnClasses}">
                        Get Started
                    </button>
                </div>
            `;
            container.innerHTML += card;
        });

    } catch (err) {
        console.error("Error loading plans", err);
        container.innerHTML = `<div class="col-span-3 text-center py-10">
            <p class="text-red-400 mb-4">Unable to load pricing plans.</p>
            <button onclick="location.reload()" class="text-white underline">Retry</button>
        </div>`;
    }
});

// 3. Handle Selection
window.selectPlan = (id, name, price) => {
    selectedPlanData = { id, name, price };
    
    // Trigger the Modal Open Function (from the previous Onboarding code)
    if(typeof openModal === "function") {
        openModal();
    } else {
        // Fallback if openModal isn't global
        const modal = document.getElementById("onboardingModal");
        const backdrop = document.getElementById("modalBackdrop");
        const content = document.getElementById("modalContent");
        
        if(modal) {
            modal.classList.remove("hidden");
            setTimeout(() => {
                if(backdrop) backdrop.classList.remove("opacity-0");
                if(content) {
                    content.classList.remove("opacity-0", "scale-95");
                    content.classList.add("scale-100");
                }
            }, 10);
        }
    }

    // Update the Checkout Button Text in the modal to match the price
    const checkoutBtn = document.getElementById("checkoutBtn");
    if(checkoutBtn) {
        checkoutBtn.innerHTML = `
            <span>Complete Setup</span>
            <div class="w-px h-4 bg-gray-700"></div>
            <span class="text-indigo-400">₹${price}</span>
        `;
    }
};