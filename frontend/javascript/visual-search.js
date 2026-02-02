document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. UPLOAD MODAL ELEMENTS (Existing)
    // ==========================================
    const modal = document.getElementById('visual-search-modal'); // The Upload Modal
    const backdrop = document.getElementById('modal-backdrop');
    const panel = document.getElementById('modal-panel');
    const openBtn = document.getElementById('visual-search-btn'); // The Camera Button
    const closeBtn = document.getElementById('close-search-modal');
    
    // File Inputs
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-upload');
    const previewContainer = document.getElementById('image-preview-container');
    const previewImg = document.getElementById('preview-img');
    const removeBtn = document.getElementById('remove-image');
    
    // Search Actions
    const searchBtn = document.getElementById('trigger-search');
    const loader = document.getElementById('search-loader');
    const resultsArea = document.getElementById('search-results');
    const resultsList = document.getElementById('results-list');

    // ==========================================
    // 2. ITEM DETAILS MODAL ELEMENTS (New)
    // ==========================================
    const detailsModal = document.getElementById('item-details-modal'); // The View Modal
    const detailsBackdrop = document.getElementById('details-backdrop');
    const closeDetailsBtn = document.getElementById('close-details-btn');
    
    // Details Fields
    const dImage = document.getElementById('modal-item-image');
    const dName = document.getElementById('modal-item-name');
    const dLoc = document.getElementById('modal-item-location');
    const dDesc = document.getElementById('modal-item-desc');
    const dBadge = document.getElementById('modal-match-badge');

    let currentFile = null;

    // ==========================================
    // 3. UPLOAD MODAL LOGIC (Camera Button)
    // ==========================================
    function openModal() {
        modal.classList.remove('hidden');
        setTimeout(() => {
            backdrop.classList.remove('opacity-0');
            panel.classList.remove('opacity-0', 'translate-y-4', 'sm:translate-y-0', 'sm:scale-95');
            panel.classList.add('opacity-100', 'translate-y-0', 'sm:scale-100');
        }, 10);
    }

    function closeModal() {
        backdrop.classList.add('opacity-0');
        panel.classList.remove('opacity-100', 'translate-y-0', 'sm:scale-100');
        panel.classList.add('opacity-0', 'translate-y-4', 'sm:translate-y-0', 'sm:scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
            resetForm();
        }, 300);
    }

    // Connect Camera Button
    if(openBtn) openBtn.addEventListener('click', openModal);
    if(closeBtn) closeBtn.addEventListener('click', closeModal);
    if(backdrop) backdrop.addEventListener('click', closeModal);

    // ==========================================
    // 4. DETAILS MODAL LOGIC (Result Click)
    // ==========================================
    function closeDetails() {
        detailsModal.classList.add('hidden');
    }

    if(closeDetailsBtn) closeDetailsBtn.addEventListener('click', closeDetails);
    if(detailsBackdrop) detailsBackdrop.addEventListener('click', closeDetails);


    // ==========================================
    // 5. FILE HANDLING (Drag & Drop)
    // ==========================================
    dropZone.addEventListener('click', (e) => {
        if(e.target !== removeBtn && e.target.closest('#remove-image') === null) {
            fileInput.click();
        }
    });

    fileInput.addEventListener('change', handleFileSelect);

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    });

    function handleFileSelect(e) {
        const files = e.target.files;
        handleFiles(files);
    }

    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            if (!file.type.startsWith('image/')) {
                alert('Please upload an image file.');
                return;
            }
            currentFile = file;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                previewContainer.classList.remove('hidden');
                
                searchBtn.disabled = false;
                searchBtn.classList.remove('bg-slate-200', 'text-slate-400', 'cursor-not-allowed');
                searchBtn.classList.add('bg-indigo-600', 'hover:bg-indigo-700', 'text-white', 'shadow-lg', 'shadow-indigo-200');
            };
            reader.readAsDataURL(file);
        }
    }

    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetForm();
    });

    function resetForm() {
        currentFile = null;
        fileInput.value = '';
        previewContainer.classList.add('hidden');
        previewImg.src = '';
        searchBtn.disabled = true;
        searchBtn.classList.add('bg-slate-200', 'text-slate-400', 'cursor-not-allowed');
        searchBtn.classList.remove('bg-indigo-600', 'hover:bg-indigo-700', 'text-white', 'shadow-lg', 'shadow-indigo-200');
        resultsArea.classList.add('hidden');
        loader.classList.add('hidden');
    }

    // ==========================================
    // 6. API CALL & RESULT RENDERING
    // ==========================================
    searchBtn.addEventListener('click', async () => {
        if (!currentFile) return;

        // UI State: Loading
        searchBtn.classList.add('hidden');
        loader.classList.remove('hidden');
        resultsArea.classList.add('hidden');

        const formData = new FormData();
        formData.append('file', currentFile);

        try {
            const token = localStorage.getItem('authToken'); 
            const response = await fetch('http://localhost:8000/matches/search-by-image', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            loader.classList.add('hidden');
            searchBtn.classList.remove('hidden');
            resultsArea.classList.remove('hidden');
            resultsList.innerHTML = '';

            if (data.matches && data.matches.length > 0) {
                data.matches.forEach(match => {
                    const el = document.createElement('div');
                    el.className = 'flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-lg hover:border-indigo-200 transition-colors cursor-pointer group';
                    
                    // 1. Define your backend address
const BACKEND_URL = 'http://127.0.0.1:8000'; 

// 2. Get the raw path from the match
let rawPath = match.image_url || match.image_path;
let imgSrc = 'assets/placeholder.jpg'; // Default fallback

if (rawPath) {
    // 3. Clean the path to ensure it doesn't try to look in the /frontend folder
    let cleanPath = rawPath.replace(/^(\/)?frontend\//, '');
    
    // Ensure we don't have a double slash when combining
    if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);

    // 4. Final Result: http://127.0.0.1:8000/uploads/items/filename.jpg
    imgSrc = `${BACKEND_URL}/${cleanPath}`;
}

                    el.innerHTML = `
                        <img src="${imgSrc}" class="w-12 h-12 rounded-md object-cover bg-slate-100">
                        <div class="flex-1">
                            <div class="flex justify-between">
                                <h5 class="font-bold text-slate-800 text-sm group-hover:text-indigo-600">${match.name}</h5>
                                <span class="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">${match.match_confidence} Match</span>
                            </div>
                            <p class="text-xs text-slate-500 truncate w-48">${match.description || 'No description'}</p>
                        </div>
                    `;
                    
                    // --- MODIFIED CLICK HANDLER ---
                    // Instead of redirecting, open the Details Modal
                    el.onclick = () => {
                        // 1. Populate Modal Data
                        dImage.src = imgSrc;
                        dName.textContent = match.name;
                        dLoc.textContent = match.location || "Unknown Location";
                        dDesc.textContent = match.descriptionn || "Description is hidden to prevent unauthorized access.But your item is  safe with us.";
                        
                        // Badge Styling
                        dBadge.textContent = `${match.match_confidence} Match`;
                        const rawScore = parseFloat(match.raw_score);
                        if (rawScore > 0.8) {
                            dBadge.className = "absolute top-4 right-4 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm";
                        } else {
                            dBadge.className = "absolute top-4 right-4 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm";
                        }

                        // 2. Open the Details Modal
                        detailsModal.classList.remove('hidden');
                    };

                    resultsList.appendChild(el);
                });
            } else {
                resultsList.innerHTML = `
                    <div class="text-center py-4 text-slate-400">
                        <i class="far fa-frown text-2xl mb-2"></i>
                        <p class="text-sm">No visual matches found.</p>
                    </div>
                `;
            }

        } catch (error) {
            console.error('Error:', error);
            loader.classList.add('hidden');
            searchBtn.classList.remove('hidden');
            alert('Something went wrong with the search.');
        }
    });
});