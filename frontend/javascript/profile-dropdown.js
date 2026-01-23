// profile-dropdown.js - Updated with dynamic role mapping
export class ProfileDropdown {
    constructor() {
        this.dropdownHTML = `
            <!-- Profile Dropdown Container -->
            <div class="profile-dropdown-container">
                <button class="flex items-center space-x-2 group focus:outline-none" id="profileToggle">
                    <div class="profile-avatar">
                        <img id="dashboard-profile-img" class="hidden w-full h-full object-cover rounded-full" alt="Profile" />
                        <span id="user-initial" class="text-white font-medium"></span>
                    </div>
                    <div class="hidden md:block">
                        <span id="username" class="text-sm font-medium text-gray-900 block text-left">
                            Loading...
                        </span>
                        <span id="user-role" class="text-xs text-gray-500 block text-left">
                            Loading...
                        </span>
                    </div>
                    <svg class="profile-arrow h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                
                <!-- Profile Dropdown Menu -->
                <div class="profile-dropdown" id="profileDropdown">
                    <!-- Profile Header -->
                    <div class="profile-header">
                        <div class="flex items-center space-x-4">
                            <div class="profile-avatar">
                                <img id="dropdown-profile-img" class="hidden w-full h-full object-cover rounded-full" alt="Profile" />
                                <span id="dropdown-initial" class="text-white font-medium"></span>
                            </div>
                            <div>
                                <h3 id="dropdown-username" class="font-semibold text-white">Loading...</h3>
                                <p id="dropdown-role" class="text-sm text-gray-300">Loading...</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Dropdown Menu Items -->
                    <div class="py-2">
                        <a href="profile.html" class="menu-item">
                            <svg class="w-5 h-5 mr-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Profile Settings
                        </a>
                        
                        <div class="menu-divider"></div>
                        
                        <a href="support.html" class="menu-item">
                            <svg class="w-5 h-5 mr-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            Help Center
                        </a>
                        
                        <div class="menu-divider"></div>
                        
                        <button id="logoutButton" class="menu-item logout-btn w-full text-left">
                            <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Logout
                        </button>
                    </div>
                    
                    <!-- Footer -->
                    <div class="px-5 py-3 bg-gray-50 border-t border-gray-100">
                        <p class="text-xs text-gray-500">ReClaim Dashboard • v2.1</p>
                    </div>
                </div>
            </div>
        `;
        
        this.styles = `
            <style>
                /* Profile dropdown styles */
                .profile-dropdown-container {
                    position: relative;
                }
                
                .profile-dropdown {
                    position: absolute;
                    right: 0;
                    top: 100%;
                    margin-top: 8px;
                    width: 280px;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05);
                    opacity: 0;
                    visibility: hidden;
                    transform: translateY(-10px);
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    z-index: 1000;
                    overflow: hidden;
                }
                
                .profile-dropdown.active {
                    opacity: 1;
                    visibility: visible;
                    transform: translateY(0);
                }
                
                .profile-dropdown::before {
                    content: '';
                    position: absolute;
                    top: -6px;
                    right: 16px;
                    width: 12px;
                    height: 12px;
                    background: white;
                    transform: rotate(45deg);
                    border-top: 1px solid #e5e7eb;
                    border-left: 1px solid #e5e7eb;
                }
                
                .profile-header {
                    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                    padding: 20px;
                    color: white;
                }
                
                /* Smaller avatar - changed from 40px to 32px */
                .profile-avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    border: 2px solid rgba(255, 255, 255, 0.2);
                    background: linear-gradient(135deg, #4B5563 0%, #1F2937 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    font-weight: 600;
                    font-size: 14px;
                }
                
                /* Larger avatar in dropdown - changed from 40px to 44px */
                .profile-header .profile-avatar {
                    width: 44px;
                    height: 44px;
                    font-size: 16px;
                }
                
                .profile-arrow {
                    transition: transform 0.2s ease;
                }
                
                .profile-dropdown-container:hover .profile-arrow {
                    transform: rotate(180deg);
                }
                
                .menu-item {
                    padding: 12px 20px;
                    display: flex;
                    align-items: center;
                    color: #374151;
                    text-decoration: none;
                    transition: all 0.2s ease;
                    border-left: 3px solid transparent;
                    cursor: pointer;
                    background: none;
                    border: none;
                    width: 100%;
                    text-align: left;
                    font-size: 14px;
                    font-family: inherit;
                }
                
                .menu-item:hover {
                    background: #f9fafb;
                    color: #111827;
                    border-left-color: #1a1a1a;
                }
                
                .menu-item svg {
                    transition: transform 0.2s ease;
                }
                
                .menu-item:hover svg {
                    transform: scale(1.1);
                }
                
                .menu-divider {
                    height: 1px;
                    background: #f3f4f6;
                    margin: 4px 0;
                }
                
                .logout-btn {
                    color: #dc2626;
                }
                
                .logout-btn:hover {
                    background: #fef2f2;
                }
            </style>
        `;
        
        // Dynamic role mapping based on your API response
        // Update these values based on what your API returns
        this.roleMapping = {
            1: "Super Admin",
            2: "Administrator",
            3: "Manager", 
            4: "Staff",
            5: "User",
            6: "Viewer"
        };
    }

