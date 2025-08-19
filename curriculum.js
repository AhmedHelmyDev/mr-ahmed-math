import { db } from './firebase-config.js';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js";
import { collection, getDocs, addDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is logged in
    if (localStorage.getItem('isLoggedIn') !== 'true') {
        window.location.href = 'login.html';
        return;
    }

    // Apply saved theme settings
    const savedSettings = JSON.parse(localStorage.getItem('siteSettings')) || {};
    if (savedSettings.theme) {
        document.body.className = savedSettings.theme;
    }
    // Apply font settings from saved settings
    if (savedSettings.font) {
        document.documentElement.classList.forEach(className => {
            if (className.startsWith('font-')) {
                document.documentElement.classList.remove(className);
            }
        });
        document.documentElement.classList.add(`font-${savedSettings.font}`);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const grade = urlParams.get('grade');
    const gradeTitle = document.getElementById('gradeTitle');
    const curriculumContainer = document.getElementById('curriculumContainer');
    const addContentBtn = document.getElementById('addContentBtn');
    const modal = document.getElementById('addContentModal');
    const closeModalBtn = modal.querySelector('.close-btn');
    const addContentForm = document.getElementById('addContentForm');
    const sectionDropdownBtn = document.getElementById('sectionDropdownBtn');
    const sectionDropdownList = document.getElementById('sectionDropdownList');
    const selectedSectionSpan = document.getElementById('selectedSection');
    const filePreview = document.getElementById('filePreview');
    const fileInputs = ['imageUpload', 'videoUpload', 'pdfUpload'];
    const storage = getStorage();
    const curriculumCollection = collection(db, "grades", grade, "curriculum");

    if (!grade) {
        console.error('No grade parameter found in URL');
        if (gradeTitle) gradeTitle.textContent = "المنهج الدراسي";
        curriculumContainer.innerHTML = `<p class="error-message">لم يتم تحديد صف دراسي.</p>`;
        return;
    }

    // --- Grade Title ---
    const gradeTitles = {
        'prim1': 'الصف الأول الابتدائي', 'prim2': 'الصف الثاني الابتدائي', 'prim3': 'الصف الثالث الابتدائي',
        'prim4': 'الصف الرابع الابتدائي', 'prim5': 'الصف الخامس الابتدائي', 'prim6': 'الصف السادس الابتدائي',
        'prep1': 'الصف الأول الإعدادي', 'prep2': 'الصف الثاني الإعدادي', 'prep3': 'الصف الثالث الإعدادي',
        'sec1': 'الصف الأول الثانوي', 'sec2': 'الصف الثاني الثانوي', 'sec3': 'الصف الثالث الثانوي'
    };
    if (grade.startsWith('custom')) {
        const customStages = JSON.parse(localStorage.getItem('customStages')) || [];
        const customIndex = parseInt(grade.replace('custom', ''));
        gradeTitle.textContent = customStages[customIndex] ? `منهج ${customStages[customIndex].name}` : 'منهج';
    } else {
        gradeTitle.textContent = `منهج ${gradeTitles[grade] || 'الطلاب'}`;
    }

    // --- Modal Logic ---
    addContentBtn.addEventListener('click', () => modal.style.display = 'block');
    closeModalBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    // --- Custom Dropdown ---
    sectionDropdownBtn.addEventListener('click', () => {
        sectionDropdownList.classList.toggle('active');
        sectionDropdownBtn.querySelector('.fas').classList.toggle('fa-chevron-down');
        sectionDropdownBtn.querySelector('.fas').classList.toggle('fa-chevron-up');
    });

    sectionDropdownList.addEventListener('click', (e) => {
        if (e.target.tagName === 'LI') {
            const sectionName = e.target.textContent;
            const sectionValue = e.target.dataset.value;
            selectedSectionSpan.textContent = sectionName;
            selectedSectionSpan.dataset.value = sectionValue;
            sectionDropdownList.classList.remove('active');
            sectionDropdownBtn.querySelector('.fas').classList.add('fa-chevron-down');
            sectionDropdownBtn.querySelector('.fas').classList.remove('fa-chevron-up');
        }
    });
    
    document.addEventListener('click', (e) => {
        if (!sectionDropdownBtn.contains(e.target) && !sectionDropdownList.contains(e.target)) {
            sectionDropdownList.classList.remove('active');
             sectionDropdownBtn.querySelector('.fas').classList.add('fa-chevron-down');
            sectionDropdownBtn.querySelector('.fas').classList.remove('fa-chevron-up');
        }
    });

    // --- File Preview Logic ---
    fileInputs.forEach(id => {
        document.getElementById(id).addEventListener('change', buildAndRenderPreview);
    });

    filePreview.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-file-preview-btn')) {
            const fileNameToDelete = e.target.dataset.name;
            const fileTypeToDelete = e.target.dataset.type;

            let targetInputId;
            if (fileTypeToDelete.startsWith('image/')) targetInputId = 'imageUpload';
            else if (fileTypeToDelete.startsWith('video/')) targetInputId = 'videoUpload';
            else if (fileTypeToDelete === 'application/pdf') targetInputId = 'pdfUpload';

            if (targetInputId) {
                const input = document.getElementById(targetInputId);
                const dataTransfer = new DataTransfer();
                const files = Array.from(input.files);

                files.forEach(file => {
                    if (file.name !== fileNameToDelete) {
                        dataTransfer.items.add(file);
                    }
                });

                input.files = dataTransfer.files;
                buildAndRenderPreview();
            }
        }
    });

    function buildAndRenderPreview() {
        filePreview.innerHTML = '';
        let fileCount = 0;
        fileInputs.forEach(id => {
            const input = document.getElementById(id);
            for (const file of input.files) {
                fileCount++;
                const fileItem = document.createElement('div');
                fileItem.className = 'file-preview-item';
                let iconClass = 'fa-file';
                if (file.type.startsWith('image/')) iconClass = 'fa-file-image';
                if (file.type.startsWith('video/')) iconClass = 'fa-file-video';
                if (file.type === 'application/pdf') iconClass = 'fa-file-pdf';
                fileItem.innerHTML = `
                    <i class="fas ${iconClass}"></i>
                    <span>${file.name}</span>
                    <button type="button" class="delete-file-preview-btn" data-name="${file.name}" data-type="${file.type}" title="حذف">&times;</button>
                `;
                filePreview.appendChild(fileItem);
            }
        });
        if (fileCount > 0) {
            filePreview.style.display = 'block';
        } else {
            filePreview.style.display = 'none';
        }
    }
    
    // --- Form Submission ---
    addContentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const section = selectedSectionSpan.dataset.value;
        if (!section || section === 'none') {
            showToast('الرجاء اختيار القسم أولاً', '#dc3545');
            return;
        }

        const filesToUpload = [];
        fileInputs.forEach(id => {
            const input = document.getElementById(id);
            for (const file of input.files) {
                filesToUpload.push(file);
            }
        });

        if (filesToUpload.length === 0) {
            showToast('الرجاء اختيار ملف واحد على الأقل', '#dc3545');
            return;
        }

        try {
            for (const file of filesToUpload) {
                const storageRef = ref(storage, `${grade}/curriculum/${section}/${file.name}`);
                await uploadBytes(storageRef, file);
                const downloadURL = await getDownloadURL(storageRef);
                await addDoc(curriculumCollection, {
                    section,
                    name: file.name,
                    type: file.type,
                    url: downloadURL,
                    storagePath: storageRef.fullPath
                });
            }

            showToast(`تمت إضافة ${filesToUpload.length} ملفات بنجاح!`, '#28a745');
            addContentForm.reset();
            buildAndRenderPreview();
            selectedSectionSpan.textContent = "اختر قسمًا";
            selectedSectionSpan.dataset.value = 'none';
            modal.style.display = 'none';
            await renderCurriculum();
        } catch (error) {
            console.error('Failed to add content:', error);
            showToast('حدث خطأ أثناء إضافة الملفات', '#dc3545');
        }
    });

    // --- Rendering Logic ---
    async function renderCurriculum() {
        const allContent = [];
        const querySnapshot = await getDocs(curriculumCollection);
        querySnapshot.forEach((doc) => {
            allContent.push({ id: doc.id, ...doc.data() });
        });

        if (allContent.length === 0) {
            curriculumContainer.innerHTML = `
                <div class="placeholder-content">
                    <i class="fas fa-book-open"></i>
                    <h2>لا يوجد محتوى للمنهج بعد</h2>
                    <p>استخدم زر "إضافة محتوى" لبدء إضافة الملفات.</p>
                </div>`;
            return;
        }

        const contentBySection = allContent.reduce((acc, item) => {
            if (!acc[item.section]) acc[item.section] = [];
            acc[item.section].push(item);
            return acc;
        }, {});
        
        curriculumContainer.innerHTML = '';
        for (const section in contentBySection) {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'curriculum-section-item fade-in';
            sectionDiv.innerHTML = `
                <button class="section-header">
                    <span>${section}</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="section-content"></div>
            `;
            const contentDiv = sectionDiv.querySelector('.section-content');
            contentBySection[section].forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'content-item';
                let iconClass = 'fa-file';
                if (item.type.startsWith('image/')) iconClass = 'fa-file-image';
                if (item.type.startsWith('video/')) iconClass = 'fa-file-video';
                if (item.type === 'application/pdf') iconClass = 'fa-file-pdf';
                
                itemDiv.innerHTML = `
                    <i class="fas ${iconClass}"></i>
                    <span class="content-name">${item.name}</span>
                    <div class="content-actions">
                        <button class="view-btn" data-id="${item.id}"><i class="fas fa-eye"></i></button>
                        <button class="delete-btn" data-id="${item.id}"><i class="fas fa-trash"></i></button>
                    </div>
                `;
                contentDiv.appendChild(itemDiv);
            });
            curriculumContainer.appendChild(sectionDiv);
        }
        addContentEventListeners();
    }

    function addContentEventListeners() {
        // Accordion
        document.querySelectorAll('.section-header').forEach(header => {
            header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                const icon = header.querySelector('i');
                content.classList.toggle('active');
                icon.classList.toggle('fa-chevron-down');
                icon.classList.toggle('fa-chevron-up');
            });
        });

        // View button
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const docRef = doc(db, "grades", grade, "curriculum", id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    window.open(docSnap.data().url, '_blank');
                }
            });
        });

        // Delete button
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                if (confirm('هل أنت متأكد من حذف هذا العنصر؟')) {
                    const docRef = doc(db, "grades", grade, "curriculum", id);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const storageRef = ref(storage, docSnap.data().storagePath);
                        await deleteObject(storageRef);
                    }
                    await deleteDoc(docRef);
                    await renderCurriculum();
                    showToast('تم حذف العنصر بنجاح', '#28a745');
                }
            });
        });
    }
    
    function showToast(message, backgroundColor) {
        Toastify({
            text: message, duration: 3000, gravity: "top", position: 'right', backgroundColor: backgroundColor
        }).showToast();
    }
    
    // Initial Render
    renderCurriculum();
});
