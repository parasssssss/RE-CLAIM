// javascript/nav_handler.js

document.addEventListener("DOMContentLoaded", async () => {
    
    // 1. Try to get user data from LocalStorage first (Fastest)
    let user = JSON.parse(localStorage.getItem("userData"));
    const token = localStorage.getItem("token");

    if (!token) {
        // Not logged in? Redirect to landing
        window.location.href = 'landing.html'; 
        return;
    }

    // 2. Optional: If data is missing in LocalStorage, fetch from /me
    if (!user) {
        try {
            const res = await fetch("http://localhost:8000/users/me", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                user = await res.json();
                localStorage.setItem("userData", JSON.stringify(user));
            }
        } catch (e) {
            console.error("Auth check failed", e);
        }
    }

    if (!user) return; // Safety check

    // 3. DETERMINE THE CORRECT DASHBOARD
    let targetDashboard = "dashboard_normie.html"; // Default for Users (Role 4)

    if (user.role_id === 3) {
        // Staff Role
        targetDashboard = "dashboard_staff.html";
    } else if (user.role_id === 2) {
        // Admin Role
        targetDashboard = "dashboard_admin.html";
    }

    // 4. FIND AND UPDATE THE LINKS
    // We look for any <a> tag that links to the "wrong" dashboard
    const dashboardLinks = document.querySelectorAll('a[href*="dashboard"]');

    dashboardLinks.forEach(link => {
        // Prevent changing the current page's own link if we are already there
        // But generally, we just want to point all "Home/Dashboard" buttons to the target
        link.href = targetDashboard;
        
        // Optional: specific visual tweak for staff
        if (user.role_id === 3) {
            link.title = "Staff Dashboard";
        }
    });
    
    console.log(`✅ Nav Handler: Role ${user.role_id} detected. Dashboard set to ${targetDashboard}`);
});