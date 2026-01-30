document.addEventListener("DOMContentLoaded", () => {
    // --- Elements ---
    const form = document.getElementById("reportForm") || document.querySelector("form");
    const imageInput = document.getElementById("image");
    const uploadArea = document.querySelector(".upload-area");
    const submitBtn = document.querySelector("button[type='submit']");
    
    // Create a preview container if it doesn't exist yet
    // (This helps us swap between "Upload Box" and "Preview Box" without deleting the input)
    let previewContainer = document.getElementById("image-preview-container");
    if (!previewContainer) {
        previewContainer = document.createElement("div");
        previewContainer.id = "image-preview-container";
        previewContainer.className = "hidden mt-4 p-4 bg-green-50 rounded-lg border border-green-200 flex items-center justify-between";
        // Insert it after the upload area
        if(uploadArea) uploadArea.parentNode.insertBefore(previewContainer, uploadArea.nextSibling);
    }

    // --- 1. Enhanced Image Preview Logic ---
    if (imageInput && uploadArea) {
        imageInput.addEventListener("change", function(e) {
            const file = e.target.files[0];
            if (file) {
                // Show file details
                const fileSize = (file.size / 1024 / 1024).toFixed(2); // MB
                
                previewContainer.innerHTML = `
                    <div class="flex items-center space-x-3">
                        <div class="bg-white p-2 rounded-full shadow-sm">
                            <svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                        </div>
                        <div>
                            <p class="text-sm font-medium text-gray-900 truncate max-w-[200px]">${file.name}</p>
                            <p class="text-xs text-gray-500">${fileSize} MB</p>
                        </div>
                    </div>
                    <button type="button" id="removeImageBtn" class="text-gray-400 hover:text-red-500 transition-colors">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                `;

                // Toggle visibility: Hide default box, Show preview
                uploadArea.classList.add("hidden");
                previewContainer.classList.remove("hidden");

                // Attach click handler for the "X" button
                document.getElementById("removeImageBtn").addEventListener("click", resetUpload);
            }
        });
    }

    function resetUpload() {
        imageInput.value = ""; // Clear file input
        uploadArea.classList.remove("hidden"); // Show default box
        previewContainer.classList.add("hidden"); // Hide preview
    }

    // --- 2. Handle Form Submission with AI Check ---
    // --- 2. Handle Form Submission with AI Check ---
// --- 2. Handle Form Submission with AI Check ---
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            // A. Set Loading State
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                AI Analyzing...
            `;

            // B. Gather Data (MANUAL METHOD)
            // This ignores HTML form structure issues and grabs values directly
            const formData = new FormData();
            
            // 1. Get Values by ID
            const itemType = document.getElementById("item_type").value;
            const brand = document.getElementById("brand").value;
            const color = document.getElementById("color").value;
            const description = document.getElementById("description").value;
            const location = document.getElementById("lost_at_location").value;
            const imageFile = document.getElementById("image").files[0];

            // 2. Append with EXACT backend names
            formData.append("item_type", itemType);
            formData.append("brand", brand);
            formData.append("color", color);
            formData.append("description", description);
            formData.append("lost_at_location", location); // Critical: Must match backend argument

            if (imageFile) {
                formData.append("image", imageFile);
            }

            // Debug: Print to console what we are sending
            console.log("Sending Report:", Object.fromEntries(formData));

            try {
                const token = localStorage.getItem("token");
                // Check if your backend runs on port 8000
                const response = await fetch("http://127.0.0.1:8000/items/report-item", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`
                    },
                    body: formData
                });

                const data = await response.json();

                if (response.ok) {
                    // ✅ SUCCESS
                    alert("✅ " + data.message);
                    window.location.href = "my-reports.html"; 
                } else {
                    // ❌ ERROR / AI WARNING
                    console.error("Backend Error:", data);

                    if (response.status === 422) {
                        // Print missing fields to Alert
                        const msg = data.detail.map(err => 
                            `• Field '${err.loc[1]}' is ${err.msg}`
                        ).join("\n");
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
                // C. Reset Button State
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        });
    }
    // Make upload area clickable
    if (uploadArea && imageInput) {
        uploadArea.addEventListener("click", () => imageInput.click());
    }
});