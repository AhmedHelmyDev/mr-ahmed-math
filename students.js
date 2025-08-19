import { db } from './firebase-config.js';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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

    // Get grade from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const grade = urlParams.get('grade');
    const studentsCollection = collection(db, "grades", grade, "students");

    // Load existing students data
    let students = [];
    const querySnapshot = await getDocs(studentsCollection);
    querySnapshot.forEach((doc) => {
        students.push({ id: doc.id, ...doc.data() });
    });

    // Get grade title
    const gradeTitle = document.getElementById('gradeTitle');
    const gradeTitles = {
        'prim1': 'الصف الأول الابتدائي',
        'prim2': 'الصف الثاني الابتدائي', 
        'prim3': 'الصف الثالث الابتدائي',
        'prim4': 'الصف الرابع الابتدائي',
        'prim5': 'الصف الخامس الابتدائي',
        'prim6': 'الصف السادس الابتدائي',
        'prep1': 'الصف الأول الاعدادي',
        'prep2': 'الصف الثاني الاعدادي',
        'prep3': 'الصف الثالث الاعدادي',
        'sec1': 'الصف الأول الثانوي',
        'sec2': 'الصف الثاني الثانوي',
        'sec3': 'الصف الثالث الثانوي'
    };

    // Handle custom stages
    if (grade.startsWith('custom')) {
        const customStages = JSON.parse(localStorage.getItem('customStages')) || [];
        const customIndex = parseInt(grade.replace('custom', ''));
        if (customStages[customIndex]) {
            gradeTitle.textContent = customStages[customIndex].name;
        }
    } else {
        gradeTitle.textContent = gradeTitles[grade] || 'إدارة الطلاب';
    }

    // Get elements
    const addStudentModal = document.getElementById('addStudentModal');
    const addNotesModal = document.getElementById('addNotesModal');
    const newNoteModal = document.getElementById('newNoteModal');
    const viewNotesModal = document.getElementById('viewNotesModal');
    const closeButtons = document.querySelectorAll('.close-btn');
    const studentsTableBody = document.getElementById('studentsTableBody');
    const addNoteBtn = document.querySelector('.add-note-btn');
    const viewNotesBtn = document.querySelector('.view-notes-btn');

    // Months array
    const months = ['august', 'september', 'october', 'november', 'december', 
                   'january', 'february', 'march', 'april', 'may', 'june'];

    // Add student button
    document.querySelector('.add-student').addEventListener('click', () => {
        addStudentModal.style.display = 'block';
    });

    // Add notes button
    document.querySelector('.add-notes').addEventListener('click', () => {
        addNotesModal.style.display = 'block';
    });

    // Add note button click handler
    if (addNoteBtn) {
        addNoteBtn.addEventListener('click', () => {
            if (newNoteModal) {
                newNoteModal.style.display = 'block';
            }
        });
    }

    // Handle add note button click
    if (addNoteBtn) {
        addNoteBtn.addEventListener('click', () => {
            if (addNotesModal) addNotesModal.style.display = 'none';
            if (newNoteModal) newNoteModal.style.display = 'block';
        });
    }

    // Handle view notes button click
    if (viewNotesBtn) {
        viewNotesBtn.addEventListener('click', () => {
            const urlParams = new URLSearchParams(window.location.search);
            const grade = urlParams.get('grade');
            if (grade) {
                window.location.href = `notes.html?grade=${grade}`;
            }
        });
    }

    document.querySelector('.delete-all').addEventListener('click', async () => {
        if (confirm('هل أنت متأكد من حذف جميع الطلاب؟ هذا الإجراء لا يمكن التراجع عنه.')) {
            const studentsSnapshot = await getDocs(studentsCollection);
            const examsCollection = collection(db, "grades", grade, "exams");
            const absencesCollection = collection(db, "grades", grade, "absences");

            for (const studentDoc of studentsSnapshot.docs) {
                await deleteDoc(studentDoc.ref);
                const examDocRef = doc(examsCollection, studentDoc.id);
                await deleteDoc(examDocRef);
            }

            const absencesSnapshot = await getDocs(absencesCollection);
            for (const absenceDoc of absencesSnapshot.docs) {
                await deleteDoc(absenceDoc.ref);
            }

            students = [];
            updateStudentsTable();

            Toastify({
                text: "تم حذف جميع الطلاب بنجاح",
                duration: 3000,
                gravity: "top",
                position: 'right',
                backgroundColor: "#dc3545"
            }).showToast();
        }
    });

    // Close modals
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            addStudentModal.style.display = 'none';
            addNotesModal.style.display = 'none';
            newNoteModal.style.display = 'none';
            viewNotesModal.style.display = 'none';
        });
    });

    // Close modals with close button
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            newNoteModal.style.display = 'none';
            viewNotesModal.style.display = 'none';
            addNotesModal.style.display = 'none';
        });
    });

    // Close modals when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === newNoteModal) newNoteModal.style.display = 'none';
        if (event.target === viewNotesModal) viewNotesModal.style.display = 'none';
        if (event.target === addNotesModal) addNotesModal.style.display = 'none';
    });

    // Add student form submission
    document.getElementById('addStudentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('studentName');
        const name = nameInput.value.trim();

        if (name) {
            const q = query(studentsCollection, where("name", "==", name));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                Toastify({
                    text: "هذا الطالب موجود بالفعل",
                    duration: 3000,
                    gravity: "top",
                    position: 'right',
                    backgroundColor: "#dc3545" // Red for error
                }).showToast();
                return; // Stop the function
            }

            const payments = {};
            months.forEach(month => {
                payments[month] = false;
            });

            const newStudent = {
                name,
                payments
            };

            const docRef = await addDoc(studentsCollection, newStudent);
            students.push({ id: docRef.id, ...newStudent });

            document.getElementById('addStudentForm').reset();
            addStudentModal.style.display = 'none';
            updateStudentsTable();

            Toastify({
                text: "تم إضافة الطالب بنجاح",
                duration: 3000,
                gravity: "top",
                position: 'right',
                backgroundColor: "#28a745"
            }).showToast();
        }
    });

    // Add search functionality
    const searchInput = document.getElementById('studentSearch');
    let matchedRows = [];

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.trim();
        const rows = Array.from(studentsTableBody.getElementsByTagName('tr'));
        
        // Clear previous highlights
        matchedRows.forEach(row => {
            row.classList.remove('highlight');
        });
        matchedRows = [];

        // Restore original order if search is empty
        if (!searchTerm) {
            rows.sort((a, b) => {
                const aIndex = parseInt(a.cells[0].querySelector('.student-number').textContent);
                const bIndex = parseInt(b.cells[0].querySelector('.student-number').textContent);
                return aIndex - bIndex;
            });
            
            rows.forEach(row => {
                studentsTableBody.appendChild(row);
            });
            return;
        }

        // Find exact matches
        const matches = rows.filter(row => {
            const studentNumber = row.cells[0].querySelector('.student-number').textContent;
            const studentName = row.cells[1].textContent;
            
            // Check if searching for a number
            if (/^\d+$/.test(searchTerm)) {
                return studentNumber === searchTerm;
            }
            
            // Check for exact character match in name
            return studentName.includes(searchTerm);
        });

        if (matches.length > 0) {
            // Move matches to top and highlight them
            matches.forEach(row => {
                studentsTableBody.insertBefore(row, studentsTableBody.firstChild);
                row.classList.add('highlight');
                matchedRows.push(row);
            });
        } else {
            // Show "no results" toast notification
            showToast("لم يتم العثور على الطالب", "#dc3545");
            
            // Restore original order
            rows.sort((a, b) => {
                const aIndex = parseInt(a.cells[0].querySelector('.student-number').textContent);
                const bIndex = parseInt(b.cells[0].querySelector('.student-number').textContent);
                return aIndex - bIndex;
            });
            
            rows.forEach(row => {
                studentsTableBody.appendChild(row);
            });
        }
    });

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

    // Handle note type selection
    const typeButtons = document.querySelectorAll('.type-btn');
    const imageInput = document.querySelector('.image-input-container');
    
    typeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            typeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            imageInput.style.display = btn.dataset.type === 'image' ? 'block' : 'none';
            if (btn.dataset.type === 'image') {
                document.getElementById('noteContent').placeholder = 'اكتب وصفاً للصورة...';
            } else {
                document.getElementById('noteContent').placeholder = 'اكتب ملاحظتك هنا...';
            }
        });
    });

    // Handle image preview
    function handleImagePreview(input, previewId) {
        const file = input.files[0];
        const preview = document.getElementById(previewId);
        const noteContent = document.getElementById('noteContent');
        
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                // Scroll to the note content textarea
                noteContent.scrollIntoView({ behavior: 'smooth' });
            };
            reader.readAsDataURL(file);
        }
    }

    document.getElementById('noteImage').addEventListener('change', function() {
        handleImagePreview(this, 'imagePreview');
    });

    document.getElementById('editNoteImage').addEventListener('change', function() {
        handleImagePreview(this, 'editImagePreview');
    });

    // Add new note
    document.getElementById('addNoteForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const content = document.getElementById('noteContent').value.trim();
        const imageInput = document.getElementById('noteImage');
        const isImageNote = document.querySelector('.type-btn[data-type="image"]').classList.contains('active');
        
        if (content || (isImageNote && imageInput.files[0])) {
            const notes = JSON.parse(localStorage.getItem(`notes-${grade}`)) || [];
            const newNote = {
                id: Date.now(),
                content: content,
                date: new Date().toLocaleDateString('ar-EG'),
                time: new Date().toLocaleTimeString('ar-EG')
            };

            if (isImageNote && imageInput.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    newNote.image = e.target.result;
                    notes.push(newNote);
                    localStorage.setItem(`notes-${grade}`, JSON.stringify(notes));
                    
                    // Reset form and close modal
                    document.getElementById('addNoteForm').reset();
                    document.getElementById('imagePreview').innerHTML = '';
                    newNoteModal.style.display = 'none';
                    
                    updateNotesList();
                    
                    Toastify({
                        text: "تم إضافة الملاحظة والصورة بنجاح",
                        duration: 3000,
                        gravity: "top",
                        position: 'right',
                        backgroundColor: "#28a745"
                    }).showToast();
                };
                reader.readAsDataURL(imageInput.files[0]);
            } else {
                notes.push(newNote);
                localStorage.setItem(`notes-${grade}`, JSON.stringify(notes));
                
                // Reset form and close modal
                document.getElementById('addNoteForm').reset();
                newNoteModal.style.display = 'none';
                
                updateNotesList();
                
                Toastify({
                    text: "تم إضافة الملاحظة بنجاح",
                    duration: 3000,
                    gravity: "top",
                    position: 'right',
                    backgroundColor: "#28a745"
                }).showToast();
            }
        }
    });

    // Update students table
    function getStudentNotes() {
        return JSON.parse(localStorage.getItem(`student-notes-${grade}`)) || {};
    }

    function saveStudentNotes(notes) {
        localStorage.setItem(`student-notes-${grade}`, JSON.stringify(notes));
    }

    function handleStudentNote(studentIndex, existingNote = '') {
        const noteModal = document.getElementById('studentNoteModal');
        const noteTextarea = document.getElementById('studentNoteText');
        const noteForm = document.getElementById('studentNoteForm');
        
        noteTextarea.value = existingNote;
        noteModal.style.display = 'block';
        
        noteForm.onsubmit = (e) => {
            e.preventDefault();
            const notes = getStudentNotes();
            const noteText = noteTextarea.value.trim();
            
            if (noteText) {
                notes[studentIndex] = noteText;
            } else {
                delete notes[studentIndex];
            }
            
            saveStudentNotes(notes);
            noteModal.style.display = 'none';
            updateStudentsTable();
            
            showToast("تم حفظ الملاحظة بنجاح", "#28a745");
        };
    }

    async function updateStudentsTable() {
        const notes = getStudentNotes();
        
        studentsTableBody.innerHTML = students.map((student, index) => `
            <tr>
                <td data-label="رقم">
                    <span class="student-number">${index + 1}</span>
                    <span class="note-dot ${notes[student.id] ? 'has-note' : ''}" 
                          data-id="${student.id}" 
                          title="${notes[student.id] ? 'عرض الملاحظة' : 'إضافة ملاحظة'}">
                        <i class="fas fa-circle"></i>
                    </span>
                </td>
                <td data-label="اسم الطالب">${student.name || ''}</td>
                ${months.map(month => `
                    <td data-label="${{
                        'august': 'أغسطس',  
                        'september': 'سبتمبر',
                        'october': 'أكتوبر',
                        'november': 'نوفمبر',
                        'december': 'ديسمبر',
                        'january': 'يناير',
                        'february': 'فبراير',
                        'march': 'مارس',
                        'april': 'أبريل',
                        'may': 'مايو',
                        'june': 'يونيو'
                    }[month]}">
                        <div class="payment-circle ${student.payments?.[month] ? 'paid' : ''}" 
                             data-id="${student.id}" 
                             data-month="${month}">
                            ${student.payments?.[month] ? 'تم الدفع' : ''}
                        </div>
                    </td>
                `).join('')}
                <td data-label="إجراءات" class="student-actions">
                    <button class="student-action-btn edit-btn" data-id="${student.id}" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="student-action-btn delete-btn" data-id="${student.id}" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        // Update payment status and save to firestore
        document.querySelectorAll('.payment-circle').forEach(circle => {
            circle.addEventListener('click', async () => {
                const studentId = circle.dataset.id;
                const month = circle.dataset.month;
                const student = students.find(s => s.id === studentId);
                
                if (student) {
                    if (!student.payments) {
                        student.payments = {};
                    }
                    student.payments[month] = !student.payments[month];
                    
                    const studentDoc = doc(db, "grades", grade, "students", studentId);
                    await updateDoc(studentDoc, {
                        payments: student.payments
                    });
                    
                    if (student.payments[month]) {
                        circle.classList.add('paid');
                        circle.textContent = 'تم الدفع';
                    } else {
                        circle.classList.remove('paid');
                        circle.textContent = '';
                    }
                }
            });
        });

        // Add edit and delete handlers
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const studentId = btn.dataset.id;
                const student = students.find(s => s.id === studentId);
                const newName = prompt('أدخل اسم الطالب الجديد:', student.name);
                
                if (newName && newName.trim()) {
                    const studentDoc = doc(db, "grades", grade, "students", studentId);
                    await updateDoc(studentDoc, {
                        name: newName.trim()
                    });
                    student.name = newName.trim();
                    updateStudentsTable();
                    
                    Toastify({
                        text: "تم تعديل اسم الطالب بنجاح",
                        duration: 3000,
                        gravity: "top",
                        position: 'right',
                        backgroundColor: "#28a745"
                    }).showToast();
                }
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const studentId = btn.dataset.id;
                
                if (confirm('هل أنت متأكد من حذف هذا الطالب؟')) {
                    await deleteDoc(doc(db, "grades", grade, "students", studentId));
                    students = students.filter(s => s.id !== studentId);
                    updateStudentsTable();
                    
                    Toastify({
                        text: "تم حذف الطالب بنجاح",
                        duration: 3000,
                        gravity: "top",
                        position: 'right',
                        backgroundColor: "#dc3545"
                    }).showToast();
                }
            });
        });

        // Add event listeners for note dots
        document.querySelectorAll('.note-dot').forEach(dot => {
            dot.addEventListener('click', (e) => {
                const studentId = e.target.closest('.note-dot').dataset.id;
                const notes = getStudentNotes();
                handleStudentNote(studentId, notes[studentId] || '');
            });
        });
    }

    document.querySelector('#studentNoteModal .close-btn')?.addEventListener('click', () => {
        document.getElementById('studentNoteModal').style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        const noteModal = document.getElementById('studentNoteModal');
        if (event.target === noteModal) {
            noteModal.style.display = 'none';
        }
    });

    // Update notes list
    function updateNotesList() {
        const notesList = document.getElementById('notesList');
        const notes = JSON.parse(localStorage.getItem(`notes-${grade}`)) || [];
        
        notesList.innerHTML = notes.length ? '' : '<p class="no-notes">لا توجد ملاحظات حتى الآن</p>';
        
        notes.reverse().forEach((note, index) => {
            const noteElement = document.createElement('div');
            noteElement.className = 'note-item';
            noteElement.style.animationDelay = `${index * 0.1}s`; 
            noteElement.innerHTML = `
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
            `;
            notesList.appendChild(noteElement);
        });

        document.querySelectorAll('.note-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const noteItem = e.target.closest('.note-item');
                noteItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
        });

        document.querySelectorAll('.edit-note').forEach(btn => {
            btn.addEventListener('click', () => {
                const noteId = parseInt(btn.dataset.id);
                const notes = JSON.parse(localStorage.getItem(`notes-${grade}`)) || [];
                const note = notes.find(n => n.id === noteId);
                
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
                    
                    document.getElementById('editNoteForm').onsubmit = (e) => {
                        e.preventDefault();
                        const newContent = editContent.value.trim();
                        const editImageInput = document.getElementById('editNoteImage');
                        
                        if (newContent) {
                            if (editImageInput.files[0]) {
                                const reader = new FileReader();
                                reader.onload = function(e) {
                                    note.image = e.target.result;
                                    note.content = newContent;
                                    localStorage.setItem(`notes-${grade}`, JSON.stringify(notes));
                                    editModal.style.display = 'none';
                                    updateNotesList();
                                    
                                    Toastify({
                                        text: "تم تحديث الملاحظة بنجاح",
                                        duration: 3000,
                                        gravity: "top",
                                        position: 'right',
                                        backgroundColor: "#28a745"
                                    }).showToast();
                                };
                                reader.readAsDataURL(editImageInput.files[0]);
                            } else {
                                note.content = newContent;
                                localStorage.setItem(`notes-${grade}`, JSON.stringify(notes));
                                editModal.style.display = 'none';
                                updateNotesList();
                                
                                Toastify({
                                    text: "تم تحديث الملاحظة بنجاح",
                                    duration: 3000,
                                    gravity: "top",
                                    position: 'right',
                                    backgroundColor: "#28a745"
                                }).showToast();
                            }
                        }
                    };
                }
            });
        });

        document.querySelectorAll('.delete-note').forEach(btn => {
            btn.addEventListener('click', () => {
                const noteId = parseInt(btn.dataset.id);
                if (confirm('هل أنت متأكد من حذف هذه الملاحظة؟')) {
                    const notes = JSON.parse(localStorage.getItem(`notes-${grade}`)) || [];
                    const updatedNotes = notes.filter(note => note.id !== noteId);
                    localStorage.setItem(`notes-${grade}`, JSON.stringify(updatedNotes));
                    updateNotesList();
                    
                    Toastify({
                        text: "تم حذف الملاحظة بنجاح",
                        duration: 3000,
                        gravity: "top",
                        position: 'right',
                        backgroundColor: "#dc3545"
                    }).showToast();
                }
            });
        });
    }

    // Update the keyboard creation function
    function createVirtualKeyboard() {
        const keyboard = document.querySelector('.virtual-keyboard');
        if (!keyboard) return;

        const keyboardLayout = [
            ['١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩', '٠'],
            ['ق', 'و', 'ع', 'ر', 'ت', 'ي', 'و', 'ي', 'ه', 'خ'],
            ['ض', 'ص', 'ث', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج', 'د'],
            ['ط', 'ك', 'م', 'ن', 'ت', 'ا', 'ل', 'ب', 'ي', 'س', 'ش'],
            ['ظ', 'ز', 'و', 'ة', 'ى', 'لا', 'ر', 'ؤ', 'ء', 'ئ']
        ];

        let currentInput = null;
        keyboard.innerHTML = '';

        keyboardLayout.forEach(row => {
            const keyboardRow = document.createElement('div');
            keyboardRow.className = 'keyboard-row';
            
            row.forEach(key => {
                const keyButton = document.createElement('button');
                keyButton.className = 'keyboard-key';
                // Convert Arabic numerals to English for display
                const displayKey = /[٠-٩]/.test(key) ? String.fromCharCode(key.charCodeAt(0) - 1632 + 48) : key;
                keyButton.textContent = displayKey;
                keyButton.type = 'button';
                keyButton.addEventListener('click', () => {
                    if (currentInput) {
                        const start = currentInput.selectionStart;
                        const end = currentInput.selectionEnd;
                        const value = currentInput.value;
                        currentInput.value = value.slice(0, start) + displayKey + value.slice(end);
                        currentInput.focus();
                        currentInput.setSelectionRange(start + 1, start + 1);

                        // Trigger input event for search functionality
                        if (currentInput.id === 'studentSearch') {
                            const event = new Event('input', {
                                bubbles: true,
                                cancelable: true,
                            });
                            currentInput.dispatchEvent(event);
                        }
                    }
                });
                keyboardRow.appendChild(keyButton);
            });
            keyboard.appendChild(keyboardRow);
        });

        // Add control row with backspace and space
        const controlRow = document.createElement('div');
        controlRow.className = 'keyboard-row';

        const backspace = document.createElement('button');
        backspace.className = 'keyboard-key backspace';
        backspace.innerHTML = '<i class="fas fa-backspace"></i>';
        backspace.type = 'button';
        backspace.addEventListener('click', () => {
            if (currentInput) {
                const start = currentInput.selectionStart;
                const end = currentInput.selectionEnd;
                const value = currentInput.value;
                if (start === end && start > 0) {
                    currentInput.value = value.slice(0, start - 1) + value.slice(end);
                    currentInput.setSelectionRange(start - 1, start - 1);
                } else {
                    currentInput.value = value.slice(0, start) + value.slice(end);
                    currentInput.setSelectionRange(start, start);
                }
                currentInput.focus();

                // Trigger input event for search functionality
                if (currentInput.id === 'studentSearch') {
                    const event = new Event('input', {
                        bubbles: true,
                        cancelable: true,
                    });
                    currentInput.dispatchEvent(event);
                }
            }
        });

        const space = document.createElement('button');
        space.className = 'keyboard-key space';
        space.textContent = 'مسافة';
        space.type = 'button';
        space.addEventListener('click', () => {
            if (currentInput) {
                const start = currentInput.selectionStart;
                const end = currentInput.selectionEnd;
                const value = currentInput.value;
                currentInput.value = value.slice(0, start) + ' ' + value.slice(end);
                currentInput.focus();
                currentInput.setSelectionRange(start + 1, start + 1);

                // Trigger input event for search functionality
                if (currentInput.id === 'studentSearch') {
                    const event = new Event('input', {
                        bubbles: true,
                        cancelable: true,
                    });
                    currentInput.dispatchEvent(event);
                }
            }
        });

        controlRow.appendChild(backspace);
        controlRow.appendChild(space);
        keyboard.appendChild(controlRow);

        // Handle keyboard button clicks
        document.querySelectorAll('.keyboard-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.target;
                currentInput = document.getElementById(targetId);
                const keyboardModal = document.getElementById('virtualKeyboardModal');
                if (keyboardModal) {
                    keyboardModal.style.display = 'block';
                    if (currentInput) {
                        currentInput.focus();
                    }
                }
            });
        });

        // Make keyboard draggable
        const keyboardContent = document.querySelector('.keyboard-modal .modal-content');
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        if (keyboardContent) {
            keyboardContent.addEventListener('mousedown', dragStart);
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', dragEnd);
        }

        function dragStart(e) {
            if (e.target.classList.contains('keyboard-key')) return;
            
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;

            if (e.target === keyboardContent || e.target.closest('.keyboard-header')) {
                isDragging = true;
            }
        }

        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;

                xOffset = currentX;
                yOffset = currentY;

                setTranslate(currentX, currentY, keyboardContent);
            }
        }

        function setTranslate(xPos, yPos, el) {
            el.style.transform = `translate(${xPos}px, ${yPos}px)`;
        }

        function dragEnd() {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
        }

        // Close keyboard when clicking outside
        document.addEventListener('click', (e) => {
            const keyboardModal = document.getElementById('virtualKeyboardModal');
            if (keyboardModal && !e.target.closest('.modal-content') && !e.target.closest('.keyboard-btn')) {
                keyboardModal.style.display = 'none';
            }
        });

        return { setCurrentInput: (input) => { currentInput = input; } };
    }

    // Make sure to create keyboard if needed
    const needsKeyboard = document.querySelector('.virtual-keyboard');
    if (needsKeyboard) {
        createVirtualKeyboard();
    }

    // Get empty cells modal elements
    const emptyCellsModal = document.getElementById('emptyCellsModal');
    const emptyCellsList = document.getElementById('emptyCellsList');
    const emptyCellsBtn = document.querySelector('.empty-cells');

    // Empty cells button click handler
    if (emptyCellsBtn) {
        emptyCellsBtn.addEventListener('click', () => {
            updateEmptyCellsList();
            emptyCellsModal.style.display = 'block';
        });
    }

    // Function to update empty cells list
    function updateEmptyCellsList() {
        const students = JSON.parse(localStorage.getItem(`students-${grade}`)) || [];
        const emptyCells = students
            .map((student, index) => ({ index: index + 1, name: student.name }))
            .filter(student => !student.name);

        if (emptyCellsList) {
            if (emptyCells.length === 0) {
                emptyCellsList.innerHTML = '<div class="empty-message">لا توجد مربعات خالية</div>';
            } else {
                emptyCellsList.innerHTML = emptyCells
                    .map(cell => `
                        <div class="empty-cell-item">
                            <span class="cell-number">المربع رقم: ${cell.index}</span>
                        </div>
                    `).join('');
            }
        }
    }

    // Update empty cells list when adding/editing students
    const originalUpdateStudentsTable = updateStudentsTable;
    updateStudentsTable = function() {
        originalUpdateStudentsTable();
        updateEmptyCellsList();
    };

    // Close empty cells modal with X button
    if (emptyCellsModal) {
        emptyCellsModal.querySelector('.close-btn')?.addEventListener('click', () => {
            emptyCellsModal.style.display = 'none';
        });
    }

    // Close empty cells modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === emptyCellsModal) {
            emptyCellsModal.style.display = 'none';
        }
    });

    // Add empty cells modal to the escape key handler
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && emptyCellsModal) {
            emptyCellsModal.style.display = 'none';
        }
    });

    // Add defaulters button handler
    document.querySelector('.defaulters').addEventListener('click', () => {
        window.location.href = `defaulters.html?grade=${grade}`;
    });

    // Add this function to check for defaulters
    function checkDefaulters() {
        const today = new Date();
        const currentMonth = today.getMonth();
        const students = JSON.parse(localStorage.getItem(`students-${grade}`)) || [];
        const defaulters = JSON.parse(localStorage.getItem(`defaulters-${grade}`)) || [];
        
        const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                           'july', 'august', 'september', 'october', 'november', 'december'];
        
        const currentMonthName = monthNames[currentMonth];
        
        students.forEach((student, index) => {
            if (student.name) {
                const indexPlusOne = index + 1;
                const unpaidMonths = [];
                
                // Check for current month if past day 3
                if (today.getDate() >= 3 && !student.payments[currentMonthName]) {
                    unpaidMonths.push(currentMonthName);
                }
                
                // Check for all previous months in the academic year
                monthNames.forEach(month => {
                    const monthIndex = monthNames.indexOf(month);
                    // Only check months up to current month
                    if (monthIndex !== currentMonth && !student.payments[month]) {
                        if ((monthIndex < currentMonth && monthIndex >= 7) || // August to current month
                            (currentMonth < 7 && (monthIndex >= 7 || monthIndex < currentMonth))) { // Wrap around for new year
                            unpaidMonths.push(month);
                        }
                    }
                });
                
                if (unpaidMonths.length > 0) {
                    const existingDefaulter = defaulters.find(d => d.studentNumber === indexPlusOne);
                    
                    if (existingDefaulter) {
                        // Add any new unpaid months
                        unpaidMonths.forEach(month => {
                            if (!existingDefaulter.months.includes(month)) {
                                existingDefaulter.months.push(month);
                            }
                        });
                        // Sort months chronologically from August
                        existingDefaulter.months.sort((a, b) => {
                            let aIndex = monthNames.indexOf(a);
                            let bIndex = monthNames.indexOf(b);
                            // Adjust indices for academic year starting in August
                            aIndex = aIndex < 7 ? aIndex + 12 : aIndex;
                            bIndex = bIndex < 7 ? bIndex + 12 : bIndex;
                            return aIndex - bIndex;
                        });
                    } else {
                        // Create new defaulter entry with sorted months
                        defaulters.push({
                            id: Date.now().toString() + index,
                            studentNumber: indexPlusOne,
                            name: student.name,
                            months: [...unpaidMonths].sort((a, b) => {
                                let aIndex = monthNames.indexOf(a);
                                let bIndex = monthNames.indexOf(b);
                                // Adjust indices for academic year starting in August
                                aIndex = aIndex < 7 ? aIndex + 12 : aIndex;
                                bIndex = bIndex < 7 ? bIndex + 12 : bIndex;
                                return aIndex - bIndex;
                            })
                        });
                    }
                }
            }
        });
        
        localStorage.setItem(`defaulters-${grade}`, JSON.stringify(defaulters));
    }

    setInterval(checkDefaulters, 60000); // Check every minute
    window.addEventListener('focus', checkDefaulters); // Check when window gets focus
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            checkDefaulters();
        }
    });

    // Check for defaulters on page load
    checkDefaulters();

    // Initialize table
    updateStudentsTable();

    document.querySelector('.view-notes-btn').addEventListener('click', () => {
        setTimeout(() => {
            const notesList = document.querySelector('.notes-list');
            if (notesList) {
                notesList.scrollTop = 0;
            }
        }, 100);
    });

    document.addEventListener('keydown', (e) => {
        const notesList = document.querySelector('.notes-list');
        if (notesList && notesList.matches(':hover')) {
            const scrollAmount = 100;
            if (e.key === 'ArrowUp') {
                notesList.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
            } else if (e.key === 'ArrowDown') {
                notesList.scrollBy({ top: scrollAmount, behavior: 'smooth' });
            }
        }
    });

    // Add exam button click handler
    document.querySelector('.exams').addEventListener('click', () => {
        const examsModal = document.getElementById('examsModal');
        if (examsModal) examsModal.style.display = 'block';
    });

    // Handle exam navigation buttons
    document.querySelector('.view-exams-btn')?.addEventListener('click', () => {
        window.location.href = `exams.html?grade=${grade}`;
    });

    document.querySelector('.view-absences-btn')?.addEventListener('click', () => {
        window.location.href = `absences.html?grade=${grade}`;
    });

    // Close exams modal
    document.querySelector('#examsModal .close-btn')?.addEventListener('click', () => {
        document.getElementById('examsModal').style.display = 'none';
    });

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        const examsModal = document.getElementById('examsModal');
        if (event.target === examsModal) {
            examsModal.style.display = 'none';
        }
    });

    // Add this event listener for the memos button
    document.querySelector('.memos').addEventListener('click', () => {
        const memosModal = document.getElementById('memosModal');
        if (memosModal) memosModal.style.display = 'block';
    });

    // Add memos modal to close handlers
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const memosModal = document.getElementById('memosModal');
            if (memosModal) memosModal.style.display = 'none';
        });
    });

    // Close memos modal when clicking outside
    window.addEventListener('click', (event) => {
        const memosModal = document.getElementById('memosModal');
        if (event.target === memosModal) {
            memosModal.style.display = 'none';
        }
    });

    // Add memos modal to escape key handler
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            const memosModal = document.getElementById('memosModal');
            if (memosModal) memosModal.style.display = 'none';
        }
    });

    // Handle First and Second Term buttons clicks in memos modal
    document.querySelectorAll('.memos-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const term = btn.classList.contains('first-term') ? '1' : '2';
            window.location.href = `memos.html?grade=${grade}&term=${term}`;
        });
    });

    // Add curriculum button click handler
    document.querySelector('.curriculum-btn')?.addEventListener('click', () => {
        // The user wants to show a "coming soon" message.
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'قيد التطوير',
                text: 'جاري العمل على هذه الميزة، سيتم إضافتها قريبًا!',
                icon: 'info',
                confirmButtonText: 'حسنًا',
                confirmButtonColor: '#0066cc'
            });
        } else {
            // Fallback to a simple alert
            alert('جاري العمل على هذه الميزة، سيتم إضافتها قريبًا!');
        }
    });
});
