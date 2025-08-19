document.addEventListener('DOMContentLoaded', () => {
    // Get grade from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const grade = urlParams.get('grade');

    // Load existing students data
    let students = JSON.parse(localStorage.getItem(`students-${grade}`)) || [];

    // Initialize payments if they don't exist
    students = students.map(student => {
        if (!student.payments) {
            student.payments = {
                'august': false, 'september': false, 'october': false,
                'november': false, 'december': false, 'january': false,
                'february': false, 'march': false, 'april': false,
                'may': false, 'june': false
            };
        }
        return student;
    });

    // Save updated students data
    localStorage.setItem(`students-${grade}`, JSON.stringify(students));

    // Get grade title
    const gradeTitle = document.getElementById('gradeTitle');
    const gradeTitles = {
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

    // Delete all button
    document.querySelector('.delete-all').addEventListener('click', () => {
        if (confirm('هل أنت متأكد من حذف جميع الطلاب؟')) {
            localStorage.removeItem(`students-${grade}`);
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
    document.getElementById('addStudentForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('studentName').value.trim();

        if (name) {
            const students = JSON.parse(localStorage.getItem(`students-${grade}`)) || [];
            const payments = {};
            months.forEach(month => {
                payments[month] = false;
            });
            
            students.push({ name, payments });
            localStorage.setItem(`students-${grade}`, JSON.stringify(students));
            
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
        const searchTerm = e.target.value.toLowerCase();
        const rows = Array.from(studentsTableBody.getElementsByTagName('tr'));
        
        // Clear previous highlights
        matchedRows.forEach(row => {
            row.classList.remove('highlight');
        });
        matchedRows = [];

        if (searchTerm) {
            // Find matching rows
            const matches = rows.filter(row => {
                const studentNumber = row.cells[0].textContent;
                const studentName = row.cells[1].textContent.toLowerCase();
                return studentName.includes(searchTerm) || studentNumber.includes(searchTerm);
            });

            // Move matches to top and highlight them
            matches.forEach(row => {
                studentsTableBody.insertBefore(row, studentsTableBody.firstChild);
                row.classList.add('highlight');
                matchedRows.push(row);
            });
        } else {
            // When search is cleared, restore original order
            rows.sort((a, b) => {
                const aIndex = parseInt(a.cells[0].textContent);
                const bIndex = parseInt(b.cells[0].textContent);
                return aIndex - bIndex;
            });
            
            rows.forEach(row => {
                studentsTableBody.appendChild(row);
            });
        }
    });

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
    function updateStudentsTable() {
        const students = JSON.parse(localStorage.getItem(`students-${grade}`)) || [];
        const monthNames = {
            'august': 'اغسطس',  
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
        };

        studentsTableBody.innerHTML = students.map((student, index) => `
            <tr>
                <td data-label="رقم">${index + 1}</td>
                <td data-label="اسم الطالب">${student.name || ''}</td>
                ${months.map(month => `
                    <td data-label="${monthNames[month]}">
                        <div class="payment-circle ${student.payments?.[month] ? 'paid' : ''}" 
                             data-index="${index}" 
                             data-month="${month}">
                            ${student.payments?.[month] ? 'تم الدفع' : ''}
                        </div>
                    </td>
                `).join('')}
                <td data-label="إجراءات" class="student-actions">
                    <button class="student-action-btn edit-btn" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="student-action-btn delete-btn" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        // Update payment status and save to localStorage
        document.querySelectorAll('.payment-circle').forEach(circle => {
            circle.addEventListener('click', () => {
                const index = parseInt(circle.dataset.index);
                const month = circle.dataset.month;
                const students = JSON.parse(localStorage.getItem(`students-${grade}`)) || [];
                
                if (students[index]) {
                    if (!students[index].payments) {
                        students[index].payments = {};
                    }
                    students[index].payments[month] = !students[index].payments[month];
                    localStorage.setItem(`students-${grade}`, JSON.stringify(students));
                    
                    if (students[index].payments[month]) {
                        circle.classList.add('paid');
                        circle.textContent = 'تم الدفع';
                        
                        // Remove from defaulters if payment is made
                        const defaulters = JSON.parse(localStorage.getItem(`defaulters-${grade}`)) || [];
                        const defaulterIndex = defaulters.findIndex(d => d.studentNumber === (index + 1));
                        
                        if (defaulterIndex !== -1) {
                            const monthIndex = defaulters[defaulterIndex].months.indexOf(month);
                            if (monthIndex !== -1) {
                                defaulters[defaulterIndex].months.splice(monthIndex, 1);
                                
                                // Only remove from defaulters list if no unpaid months remain
                                if (defaulters[defaulterIndex].months.length === 0) {
                                    defaulters.splice(defaulterIndex, 1);
                                }
                                
                                localStorage.setItem(`defaulters-${grade}`, JSON.stringify(defaulters));
                            }
                        }
                    } else {
                        circle.classList.remove('paid');
                        circle.textContent = '';
                        
                        // Check current date against payment month
                        const today = new Date();
                        const monthIndex = {
                            'january': 0, 'february': 1, 'march': 2, 'april': 3,
                            'may': 4, 'june': 5, 'july': 6, 'august': 7,
                            'september': 8, 'october': 9, 'november': 10, 'december': 11
                        };
                        
                        const monthDate = new Date(today.getFullYear(), monthIndex[month], 3);
                        
                        // Add to defaulters if we're past the 3rd of the month
                        if (today >= monthDate) {
                            const defaulters = JSON.parse(localStorage.getItem(`defaulters-${grade}`)) || [];
                            const existingDefaulter = defaulters.find(d => d.studentNumber === (index + 1));
                            
                            if (existingDefaulter) {
                                if (!existingDefaulter.months.includes(month)) {
                                    existingDefaulter.months.push(month);
                                }
                            } else {
                                defaulters.push({
                                    id: Date.now().toString() + index,
                                    studentNumber: index + 1,
                                    name: students[index].name,
                                    months: [month]
                                });
                            }
                            
                            localStorage.setItem(`defaulters-${grade}`, JSON.stringify(defaulters));
                        }
                    }
                }
            });
        });

        // Add edit and delete handlers
        document.querySelectorAll('.edit-btn').forEach((btn, index) => {
            btn.addEventListener('click', () => {
                const students = JSON.parse(localStorage.getItem(`students-${grade}`));
                const newName = prompt('أدخل اسم الطالب الجديد:', students[index].name);
                
                if (newName && newName.trim()) {
                    students[index].name = newName.trim();
                    localStorage.setItem(`students-${grade}`, JSON.stringify(students));
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

        document.querySelectorAll('.delete-btn').forEach((btn, index) => {
            btn.addEventListener('click', (e) => {
                const row = e.target.closest('tr');
                const index = Array.from(studentsTableBody.children).indexOf(row);
                const students = JSON.parse(localStorage.getItem(`students-${grade}`)) || [];
                
                if (confirm('هل أنت متأكد من حذف هذا الطالب؟')) {
                    // Get the defaulters list
                    const defaulters = JSON.parse(localStorage.getItem(`defaulters-${grade}`)) || [];
                    
                    // Find and remove student from defaulters list
                    const studentDefaulterIndex = defaulters.findIndex(d => d.studentNumber === (index + 1));
                    if (studentDefaulterIndex !== -1) {
                        defaulters.splice(studentDefaulterIndex, 1);
                        localStorage.setItem(`defaulters-${grade}`, JSON.stringify(defaulters));
                    }

                    // Clear the student's name but keep the row
                    students[index].name = '';
                    localStorage.setItem(`students-${grade}`, JSON.stringify(students));
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
    }

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

    // Check for defaulters
    function checkDefaulters() {
        const today = new Date();
        const students = JSON.parse(localStorage.getItem(`students-${grade}`)) || [];
        const defaulters = JSON.parse(localStorage.getItem(`defaulters-${grade}`)) || [];
        
        const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                          'july', 'august', 'september', 'october', 'november', 'december'];
        
        // Check all months for unpaid fees after the 3rd
        monthNames.forEach(month => {
            const monthIndex = monthNames.indexOf(month);
            const monthDate = new Date(today.getFullYear(), monthIndex, 3);
            
            if (today >= monthDate) {
                students.forEach((student, index) => {
                    if (student.name && !student.payments[month]) {
                        const existingDefaulter = defaulters.find(d => d.studentNumber === (index + 1));
                        
                        if (existingDefaulter) {
                            if (!existingDefaulter.months.includes(month)) {
                                existingDefaulter.months.push(month);
                            }
                        } else {
                            defaulters.push({
                                id: Date.now().toString() + index,
                                studentNumber: index + 1,
                                name: student.name,
                                months: [month]
                            });
                        }
                    }
                });
            }
        });
        
        localStorage.setItem(`defaulters-${grade}`, JSON.stringify(defaulters));
    }

    // Check defaulters more frequently
    setInterval(checkDefaulters, 60000); // Check every minute
    window.addEventListener('focus', checkDefaulters); // Check when window gets focus
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            checkDefaulters();
        }
    });

    // Run initial check on page load
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
});