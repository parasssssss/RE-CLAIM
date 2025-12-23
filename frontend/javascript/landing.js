// Mobile menu toggle
        function toggleMenu() {
            const menu = document.getElementById('mobileMenu');
            menu.classList.toggle('active');
        }

        // Scroll reveal animation
        function revealOnScroll() {
            const reveals = document.querySelectorAll('.scroll-reveal');
            reveals.forEach(element => {
                const elementTop = element.getBoundingClientRect().top;
                const windowHeight = window.innerHeight;
                if (elementTop < windowHeight - 100) {
                    element.classList.add('active');
                }
            });
        }

        // Navbar scroll effect
        function handleNavbarScroll() {
            const navbar = document.getElementById('navbar');
            if (window.scrollY > 50) {
                navbar.classList.remove('navbar-transparent');
                navbar.classList.add('navbar-solid');
                
                // Change navbar text color when scrolled
                const navLinks = navbar.querySelectorAll('a');
                const navButtons = navbar.querySelectorAll('button');
                const logoText = navbar.querySelector('.text-2xl');
                
                navLinks.forEach(link => {
                    link.classList.remove('text-white', 'hover:text-gray-200');
                    link.classList.add('text-gray-700', 'hover:text-gray-900');
                });


                
                navButtons.forEach(button => {
                  if (button.textContent.includes('Sign In')) {
                button.classList.remove('bg-white', 'text-gray-900', 'hover:bg-gray-100');
                button.classList.add('bg-gray-900', 'text-white', 'hover:bg-gray-800');
            }
            // Change Sign Up button
            if (button.textContent.includes('Sign Up')) {
                button.classList.remove('bg-white', 'text-gray-900', 'hover:bg-gray-100');
                button.classList.add('bg-gray-900', 'text-white', 'hover:bg-gray-800');
            }
                });


                
                
                if (logoText) {
                    logoText.classList.remove('text-white');
                    logoText.classList.add('text-gray-900');
                }
                


                // Change logo color
                const logo = navbar.querySelector('svg');
                if (logo) {
                    logo.classList.remove('text-white');
                    logo.classList.add('text-gray-900');
                }
            } else {
                navbar.classList.remove('navbar-solid');
                navbar.classList.add('navbar-transparent');
                
                // Revert navbar text color to white
                const navLinks = navbar.querySelectorAll('a');
                const navButtons = navbar.querySelectorAll('button');
                const logoText = navbar.querySelector('.text-2xl');
                
                navLinks.forEach(link => {
                    link.classList.remove('text-gray-700', 'hover:text-gray-900');
                    link.classList.add('text-white', 'hover:text-gray-200');
                });
                
                navButtons.forEach(button => {
                  if (button.textContent.includes('Sign In')) {
                button.classList.remove('bg-gray-900', 'text-white', 'hover:bg-gray-800');
                button.classList.add('bg-white', 'text-gray-900', 'hover:bg-gray-100');
            }
                    if (button.textContent.includes('Sign Up')) {
                        button.classList.remove('bg-gray-900', 'text-white', 'hover:bg-gray-800');
                        button.classList.add('bg-white', 'text-gray-900', 'hover:bg-gray-100');
                    }
                });
                
                if (logoText) {
                    logoText.classList.remove('text-gray-900');
                    logoText.classList.add('text-white');
                }
                
                // Revert logo color
                const logo = navbar.querySelector('svg');
                if (logo) {
                    logo.classList.remove('text-gray-900');
                    logo.classList.add('text-white');
                }
            }
        }

        // Initial reveal check
        window.addEventListener('DOMContentLoaded', () => {
            revealOnScroll();
            handleNavbarScroll();
        });

        // Reveal on scroll
        window.addEventListener('scroll', () => {
            revealOnScroll();
            handleNavbarScroll();
        });

        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                    // Close mobile menu if open
                    const menu = document.getElementById('mobileMenu');
                    menu.classList.remove('active');
                }
            });
        });


        
// Infinite Marquee with seamless loop
function setupSeamlessMarquee() {
    const marqueeContainer = document.querySelector('.relative.overflow-hidden');
    if (!marqueeContainer) return;
    
    // Create marquee content container
    const marqueeContent = document.createElement('div');
    marqueeContent.className = 'flex animate-marquee whitespace-nowrap py-4';
    
    // Original items (you can keep your existing ones)
    const items = ['Luxury Hotels', 'Airports', 'Malls', 'Universities', 'Stadiums'];
    
    // Create enough duplicate sets to ensure seamless loop
    // We'll create 4 sets total (original + 3 duplicates) for smooth looping
    let marqueeHTML = '';
    for (let i = 0; i < 4; i++) {
        items.forEach(item => {
            marqueeHTML += `
                <div class="inline-flex items-center mx-12 text-4xl font-serif text-gradient">
                    <span>${item}</span>
                </div>
            `;
        });
    }
    
    marqueeContent.innerHTML = marqueeHTML;
    
    // Clear existing content and add new marquee
    marqueeContainer.innerHTML = '';
    marqueeContainer.appendChild(marqueeContent);
    
    // Calculate animation duration based on content width
    const calculateAnimation = () => {
        const firstItem = marqueeContent.querySelector('div');
        if (!firstItem) return;
        
        const itemWidth = firstItem.offsetWidth + 48; // 48px for mx-12 margin
        const itemsPerSet = items.length;
        const totalSets = 4;
        const totalWidth = itemWidth * itemsPerSet * totalSets;
        
        // Calculate speed: 100px per second (adjust as needed)
        const speed = 100; // pixels per second
        const duration = totalWidth / speed;
        
        // Update CSS animation
        const style = document.createElement('style');
        style.id = 'marquee-animation';
        style.textContent = `
            @keyframes seamlessMarquee {
                0% { transform: translateX(0); }
                100% { transform: translateX(-${itemWidth * itemsPerSet * 2}px); }
            }
            .animate-marquee {
                animation: seamlessMarquee ${duration}s linear infinite;
            }
        `;
        
        // Remove existing style if present
        const existingStyle = document.getElementById('marquee-animation');
        if (existingStyle) existingStyle.remove();
        
        document.head.appendChild(style);
    };
    
    // Wait for images/fonts to load
    window.addEventListener('load', calculateAnimation);
    calculateAnimation();
    
    // Recalculate on resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(calculateAnimation, 100);
    });
}

// Initialize marquee
document.addEventListener('DOMContentLoaded', setupSeamlessMarquee);