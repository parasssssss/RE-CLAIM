// profile-dropdown.js - Ultra-Premium "Cinematic Noir" Edition
export class ProfileDropdown {
    constructor() {
        // --- 1. THE CINEMATIC UI STRUCTURE ---
        this.dropdownHTML = `
            <div class="profile-dropdown-container relative z-50">
                
                <button class="flex items-center gap-3 group focus:outline-none" id="profileToggle">
                    <div class="relative">
                        <div class="absolute -inset-1 bg-gradient-to-r from-yellow-600 to-yellow-300 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-500 animate-tilt"></div>
                        
                        <div class="relative w-11 h-11 rounded-full p-[2px] bg-gradient-to-br from-slate-800 to-slate-900 ring-1 ring-slate-700 group-hover:ring-yellow-500/50 transition-all duration-300">
                            <div class="w-full h-full rounded-full bg-slate-950 flex items-center justify-center overflow-hidden">
                                <img id="dashboard-profile-img" class="hidden w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Profile" />
                                <span id="user-initial" class="text-white font-serif font-bold text-sm">U</span>
                            </div>
                        </div>
                        
                        <div class="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-[3px] border-slate-900 rounded-full z-10"></div>
                    </div>

                    <div class="hidden md:block text-left transition-all duration-300 group-hover:translate-x-1">
                        <span id="username" class="text-sm font-bold text-slate-800 block leading-tight tracking-tight">
                            Loading...
                        </span>
                        <span id="user-role" class="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-yellow-600 transition-colors">
                            ...
                        </span>
                    </div>
                    
                    <i class="fas fa-chevron-down ml-1 text-[10px] text-slate-400 group-hover:text-slate-800 transition-transform duration-300 group-[.active]:rotate-180 hidden md:block"></i>
                </button>
                
                <div class="profile-dropdown" id="profileDropdown">
                    
                    <div class="profile-header">
                        <div class="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                        <div class="absolute -top-10 -right-10 w-40 h-40 bg-yellow-500/20 rounded-full blur-[50px]"></div>
                        
                        <div class="relative z-10 flex items-center gap-4">
                            <div class="w-14 h-14 rounded-full border-2 border-white/10 shadow-2xl overflow-hidden bg-slate-900 flex items-center justify-center">
                                <img id="dropdown-profile-img" class="hidden w-full h-full object-cover" alt="Profile" />
                                <span id="dropdown-initial" class="text-2xl text-white font-serif font-bold"></span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <h3 id="dropdown-username" class="font-bold text-white text-lg truncate tracking-tight">Loading...</h3>
                                <p id="dropdown-email" class="text-xs text-slate-400 font-mono mb-2 truncate">...</p>
                                <span id="dropdown-role" class="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500 text-black uppercase tracking-wider shadow-[0_0_15px_rgba(234,179,8,0.4)]">
                                    Member
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="p-2 space-y-1 bg-white/90 backdrop-blur-xl border-t border-white/50">
                        
                        <div class="menu-label">My Account</div>

                        <a href="admin_settings.html" class="menu-item group" style="--delay: 1;">
                            <div class="icon-box group-hover:bg-slate-900 group-hover:text-yellow-400">
                                <i class="fas fa-user-astronaut"></i>
                            </div>
                            <div class="flex-1">
                                <span class="block font-bold text-slate-800 text-sm group-hover:translate-x-1 transition-transform">Profile Settings</span>
                                <span class="text-[10px] text-slate-400">Manage personal details</span>
                            </div>
                            <i class="fas fa-arrow-right text-xs opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-slate-300"></i>
                        </a>
                        
                        <a href="notifications.html" class="menu-item group" style="--delay: 2;">
                            <div class="icon-box group-hover:bg-slate-900 group-hover:text-yellow-400">
                                <i class="fas fa-bell"></i>
                            </div>
                            <div class="flex-1">
                                <div class="flex justify-between items-center">
                                    <span class="block font-bold text-slate-800 text-sm group-hover:translate-x-1 transition-transform">Notifications</span>
                                    <span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                </div>
                                <span class="text-[10px] text-slate-400">View recent alerts</span>
                            </div>
                        </a>

                        <div class="h-px bg-slate-100 my-2 mx-3"></div>
                        <div class="menu-label">System</div>
                        
                        <a href="support.html" class="menu-item group" style="--delay: 3;">
                            <div class="icon-box group-hover:bg-slate-900 group-hover:text-yellow-400">
                                <i class="fas fa-headset"></i>
                            </div>
                            <span class="font-bold text-slate-700 text-sm group-hover:translate-x-1 transition-transform">Help Center</span>
                        </a>

                        <div class="h-px bg-slate-100 my-2 mx-3"></div>
                        
                        <button id="logoutButton" class="menu-item group logout-item" style="--delay: 4;">
                            <div class="icon-box bg-red-50 text-red-500 group-hover:bg-red-500 group-hover:text-white">
                                <i class="fas fa-power-off"></i>
                            </div>
                            <span class="font-bold text-red-600 text-sm group-hover:translate-x-1 transition-transform">Log Out</span>
                        </button>
                    </div>
                    
                    <div class="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400 font-mono">
                        <span>RECLAIM OS <span class="text-slate-300">v2.5</span></span>
                        <div class="flex items-center gap-1">
                            <span class="w-1 h-1 rounded-full bg-emerald-500"></span>
                            SECURE
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // --- 2. THE CSS STYLES ---
        this.styles = `
            <style>
                .profile-dropdown {
                    position: absolute;
                    right: 0;
                    top: 140%; 
                    width: 320px;
                    background: #fff;
                    border: 1px solid rgba(255, 255, 255, 0.8);
                    border-radius: 24px;
                    box-shadow: 
                        0 25px 50px -12px rgba(0, 0, 0, 0.25),
                        0 0 0 1px rgba(0, 0, 0, 0.02);
                    opacity: 0;
                    visibility: hidden;
                    transform: translateY(-15px) scale(0.95);
                    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    z-index: 1000;
                    overflow: hidden;
                    transform-origin: top right;
                }
                
                .profile-dropdown.active {
                    opacity: 1;
                    visibility: visible;
                    transform: translateY(0) scale(1);
                    top: 130%;
                }
                
                .profile-header {
                    background: radial-gradient(circle at 100% 0%, #1e293b 0%, #020617 100%);
                    padding: 24px;
                    position: relative;
                    overflow: hidden;
                }
                
                .menu-label {
                    font-size: 10px;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    color: #94a3b8;
                    padding: 8px 20px 4px;
                }

                .menu-item {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    padding: 10px 14px;
                    margin: 2px 6px;
                    border-radius: 16px;
                    transition: all 0.2s ease;
                    text-decoration: none;
                    background: transparent;
                    border: 1px solid transparent;
                    width: auto;
                    cursor: pointer;
                    /* Animation Setup */
                    opacity: 0;
                    transform: translateX(-10px);
                }
                
                /* Staggered Animation on Active */
                .profile-dropdown.active .menu-item {
                    animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    animation-delay: calc(var(--delay) * 0.05s);
                }

                @keyframes slideIn {
                    to { opacity: 1; transform: translateX(0); }
                }
                
                .menu-item:hover {
                    background: #f8fafc;
                    border-color: #e2e8f0;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
                }
                
                .icon-box {
                    width: 36px;
                    height: 36px;
                    border-radius: 12px;
                    background: #f1f5f9;
                    color: #64748b;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
                }
                
                /* Mobile Adjustment */
                @media (max-width: 640px) {
                    .profile-dropdown {
                        position: fixed;
                        top: auto;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        width: 100%;
                        border-radius: 32px 32px 0 0;
                        transform: translateY(100%);
                        box-shadow: 0 -20px 40px rgba(0,0,0,0.2);
                    }
                    .profile-dropdown.active {
                        transform: translateY(0);
                    }
                }
            </style>
        `;
        
        this.roleMapping = {
            1: "Super Admin",
            2: "Admin",
            3: "Staff", 
            4: "Member"
        };
    }

    // --- 3. INIT LOGIC ---
    async init() {
        if (!document.querySelector('#profile-dropdown-styles')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'profile-dropdown-styles';
            styleElement.textContent = this.extractStyles();
            document.head.appendChild(styleElement);
        }

        this.injectDropdowns();
        await this.fetchUserData();
        this.addEventListeners();
    }

    extractStyles() {
        const styleMatch = this.styles.match(/<style>([\s\S]*?)<\/style>/);
        return styleMatch ? styleMatch[1] : '';
    }

    // --- 4. INJECTION LOGIC ---
    injectDropdowns() {
        const targets = [
            document.querySelector('.flex.items-center.space-x-4'),
            document.querySelector('#user-menu-container'),
            document.querySelector('.relative > a[href="admin_settings.html"]')?.parentElement
        ];

        const target = targets.find(t => t !== null);

        if (target) {
            if (target.tagName === 'DIV' && target.classList.contains('relative')) {
                target.outerHTML = this.dropdownHTML;
            } else {
                const innerProfile = target.querySelector('a[href="admin_settings.html"]');
                if (innerProfile && innerProfile.parentElement) {
                    innerProfile.parentElement.outerHTML = this.dropdownHTML;
                } else {
                    target.innerHTML += this.dropdownHTML;
                }
            }
        } else {
            console.warn('Profile container not found. Ensure HTML structure matches.');
        }
    }

    // --- 5. INTERACTION LOGIC ---
    addEventListeners() {
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('profileDropdown');
            const toggle = document.getElementById('profileToggle');
            const logoutButton = document.getElementById('logoutButton');

            // Handle Toggle
            if (toggle && toggle.contains(e.target)) {
                e.stopPropagation();
                
                // Toggle Logic
                if (dropdown.classList.contains('active')) {
                    dropdown.classList.remove('active');
                    toggle.classList.remove('active');
                } else {
                    dropdown.classList.add('active');
                    toggle.classList.add('active');
                }
            } 
            // Handle Outside Click
            else if (dropdown && !dropdown.contains(e.target)) {
                dropdown.classList.remove('active');
                if(toggle) toggle.classList.remove('active');
            }
            
            // Handle Logout
            if (logoutButton && logoutButton.contains(e.target)) {
                e.preventDefault();
                this.handleLogout();
            }
        });
    }

    // --- 6. DATA FETCHING ---
    async fetchUserData() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                this.loadDefaultUserData();
                return;
            }

            const response = await fetch('http://127.0.0.1:8000/users/me', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const userData = await response.json();
                this.updateUserDisplay(userData);
                localStorage.setItem('userData', JSON.stringify(userData));
            } else {
                this.loadDefaultUserData();
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            this.loadDefaultUserData();
        }
    }

    updateUserDisplay(userData) {
        const firstName = userData.first_name || 'User';
        const fullName = userData.first_name && userData.last_name 
            ? `${userData.first_name} ${userData.last_name}`
            : firstName;
        const email = userData.email || '';
        const roleDisplay = this.roleMapping[userData.role_id] || "Member";
        const initial = (firstName.charAt(0) || email.charAt(0) || 'U').toUpperCase();

        // Update UI
        const safeSetText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        safeSetText('username', firstName);
        safeSetText('user-role', roleDisplay);
        safeSetText('dropdown-username', fullName);
        safeSetText('dropdown-email', email);
        safeSetText('dropdown-role', roleDisplay);
        safeSetText('user-initial', initial);
        safeSetText('dropdown-initial', initial);

        // Handle Images
        if (userData.profile_image) {
            this.updateProfileImage(userData.profile_image, userData.profile_image_mime);
        }
    }

    updateProfileImage(imageData, mimeType) {
        const imageElements = document.querySelectorAll('#dashboard-profile-img, #dropdown-profile-img');
        let dataUrl = imageData;
        if (!imageData.startsWith('data:') && mimeType) {
            dataUrl = `data:${mimeType};base64,${imageData}`;
        }
        
        imageElements.forEach(img => {
            img.src = dataUrl;
            img.classList.remove('hidden');
             const parent = img.parentElement;
             if(parent) {
                 const span = parent.querySelector('span');
                 if(span) span.style.display = 'none';
             }
        });
    }

    loadDefaultUserData() {
        const storedData = JSON.parse(localStorage.getItem('userData'));
        if (storedData) this.updateUserDisplay(storedData);
    }

    handleLogout() {
        if (confirm('Sign out of your session?')) {
            // Clear only auth-related data, preserve "remember me" email
            localStorage.removeItem('token');
            localStorage.removeItem('role_id');
            localStorage.removeItem('user_id');
            localStorage.removeItem('userData');
            
            // Clear session storage
            sessionStorage.clear();
            
            window.location.href = 'login.html';
        }
    }
}

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
    const profileDropdown = new ProfileDropdown();
    profileDropdown.init();
});