    // Initialize the dropdown
    async init() {
        // Add styles to head
        if (!document.querySelector('#profile-dropdown-styles')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'profile-dropdown-styles';
            styleElement.textContent = this.extractStyles();
            document.head.appendChild(styleElement);
        }

        // Find all profile containers and inject dropdown
        this.injectDropdowns();
        
        // Fetch user data from API
        await this.fetchUserData();
        
        // Add event listeners
        this.addEventListeners();
    }

    // Extract just the CSS from styles string
    extractStyles() {
        const styleMatch = this.styles.match(/<style>([\s\S]*?)<\/style>/);
        return styleMatch ? styleMatch[1] : '';
    }

    // Inject dropdown into existing profile elements
   // Fix the injectDropdowns method
injectDropdowns() {
    // Find the profile section in the header
    // Look for the specific structure in your HTML
    const rightSideContainer = document.querySelector('.flex.items-center.space-x-4');
    
    if (rightSideContainer) {
        // Find the profile link or container within the right side
        const profileLink = rightSideContainer.querySelector('a[href="profile.html"]');
        
        if (profileLink) {
            // Get the parent div that contains the profile link
            const profileContainer = profileLink.closest('.relative');
            
            if (profileContainer) {
                // Replace the entire profile container with our dropdown
                profileContainer.outerHTML = this.dropdownHTML;
                console.log('Profile dropdown injected successfully');
                return;
            }
        }
        
        // Alternative: Look for the profile avatar structure
        const profileAvatar = rightSideContainer.querySelector('.h-8.w-8.rounded-full.bg-gray-900');
        
        if (profileAvatar) {
            // Find the container that holds the avatar and username
            const avatarContainer = profileAvatar.closest('.flex.items-center.space-x-3') || 
                                   profileAvatar.closest('.relative');
            
            if (avatarContainer) {
                avatarContainer.outerHTML = this.dropdownHTML;
                console.log('Profile dropdown injected via avatar');
                return;
            }
        }
        
        // If we get here, manually inject the dropdown at the end
        console.log('Manual injection required');
        rightSideContainer.innerHTML += this.dropdownHTML;
    } else {
        console.warn('Could not find right side container for profile dropdown');
    }
}

