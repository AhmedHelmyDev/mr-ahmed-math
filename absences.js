import { db } from './firebase-config.js';
import { collection, getDocs, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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

    const downloadPdfBtn = document.querySelector('.download-pdf-btn');
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', generatePDF);
    }

    // Get grade from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const grade = urlParams.get('grade');
    const studentsCollection = collection(db, "grades", grade, "students");
    const absencesCollection = collection(db, "grades", grade, "absences");

    if (!grade) {
        console.error('No grade parameter found in URL');
        return;
    }

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
            gradeTitle.textContent = `المتغيبون عن امتحانات ${customStages[customIndex].name}`;
        }
    } else {
        gradeTitle.textContent = `المتغيبون عن امتحانات ${gradeTitles[grade] || 'الطلاب'}`;
    }

    async function generatePDF() {
        const tableContainer = document.querySelector('.table-container');
        const table = tableContainer.querySelector('.absences-table');
        const gradeTitleText = document.getElementById('gradeTitle')?.textContent || 'قائمة المتغيبين';

        // Show loading indicator
        Swal.fire({
            title: 'جاري إنشاء الـ PDF...',
            text: 'قد تستغرق هذه العملية بعض الوقت.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // Clone the table to modify it for PDF generation
        const tableClone = table.cloneNode(true);

        // Remove the actions column from the cloned table header
        const headerRowClone = tableClone.querySelector('thead tr');
        if (headerRowClone && headerRowClone.lastElementChild) {
            headerRowClone.removeChild(headerRowClone.lastElementChild);
        }

        // Remove the actions column from each body row
        const bodyRowsClone = tableClone.querySelectorAll('tbody tr');
        bodyRowsClone.forEach(row => {
            if (row.lastElementChild) {
                // Check if it's not the placeholder cell
                if (!row.querySelector('.empty-absences')) {
                    row.removeChild(row.lastElementChild);
                }
            }
        });

        // Remove empty absences row if present
        const emptyRow = tableClone.querySelector('.empty-absences');
        if (emptyRow) {
            emptyRow.parentElement.parentElement.remove();
        }

        // Create a temporary container for the clone to be rendered off-screen for html2canvas
        const pdfContainer = document.createElement('div');
        pdfContainer.style.position = 'absolute';
        pdfContainer.style.left = '-9999px';
        pdfContainer.style.top = '0';
        pdfContainer.style.width = '800px'; // A fixed width for better PDF layout
        pdfContainer.style.background = 'white';
        pdfContainer.style.padding = '20px';
        pdfContainer.style.direction = 'rtl'; // Ensure RTL layout in capture
        pdfContainer.style.fontFamily = getComputedStyle(document.body).fontFamily;

        // Create a title element for the PDF
        const pdfTitle = document.createElement('h1');
        pdfTitle.textContent = gradeTitleText;
        pdfTitle.style.textAlign = 'center';
        pdfTitle.style.marginBottom = '20px';
        pdfTitle.style.color = 'black'; // Ensure title is visible
        pdfTitle.style.fontFamily = 'inherit';

        pdfContainer.appendChild(pdfTitle);
        pdfContainer.appendChild(tableClone);
        document.body.appendChild(pdfContainer);

        try {
            const canvas = await html2canvas(pdfContainer, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: 'a4'
            });

            const imgData = canvas.toDataURL('image/png');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth() - 40; // 20pt margin on each side
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            const pageHeight = pdf.internal.pageSize.getHeight() - 40; // 20pt margin top/bottom

            let heightLeft = pdfHeight;
            let position = 20;

            pdf.addImage(imgData, 'PNG', 20, position, pdfWidth, pdfHeight);
            heightLeft -= pageHeight;

            while (heightLeft > 0) {
                position -= pageHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 20, position, pdfWidth, pdfHeight);
                heightLeft -= pageHeight;
            }

            pdf.save(`absences_${grade}_${new Date().toISOString().slice(0, 10)}.pdf`);

            Swal.close();
            showToast("تم إنشاء الـ PDF بنجاح!", "#28a745");

        } catch (error) {
            console.error("Error generating PDF:", error);
            Swal.fire({
                icon: 'error',
                title: 'خطأ',
                text: 'حدث خطأ أثناء إنشاء الـ PDF.'
            });
        } finally {
            // Cleanup
            document.body.removeChild(pdfContainer);
        }
    }

    async function updateAbsencesTable() {
        const absencesTableBody = document.getElementById('absencesTableBody');
        
        const students = [];
        const studentsSnapshot = await getDocs(studentsCollection);
        studentsSnapshot.forEach(doc => {
            students.push({ id: doc.id, ...doc.data() });
        });

        const absences = [];
        const absencesSnapshot = await getDocs(absencesCollection);
        absencesSnapshot.forEach(doc => {
            absences.push({ id: doc.id, ...doc.data() });
        });

        // Sort absences by student name, then by exam number
        const sortedAbsences = absences.sort((a, b) => {
            if (a.studentName < b.studentName) return -1;
            if (a.studentName > b.studentName) return 1;
            return parseInt(a.examNumber) - parseInt(b.examNumber);
        });

        if (absences.length === 0) {
            absencesTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-absences">
                        <i class="fas fa-calendar-check"></i>
                        لا يوجد متغيبون حاليًا
                    </td>
                </tr>
            `;
            return;
        }

        absencesTableBody.innerHTML = sortedAbsences.map((absence, index) => {
            const student = students.find(s => s.name === absence.studentName);

            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${absence.studentName}</td>
                    <td>
                        <span class="${isMultipleAbsences(sortedAbsences, absence.studentName) ? 'absence-highlight' : ''}">
                            الامتحان ${absence.examNumber}
                        </span>
                    </td>
                    <td>${absence.date}</td>
                    <td>
                        <div class="student-actions">
                            <button class="student-action-btn edit-btn" data-studentid="${student.id}" title="الانتقال لدرجات الطالب">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="student-action-btn delete-btn" data-studentid="${student.id}" title="حذف الطالب">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Add event listeners for edit and delete buttons
        addActionListeners(students);
    }

    function addActionListeners(students) {
        // Edit button handler
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const studentId = e.currentTarget.dataset.studentid;
                // Redirect to exams page and focus on the specific student
                window.location.href = `exams.html?grade=${grade}&focusStudent=${studentId}`;
            });
        });

        // Delete button handler
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const studentId = e.currentTarget.dataset.studentid;
                const student = students.find(s => s.id === studentId);
                
                if (student && confirm(`هل أنت متأكد من حذف الطالب ${student.name}؟`)) {
                    await deleteDoc(doc(db, "grades", grade, "students", studentId));
                    
                    // Remove student's absences
                    const absencesSnapshot = await getDocs(absencesCollection);
                    absencesSnapshot.forEach(async (absenceDoc) => {
                        if (absenceDoc.data().studentName === student.name) {
                            await deleteDoc(doc(db, "grades", grade, "absences", absenceDoc.id));
                        }
                    });
                    
                    // Refresh table
                    updateAbsencesTable();
                    
                    showToast("تم حذف الطالب بنجاح", "#dc3545");
                }
            });
        });
    }

    // Check if a student has multiple absences
    function isMultipleAbsences(absences, studentName) {
        return absences.filter(absence => 
            absence.studentName === studentName
        ).length > 1;
    }

    // Toast notification function
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

    // Initial table
    updateAbsencesTable();

    // Refresh the table when the window gets focus to show latest updates
    window.addEventListener('focus', () => {
        updateAbsencesTable();
    });
});
