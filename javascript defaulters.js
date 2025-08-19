document.addEventListener('DOMContentLoaded', () => {
    // Get grade from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const grade = urlParams.get('grade');

    if (!grade) {
        console.error('No grade parameter found in URL');
        return;
    }

    function updateDefaultersTable() {
        const defaultersTableBody = document.getElementById('defaultersTableBody');
        const defaulters = getDefaulters();
        
        defaultersTableBody.innerHTML = defaulters.map((defaulter, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${defaulter.studentNumber}</td>
                <td>${defaulter.name}</td>
                <td>
                    <div class="months-list">
                        ${defaulter.months.map(month => `
                            <span class="month-tag">${getMonthName(month)}</span>
                        `).join('')}
                    </div>
                </td>
                <td>
                    <button class="remove-defaulter" data-id="${defaulter.id}">
                        <i class="fas fa-trash"></i>
                        حذف
                    </button>
                </td>
            </tr>
        `).join('');

        // Add event listeners for remove buttons
        document.querySelectorAll('.remove-defaulter').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const defaulterId = e.target.closest('.remove-defaulter').dataset.id;
                removeDefaulter(defaulterId);
                updateDefaultersTable();
            });
        });
    }

    function getDefaulters() {
        const defaulters = JSON.parse(localStorage.getItem(`defaulters-${grade}`)) || [];
        return defaulters;
    }

    function removeDefaulter(defaulterId) {
        let defaulters = getDefaulters();
        defaulters = defaulters.filter(d => d.id !== defaulterId);
        localStorage.setItem(`defaulters-${grade}`, JSON.stringify(defaulters));

        Toastify({
            text: "تم حذف الطالب من قائمة الممتنعين",
            duration: 3000,
            gravity: "top",
            position: 'right',
            backgroundColor: "#dc3545"
        }).showToast();
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

    function checkDefaulters() {
        const today = new Date();
        const currentDay = today.getDate();
        const currentMonth = today.getMonth();
        
        // Only check on the 3rd of each month
        if (currentDay === 3) {
            const students = JSON.parse(localStorage.getItem(`students-${grade}`)) || [];
            const defaulters = JSON.parse(localStorage.getItem(`defaulters-${grade}`)) || [];
            
            const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                              'july', 'august', 'september', 'october', 'november', 'december'];
            
            const currentMonthName = monthNames[currentMonth];
            
            students.forEach((student, index) => {
                if (student.name && !student.payments[currentMonthName]) {
                    // Check if student is already in defaulters
                    const existingDefaulter = defaulters.find(d => d.studentNumber === (index + 1));
                    
                    if (existingDefaulter) {
                        if (!existingDefaulter.months.includes(currentMonthName)) {
                            existingDefaulter.months.push(currentMonthName);
                        }
                    } else {
                        defaulters.push({
                            id: Date.now().toString() + index,
                            studentNumber: index + 1,
                            name: student.name,
                            months: [currentMonthName]
                        });
                    }
                }
            });
            
            localStorage.setItem(`defaulters-${grade}`, JSON.stringify(defaulters));
        }
    }

    // Initialize table
    updateDefaultersTable();

    // Check for defaulters on page load
    checkDefaulters();
});