    // Add event listeners for dropdown functionality
    addEventListeners() {
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('profileDropdown');
            const toggle = document.getElementById('profileToggle');
            const container = document.querySelector('.profile-dropdown-container');
            const logoutButton = document.getElementById('logoutButton');

            if (toggle && toggle.contains(e.target)) {
                // Toggle dropdown on click
                e.stopPropagation();
                dropdown.classList.toggle('active');
            } else if (dropdown && !dropdown.contains(e.target) && !container.contains(e.target)) {
                // Close dropdown when clicking outside
                dropdown.classList.remove('active');
            }
            
            // Handle logout button click
            if (logoutButton && logoutButton.contains(e.target)) {
                e.preventDefault();
                this.handleLogout();
            }
        });

        // Hover functionality
        const container = document.querySelector('.profile-dropdown-container');
        if (container) {
            container.addEventListener('mouseenter', () => {
                const dropdown = document.getElementById('profileDropdown');
                if (dropdown) dropdown.classList.add('active');
            });

            container.addEventListener('mouseleave', () => {
                const dropdown = document.getElementById('profileDropdown');
                if (dropdown) dropdown.classList.remove('active');
            });
        }
    }

    // Fetch user data from API
    async fetchUserData() {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                console.warn('No auth token found');
                this.loadDefaultUserData();
                return;
            }

            const response = await fetch('http://127.0.0.1:8000/me', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const userData = await response.json();
                console.log('User data fetched:', userData); // For debugging
                this.updateUserDisplay(userData);
                
                // Store in localStorage for offline use
                localStorage.setItem('userData', JSON.stringify(userData));
            } else {
                console.error('Failed to fetch user data:', response.status);
                this.loadDefaultUserData();
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            this.loadDefaultUserData();
        }
    }

    // Update user display with fetched data
    updateUserDisplay(userData) {
        console.log('Updating display with:', userData); // For debugging
        
        // Get user's first name (from API response)
        const firstName = userData.first_name || '';
        
        // Get user's full name if available
        const fullName = userData.first_name && userData.last_name 
            ? `${userData.first_name} ${userData.last_name}`
            : userData.first_name || userData.email;
        
        // Get role display text based on role_id
        const roleDisplay = this.getRoleDisplay(userData.role_id);
        
        // Get initial from first name or email
        const initial = this.getInitial(firstName || userData.email);
        
        // Update header username (show first name only)
        const headerUsername = document.getElementById('username');
        if (headerUsername) {
            headerUsername.textContent = firstName || userData.email.split('@')[0];
        }
        
        // Update dropdown username (show full name)
        const dropdownUsername = document.getElementById('dropdown-username');
        if (dropdownUsername) {
            dropdownUsername.textContent = fullName || userData.email;
        }
        
        // Update header role
        const headerRole = document.getElementById('user-role');
        if (headerRole) {
            headerRole.textContent = roleDisplay;
        }
        
        // Update dropdown role
        const dropdownRole = document.getElementById('dropdown-role');
        if (dropdownRole) {
            dropdownRole.textContent = roleDisplay;
        }
        
        // Update all initial elements
        const initialElements = document.querySelectorAll('#user-initial, #dropdown-initial');
        initialElements.forEach(el => {
            el.textContent = initial;
        });

        // Update profile image if available
        if (userData.profile_image) {
            this.updateProfileImage(userData.profile_image, userData.profile_image_mime);
        }
    }

    // Get role display text based on role_id
    getRoleDisplay(roleId) {
        // Default to "User" if role_id not found in mapping
        return this.roleMapping[roleId] || "User";
    }

    // Get initial from name or email
    getInitial(nameOrEmail) {
        if (!nameOrEmail) return 'U';
        
        // If it's an email, get the first letter before @
        if (nameOrEmail.includes('@')) {
            return nameOrEmail.charAt(0).toUpperCase();
        }
        
        // If it's a name, get first letter
        return nameOrEmail.charAt(0).toUpperCase();
    }

    // Update profile image
    updateProfileImage(imageData, mimeType) {
        const imageElements = document.querySelectorAll('#dashboard-profile-img, #dropdown-profile-img');
        
        // Create data URL if image data is base64
        let dataUrl = imageData;
        if (!imageData.startsWith('data:') && mimeType) {
            dataUrl = `data:${mimeType};base64,${imageData}`;
        }
        
        imageElements.forEach(img => {
            img.src = dataUrl;
            img.classList.remove('hidden');
            
            // Hide the initial span when image loads
            const avatarContainer = img.parentElement;
            const initialSpan = avatarContainer.querySelector('span[id$="initial"]');
            if (initialSpan) {
                initialSpan.style.display = 'none';
            }
        });
    }

    // Load default user data (fallback)
    loadDefaultUserData() {
        const storedData = JSON.parse(localStorage.getItem('userData'));
        
        if (storedData) {
            // Use stored data from localStorage
            this.updateUserDisplay(storedData);
        } else {
            // Set minimal default display
            const headerUsername = document.getElementById('username');
            const headerRole = document.getElementById('user-role');
            const initialElements = document.querySelectorAll('#user-initial, #dropdown-initial');
            
            if (headerUsername) {
                headerUsername.textContent = 'User';
            }
            if (headerRole) {
                headerRole.textContent = 'Loading...';
            }
            
            initialElements.forEach(el => {
                el.textContent = 'U';
            });
        }
    }

    // Handle logout
    handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            // Clear user data and tokens
            localStorage.removeItem('userData');
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            
            // Clear any session storage
            sessionStorage.clear();
            
            // Redirect to landing page
            window.location.href = 'landing.html';
        }
    }
}

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const profileDropdown = new ProfileDropdown();
    profileDropdown.init();
});