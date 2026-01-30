// Global variable to store selected plan
let selectedPlanData = null;

document.addEventListener("DOMContentLoaded", async () => {
    const container = document.getElementById("plansContainer");
    if(!container) return;

    try {
        const res = await fetch("http://127.0.0.1:8000/billing/plans");
        const plans = await res.json();

        container.innerHTML = ""; // Clear loader

        plans.forEach(plan => {
            // Split features string into array
            const featuresList = plan.features ? plan.features.split(',').map(f => 
                `<li class="flex items-center text-gray-300 mb-3">
                    <i class="fas fa-check text-amber-500 mr-3"></i> ${f.trim()}
                </li>`
            ).join('') : '';

            const card = `
                <div class="relative group bg-gray-800/50 border border-gray-700 hover:border-amber-500/50 rounded-2xl p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-900/20 hover:-translate-y-2">
                    <h3 class="text-xl font-semibold text-white mb-2">${plan.name}</h3>
                    <div class="flex items-baseline mb-6">
                        <span class="text-4xl font-bold text-amber-500">₹${plan.price}</span>
                        <span class="text-gray-400 ml-2">/${plan.duration_days} days</span>
                    </div>
                    <p class="text-gray-400 text-sm mb-6">${plan.description || ''}</p>
                    
                    <ul class="mb-8 min-h-[150px]">
                        ${featuresList}
                    </ul>

                    <button onclick="selectPlan(${plan.plan_id}, '${plan.name}', ${plan.price})" 
                        class="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 text-white font-semibold hover:from-amber-500 hover:to-amber-600 transition shadow-lg shadow-amber-900/30">
                        Get Started
                    </button>
                </div>
            `;
            container.innerHTML += card;
        });

    } catch (err) {
        console.error("Error loading plans", err);
        container.innerHTML = "<p class='text-red-500 text-center'>Failed to load pricing.</p>";
    }
});

// Function called when user clicks a button
window.selectPlan = (id, name, price) => {
    selectedPlanData = { id, name, price };
    
    // Open the existing onboarding modal
    const modal = document.getElementById("onboardingModal");
    if(modal) {
        modal.classList.remove("hidden");
        // Update modal title to show selection
        const title = document.querySelector("#onboardingModal h2");
        if(title) title.innerHTML = `Setup your <span class="text-amber-600">${name}</span> Account`;
    }
};