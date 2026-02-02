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
document.getElementById("loginBtn").addEventListener("click", async (e) => {
    e.preventDefault();
    
    const loginBtn = document.getElementById("loginBtn");
    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");
    const rememberCheckbox = document.getElementById("rememberMe");
    
    // Validate inputs
    if (!emailInput.value.trim() || !passwordInput.value.trim()) {
        // Quick validation feedback
        if (!emailInput.value.trim()) {
            emailInput.classList.add('border-red-500', 'animate-shake');
            setTimeout(() => emailInput.classList.remove('animate-shake'), 600);
        }
        if (!passwordInput.value.trim()) {
            passwordInput.classList.add('border-red-500', 'animate-shake');
            setTimeout(() => passwordInput.classList.remove('animate-shake'), 600);
        }
        return;
    }
    
    // Clear any previous error states
    emailInput.classList.remove('border-red-500');
    passwordInput.classList.remove('border-red-500');
    
    // Show loading animation
    LoadingManager.showLoading(loginBtn);
    
    // Also add loading state to inputs
    emailInput.disabled = true;
    passwordInput.disabled = true;
    
    const data = {
        email: emailInput.value.trim(),
        password: passwordInput.value
    };

    try {
        // Add timeout for slow network (optional)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const res = await fetch("http://127.0.0.1:8000/auth/login", {
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
            // Save credentials if remember me is checked
            if (rememberCheckbox.checked) {
                RememberMeManager.saveCredentials(emailInput.value.trim(), true);
            } else {
                RememberMeManager.clearCredentials();
            }
            
            // Success - show brief success animation
            loginBtn.innerHTML = `
                <span class="absolute left-0 inset-y-0 flex items-center pl-3">
                    <svg class="h-5 w-5 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                </span>
                <span class="flex items-center justify-center text-green-100">
                    <span class="mr-2">Rediecting....</span>
                </span>
            `;
            loginBtn.classList.add('bg-green-600', 'hover:bg-green-700');
            
            const token = result.access_token;
            console.log("JWT Token:", token);
            localStorage.setItem("token", token);

            // Ensure roleId is integer
            const roleId = parseInt(result.role_id, 10);
            localStorage.setItem("role_id", roleId);
            
            // Store user info if available
            if (result.user_id) {
                localStorage.setItem("user_id", result.user_id);
            }
            
            // Optional: Show success message
            // alert("Login successful! User ID: " + result.user_id);

            // Wait briefly for user to see success state, then redirect
            setTimeout(() => {
                // Redirect based on role
                if (roleId === 2) {
                    window.location.href = "dashboard_admin.html";
                } else if (roleId === 3) {
                    window.location.href = "dashboard_staff.html";
                } else {
                    window.location.href = "dashboard_normie.html";
                }
            }, 800);
            
        } else {
            // Server returned an error
            const errorMessage = result.message || result.error || "Login failed";
            console.error("Login error:", errorMessage);
            
            // Show error state on button
            LoadingManager.showError(loginBtn, errorMessage);
            
            // Re-enable inputs
            emailInput.disabled = false;
            passwordInput.disabled = false;
            
            // Optional: Highlight problematic input
            if (errorMessage.toLowerCase().includes('email')) {
                emailInput.classList.add('border-red-500', 'animate-shake');
                setTimeout(() => emailInput.classList.remove('animate-shake'), 600);
            } else if (errorMessage.toLowerCase().includes('password')) {
                passwordInput.classList.add('border-red-500', 'animate-shake');
                setTimeout(() => passwordInput.classList.remove('animate-shake'), 600);
            }
        }

    } catch (err) {
        console.error("Network or other error:", err);
        
        // Show appropriate error message
        let errorMessage = "Something went wrong!";
        if (err.name === 'AbortError') {
            errorMessage = "Request timeout. Please try again.";
        } else if (err.name === 'TypeError') {
            errorMessage = "Network error. Please check your connection.";
        }
        
        // Show error state
        LoadingManager.showError(loginBtn, errorMessage);
        
        // Re-enable inputs
        emailInput.disabled = false;
        passwordInput.disabled = false;
        
        // Re-enable button after error
        setTimeout(() => {
            LoadingManager.hideLoading(loginBtn);
            loginBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
        }, 3000);
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
