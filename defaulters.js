import { db } from './firebase-config.js';
import { collection, getDocs, doc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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
    const defaultersCollection = collection(db, "grades", grade, "defaulters");

    if (!grade) {
        console.error('No grade parameter found in URL');
        return;
    }

    async function updateDefaultersTable() {
        const defaultersTableBody = document.getElementById('defaultersTableBody');
        const defaulters = await getDefaulters();
        
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
            btn.addEventListener('click', async (e) => {
                const defaulterId = e.target.closest('.remove-defaulter').dataset.id;
                await removeDefaulter(defaulterId);
                updateDefaultersTable();
            });
        });
    }

    async function getDefaulters() {
        const defaulters = [];
        const querySnapshot = await getDocs(defaultersCollection);
        querySnapshot.forEach((doc) => {
            defaulters.push({ id: doc.id, ...doc.data() });
        });
        defaulters.sort((a, b) => a.studentNumber - b.studentNumber);
        
        // Sort months for each defaulter
        const monthNames = ['august', 'september', 'october', 'november', 'december', 
                           'january', 'february', 'march', 'april', 'may', 'june'];
        
        defaulters.forEach(defaulter => {
            defaulter.months.sort((a, b) => {
                let aIndex = monthNames.indexOf(a);
                let bIndex = monthNames.indexOf(b);
                // Adjust indices for academic year starting in August
                aIndex = aIndex < 7 ? aIndex + 12 : aIndex;
                bIndex = bIndex < 7 ? bIndex + 12 : bIndex;
                return aIndex - bIndex;
            });
        });
        
        return defaulters;
    }

    async function removeDefaulter(defaulterId) {
        await deleteDoc(doc(db, "grades", grade, "defaulters", defaulterId));

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

    // Initialize table
    updateDefaultersTable();

    // Check for updates every minute
    setInterval(() => {
        updateDefaultersTable();
    }, 60000);

    // Also check when the page gets focus
    window.addEventListener('focus', () => {
        updateDefaultersTable();
    });

    // Check when visibility changes
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            updateDefaultersTable();
        }
    });

});
