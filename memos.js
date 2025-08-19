import { db } from './firebase-config.js';
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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

    // Get parameters from URL
    const urlParams = new URLSearchParams(window.location.search);
    const grade = urlParams.get('grade');
    const term = urlParams.get('term');
    const studentsCollection = collection(db, "grades", grade, "students");
    const memosCollection = collection(db, "grades", grade, "memos");

    if (!grade || !term) {
        console.error('Grade or term parameter missing');
        return;
    }

    // Update page title based on term
    const termTitle = document.getElementById('termTitle');
    if (termTitle) {
        termTitle.textContent = `مذكرات الترم ${term === '1' ? 'الأول' : 'الثاني'}`;
    }

    let students = [];
    let memos = {};

    async function loadData() {
        students = [];
        const studentsSnapshot = await getDocs(studentsCollection);
        studentsSnapshot.forEach(doc => {
            students.push({ id: doc.id, ...doc.data() });
        });

        memos = {};
        const memosSnapshot = await getDocs(memosCollection);
        memosSnapshot.forEach(doc => {
            memos[doc.id] = doc.data();
        });
    }


    // Load student data
    async function loadStudents() {
        const notes = getStudentNotes();
        return students.map((student, index) => ({
            id: student.id,
            name: student.name,
            status: memos[student.id]?.[`term${term}`] || 'none',
            hasNote: !!notes[student.id]
        })).filter(student => student.name);
    }

    function getStudentNotes() {
        // Use a separate storage key for memo notes
        return JSON.parse(localStorage.getItem(`memo-notes-${grade}-${term}`)) || {};
    }

    function saveStudentNotes(notes) {
        localStorage.setItem(`memo-notes-${grade}-${term}`, JSON.stringify(notes));
    }

    // Update table
    let originalUpdateTable;
    async function updateTable() {
        const studentsToDisplay = await loadStudents();
        const tableBody = document.getElementById('memosTableBody');
        if (!tableBody) return;

        const notes = getStudentNotes();
        
        tableBody.innerHTML = studentsToDisplay
            .filter(student => student.name) // Filter out empty names
            .map(student => `
                <tr>
                    <td>
                        <span class="student-number">${students.findIndex(s => s.id === student.id) + 1}</span>
                        <span class="note-dot ${notes[student.id]?.text ? 'has-note' : ''}" 
                              data-id="${student.id}" 
                              title="${notes[student.id]?.text ? 'آخر تحديث: ' + notes[student.id].date + ' - ' + notes[student.id].time : 'إضافة ملاحظة'}">
                            <i class="fas fa-circle"></i>
                        </span>
                    </td>
                    <td>${student.name}</td>
                    <td>
                        <span class="memo-status status-${student.status}">
                            ${getStatusText(student.status)}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn edit-btn" data-id="${student.id}">
                                <i class="fas fa-edit"></i>
                                تغيير الحالة
                            </button>
                            <button class="action-btn delete-btn" data-id="${student.id}">
                                <i class="fas fa-trash"></i>
                                حذف
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');

        // Add event listeners
        addTableEventListeners();
        addNoteEventListeners();
    }

    function getStatusText(status) {
        const statusMap = {
            'none': 'لم يتم الدفع',
            'pending': 'قيد الانتظار',
            'received': 'تم الاستلام'
        };
        return statusMap[status] || 'لم يتم الدفع';
    }

    function getMonthName(month) {
        const months = {
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
        };
        return months[month] || month;
    }

    function addTableEventListeners() {
        // Edit status buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const studentId = btn.dataset.id;
                const currentStatus = memos[studentId]?.[`term${term}`] || 'none';

                // Define status progression
                const statusOrder = ['none', 'pending', 'received'];
                const nextStatusIndex = (statusOrder.indexOf(currentStatus) + 1) % statusOrder.length;
                const newStatus = statusOrder[nextStatusIndex];

                // Apply status change with animation
                const statusElement = btn.closest('tr').querySelector('.memo-status');
                statusElement.style.transform = 'scale(0.9)';

                setTimeout(async () => {
                    const memoDoc = doc(db, "grades", grade, "memos", studentId);
                    const memoData = { ...memos[studentId], [`term${term}`]: newStatus };
                    await setDoc(memoDoc, memoData, { merge: true });
                    memos[studentId] = memoData;


                    // Update only the status cell to preserve search results
                    const row = btn.closest('tr');
                    const statusCell = row.querySelector('.memo-status');
                    statusCell.className = `memo-status status-${newStatus}`;
                    statusCell.textContent = getStatusText(newStatus);
                    statusCell.style.transform = 'scale(1)';

                    // Show colored toast based on status
                    let toastBg;
                    switch(newStatus) {
                        case 'none':
                            toastBg = "#dc3545";
                            break;
                        case 'pending':
                            toastBg = "#ffc107";
                            break;
                        case 'received':
                            toastBg = "#28a745";
                            break;
                    }

                    showToast(`تم تغيير الحالة إلى ${getStatusText(newStatus)}`, toastBg);
                }, 200);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const studentId = btn.dataset.id;
                handleDeleteStudent(studentId);
            });
        });
    }

    async function handleDeleteStudent(studentId) {
        if (confirm('هل أنت متأكد من حذف هذا الطالب؟')) {
            await deleteDoc(doc(db, "grades", grade, "students", studentId));
            await deleteDoc(doc(db, "grades", grade, "memos", studentId));

            students = students.filter(s => s.id !== studentId);
            delete memos[studentId];

            // Clear student note
            const notes = getStudentNotes();
            delete notes[studentId];
            saveStudentNotes(notes);

            // Update all tables
            updateTable();
            updatePendingDeliveryTable();
            updatePaymentRequiredTable();
            updateReceivedTable();

            showToast("تم حذف الطالب بنجاح", "#dc3545");
        }
    }

    function addNoteEventListeners() {
        document.querySelectorAll('.note-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                const studentId = dot.dataset.id;
                const notes = getStudentNotes();
                handleStudentNote(studentId, notes[studentId] ? notes[studentId].text : '');
            });
        });
    }

    function handleStudentNote(studentId, existingNote = '') {
        const noteModal = document.getElementById('studentNoteModal');
        const noteTextarea = document.getElementById('studentNoteText');
        const noteForm = document.getElementById('studentNoteForm');
        
        // Add animation class to the clicked dot
        const noteDot = document.querySelector(`.note-dot[data-id="${studentId}"]`);
        if (noteDot) {
            noteDot.style.animation = 'none';
            noteDot.offsetHeight; // Trigger reflow
            noteDot.style.animation = 'ripple 0.6s ease-out';
        }

        noteTextarea.value = existingNote;
        noteModal.style.display = 'block';
        noteTextarea.focus();
        
        noteForm.onsubmit = (e) => {
            e.preventDefault();
            const notes = getStudentNotes();
            const noteText = noteTextarea.value.trim();
            
            if (noteText) {
                notes[studentId] = {
                    text: noteText,
                    date: new Date().toLocaleDateString('ar-EG'),
                    time: new Date().toLocaleTimeString('ar-EG')
                };
            } else {
                delete notes[studentId];
            }
            
            saveStudentNotes(notes);
            noteModal.style.display = 'none';
            
            // Animate the dot when saving
            if (noteDot) {
                noteDot.classList.add('saving');
                setTimeout(() => noteDot.classList.remove('saving'), 500);
            }
            
            updateTable();
            
            showToast(noteText ? "تم حفظ الملاحظة بنجاح" : "تم حذف الملاحظة", "#28a745");
        };

        // Add hover text to show note date/time
        if (noteDot && noteDot.classList.contains('has-note')) {
            const notes = getStudentNotes();
            const noteData = notes[studentId];
            if (noteData && noteData.date) {
                noteDot.title = `آخر تحديث: ${noteData.date} - ${noteData.time}`;
            }
        }
    }

    // Search functionality
    const searchInput = document.getElementById('memosStudentSearch');
    if (searchInput) {
        searchInput.addEventListener('input', async () => {
            const searchTerm = searchInput.value.trim();
            const allStudents = await loadStudents();
            
            // Clear all highlights first
            document.querySelectorAll('#memosTableBody tr').forEach(row => {
                row.classList.remove('highlight');
            });

            // If search is empty, restore original order
            if (!searchTerm) {
                updateTable();
                return;
            }

            const filteredStudents = allStudents.filter(student => 
                student.name.includes(searchTerm) || 
                student.id.toString() === searchTerm
            );

            // If no matches found, keep current table state
            if (filteredStudents.length === 0) {
                showToast("لم يتم العثور على الطالب", "#dc3545");
                return;
            }

            // Sort students putting matches first while preserving their relative order
            const sortedStudents = [
                ...filteredStudents,
                ...allStudents.filter(student => !filteredStudents.includes(student))
            ];

            updateTable(sortedStudents);

            // Highlight only the matched students
            const rows = document.querySelectorAll('#memosTableBody tr');
            filteredStudents.forEach(student => {
                const row = Array.from(rows).find(row => 
                    parseInt(row.querySelector('.student-number').textContent) === student.id
                );
                if (row) {
                    row.classList.add('highlight');
                    // Ensure row is visible by scrolling to it
                    row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            });
        });
    }

    // Add close handlers for note modal
    document.querySelector('#studentNoteModal .close-btn')?.addEventListener('click', () => {
        document.getElementById('studentNoteModal').style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        const noteModal = document.getElementById('studentNoteModal');
        if (event.target === noteModal) {
            noteModal.style.display = 'none';
        }
    });

    // Close modal handlers
    document.querySelectorAll('.close-btn, .keyboard-close').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        });
    });

    // Close modals when clicking outside
    window.addEventListener('click', (event) => {
        document.querySelectorAll('.modal').forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
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

    // Virtual keyboard functionality
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

        // Create keyboard rows
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
                        if (currentInput.id === 'memosStudentSearch') {
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
                
                // Trigger input event for search
                if (currentInput.id === 'memosStudentSearch') {
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

                // Trigger input event for search
                if (currentInput.id === 'memosStudentSearch') {
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

        // Close keyboard when clicking outside
        document.addEventListener('click', (e) => {
            const keyboardModal = document.getElementById('virtualKeyboardModal');
            if (keyboardModal && !e.target.closest('.modal-content') && !e.target.closest('.keyboard-btn')) {
                keyboardModal.style.display = 'none';
            }
        });
    }

    // Initialize keyboard
    createVirtualKeyboard();

    // Add click handler for received button
    const receivedBtn = document.querySelector('.received-btn');
    const receivedModal = document.getElementById('receivedModal');

    if (receivedBtn) {
        receivedBtn.addEventListener('click', () => {
            updateReceivedTable();
            receivedModal.style.display = 'block';
        });
    }

    // Function to update received table
    async function updateReceivedTable() {
        const students = await loadStudents();
        const receivedStudents = students.filter(student => student.status === 'received');
        const tableBody = document.getElementById('receivedTableBody');

        if (!tableBody) return;

        tableBody.innerHTML = receivedStudents.map((student, index) => `
            <tr>
                <td>
                    <span class="student-number">${index + 1}</span>
                    <span class="note-dot ${hasNote(student.id) ? 'has-note' : ''}" 
                          data-id="${student.id}" 
                          title="${getNoteTitle(student.id)}">
                        <i class="fas fa-circle"></i>
                    </span>
                </td>
                <td>${student.id}</td>
                <td>${student.name}</td>
                <td>
                    <span class="memo-status status-${student.status}">
                        ${getStatusText(student.status)}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit-btn" data-id="${student.id}">
                            <i class="fas fa-edit"></i>
                            تغيير الحالة
                        </button>
                        <button class="action-btn delete-btn" data-id="${student.id}">
                            <i class="fas fa-trash"></i>
                            حذف
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Add event listeners to the new table
        addTableEventListeners();
        addNoteEventListeners();
    }

    // Add new modals to close handlers
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (pendingDeliveryModal) pendingDeliveryModal.style.display = 'none';
            if (paymentRequiredModal) paymentRequiredModal.style.display = 'none';
            if (receivedModal) receivedModal.style.display = 'none';
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target === pendingDeliveryModal) {
            pendingDeliveryModal.style.display = 'none';
        }
        if (event.target === paymentRequiredModal) {
            paymentRequiredModal.style.display = 'none';
        }
        if (event.target === receivedModal) {
            receivedModal.style.display = 'none';
        }
    });

    // Initial table update
    originalUpdateTable = updateTable;
    updateTable = async function() {
        await originalUpdateTable();
        const pendingDeliveryModal = document.getElementById('pendingDeliveryModal');
        const paymentRequiredModal = document.getElementById('paymentRequiredModal');
        if (pendingDeliveryModal && pendingDeliveryModal.style.display === 'block') {
            updatePendingDeliveryTable();
        }
        if (paymentRequiredModal && paymentRequiredModal.style.display === 'block') {
            updatePaymentRequiredTable();
        }
        if (receivedModal && receivedModal.style.display === 'block') {
            updateReceivedTable();
        }
    };

    // Add new buttons event listeners
    const pendingDeliveryBtn = document.querySelector('.pending-delivery-btn');
    const paymentRequiredBtn = document.querySelector('.payment-required-btn');
    const pendingDeliveryModal = document.getElementById('pendingDeliveryModal');
    const paymentRequiredModal = document.getElementById('paymentRequiredModal');

    if (pendingDeliveryBtn) {
        pendingDeliveryBtn.addEventListener('click', () => {
            updatePendingDeliveryTable();
            pendingDeliveryModal.style.display = 'block';
        });
    }

    if (paymentRequiredBtn) {
        paymentRequiredBtn.addEventListener('click', () => {
            updatePaymentRequiredTable();
            paymentRequiredModal.style.display = 'block';
        });
    }

    // Function to update pending delivery table
    async function updatePendingDeliveryTable() {
        const students = await loadStudents();
        const pendingStudents = students.filter(student => student.status === 'pending');
        const tableBody = document.getElementById('pendingDeliveryTableBody');

        if (!tableBody) return;

        tableBody.innerHTML = pendingStudents.map((student, index) => `
            <tr>
                <td>
                    <span class="student-number">${index + 1}</span>
                    <span class="note-dot ${hasNote(student.id) ? 'has-note' : ''}" 
                          data-id="${student.id}" 
                          title="${getNoteTitle(student.id)}">
                        <i class="fas fa-circle"></i>
                    </span>
                </td>
                <td>${student.id}</td>
                <td>${student.name}</td>
                <td>
                    <span class="memo-status status-${student.status}">
                        ${getStatusText(student.status)}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit-btn" data-id="${student.id}">
                            <i class="fas fa-edit"></i>
                            تغيير الحالة
                        </button>
                        <button class="action-btn delete-btn" data-id="${student.id}">
                            <i class="fas fa-trash"></i>
                            حذف
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Add event listeners to the new table
        addTableEventListeners();
        addNoteEventListeners();
    }

    // Function to update payment required table
    async function updatePaymentRequiredTable() {
        const students = await loadStudents();
        const unpaidStudents = students.filter(student => student.status === 'none');
        const tableBody = document.getElementById('paymentRequiredTableBody');

        if (!tableBody) return;

        tableBody.innerHTML = unpaidStudents.map((student, index) => `
            <tr>
                <td>
                    <span class="student-number">${index + 1}</span>
                    <span class="note-dot ${hasNote(student.id) ? 'has-note' : ''}" 
                          data-id="${student.id}" 
                          title="${getNoteTitle(student.id)}">
                        <i class="fas fa-circle"></i>
                    </span>
                </td>
                <td>${student.id}</td>
                <td>${student.name}</td>
                <td>
                    <span class="memo-status status-${student.status}">
                        ${getStatusText(student.status)}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit-btn" data-id="${student.id}">
                            <i class="fas fa-edit"></i>
                            تغيير الحالة
                        </button>
                        <button class="action-btn delete-btn" data-id="${student.id}">
                            <i class="fas fa-trash"></i>
                            حذف
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Add event listeners to the new table
        addTableEventListeners();
        addNoteEventListeners();
    }

    // Helper functions
    function hasNote(studentId) {
        const notes = getStudentNotes();
        return !!notes[studentId];
    }

    function getNoteTitle(studentId) {
        const notes = getStudentNotes();
        const note = notes[studentId];
        return note ? `آخر تحديث: ${note.date} - ${note.time}` : 'إضافة ملاحظة';
    }

    // Add new modals to close handlers
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (pendingDeliveryModal) pendingDeliveryModal.style.display = 'none';
            if (paymentRequiredModal) paymentRequiredModal.style.display = 'none';
            if (receivedModal) receivedModal.style.display = 'none';
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target === pendingDeliveryModal) {
            pendingDeliveryModal.style.display = 'none';
        }
        if (event.target === paymentRequiredModal) {
            paymentRequiredModal.style.display = 'none';
        }
        if (event.target === receivedModal) {
            receivedModal.style.display = 'none';
        }
    });

    await loadData();
    await updateTable();
});
