import { db } from './firebase-config.js';
import { collection, getDocs, doc, updateDoc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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
    const focusStudentId = urlParams.get('focusStudent');
    const studentsCollection = collection(db, "grades", grade, "students");
    const examsCollection = collection(db, "grades", grade, "exams");
    const settingsDoc = doc(db, "grades", grade, "settings", "exams");

    if (!grade) {
        console.error('No grade parameter found in URL');
        return;
    }

    // Exam count management
    const getExamCount = async () => {
        const docSnap = await getDoc(settingsDoc);
        return docSnap.exists() ? docSnap.data().count : 8;
    };
    const setExamCount = async (count) => {
        await setDoc(settingsDoc, { count });
    };

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
            gradeTitle.textContent = `امتحانات ${customStages[customIndex].name}`;
        }
    } else {
        gradeTitle.textContent = `امتحانات ${gradeTitles[grade] || 'الطلاب'}`;
    }

    async function updateExamsTable() {
        const examCount = await getExamCount();
        const examsTableHead = document.getElementById('examsTableHead');
        const examsTableBody = document.getElementById('examsTableBody');
        
        const students = [];
        const studentsSnapshot = await getDocs(studentsCollection);
        studentsSnapshot.forEach(doc => {
            students.push({ id: doc.id, ...doc.data() });
        });

        const exams = {};
        const examsSnapshot = await getDocs(examsCollection);
        examsSnapshot.forEach(doc => {
            exams[doc.id] = doc.data();
        });

        const totalsDoc = await getDoc(doc(db, "grades", grade, "settings", "examTotals"));
        const totals = totalsDoc.exists() ? totalsDoc.data() : {};

        // --- Render Table Head ---
        let totalScoresRowHtml = '<tr class="total-scores-row"><th>الدرجة الكلية</th><th>للامتحانات</th>';
        let examHeadersRowHtml = '<tr><th>م</th><th>اسم الطالب</th>';

        for (let i = 1; i <= examCount; i++) {
            totalScoresRowHtml += `
                <th id="exam${i}Total" class="exam-total">
                    <input type="text" class="total-score-input" data-exam="${i}" placeholder="الدرجة">
                </th>`;
            examHeadersRowHtml += `<th>الامتحان ${i}</th>`;
        }
        totalScoresRowHtml += '</tr>';
        examHeadersRowHtml += '</tr>';
        examsTableHead.innerHTML = totalScoresRowHtml + examHeadersRowHtml;

        // --- Render Table Body ---
        examsTableBody.innerHTML = students.map((student, index) => {
            if (!student.name) return ''; // Skip empty cells

            const studentExams = exams[student.id] || {};
            let studentRowHtml = `<tr><td>${index + 1}</td><td>${student.name}</td>`;

            for (let i = 1; i <= examCount; i++) {
                studentRowHtml += `
                    <td>
                        <input type="text" 
                               class="exam-score" 
                               data-student="${student.id}" 
                               data-exam="${i}" 
                               value="${studentExams[i] || ''}"
                               oninput="this.value = this.value.replace(/[^0-9]/g, '')"
                               maxlength="3">
                    </td>`;
            }
            studentRowHtml += '</tr>';
            return studentRowHtml;
        }).join('');
        
        // --- Load Totals and Add Listeners ---
        // Load saved total scores
        for (let i = 1; i <= examCount; i++) {
            const totalInput = document.querySelector(`.total-score-input[data-exam="${i}"]`);
            if (totalInput) {
                totalInput.value = totals[i] || '';
            }
        }

        // Add event listeners for total score inputs
        document.querySelectorAll('.total-score-input').forEach(input => {
            input.addEventListener('input', async (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
                const examNum = e.target.dataset.exam;
                
                const totalsDocRef = doc(db, "grades", grade, "settings", "examTotals");
                const totalsDocSnap = await getDoc(totalsDocRef);
                const totals = totalsDocSnap.exists() ? totalsDocSnap.data() : {};

                if (e.target.value === '') {
                    delete totals[examNum];
                } else {
                    totals[examNum] = e.target.value;
                }
                
                await setDoc(totalsDocRef, totals);
            });
        });

        // Add event listeners for score inputs
        document.querySelectorAll('.exam-score').forEach(input => {
            input.addEventListener('change', async (e) => {
                const studentId = e.target.dataset.student;
                const examNum = e.target.dataset.exam;
                const score = e.target.value;
                const totalScore = document.querySelector(`.total-score-input[data-exam="${examNum}"]`).value;

                // Validate score
                if (score && totalScore && parseInt(score) > parseInt(totalScore)) {
                    e.target.value = '';
                    showToast(`الدرجة يجب أن تكون أقل من أو تساوي ${totalScore}`, "#dc3545");
                    return;
                }

                // Save score
                const examDocRef = doc(db, "grades", grade, "exams", studentId);
                const examDocSnap = await getDoc(examDocRef);
                const studentExams = examDocSnap.exists() ? examDocSnap.data() : {};

                if (score === '') {
                    delete studentExams[examNum];
                } else {
                    studentExams[examNum] = score;
                }
                
                await setDoc(examDocRef, studentExams);
                
                // Update absences based on the new score data
                updateAbsencesForAllExams();
                
                showToast("تم حفظ الدرجة بنجاح", "#28a745");
            });
        });

        // If we have a student to focus on, call the focus function
        if (focusStudentId) {
            focusOnStudent(focusStudentId);
        }
    }
    
    async function updateAbsencesForAllExams() {
        const students = [];
        const studentsSnapshot = await getDocs(studentsCollection);
        studentsSnapshot.forEach(doc => {
            students.push({ id: doc.id, ...doc.data() });
        });

        const allExamScores = {};
        const examsSnapshot = await getDocs(examsCollection);
        examsSnapshot.forEach(doc => {
            allExamScores[doc.id] = doc.data();
        });

        // 1. Find all exams that have at least one score (active exams)
        const activeExams = new Set();
        for (const studentId in allExamScores) {
            for (const examNum in allExamScores[studentId]) {
                // Ensure the score is not an empty string before considering the exam active
                if (allExamScores[studentId][examNum] !== '') {
                    activeExams.add(examNum);
                }
            }
        }

        const absencesCollectionRef = collection(db, "grades", grade, "absences");
        // Clear existing absences
        const existingAbsences = await getDocs(absencesCollectionRef);
        existingAbsences.forEach(async (doc) => {
            await deleteDoc(doc.ref);
        });


        // 2. For each active exam, check all students
        activeExams.forEach(examNum => {
            students.forEach(async (student) => {
                if (!student.name) return; // Skip empty student slots

                const studentScores = allExamScores[student.id];
                const hasScore = studentScores && studentScores[examNum] !== undefined && studentScores[examNum] !== null && studentScores[examNum] !== '';

                if (!hasScore) {
                    // Student is absent for this active exam
                    await addDoc(absencesCollectionRef, {
                        studentId: student.id,
                        studentName: student.name,
                        examNumber: examNum,
                        date: new Date().toLocaleDateString('ar-EG')
                    });
                }
            });
        });
    }
    
    // Add Exam button handler
    const addExamBtn = document.querySelector('.add-exam-btn');
    if (addExamBtn) {
        addExamBtn.addEventListener('click', async () => {
            let examCount = await getExamCount();
            if (examCount < 12) {
                examCount++;
                await setExamCount(examCount);
                updateExamsTable();
                showToast(`تمت إضافة الامتحان رقم ${examCount}`, '#28a745');
            } else {
                showToast('لقد وصلت إلى الحد الأقصى لعدد الامتحانات (12)', '#dc3545');
            }
        });
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

    // Function to focus on a specific student after table is updated
    function focusOnStudent(studentId) {
        if (!studentId) return;

        const studentRow = document.querySelector(`input.exam-score[data-student="${studentId}"]`)?.closest('tr');
        if (studentRow) {
            studentRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
            studentRow.classList.add('highlight');

            // Remove highlight after 3 seconds
            setTimeout(() => {
                studentRow.classList.remove('highlight');
            }, 3000);

            // Focus the first exam score input for the student
            const firstExamInput = studentRow.querySelector('input.exam-score');
            if (firstExamInput) {
                firstExamInput.focus();
            }
        }
    }

    // Add search functionality
    const searchInput = document.getElementById('examStudentSearch');
    const examsTableBody = document.getElementById('examsTableBody');
    let matchedRows = [];

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.trim();
            const rows = Array.from(examsTableBody.getElementsByTagName('tr'));
            
            // Clear previous highlights
            matchedRows.forEach(row => {
                row.classList.remove('highlight');
            });
            matchedRows = [];

            // Restore original order if search is empty
            if (!searchTerm) {
                rows.sort((a, b) => {
                    const aIndex = parseInt(a.cells[0].textContent);
                    const bIndex = parseInt(b.cells[0].textContent);
                    return aIndex - bIndex;
                });
                
                rows.forEach(row => {
                    examsTableBody.appendChild(row);
                });
                return;
            }

            // Find exact matches
            const matches = rows.filter(row => {
                const studentNumber = row.cells[0].textContent;
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
                    examsTableBody.insertBefore(row, examsTableBody.firstChild);
                    row.classList.add('highlight');
                    matchedRows.push(row);
                });
            } else {
                // Show "no results" toast notification
                showToast("لم يتم العثور على الطالب", "#dc3545");
                
                // Restore original order
                rows.sort((a, b) => {
                    const aIndex = parseInt(a.cells[0].textContent);
                    const bIndex = parseInt(b.cells[0].textContent);
                    return aIndex - bIndex;
                });
                
                rows.forEach(row => {
                    examsTableBody.appendChild(row);
                });
            }
        });
    }

    // Add student grades functionality
    const studentGradesBtn = document.querySelector('.student-grades-btn');
    const studentGradesModal = document.getElementById('studentGradesModal');
    const showGradesBtn = document.querySelector('.show-grades-btn');
    const gradesDisplay = document.getElementById('gradesDisplay');
    const specificExamsContainer = document.getElementById('specificExamsContainer');

    if (studentGradesBtn) {
        studentGradesBtn.addEventListener('click', () => {
            if (studentGradesModal) {
                studentGradesModal.style.display = 'block';
                resetGradesModal();
            }
        });
    }

    // Handle exam selection radio buttons
    document.querySelectorAll('input[name="examSelection"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'specific') {
                specificExamsContainer.style.display = 'block';
            } else {
                specificExamsContainer.style.display = 'none';
            }
        });
    });

    // Show grades button handler
    if (showGradesBtn) {
        showGradesBtn.addEventListener('click', async () => {
            const selectedOption = document.querySelector('input[name="examSelection"]:checked').value;
            let selectedExams = [];

            if (selectedOption === 'specific') {
                const checkedBoxes = document.querySelectorAll('.exam-checkboxes input[type="checkbox"]:checked');
                if (checkedBoxes.length === 0) {
                    showToast("الرجاء اختيار امتحان واحد على الأقل", "#dc3545");
                    return;
                }
                selectedExams = Array.from(checkedBoxes).map(cb => cb.value);
            } else if (selectedOption === 'all') {
                const examCount = await getExamCount();
                selectedExams = Array.from({length: examCount}, (_, i) => String(i + 1));
            } else if (selectedOption === 'auto') {
                const totalsDoc = await getDoc(doc(db, "grades", grade, "settings", "examTotals"));
                const totals = totalsDoc.exists() ? totalsDoc.data() : {};
                selectedExams = Object.keys(totals).filter(examNum => totals[examNum]);
                if (selectedExams.length === 0) {
                    showToast("لا توجد امتحانات بدرجات كلية محددة", "#dc3545");
                    return;
                }
            }

            displayStudentGrades(selectedExams);
            
            // Close the modal
            if (studentGradesModal) studentGradesModal.style.display = 'none';
        });
    }

    async function displayStudentGrades(selectedExams) {
        const students = [];
        const studentsSnapshot = await getDocs(studentsCollection);
        studentsSnapshot.forEach(doc => {
            students.push({ id: doc.id, ...doc.data() });
        });

        const exams = {};
        const examsSnapshot = await getDocs(examsCollection);
        examsSnapshot.forEach(doc => {
            exams[doc.id] = doc.data();
        });

        const totalsDoc = await getDoc(doc(db, "grades", grade, "settings", "examTotals"));
        const totals = totalsDoc.exists() ? totalsDoc.data() : {};

        // Hide the original table, action-buttons, search...
        const originalTableContainer = document.querySelector('.table-container');
        originalTableContainer.style.display = 'none';
        document.querySelector('.action-buttons').style.display = 'none';
        document.querySelector('.search-container').style.display = 'none';

        // Prepare / create grades-view-container
        let gradesViewContainer = document.getElementById('gradesViewContainer');
        if (!gradesViewContainer) {
            gradesViewContainer = document.createElement('div');
            gradesViewContainer.id = 'gradesViewContainer';
            gradesViewContainer.className = 'grades-view-container';
            originalTableContainer.parentNode.insertBefore(gradesViewContainer, originalTableContainer);
        }

        // Rebuild header with Download PDF and Back buttons
        gradesViewContainer.innerHTML = `
            <div class="grades-header">
                <h2>درجات الطلاب</h2>
                <div class="grades-header-buttons">
                    <button id="downloadPdfBtn" class="download-pdf-btn">
                        <i class="fas fa-file-pdf"></i>
                        تنزيل PDF
                    </button>
                    <button class="close-grades-btn" onclick="closeGradesView()">
                        <i class="fas fa-times"></i>
                        العودة للجدول الرئيسي
                    </button>
                </div>
            </div>
            <div class="search-container">
                <div class="input-with-keyboard">
                    <input type="text" id="gradesStudentSearch" class="search-input" placeholder="ابحث عن طالب...">
                    <button type="button" class="keyboard-btn" data-target="gradesStudentSearch">
                        <i class="fas fa-keyboard"></i>
                    </button>
                </div>
            </div>
            <div class="grades-table-container">
                <table class="grades-table" id="gradesTable">
                    <thead>
                        ${'<tr><th>م</th><th>اسم الطالب</th>' +
                          selectedExams.map(examNum => `<th>الامتحان ${examNum}${totals[examNum] ? ` (${totals[examNum]})` : ''}</th>`).join('') +
                          '</tr>'}
                    </thead>
                    <tbody id="gradesTableBody">
                        ${students.filter(s => s.name).map((student, idx) => {
                            const stuEx = exams[student.id] || {};
                            return `<tr>
                                <td>${idx+1}</td>
                                <td>${student.name}</td>
                                ${selectedExams.map(examNum => {
                                    const score = stuEx[examNum] || '';
                                    const totalScore = totals[examNum] || '';
                                    let cls = 'grade-cell';
                                    if (score === '0') cls += ' absent';
                                    else if (score && totalScore && +score===+totalScore) cls += ' perfect';
                                    return `<td class="${cls}">${score}</td>`;
                                }).join('')}
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
        gradesViewContainer.style.display = 'block';

        // Attach Download PDF handler
        const pdfSettingsModal = document.getElementById('pdfSettingsModal');
        document.getElementById('downloadPdfBtn').addEventListener('click', () => {
            pdfSettingsModal.style.display = 'block';
        });

        // Close PDF settings modal handlers
        pdfSettingsModal.querySelector('.close-btn').addEventListener('click', () => {
            pdfSettingsModal.style.display = 'none';
        });
        window.addEventListener('click', e => {
            if (e.target === pdfSettingsModal) pdfSettingsModal.style.display = 'none';
        });
        document.addEventListener('keydown', e => {
            if (e.key==='Escape' && pdfSettingsModal.style.display==='block') {
                pdfSettingsModal.style.display='none';
            }
        });

        // Generate PDF on button click
        document.getElementById('generatePdfBtn').addEventListener('click', async () => {
            const pdfSettingsModal = document.getElementById('pdfSettingsModal');
            const fontSize = pdfSettingsModal.querySelector('#pdfFontSize').value;
            await generatePDF(fontSize);
            pdfSettingsModal.style.display = 'none';
        });

        // Initialize search within grades view
        const gradesSearchInput = document.getElementById('gradesStudentSearch');
        const gradesTableBody = document.getElementById('gradesTableBody');
        let gradesMatchedRows = [];
        gradesSearchInput.addEventListener('input', e => {
            const term = e.target.value.trim();
            const rows = Array.from(gradesTableBody.querySelectorAll('tr'));
            gradesMatchedRows.forEach(r=>r.classList.remove('highlight'));
            gradesMatchedRows=[];
            if (!term) {
                rows.sort((a,b)=>+a.cells[0].textContent - +b.cells[0].textContent)
                    .forEach(r=>gradesTableBody.appendChild(r));
                return;
            }
            const matches = rows.filter(r=>{
                const num = r.cells[0].textContent;
                const nm = r.cells[1].textContent;
                if (/^\d+$/.test(term)) return num===term;
                return nm.includes(term);
            });
            if (matches.length) {
                matches.forEach(r=>{
                    gradesTableBody.insertBefore(r, gradesTableBody.firstChild);
                    r.classList.add('highlight');
                    gradesMatchedRows.push(r);
                });
            } else {
                showToast("لم يتم العثور على الطالب", "#dc3545");
                rows.sort((a,b)=>+a.cells[0].textContent - +b.cells[0].textContent)
                    .forEach(r=>gradesTableBody.appendChild(r));
            }
        });

        // Update keyboard target for grades search
        document.querySelectorAll('.keyboard-btn').forEach(btn=>{
            if (btn.dataset.target==='gradesStudentSearch') {
                btn.addEventListener('click', () => {
                    const input = document.getElementById('gradesStudentSearch');
                    const keyModal = document.getElementById('virtualKeyboardModal');
                    if (keyModal && input) {
                        keyModal.style.display='block';
                        // set current input if our keyboard code tracks it
                        input.focus();
                    }
                });
            }
        });
    }

    // PDF generation function
    async function generatePDF(fontSize) {
        const gradesView = document.getElementById('gradesViewContainer');
        const gradesTable = gradesView.querySelector('#gradesTable');

        // Show a loading indicator
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'جاري إنشاء الـ PDF...',
                text: 'قد تستغرق هذه العملية بعض الوقت.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
        }

        // Hide unwanted elements
        const headerButtons = gradesView.querySelector('.grades-header-buttons');
        const searchContainer = gradesView.querySelector('.search-container');
        if (headerButtons) headerButtons.style.display = 'none';
        if (searchContainer) searchContainer.style.display = 'none';
        
        // Temporarily apply font size and styles for capture
        const originalTableFontSize = gradesTable.style.fontSize;
        gradesTable.style.fontSize = `${fontSize}px`;
        
        const tempStyle = document.createElement('style');
        tempStyle.textContent = `
            body { background: white !important; }
            .grades-view-container { background: white !important; box-shadow: none !important; }
            .grades-table th { background-color: var(--primary-color) !important; color: white !important; }
        `;
        document.head.appendChild(tempStyle);

        const canvas = await html2canvas(gradesTable, {
            scale: 2,
            useCORS: true,
            logging: false,
        });
        
        // Restore everything after capture
        if (headerButtons) headerButtons.style.display = 'flex';
        if (searchContainer) searchContainer.style.display = 'block';
        gradesTable.style.fontSize = originalTableFontSize;
        tempStyle.remove();

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'pt',
            format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth() - 40; // with margin
        const pdfHeight = pdf.internal.pageSize.getHeight() - 40; // with margin
        
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        
        const ratio = canvasWidth / pdfWidth;
        const canvasPageHeight = pdfHeight * ratio;
        
        const totalPages = Math.ceil(canvasHeight / canvasPageHeight);
        
        for (let i = 0; i < totalPages; i++) {
            if (i > 0) {
                pdf.addPage();
            }
            const y = i * canvasPageHeight;
            
            // Create a temporary canvas for each page
            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = canvasWidth;
            pageCanvas.height = Math.min(canvasPageHeight, canvasHeight - y); // Use remaining height for last page
            const pageCtx = pageCanvas.getContext('2d');
            
            // Draw a portion of the original canvas onto the page canvas
            pageCtx.drawImage(canvas, 0, y, canvasWidth, pageCanvas.height, 0, 0, canvasWidth, pageCanvas.height);
            
            const imgData = pageCanvas.toDataURL('image/png');
            const pageRatio = pageCanvas.height / pageCanvas.width;
            const pageImgHeight = pdfWidth * pageRatio;
            
            pdf.addImage(imgData, 'PNG', 20, 20, pdfWidth, pageImgHeight);
        }

        pdf.save(`student_grades_${grade}.pdf`);

        if (typeof Swal !== 'undefined') {
            Swal.close();
        }
        showToast("تم إنشاء الـ PDF بنجاح!", "#28a745");
    }

    // Add global function to close grades view
    window.closeGradesView = function() {
        const gradesViewContainer = document.getElementById('gradesViewContainer');
        const originalTable = document.querySelector('.table-container');
        const actionButtons = document.querySelector('.action-buttons');
        const searchContainer = document.querySelector('.search-container');
        
        if (gradesViewContainer) {
            gradesViewContainer.style.display = 'none';
        }
        
        if (originalTable) {
            originalTable.style.display = 'block';
        }
        
        if (actionButtons) {
            actionButtons.style.display = 'flex';
        }
        
        if (searchContainer) {
            searchContainer.style.display = 'block';
        }
    };

    async function resetGradesModal() {
        // Reset radio buttons
        document.querySelector('input[name="examSelection"][value="specific"]').checked = true;
        specificExamsContainer.style.display = 'block';
        
        // Dynamically create checkboxes based on current exam count
        const examCount = await getExamCount();
        const checkboxesContainer = document.querySelector('.exam-checkboxes');
        checkboxesContainer.innerHTML = '';
        for (let i = 1; i <= examCount; i++) {
            const label = document.createElement('label');
            label.innerHTML = `<input type="checkbox" value="${i}"> الامتحان ${i}`;
            checkboxesContainer.appendChild(label);
        }
    }

    // Add student grades modal to close handlers
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (studentGradesModal) studentGradesModal.style.display = 'none';
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target === studentGradesModal) {
            studentGradesModal.style.display = 'none';
        }
    });

    // Initialize virtual keyboard
    function createVirtualKeyboard() {
        const keyboard = document.querySelector('.virtual-keyboard');
        if (!keyboard) return;

        const keyboardLayout = [
            ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
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
                keyButton.textContent = key;
                keyButton.type = 'button';
                keyButton.addEventListener('click', () => {
                    if (currentInput) {
                        const start = currentInput.selectionStart;
                        const end = currentInput.selectionEnd;
                        const value = currentInput.value;
                        currentInput.value = value.slice(0, start) + key + value.slice(end);
                        currentInput.focus();
                        currentInput.setSelectionRange(start + 1, start + 1);

                        // Trigger input event for search functionality
                        if (currentInput.id === 'examStudentSearch' || currentInput.id === 'gradesStudentSearch') {
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
                if (currentInput.id === 'examStudentSearch' || currentInput.id === 'gradesStudentSearch') {
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
                if (currentInput.id === 'examStudentSearch' || currentInput.id === 'gradesStudentSearch') {
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

        // Close keyboard with close button
        const closeBtn = document.querySelector('.keyboard-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                const keyboardModal = document.getElementById('virtualKeyboardModal');
                if (keyboardModal) {
                    keyboardModal.style.display = 'none';
                }
            });
        }
    }

    // Initialize keyboard if needed
    const needsKeyboard = document.querySelector('.virtual-keyboard');
    if (needsKeyboard) {
        createVirtualKeyboard();
    }

    // Initialize table
    updateExamsTable();
});
