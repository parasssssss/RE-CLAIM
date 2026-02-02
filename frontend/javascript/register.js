/* ================= PASSWORD STRENGTH METER ================= */
class PasswordStrengthMeter {
    constructor() {
        this.passwordInput = document.getElementById('password');
        this.strengthMeterFill = document.getElementById('strengthMeterFill');
        this.strengthText = document.getElementById('strengthText');
        this.strengthScore = document.getElementById('strengthScore');
        this.passwordIcon = document.getElementById('passwordStrengthIcon');
        this.togglePasswordBtn = document.getElementById('togglePassword');

        this.requirements = {
            length: false,
            uppercase: false,
            lowercase: false,
            number: false,
            special: false
        };

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
        this.passwordInput.addEventListener('input', e =>
            this.checkPasswordStrength(e.target.value)
        );

        this.togglePasswordBtn.addEventListener('click', () =>
            this.togglePasswordVisibility()
        );

        this.checkPasswordStrength('');
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

        const levelIndex = Math.floor(score / 20);
        const level = this.strengthLevels[Math.min(levelIndex, 5)];

        this.updateStrengthDisplay(score, level);
        this.updateRequirementsDisplay();
    }

    updateStrengthDisplay(score, level) {
        this.strengthMeterFill.style.width = `${score}%`;
        this.strengthMeterFill.style.backgroundColor = level.color;
        this.strengthText.textContent = level.text;
        this.strengthText.style.color = level.color;
        this.strengthScore.textContent = `${score}/100`;
        this.strengthScore.style.color = level.color;
        this.passwordIcon.textContent = level.icon;
    }

    updateRequirementsDisplay() {
        // Update individual requirement items
        const reqIds = ['req-length', 'req-upper', 'req-lower', 'req-number', 'req-special'];
        const reqKeys = ['length', 'uppercase', 'lowercase', 'number', 'special'];
        
        reqIds.forEach((id, i) => {
            const element = document.getElementById(id);
            if (element) {
                const isValid = this.requirements[reqKeys[i]];
                element.className = `requirement-check ${isValid ? 'valid' : 'invalid'}`;
                
                // Update SVG icon
                const svg = element.querySelector('svg');
                if (svg) {
                    if (isValid) {
                        svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />';
                    } else {
                        svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />';
                    }
                }
            }
        });

        // Update badge count
        const passedCount = Object.values(this.requirements).filter(v => v).length;
        const badgeText = document.getElementById('requirementBadgeText');
        if (badgeText) {
            badgeText.textContent = `${passedCount}/5 requirements`;
        }
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

/* ================= REGISTRATION ================= */
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
        this.registerBtn.addEventListener('click', e => this.handleRegistration(e));
    }

    validateForm() {
        let valid = true;

        if (!this.businessCodeInput.value.trim()) {
            this.showError(this.businessCodeInput);
            valid = false;
        }

        if (!this.firstNameInput.value.trim()) {
            this.showError(this.firstNameInput);
            valid = false;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.emailInput.value)) {
            this.showError(this.emailInput);
            valid = false;
        }

        if (!this.passwordMeter.isPasswordStrongEnough(60)) {
            this.showError(this.passwordInput);
            this.showNotification('Password is weak (minimum strength: 60)', 'error');
            valid = false;
        }
        

        return valid;
    }

    showError(input) {
        input.classList.add('border-red-500');
        setTimeout(() => input.classList.remove('border-red-500'), 1500);
    }

    async handleRegistration(e) {
        e.preventDefault();
        if (!this.validateForm()) {
            this.showNotification('Fix form errors', 'error');
            return;
        }

        const original = this.registerBtn.innerHTML;
        this.registerBtn.innerHTML = 'Creating Account...';
        this.registerBtn.disabled = true;

        const payload = {
            business_code: this.businessCodeInput.value.trim(),
            first_name: this.firstNameInput.value.trim(),
            email: this.emailInput.value.trim(),
            password: this.passwordInput.value
        };

        try {
            const res = await fetch('http://127.0.0.1:8000/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok) {
                this.showNotification('Registration successful!', 'success');
                setTimeout(() => location.href = 'login.html', 1500);
            } else {
                throw new Error(data.detail || 'Registration failed');
            }
        } catch (err) {
            this.showNotification(err.message, 'error');
            this.registerBtn.innerHTML = original;
            this.registerBtn.disabled = false;
        }
    }

    showNotification(msg, type) {
        const n = document.createElement('div');
        n.className = `fixed top-4 right-4 px-4 py-2 rounded text-white ${
            type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`;
        n.textContent = msg;
        document.body.appendChild(n);
        setTimeout(() => n.remove(), 4000);
    }
}

/* ================= INIT ================= */
document.addEventListener('DOMContentLoaded', () => {
    new EnhancedRegistration();
});
