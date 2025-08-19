import { db } from './firebase-config.js';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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

    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const grade = urlParams.get('grade');
    const notesCollection = collection(db, "grades", grade, "notes");

    if (!grade) {
        console.warn('No grade parameter found in URL');
        return;
    }

    // Get elements with null checks
    const notesList = document.getElementById('notesList');
    const newNoteModal = document.getElementById('newNoteModal');
    const editNoteModal = document.getElementById('editNoteModal');
    const addNotesModal = document.getElementById('addNotesModal');
    const viewNotesModal = document.getElementById('viewNotesModal');
    const closeButtons = document.querySelectorAll('.close-btn');
    const addNoteBtn = document.querySelector('.add-note-btn');

    // Add new note button handler
    if (addNoteBtn) {
        addNoteBtn.addEventListener('click', () => {
            if (newNoteModal) {
                newNoteModal.style.display = 'block';
            }
        });
    }

    // Close buttons handlers
    if (closeButtons) {
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                if (newNoteModal) newNoteModal.style.display = 'none';
                if (editNoteModal) editNoteModal.style.display = 'none';
                if (addNotesModal) addNotesModal.style.display = 'none';
                if (viewNotesModal) viewNotesModal.style.display = 'none';
            });
        });
    }

    // Handle type selection
    const typeButtons = document.querySelectorAll('.type-btn');
    const imageInput = document.querySelector('.image-input-container');
    
    if (typeButtons.length > 0 && imageInput) {
        typeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                typeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                imageInput.style.display = btn.dataset.type === 'image' ? 'block' : 'none';
                
                const noteContent = document.getElementById('noteContent');
                if (noteContent) {
                    noteContent.placeholder = btn.dataset.type === 'image' ? 
                        'اكتب وصفاً للصورة...' : 'اكتب ملاحظتك هنا...';
                }
            });
        });
    }

    // Image preview handlers
    const noteImage = document.getElementById('noteImage');
    const editNoteImage = document.getElementById('editNoteImage');
    
    if (noteImage) {
        noteImage.addEventListener('change', function() {
            handleImagePreview(this, 'imagePreview');
        });
    }
    
    if (editNoteImage) {
        editNoteImage.addEventListener('change', function() {
            handleImagePreview(this, 'editImagePreview');
        });
    }

    // Add new note form handler
    const addNoteForm = document.getElementById('addNoteForm');
    if (addNoteForm) {
        addNoteForm.addEventListener('submit', handleAddNote);
    }

    // Edit note form handler
    const editNoteForm = document.getElementById('editNoteForm');
    if (editNoteForm) {
        editNoteForm.addEventListener('submit', handleEditNoteSubmit);
    }

    // Initialize notes list if we're on the notes page
    if (notesList) {
        updateNotesList();
    }

    // Helper functions
    async function handleAddNote(e) {
        e.preventDefault();
        const content = document.getElementById('noteContent')?.value.trim();
        const imageInput = document.getElementById('noteImage');
        const isImageNote = document.querySelector('.type-btn[data-type="image"]')?.classList.contains('active');
        
        if (content || (isImageNote && imageInput?.files[0])) {
            const newNote = {
                content: content,
                date: new Date().toLocaleDateString('ar-EG'),
                time: new Date().toLocaleTimeString('ar-EG')
            };

            if (isImageNote && imageInput?.files[0]) {
                const reader = new FileReader();
                reader.onload = async function(e) {
                    newNote.image = e.target.result;
                    await addDoc(notesCollection, newNote);
                    
                    if (addNoteForm) addNoteForm.reset();
                    const imagePreview = document.getElementById('imagePreview');
                    if (imagePreview) imagePreview.innerHTML = '';
                    if (newNoteModal) newNoteModal.style.display = 'none';
                    
                    updateNotesList();
                    showToast("تم إضافة الملاحظة والصورة بنجاح", "#28a745");
                };
                reader.readAsDataURL(imageInput.files[0]);
            } else {
                await addDoc(notesCollection, newNote);
                
                if (addNoteForm) addNoteForm.reset();
                if (newNoteModal) newNoteModal.style.display = 'none';
                
                updateNotesList();
                showToast("تم إضافة الملاحظة بنجاح", "#28a745");
            }
        }
    }

    async function updateNotesList() {
        if (!notesList) return;
        
        const notes = [];
        const querySnapshot = await getDocs(notesCollection);
        querySnapshot.forEach((doc) => {
            notes.push({ id: doc.id, ...doc.data() });
        });
        
        if (notes.length === 0) {
            notesList.innerHTML = '<div class="empty-notes">لا توجد ملاحظات حتى الآن</div>';
            return;
        }
        
        notesList.innerHTML = notes.reverse().map((note, i) => `
            <div class="note-item fade-in" style="animation-delay: ${i * 50}ms">
                <div class="note-date">${note.date} - ${note.time}</div>
                ${note.image ? `<img src="${note.image}" class="note-image" alt="Note Image" loading="lazy">` : ''}
                <div class="note-content">${note.content}</div>
                <div class="note-actions">
                    <button class="note-btn edit-note" data-id="${note.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="note-btn delete-note" data-id="${note.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        addNoteEventListeners();
    }

    function addNoteEventListeners() {
        document.querySelectorAll('.edit-note').forEach(btn => {
            btn.addEventListener('click', handleEditNote);
        });
        
        document.querySelectorAll('.delete-note').forEach(btn => {
            btn.addEventListener('click', handleDeleteNote);
        });
    }

    async function handleEditNote(event) {
        const noteId = event.currentTarget.dataset.id;
        const noteDoc = doc(db, "grades", grade, "notes", noteId);
        const noteSnapshot = await getDoc(noteDoc);
        const note = noteSnapshot.data();
        
        if (note) {
            const editModal = document.getElementById('editNoteModal');
            const editContent = document.getElementById('editNoteContent');
            const editImageContainer = document.getElementById('editImageContainer');
            const editImagePreview = document.getElementById('editImagePreview');
            
            editContent.value = note.content;
            if (note.image) {
                editImageContainer.style.display = 'block';
                editImagePreview.innerHTML = `<img src="${note.image}" alt="Preview">`;
            } else {
                editImageContainer.style.display = 'none';
                editImagePreview.innerHTML = '';
            }
            
            editModal.style.display = 'block';
            document.getElementById('editNoteForm').dataset.id = noteId;
        }
    }

    async function handleDeleteNote(event) {
        const noteId = event.currentTarget.dataset.id;
        if (confirm('هل أنت متأكد من حذف هذه الملاحظة؟')) {
            await deleteDoc(doc(db, "grades", grade, "notes", noteId));
            updateNotesList();
            
            showToast("تم حذف الملاحظة بنجاح", "#dc3545");
        }
    }

    async function handleEditNoteSubmit(e) {
        e.preventDefault();
        const noteId = e.target.dataset.id;
        const newContent = document.getElementById('editNoteContent').value.trim();
        const editImageInput = document.getElementById('editNoteImage');
        
        if (newContent) {
            const noteDoc = doc(db, "grades", grade, "notes", noteId);
            const updatedNote = { content: newContent };

            if (editImageInput.files[0]) {
                const reader = new FileReader();
                reader.onload = async function(e) {
                    updatedNote.image = e.target.result;
                    await updateDoc(noteDoc, updatedNote);
                    editNoteModal.style.display = 'none';
                    updateNotesList();
                    
                    showToast("تم تحديث الملاحظة بنجاح", "#28a745");
                };
                reader.readAsDataURL(editImageInput.files[0]);
            } else {
                await updateDoc(noteDoc, updatedNote);
                editNoteModal.style.display = 'none';
                updateNotesList();
                
                showToast("تم تحديث الملاحظة بنجاح", "#28a745");
            }
        }
    }

    function handleImagePreview(input, previewId) {
        const file = input.files[0];
        const preview = document.getElementById(previewId);
        
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            };
            reader.readAsDataURL(file);
        }
    }

    function showToast(message, backgroundColor) {
        if (typeof Toastify === 'function') {
            Toastify({
                text: message,
                duration: 3000,
                gravity: "top",
                position: 'right',
                backgroundColor: backgroundColor
            }).showToast();
        }
    }
});
