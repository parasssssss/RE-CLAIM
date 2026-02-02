document.addEventListener("DOMContentLoaded", async () => {


  // ---------------------------------------------------------
    // 1. FETCH USER DATA DIRECTLY FROM ENDPOINT
    // ---------------------------------------------------------
    const token = localStorage.getItem("token");
    let currentUser = null;

    if (token) {
        try {
            // Adjust the URL if your router prefix is different (e.g. /api/users/me)
            const res = await fetch("http://127.0.0.1:8000/users/me", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                currentUser = await res.json();
            }
        } catch (err) {
            console.error("Failed to fetch user role:", err);
        }
    }

    // ---------------------------------------------------------
    // 2. APPLY STAFF ("FOUND ITEM") UI CHANGES
    // ---------------------------------------------------------
    // Check if user exists AND has role_id 3 (Staff)
    if (currentUser && currentUser.role_id === 3) {
        console.log("Staff Mode Activated: Switching to Found Item Report");

        // A. Sidebar Link
        const sidebarText = document.getElementById("sidebar-report-text");
        if(sidebarText) sidebarText.textContent = "Report Found Item";

        // B. Page Title
        const pageTitle = document.getElementById("page-title-text");
        if(pageTitle) pageTitle.textContent = "Report Found Item";

        // C. Form Labels
        const questionText = document.getElementById("item-question-text");
        if(questionText) questionText.innerHTML = 'What did you find? <span class="text-red-500">*</span>';

        const locationLabel = document.getElementById("location-label-text");
        if(locationLabel) locationLabel.innerHTML = 'Location Found <span class="text-red-500">*</span>';

        // D. Submit Button Styling
        const submitBtn = document.getElementById("submitBtn");
        if(submitBtn) {
            submitBtn.innerHTML = `
                <span class="absolute left-0 inset-y-0 flex items-center pl-6">
                    <i class="fas fa-check-circle text-yellow-500"></i>
                </span>
                Submit Found Report
            `;
            // Optional: Change button color to indicate different action
            submitBtn.classList.remove("bg-gray-900", "hover:bg-gray-800");
            submitBtn.classList.add("bg-gray-800", "hover:bg-gray-700", "border-yellow-500/30", "border");
        }

        // E. Helper Text
        const helperContainer = document.querySelector(".text-center p.text-\\[10px\\]");
        if(helperContainer) {
             helperContainer.innerHTML = `<i class="fas fa-id-badge text-yellow-500"></i> Staff Entry • Priority Indexing`;
        }
    }
    

    // --- Elements ---
    const form = document.getElementById("reportForm");
    const imageInput = document.getElementById("image");
    const uploadArea = document.querySelector(".upload-area");
    const submitBtn = document.querySelector("button[type='submit']");
    const charCount = document.getElementById("charCount");
    const descInput = document.getElementById("description");

    // Character Count Logic
    if(descInput && charCount) {
        descInput.addEventListener("input", () => {
            const len = descInput.value.length;
            charCount.textContent = len;
            if(len > 450) charCount.classList.replace("text-yellow-600", "text-red-500");
            else charCount.classList.replace("text-red-500", "text-yellow-600");
        });
    }

    // Create a preview container if it doesn't exist yet
    let previewContainer = document.getElementById("image-preview-container");
    if (!previewContainer) {
        previewContainer = document.createElement("div");
        previewContainer.id = "image-preview-container";
        // Updated colors to match Yellow/Gray theme (bg-yellow-50, border-yellow-200)
        previewContainer.className = "hidden mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200 flex items-center justify-between animate-entry";
        if(uploadArea) uploadArea.parentNode.insertBefore(previewContainer, uploadArea.nextSibling);
    }

    // --- 1. Enhanced Image Preview Logic ---
    if (imageInput && uploadArea) {
        imageInput.addEventListener("change", function(e) {
            const file = e.target.files[0];
            if (file) {
                const fileSize = (file.size / 1024 / 1024).toFixed(2); // MB
                
                previewContainer.innerHTML = `
                    <div class="flex items-center space-x-3">
                        <div class="bg-white p-2 rounded-full shadow-sm border border-yellow-100">
                            <i class="fas fa-image text-yellow-500 text-lg"></i>
                        </div>
                        <div>
                            <p class="text-sm font-bold text-gray-900 truncate max-w-[200px]">${file.name}</p>
                            <p class="text-xs text-gray-500">${fileSize} MB</p>
                        </div>
                    </div>
                    <button type="button" id="removeImageBtn" class="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-full">
                        <i class="fas fa-times"></i>
                    </button>
                `;

                uploadArea.classList.add("hidden");
                previewContainer.classList.remove("hidden");
                document.getElementById("removeImageBtn").addEventListener("click", resetUpload);
            }
        });
    }

    function resetUpload() {
        imageInput.value = ""; 
        uploadArea.classList.remove("hidden"); 
        previewContainer.classList.add("hidden"); 
    }

    // --- 2. Handle Form Submission with AI Check ---
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            // A. Set Loading State (Theme adapted)
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <i class="fas fa-circle-notch fa-spin text-yellow-500 mr-2"></i>
                AI Analyzing...
            `;

            // B. Gather Data
            const formData = new FormData();
            const itemType = document.getElementById("item_type").value;
            const brand = document.getElementById("brand").value;
            const color = document.getElementById("color").value;
            const description = document.getElementById("description").value;
            const location = document.getElementById("lost_at_location").value;
            const imageFile = document.getElementById("image").files[0];

            formData.append("item_type", itemType);
            formData.append("brand", brand);
            formData.append("color", color);
            formData.append("description", description);
            formData.append("lost_at_location", location);

            if (imageFile) {
                formData.append("image", imageFile);
            }

            console.log("Sending Report:", Object.fromEntries(formData));

            try {
                const token = localStorage.getItem("token");
                const response = await fetch("http://127.0.0.1:8000/items/report-item", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${token}` },
                    body: formData
                });

                const data = await response.json();

                if (response.ok) {
                    alert("✅ " + data.message);
                    window.location.href = "my-reports.html"; 
                } else {
                    console.error("Backend Error:", data);
                    if (response.status === 422) {
                        const msg = data.detail.map(err => `• Field '${err.loc[1]}' is ${err.msg}`).join("\n");
                        alert("⚠️ Data Missing:\n" + msg);
                    } else if (data.detail) {
                        alert("⚠️ " + data.detail);
                    } else {
                        alert("❌ An error occurred. Check console.");
                    }
                }

            } catch (err) {
                console.error("Submission Error:", err);
                alert("Server connection failed. Is the backend running?");
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        });
    }
    
    if (uploadArea && imageInput) {
        uploadArea.addEventListener("click", () => imageInput.click());
    }
});