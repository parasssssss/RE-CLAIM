/* ================= TOAST NOTIFICATION SYSTEM ================= */
const ToastManager = {
    container: null,

    // Initialize the container element
    init() {
        if (!document.getElementById('toast-container')) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            // Fixed position top-right, high z-index
            this.container.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none';
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('toast-container');
        }
    },

    // Show a notification
    show(message, type = 'error') {
        this.init(); // Ensure container exists

        // Create the toast element
        const toast = document.createElement('div');
        
        // Premium styling based on type
        const styles = type === 'error' 
            ? 'border-red-500 bg-white' 
            : 'border-green-500 bg-white';
            
        const icon = type === 'error'
            ? `<div class="bg-red-100 rounded-full p-2 text-red-600"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg></div>`
            : `<div class="bg-green-100 rounded-full p-2 text-green-600"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg></div>`;

        const title = type === 'error' ? 'Action Failed' : 'Success';

        // Set classes (matches your ReClaim theme: serif fonts, slate text, shadows)
        toast.className = `
            pointer-events-auto toast-enter 
            flex items-start gap-4 p-4 min-w-[320px] max-w-sm
            bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)]
            border-l-4 ${styles}
        `;

        // Inner HTML
        toast.innerHTML = `
            <div class="flex-shrink-0">
                ${icon}
            </div>
            <div class="flex-1 pt-0.5">
                <h3 class="font-serif font-bold text-slate-800 text-sm leading-5">${title}</h3>
                <p class="mt-1 text-sm text-slate-500 leading-relaxed">${message}</p>
            </div>
            <button onclick="this.parentElement.remove()" class="flex-shrink-0 ml-4 text-slate-400 hover:text-slate-600 transition-colors">
                <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                </svg>
            </button>
        `;

        // Append to container
        this.container.appendChild(toast);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            toast.classList.remove('toast-enter');
            toast.classList.add('toast-exit');
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }, 5000);
    }
};



// Create reusable loading state manager
const LoadingManager = {
    // Show loading state on button
    showLoading(button, loadingText = 'Signing In...') {
        // Store original content
        button.dataset.originalHTML = button.innerHTML;
        button.dataset.originalText = button.querySelector('.btn-text')?.textContent || 'Sign In';
        
        // Update button content with loading animation
        button.innerHTML = `
            <span class="absolute left-0 inset-y-0 flex items-center pl-3">
                <svg class="h-5 w-5 text-gray-300 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
            </span>
            <span class="flex items-center justify-center">
                <span class="btn-text">${loadingText}</span>
                <svg class="animate-spin ml-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </span>
        `;
        
        // Disable button
        button.disabled = true;
        button.classList.add('opacity-75', 'cursor-not-allowed');
    },
    
    // Hide loading state
    hideLoading(button) {
        // Restore original content
        if (button.dataset.originalHTML) {
            button.innerHTML = button.dataset.originalHTML;
        }
        
        // Re-enable button
        button.disabled = false;
        button.classList.remove('opacity-75', 'cursor-not-allowed');
    },
    
    // Show error state
    showError(button, errorMessage = 'Failed') {
        // Store original content if not already stored
        if (!button.dataset.originalHTML) {
            button.dataset.originalHTML = button.innerHTML;
        }
        
        // Update button to show error state
        button.innerHTML = `
            <span class="absolute left-0 inset-y-0 flex items-center pl-3">
                <svg class="h-5 w-5 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </span>
            <span class="flex items-center justify-center text-red-100">
                ${errorMessage}
            </span>
        `;
        
        button.disabled = true;
        button.classList.add('bg-red-600', 'hover:bg-red-700', 'cursor-not-allowed');
        
        // Auto-reset after 3 seconds
        setTimeout(() => {
            this.hideLoading(button);
            button.classList.remove('bg-red-600', 'hover:bg-red-700');
        }, 3000);
    }
};

// Add CSS for animations (add this to your style section)
const addLoadingStyles = () => {
    if (!document.getElementById('loading-styles')) {
        const style = document.createElement('style');
        style.id = 'loading-styles';
        style.textContent = `
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            .animate-spin {
                animation: spin 1s linear infinite;
            }
            .animate-pulse {
                animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            }
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                20%, 40%, 60%, 80% { transform: translateX(5px); }
            }
            .animate-shake {
                animation: shake 0.6s ease-in-out;
            }
        `;
        document.head.appendChild(style);
    }
};

// Initialize styles
addLoadingStyles();

/* ================= REMEMBER ME FUNCTIONALITY ================= */
const RememberMeManager = {
    // Key for storing remember me data
    storageKey: 'reclaim_remember_me',
    
    // Save credentials if remember me is checked
    saveCredentials(email, remember) {
        if (remember) {
            // Store in localStorage with a simple encoding (not production-secure, for demo)
            const data = btoa(JSON.stringify({ email, timestamp: Date.now() }));
            localStorage.setItem(this.storageKey, data);
            console.log('Credentials saved');
        } else {
            this.clearCredentials();
        }
    },
    
    // Load saved credentials on page load
    loadCredentials() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(atob(stored));
                return data.email;
            }
        } catch (err) {
            console.error('Error loading credentials:', err);
            this.clearCredentials();
        }
        return null;
    },
    
    // Clear stored credentials
    clearCredentials() {
        localStorage.removeItem(this.storageKey);
        console.log('Credentials cleared');
    },
    
    // Check if remember me was previously set
    isRemembered() {
        return localStorage.getItem(this.storageKey) !== null;
    }
};

