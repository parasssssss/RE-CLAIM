/* ================= 1. STYLE & ANIMATION MANAGER ================= */
const addGlobalStyles = () => {
    if (!document.getElementById('reclaim-dynamic-styles')) {
        const style = document.createElement('style');
        style.id = 'reclaim-dynamic-styles';
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
            
            /* Error Shake */
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                20%, 40%, 60%, 80% { transform: translateX(5px); }
            }
            .animate-shake { animation: shake 0.6s ease-in-out; }
        `;
        document.head.appendChild(style);
    }
};

// Initialize Styles immediately
addGlobalStyles();


/* ================= 2. TOAST NOTIFICATION SYSTEM ================= */
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
    show(message, type = 'error') {
        this.init();
        const toast = document.createElement('div');
        const isError = type === 'error';
        
        // Theme Colors
        const borderClass = isError ? 'border-red-500' : 'border-green-500';
        const iconColor = isError ? 'text-red-600 bg-red-100' : 'text-green-600 bg-green-100';
        const title = isError ? 'Action Failed' : 'Success';
        const iconSvg = isError 
            ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>'
            : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>';

        toast.className = `pointer-events-auto toast-enter flex items-start gap-4 p-4 min-w-[320px] max-w-sm bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border-l-4 ${borderClass}`;
        
        toast.innerHTML = `
            <div class="flex-shrink-0"><div class="${iconColor} rounded-full p-2"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">${iconSvg}</svg></div></div>
            <div class="flex-1 pt-0.5">
                <h3 class="font-serif font-bold text-slate-800 text-sm leading-5">${title}</h3>
                <p class="mt-1 text-sm text-slate-500 leading-relaxed">${message}</p>
            </div>
            <button onclick="this.parentElement.remove()" class="flex-shrink-0 ml-4 text-slate-400 hover:text-slate-600"><svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg></button>
        `;

        this.container.appendChild(toast);
        setTimeout(() => {
            toast.classList.remove('toast-enter');
            toast.classList.add('toast-exit');
            toast.addEventListener('animationend', () => toast.remove());
        }, 5000);
    }
};


/* ================= 3. LOADING STATE MANAGER ================= */
const LoadingManager = {
    showLoading(button, loadingText = 'Processing...') {
        if (!button) return;
        button.dataset.originalHTML = button.innerHTML;
        button.innerHTML = `
            <span class="absolute left-0 inset-y-0 flex items-center pl-3">
                <svg class="h-5 w-5 text-gray-300 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </span>
            <span class="flex items-center justify-center">${loadingText}</span>
        `;
        button.disabled = true;
        button.classList.add('opacity-75', 'cursor-not-allowed');
    },
    hideLoading(button) {
        if (!button) return;
        if (button.dataset.originalHTML) button.innerHTML = button.dataset.originalHTML;
        button.disabled = false;
        button.classList.remove('opacity-75', 'cursor-not-allowed');
    }
};


/* ================= 4. PASSWORD STRENGTH METER ================= */
class PasswordStrengthMeter {
    constructor() {
        this.passwordInput = document.getElementById('password');
        this.strengthMeterFill = document.getElementById('strengthMeterFill');
        this.strengthText = document.getElementById('strengthText');
        this.strengthScore = document.getElementById('strengthScore');
        this.passwordIcon = document.getElementById('passwordStrengthIcon');
        this.togglePasswordBtn = document.getElementById('togglePassword');

        this.requirements = { length: false, uppercase: false, lowercase: false, number: false, special: false };
        this.strengthLevels = [
            { text: "Very Weak", color: "#ef4444", score: 0, icon: "😟" },
            { text: "Weak", color: "#f97316", score: 20, icon: "😕" },
            { text: "Fair", color: "#eab308", score: 40, icon: "😐" },
            { text: "Good", color: "#22c55e", score: 60, icon: "🙂" },
            { text: "Strong", color: "#16a34a", score: 80, icon: "😊" },
            { text: "Very Strong", color: "#15803d", score: 100, icon: "😎" }
        ];

        this.init();
    }

    init() {
        if(this.passwordInput) {
            this.passwordInput.addEventListener('input', e => this.checkPasswordStrength(e.target.value));
            this.checkPasswordStrength(''); // Init state
        }
        if(this.togglePasswordBtn) {
            this.togglePasswordBtn.addEventListener('click', () => this.togglePasswordVisibility());
        }
    }

    checkPasswordStrength(password) {
        let score = 0;
        Object.keys(this.requirements).forEach(k => this.requirements[k] = false);

        if (password.length >= 8) {
            this.requirements.length = true;
            score += Math.min(password.length, 20) * 0.5;
        }
        if (/[A-Z]/.test(password)) { this.requirements.uppercase = true; score += 20; }
        if (/[a-z]/.test(password)) { this.requirements.lowercase = true; score += 20; }
        if (/[0-9]/.test(password)) { this.requirements.number = true; score += 20; }
        if (/[^A-Za-z0-9]/.test(password)) { this.requirements.special = true; score += 20; }

        if (this.requirements.uppercase && this.requirements.lowercase) score += 10;
        if (this.requirements.number && this.requirements.special) score += 10;

        score = Math.min(score, 100);
        const level = this.strengthLevels[Math.min(Math.floor(score / 20), 5)];

        this.updateStrengthDisplay(score, level);
        this.updateRequirementsDisplay();
    }

    updateStrengthDisplay(score, level) {
        if(!this.strengthMeterFill) return;
        this.strengthMeterFill.style.width = `${score}%`;
        this.strengthMeterFill.style.backgroundColor = level.color;
        this.strengthText.textContent = level.text;
        this.strengthText.style.color = level.color;
        this.strengthScore.textContent = `${Math.round(score)}/100`;
        this.strengthScore.style.color = level.color;
        this.passwordIcon.textContent = level.icon;
    }

    updateRequirementsDisplay() {
        const reqIds = ['req-length', 'req-upper', 'req-lower', 'req-number', 'req-special'];
        const reqKeys = ['length', 'uppercase', 'lowercase', 'number', 'special'];
        
        reqIds.forEach((id, i) => {
            const element = document.getElementById(id);
            if (element) {
                const isValid = this.requirements[reqKeys[i]];
                element.className = `requirement-check ${isValid ? 'valid' : 'invalid'}`;
                const svg = element.querySelector('svg');
                if (svg) {
                    svg.innerHTML = isValid 
                        ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />' 
                        : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />';
                }
            }
        });

        const passedCount = Object.values(this.requirements).filter(v => v).length;
        const badgeText = document.getElementById('requirementBadgeText');
        if (badgeText) badgeText.textContent = `${passedCount}/5 requirements`;
    }

    togglePasswordVisibility() {
        const type = this.passwordInput.type === 'password' ? 'text' : 'password';
        this.passwordInput.type = type;
        this.togglePasswordBtn.textContent = type === 'password' ? '👁 Show' : '🙈 Hide';
    }

    isPasswordStrongEnough(min = 60) {
        return parseInt(this.strengthMeterFill.style.width) >= min;
    }
}


/* ================= 5. ENHANCED REGISTRATION LOGIC ================= */
class EnhancedRegistration {
    constructor() {
        this.passwordMeter = new PasswordStrengthMeter();
        
        this.registerBtn = document.getElementById('registerBtn');
        this.businessCodeInput = document.getElementById('businessCode');
        this.firstNameInput = document.getElementById('firstName');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');

        this.init();
    }

    init() {
        if(this.registerBtn) {
            this.registerBtn.addEventListener('click', e => this.handleRegistration(e));
        }
    }

    // Helper: Shake input and show Toast error
    triggerError(input, message) {
        if(input) {
            input.classList.add('border-red-500', 'animate-shake');
            // Remove shake animation class after it plays so it can be triggered again
            setTimeout(() => input.classList.remove('animate-shake', 'border-red-500'), 2000);
        }
        ToastManager.show(message, 'error');
    }

    validateForm() {
        // 1. Business Code
        if (!this.businessCodeInput.value.trim()) {
            this.triggerError(this.businessCodeInput, "Business Code is required.");
            this.businessCodeInput.focus();
            return false;
        }

        // 2. First Name
        if (!this.firstNameInput.value.trim()) {
            this.triggerError(this.firstNameInput, "First Name is required.");
            this.firstNameInput.focus();
            return false;
        }

        // 3. Email Regex
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.emailInput.value)) {
            this.triggerError(this.emailInput, "Please enter a valid email address.");
            this.emailInput.focus();
            return false;
        }

        // 4. Password Strength (Minimum 60%)
        if (!this.passwordMeter.isPasswordStrongEnough(60)) {
            this.triggerError(this.passwordInput, "Password is too weak. Please improve it.");
            this.passwordInput.focus();
            return false;
        }

        return true;
    }

    async handleRegistration(e) {
        e.preventDefault();
        
        // 1. Validate
        if (!this.validateForm()) return;

        // 2. Loading State
        LoadingManager.showLoading(this.registerBtn, 'Creating Account...');
        
        // Disable Inputs
        const inputs = [this.businessCodeInput, this.firstNameInput, this.emailInput, this.passwordInput];
        inputs.forEach(i => i.disabled = true);

        const payload = {
            business_code: this.businessCodeInput.value.trim(),
            first_name: this.firstNameInput.value.trim(),
            email: this.emailInput.value.trim(),
            password: this.passwordInput.value
        };

        try {
            // Setup Timeout (30s)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            const API_BASE =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:8000"
    : "https://reclaim-backend-nqd4.onrender.com";

            const res = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const data = await res.json();

            if (res.ok) {
                // --- SUCCESS ---
                ToastManager.show('Registration successful! Redirecting...', 'success');
                
                // Keep loading spinner but change text
                this.registerBtn.innerHTML = `
                    <span class="flex items-center justify-center text-green-100">
                        <svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                        Redirecting...
                    </span>
                `;
                this.registerBtn.classList.add('bg-green-600');
                
                setTimeout(() => location.href = 'login.html', 1500);

            } else {
                throw new Error(data.detail || 'Registration failed.');
            }

        } catch (err) {
            // --- ERROR ---
            console.error(err);
            
            let msg = err.message;
            if (err.name === 'AbortError') msg = "Request timed out.";
            else if (err.name === 'TypeError') msg = "Network error. Check connection.";

            ToastManager.show(msg, 'error');
            
            // Reset Button
            LoadingManager.hideLoading(this.registerBtn);
            
            // Re-enable Inputs
            inputs.forEach(i => i.disabled = false);
        }
    }
}

/* ================= INIT ================= */
document.addEventListener('DOMContentLoaded', () => {
    new EnhancedRegistration();
});