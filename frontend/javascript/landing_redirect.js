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

// Optional: Redirect buttons
document.getElementById('Signinbtn').addEventListener('click', () => {
  window.location.href = '/frontend/login.html';
});

document.getElementById('Signupbtn').addEventListener('click', () => {
  window.location.href = '/frontend/register.html';
});



document.getElementById('Signinbtnmob').addEventListener('click', function() {
    window.location.href = 'login.html';
});

document.getElementById('Signupbtnmob').addEventListener('click', function() {
    window.location.href = 'register.html';
});