// Auto-fill form function
const autoFillRememberedEmail = () => {
    const emailInput = document.getElementById('loginEmail');
    const rememberCheckbox = document.getElementById('rememberMe');
    
    if (emailInput && rememberCheckbox) {
        const savedEmail = RememberMeManager.loadCredentials();
        if (savedEmail) {
            emailInput.value = savedEmail;
            rememberCheckbox.checked = true;
            console.log('Email auto-filled from saved credentials');
            // Focus on password field for better UX
            setTimeout(() => {
                const passwordInput = document.getElementById('loginPassword');
                if (passwordInput) {
                    passwordInput.focus();
                }
            }, 100);
        }
    }
};

// Load credentials immediately when script runs (not just on DOMContentLoaded)
autoFillRememberedEmail();

// Also reload if page becomes visible (tab switch)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        autoFillRememberedEmail();
    }
});

// Auto-fill form on page load if credentials were saved
document.addEventListener('DOMContentLoaded', () => {
    autoFillRememberedEmail();
});

// Enhanced login handler with loading animation
// Enhanced login handler with Toast Notifications
document.getElementById("loginBtn").addEventListener("click", async (e) => {
    e.preventDefault();
    
    const loginBtn = document.getElementById("loginBtn");
    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");
    const rememberCheckbox = document.getElementById("rememberMe");
    
    // 1. Validation Checks
    if (!emailInput.value.trim() || !passwordInput.value.trim()) {
        if (!emailInput.value.trim()) {
            emailInput.classList.add('border-red-500', 'animate-shake');
            // Trigger Toast for empty email
            ToastManager.show("Please enter your email address."); 
            setTimeout(() => emailInput.classList.remove('animate-shake'), 600);
        }
        else if (!passwordInput.value.trim()) {
            passwordInput.classList.add('border-red-500', 'animate-shake');
            ToastManager.show("Please enter your password.");
            setTimeout(() => passwordInput.classList.remove('animate-shake'), 600);
        }
        return;
    }
    
    // Reset styles
    emailInput.classList.remove('border-red-500');
    passwordInput.classList.remove('border-red-500');
    
    // Start Loading
    LoadingManager.showLoading(loginBtn);
    emailInput.disabled = true;
    passwordInput.disabled = true;
    
    const data = {
        email: emailInput.value.trim(),
        password: passwordInput.value
    };

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        const API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:8000"
    : "https://reclaim-backend-nqd4.onrender.com";
        
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(data),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        const result = await res.json();

        if (res.ok) {
            // --- SUCCESS LOGIC ---
            if (rememberCheckbox.checked) {
                RememberMeManager.saveCredentials(emailInput.value.trim(), true);
            } else {
                RememberMeManager.clearCredentials();
            }
            
            // Show Success Toast
            ToastManager.show("Login successful! Redirecting...", "success");

            // Success Button State
            loginBtn.innerHTML = `
                <span class="flex items-center justify-center text-green-100">
                   <svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                   Redirecting...
                </span>
            `;
            loginBtn.classList.add('bg-green-600');
            
            // Token Handling
            localStorage.setItem("token", result.access_token);
            const roleId = parseInt(result.role_id, 10);
            localStorage.setItem("role_id", roleId);
            if (result.user_id) localStorage.setItem("user_id", result.user_id);

            // Redirect
            setTimeout(() => {
                if (roleId === 1) window.location.href = "dashboard_super.html";
                else if (roleId === 2) window.location.href = "dashboard_admin.html";
                else if (roleId === 3) window.location.href = "dashboard_staff.html";
                else window.location.href = "dashboard_normie.html";
            }, 800);
            
        } else {
            // --- SERVER ERROR LOGIC ---
            const errorMessage = result.message || result.error || "Invalid credentials.";
            
            // 1. Show the Toast Card
            ToastManager.show(errorMessage, 'error');
            
            // 2. Reset the button (Stop loading spinner)
            LoadingManager.hideLoading(loginBtn);
            
            // 3. Re-enable inputs
            emailInput.disabled = false;
            passwordInput.disabled = false;
            
            // 4. Highlight inputs red
            emailInput.classList.add('border-red-500');
            passwordInput.classList.add('border-red-500');
            setTimeout(() => {
                 emailInput.classList.remove('border-red-500');
                 passwordInput.classList.remove('border-red-500');
            }, 2000);
        }

    } catch (err) {
        // --- NETWORK ERROR LOGIC ---
        console.error("Error:", err);
        
        let errorMessage = "Something went wrong!";
        if (err.name === 'AbortError') errorMessage = "Request timeout. Server took too long.";
        else if (err.name === 'TypeError') errorMessage = "Unable to connect to server.";
        
        // Show Toast
        ToastManager.show(errorMessage, 'error');
        
        // Reset Interface
        LoadingManager.hideLoading(loginBtn);
        emailInput.disabled = false;
        passwordInput.disabled = false;
    }
});

// Optional: Add Enter key support for login
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && 
        (document.activeElement === document.getElementById('loginEmail') || 
         document.activeElement === document.getElementById('loginPassword'))) {
        document.getElementById('loginBtn').click();
    }
});


/* ================= PASSWORD SHOW / HIDE ================= */
const initPasswordToggle = () => {
    const passwordInput = document.getElementById('loginPassword');
    const toggleBtn = document.getElementById('toggleLoginPassword');

    if (!passwordInput || !toggleBtn) return;

    toggleBtn.addEventListener('click', () => {
        const isHidden = passwordInput.type === 'password';
        passwordInput.type = isHidden ? 'text' : 'password';
        toggleBtn.textContent = isHidden ? '🙈 Hide' : '👁 Show';
    });
};

// Init after DOM loads
document.addEventListener('DOMContentLoaded', initPasswordToggle);
