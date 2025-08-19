import { db } from './firebase-config.js';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is logged in
    if (localStorage.getItem('isLoggedIn') !== 'true') {
        window.location.href = 'login.html';
        return;
    }

    // Get all modal elements
    const primaryModal = document.getElementById('primaryModal');
    const prepModal = document.getElementById('prepModal');
    const secondaryModal = document.getElementById('secondaryModal');
    const customModal = document.getElementById('customModal');
    const customStagesList = document.querySelector('.custom-stages-list');
    
    // Get buttons
    const primaryStageBtn = document.querySelector('.primary-stage');
    const prepStageBtn = document.querySelector('.prep-stage');
    const secondaryStageBtn = document.querySelector('.secondary-stage');
    const customStageBtn = document.querySelector('.custom-stage');
    const arrowContainer = document.querySelector('.arrow-container');
    const arrowDown = document.querySelector('.arrow-down');
    
    // Get close buttons
    const closeButtons = document.querySelectorAll('.close-btn');
    
    // Custom stages array
    const customStagesCollection = collection(db, "customStages");
    let customStages = [];
    const querySnapshot = await getDocs(customStagesCollection);
    querySnapshot.forEach((doc) => {
        customStages.push({ id: doc.id, ...doc.data() });
    });
    
    // Generate random color
    function getRandomColor() {
        const colors = [
            '#1a237e', // Dark Blue
            '#1b5e20', // Dark Green
            '#311b92', // Dark Purple
            '#b71c1c', // Dark Red
            '#004d40', // Dark Teal
            '#263238', // Dark Blue Grey
            '#3e2723', // Dark Brown
            '#212121', // Almost Black
            '#0d47a1', // Navy Blue
            '#1a472a', // Forest Green
            '#2e1437', // Dark Purple
            '#641e16'  // Dark Burgundy
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    // Update custom stages list with edit/delete functionality
    function updateCustomStagesList() {
        if (!customStagesList) return;

        const list = document.querySelector('.custom-stages-list');
        if (!list) return;

        list.innerHTML = '';
        customStages.forEach((stage, index) => {
            const item = document.createElement('div');
            item.className = 'custom-stage-item';
            
            // Create link wrapper
            const linkWrapper = document.createElement('a');
            linkWrapper.href = `students.html?grade=custom${index}`;
            linkWrapper.style.textDecoration = 'none';
            linkWrapper.style.color = 'inherit';
            
            const stageNameSpan = document.createElement('span');
            stageNameSpan.textContent = stage.name;
            
            linkWrapper.appendChild(stageNameSpan);
            
            const optionsBtn = document.createElement('button');
            optionsBtn.className = 'options-btn';
            optionsBtn.innerHTML = '<i class="fas fa-ellipsis-v"></i>';
            
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'stage-actions';
            
            const editBtn = document.createElement('button');
            editBtn.className = 'action-btn';
            editBtn.innerHTML = '<i class="fas fa-pen"></i> تعديل';
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'action-btn delete';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i> حذف';
            
            actionsDiv.appendChild(editBtn);
            actionsDiv.appendChild(deleteBtn);
            
            item.appendChild(linkWrapper);
            item.appendChild(optionsBtn);
            item.appendChild(actionsDiv);
            
            // Make sure the stage color is saved in firestore
            if (!stage.color) {
                stage.color = getRandomColor();
                const stageDoc = doc(db, "customStages", stage.id);
                updateDoc(stageDoc, { color: stage.color });
            }
            
            item.style.backgroundColor = stage.color;
            list.appendChild(item);
            
            // Options button click handler - Show actions immediately
            optionsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Remove active class from all other action menus
                document.querySelectorAll('.stage-actions').forEach(menu => {
                    if (menu !== actionsDiv) {
                        menu.classList.remove('active');
                    }
                });
                actionsDiv.classList.add('active');
            });
            
            // Edit button click handler
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const editModal = document.getElementById('editModal');
                const editInput = document.getElementById('editStageInput');
                if (!editModal || !editInput) return;

                editInput.value = stage.name;
                editModal.style.display = 'block';
                
                const editForm = document.getElementById('editStageForm');
                if (!editForm) return;

                editForm.onsubmit = async (e) => {
                    e.preventDefault();
                    const newName = editInput.value.trim();
                    if (newName) {
                        const stageDoc = doc(db, "customStages", stage.id);
                        await updateDoc(stageDoc, { name: newName });
                        customStages[index].name = newName;
                        updateCustomStagesList();
                        editModal.style.display = 'none';
                        
                        if (typeof Toastify === 'function') {
                            Toastify({
                                text: "تم تعديل المرحلة بنجاح",
                                duration: 3000,
                                gravity: "top",
                                position: 'right',
                                backgroundColor: "#28a745"
                            }).showToast();
                        }
                    }
                };
            });
            
            // Delete button click handler
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm('هل أنت متأكد من حذف هذه المرحلة؟')) {
                    await deleteDoc(doc(db, "customStages", stage.id));
                    customStages.splice(index, 1);
                    updateCustomStagesList();
                    
                    if (typeof Toastify === 'function') {
                        Toastify({
                            text: "تم حذف المرحلة بنجاح",
                            duration: 3000,
                            gravity: "top",
                            position: 'right',
                            backgroundColor: "#dc3545"
                        }).showToast();
                    }
                }
            });
        });
    }
    
    // Add new custom stage
    const addStageForm = document.getElementById('addStageForm');
    if (addStageForm) {
        addStageForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('stageInput');
            if (!input) return;

            const stageName = input.value.trim();
            
            if (stageName) {
                const newStage = {
                    name: stageName,
                    color: getRandomColor()
                };
                
                const docRef = await addDoc(customStagesCollection, newStage);
                customStages.push({ id: docRef.id, ...newStage });
                updateCustomStagesList();
                input.value = '';
                if (customModal) {
                    customModal.style.display = 'none';
                }
            }
        });
    }

    // Add arrow click functionality
    if (arrowDown) {
        arrowDown.style.display = 'block';
        arrowDown.style.cursor = 'pointer';
        arrowDown.style.transition = 'transform 0.3s ease';
    }
    
    if (customStagesList) {
        customStagesList.style.display = 'none';
    }

    // Handle arrow click
    if (arrowContainer) {
        arrowContainer.addEventListener('click', () => {
            if (customStagesList && arrowDown) {
                if (customStagesList.style.display === 'none') {
                    customStagesList.style.display = 'grid';
                    arrowDown.style.transform = 'rotate(180deg)';
                } else {
                    customStagesList.style.display = 'none';
                    arrowDown.style.transform = 'rotate(0deg)';
                }
            }
        });
    }

    // Close all action menus when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.options-btn')) {
            document.querySelectorAll('.stage-actions').forEach(menu => {
                menu.classList.remove('active');
            });
        }
    });
    
    // Modal opening events
    if (primaryStageBtn && primaryModal) {
        primaryStageBtn.addEventListener('click', () => primaryModal.style.display = 'block');
    }
    if (prepStageBtn && prepModal) {
        prepStageBtn.addEventListener('click', () => prepModal.style.display = 'block');
    }
    if (secondaryStageBtn && secondaryModal) {
        secondaryStageBtn.addEventListener('click', () => secondaryModal.style.display = 'block');
    }
    if (customStageBtn && customModal) {
        customStageBtn.addEventListener('click', () => customModal.style.display = 'block');
    }
    
    // Close modals when clicking close button
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (primaryModal) primaryModal.style.display = 'none';
            if (prepModal) prepModal.style.display = 'none';
            if (secondaryModal) secondaryModal.style.display = 'none';
            if (customModal) customModal.style.display = 'none';
        });
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === primaryModal && primaryModal) primaryModal.style.display = 'none';
        if (event.target === prepModal && prepModal) prepModal.style.display = 'none';
        if (event.target === secondaryModal && secondaryModal) secondaryModal.style.display = 'none';
        if (event.target === customModal && customModal) customModal.style.display = 'none';
    });
    
    // Close edit modal with escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            const editModal = document.getElementById('editModal');
            if (editModal) editModal.style.display = 'none';
            if (primaryModal) primaryModal.style.display = 'none';
            if (prepModal) prepModal.style.display = 'none';
            if (secondaryModal) secondaryModal.style.display = 'none';
            if (customModal) customModal.style.display = 'none';
        }
    });
    
    // Close edit modal when clicking outside
    window.addEventListener('click', (event) => {
        const editModal = document.getElementById('editModal');
        if (event.target === editModal && editModal) {
            editModal.style.display = 'none';
        }
    });

    // Update notes button click handlers 
    const addNoteBtn = document.querySelector('.add-note-btn');
    const viewNotesBtn = document.querySelector('.view-notes-btn');

    if (addNoteBtn) {
        addNoteBtn.addEventListener('click', () => {
            const newNoteModal = document.getElementById('newNoteModal');
            const addNotesModal = document.getElementById('addNotesModal');
            if (newNoteModal) newNoteModal.style.display = 'block';
            if (addNotesModal) addNotesModal.style.display = 'none';
        });
    }

    if (viewNotesBtn) {
        viewNotesBtn.addEventListener('click', () => {
            // Redirect to notes list page
            const urlParams = new URLSearchParams(window.location.search);
            const grade = urlParams.get('grade');
            if (grade) {
                window.location.href = `notes.html?grade=${grade}`;
            }
        });
    }

    // Initialize custom stages list on page load
    updateCustomStagesList();

    // Settings functionality
    const settingsBtn = document.querySelector('.settings-btn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = settingsModal?.querySelector('.close-btn');

    // Load saved settings
    const settings = JSON.parse(localStorage.getItem('siteSettings')) || {
        theme: 'light',
        fontSize: 'medium',
        colorScheme: 'default',
        font: 'cairo',
        notifications: false,
        mobileView: false,
        customColors: { primary: '#ff0000', secondary: '#0066cc' } 
    };

    // Apply saved settings on load
    function applySettings(settings) {
        // Apply theme: manage 'dark' and 'light' classes directly
        if (settings.theme === 'dark') {
            document.body.classList.add('dark');
            document.body.classList.remove('light');
        } else {
            document.body.classList.add('light');
            document.body.classList.remove('dark');
        }
        
        // Apply mobile view
        if (settings.mobileView) {
            document.body.classList.add('mobile-view');
        } else {
            document.body.classList.remove('mobile-view');
        }
        
        // Apply font size to the root element (html)
        const fontSizes = {
            small: '14px',
            medium: '16px',
            large: '18px'
        };
        document.documentElement.style.fontSize = fontSizes[settings.fontSize] || fontSizes.medium;
        
        // Apply color scheme
        if (settings.colorScheme === 'custom' && settings.customColors) {
            document.documentElement.style.setProperty('--primary-color', settings.customColors.primary);
            document.documentElement.style.setProperty('--secondary-color', settings.customColors.secondary);
        } else {
            const schemes = {
                default: {
                    primaryColor: '#ff0000',
                    secondaryColor: '#0066cc'
                },
                blue: {
                    primaryColor: '#1a237e',
                    secondaryColor: '#42a5f5'
                },
                green: {
                    primaryColor: '#1b5e20',
                    secondaryColor: '#66bb6a'
                }
            };
            
            const scheme = schemes[settings.colorScheme] || schemes.default;
            if (scheme) {
                document.documentElement.style.setProperty('--primary-color', scheme.primaryColor);
                document.documentElement.style.setProperty('--secondary-color', scheme.secondaryColor);
            }
        }
        
        // Apply font using a dedicated function that targets <html>
        applyFont(settings.font || 'cairo');

        // Update UI controls in settings modal
        // Theme buttons
        document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.theme-btn[data-theme="${settings.theme}"]`)?.classList.add('active');
        
        // Font size buttons
        document.querySelectorAll('.font-size-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.font-size-btn[data-size="${settings.fontSize}"]`)?.classList.add('active');

        // Color scheme buttons
        document.querySelectorAll('.color-scheme-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.color-scheme-btn[data-scheme="${settings.colorScheme}"]`)?.classList.add('active');
        
        // Font buttons
        document.querySelectorAll('.font-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.font-btn[data-font="${settings.font}"]`)?.classList.add('active');

        // Mobile view toggle
        const mobileViewToggle = document.getElementById('mobileViewToggle');
        if (mobileViewToggle) {
            mobileViewToggle.checked = settings.mobileView || false;
        }
    }

    // Function to apply font by adding/removing classes on <html>
    function applyFont(fontName) {
        // Get the html element
        const htmlElement = document.documentElement;

        // Remove all existing font classes from <html>
        htmlElement.classList.forEach(className => {
            if (className.startsWith('font-')) {
                htmlElement.classList.remove(className);
            }
        });

        // Add the new font class to <html>
        htmlElement.classList.add(`font-${fontName}`);
    }

    // Apply all settings on initial load
    applySettings(settings);

    // Settings button click handler
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            if (settingsModal) settingsModal.style.display = 'block';
        });
    }

    // Close settings modal with X button
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            if (settingsModal) settingsModal.style.display = 'none';
        });
    }

    // Close settings modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
    });

    // Close settings modal with Escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && settingsModal) {
            settingsModal.style.display = 'none';
        }
    });

    // Theme selection
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            settings.theme = btn.dataset.theme;
            
            // Apply theme to current page immediately
            // Ensure font classes are not removed when changing theme
            if (settings.theme === 'dark') {
                document.body.classList.add('dark');
                document.body.classList.remove('light');
            } else {
                document.body.classList.add('light');
                document.body.classList.remove('dark');
            }
            
            saveSettings(settings);
        });
    });

    // Font size selection
    document.querySelectorAll('.font-size-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.font-size-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            settings.fontSize = btn.dataset.size;
            applySettings(settings); // This will re-apply all settings including font size
            saveSettings(settings);
        });
    });

    // Color scheme selection
    document.querySelectorAll('.color-scheme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.color-scheme-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            settings.colorScheme = btn.dataset.scheme;
            applySettings(settings); // This will re-apply all settings including color scheme
            saveSettings(settings);
        });
    });

    // Font selection
    document.querySelectorAll('.font-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.font-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            settings.font = btn.dataset.font;
            applySettings(settings); // This will re-apply all settings including font
            saveSettings(settings);
        });
    });

    // Mobile view toggle
    const mobileViewToggle = document.getElementById('mobileViewToggle');
    if (mobileViewToggle) {
        mobileViewToggle.addEventListener('change', () => {
            settings.mobileView = mobileViewToggle.checked;
            
            if (settings.mobileView) {
                document.body.classList.add('mobile-view');
                showToast("تم تفعيل وضع عرض الهاتف", "#28a745");
            } else {
                document.body.classList.remove('mobile-view');
                showToast("تم إلغاء وضع عرض الهاتف", "#dc3545");
            }
            
            saveSettings(settings);
        });
    }

    // Custom color picker functionality
    const primaryColorPicker = document.getElementById('primaryColorPicker');
    const secondaryColorPicker = document.getElementById('secondaryColorPicker');
    const colorPreviewCustom = document.querySelector('.color-preview-custom');
    const applyCustomColorsBtn = document.querySelector('.apply-custom-colors');

    // Update preview when colors change
    function updateColorPreview() {
        if (colorPreviewCustom) {
            colorPreviewCustom.style.background = `linear-gradient(45deg, ${primaryColorPicker.value}, ${secondaryColorPicker.value})`;
        }
    }

    if (primaryColorPicker && secondaryColorPicker) {
        primaryColorPicker.addEventListener('input', updateColorPreview);
        secondaryColorPicker.addEventListener('input', updateColorPreview);
        
        // Initial preview
        updateColorPreview();
    }

    // Apply custom colors
    if (applyCustomColorsBtn) {
        applyCustomColorsBtn.addEventListener('click', () => {
            // Remove active class from other scheme buttons
            document.querySelectorAll('.color-scheme-btn').forEach(btn => {
                btn.classList.remove('active');
            });

            // Apply custom colors
            document.documentElement.style.setProperty('--primary-color', primaryColorPicker.value);
            document.documentElement.style.setProperty('--secondary-color', secondaryColorPicker.value);

            // Save custom colors to settings
            const settings = JSON.parse(localStorage.getItem('siteSettings')) || {};
            settings.colorScheme = 'custom';
            settings.customColors = {
                primary: primaryColorPicker.value,
                secondary: secondaryColorPicker.value
            };
            saveSettings(settings);

            showToast("تم تطبيق الألوان المخصصة بنجاح", "#28a745");
        });
    }

    // Update color pickers with saved custom colors on load
    const savedSettings = JSON.parse(localStorage.getItem('siteSettings')) || {};
    if (savedSettings.colorScheme === 'custom' && savedSettings.customColors) {
        if (primaryColorPicker) {
            primaryColorPicker.value = savedSettings.customColors.primary;
        }
        if (secondaryColorPicker) {
            secondaryColorPicker.value = savedSettings.customColors.secondary;
        }
        updateColorPreview();
    }

    // Reset settings
    const resetBtn = document.querySelector('.reset-settings-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            const defaultSettings = {
                theme: 'light',
                fontSize: 'medium',
                colorScheme: 'default',
                font: 'cairo',
                notifications: false,
                mobileView: false
            };
            
            applySettings(defaultSettings);
            saveSettings(defaultSettings);
            
            showToast("تم إعادة ضبط الإعدادات", "#28a745");
        });
    }

    function saveSettings(settings) {
        localStorage.setItem('siteSettings', JSON.stringify(settings));
        showToast("تم حفظ الإعدادات", "#28a745");
    }

    // Clock functionality
    const clockBtn = document.querySelector('.clock-btn');
    const clockModal = document.getElementById('clockModal');
    const timeDisplay = document.getElementById('timeDisplay');
    const gregorianDateDisplay = document.getElementById('gregorianDate');
    const hijriDateDisplay = document.getElementById('hijriDate');
    const copticDateDisplay = document.getElementById('copticDate');

    // Coptic months
    const copticMonths = [
        'توت', 'بابه', 'هاتور', 'كيهك', 'طوبة', 'أمشير',
        'برمهات', 'برمودة', 'بشنس', 'بؤونة', 'أبيب', 'مسرى', 'نسيء'
    ];

    // Calculate Coptic date
    function getCopticDate() {
        const today = new Date();
        const copticEpoch = new Date(284, 8, 11);
        const diff = today - copticEpoch;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        let year = Math.floor(days / 365.25) + 1;
        let remainingDays = Math.floor(days - ((year - 1) * 365.25));
        let month = Math.floor(remainingDays / 30);
        let day = remainingDays % 30;
        
        if (month >= 13) {
            month = 12;
            day = remainingDays - (12 * 30);
        }
        
        return `${day + 1} ${copticMonths[month]} ${year}`;
    }

    // Update clock
    function updateClock() {
        const now = new Date();
        
        // Time
        const timeStr = now.toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        if (timeDisplay) timeDisplay.textContent = timeStr;
        
        // Gregorian date
        const gregorianStr = now.toLocaleDateString('ar-EG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        if (gregorianDateDisplay) gregorianDateDisplay.textContent = gregorianStr;
        
        // Hijri date
        if (window.moment && hijriDateDisplay) {
            const hijriStr = moment().format('iD iMMMM iYYYY');
            hijriDateDisplay.textContent = hijriStr;
        }
        
        // Coptic date
        if (copticDateDisplay) {
            copticDateDisplay.textContent = getCopticDate();
        }
    }

    // Update clock every second
    setInterval(updateClock, 1000);

    // Initial update
    updateClock();

    // Clock button click handler
    if (clockBtn) {
        clockBtn.addEventListener('click', () => {
            if (clockModal) clockModal.style.display = 'block';
        });
    }

    // Add clock modal to close handlers
    window.addEventListener('click', (event) => {
        if (event.target === clockModal) {
            clockModal.style.display = 'none';
        }
    });

    // Add clock modal to escape key handler
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && clockModal) {
            clockModal.style.display = 'none';
        }
    });

    // Add clock modal to close button handlers
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (clockModal) clockModal.style.display = 'none';
        });
    });

    async function handleAnnualTransfer() {
        // Helper function to clear all data associated with a grade
        async function clearGradeData(grade) {
            const keysToRemove = [
                `students-${grade}`, `exams-${grade}`, `exam-count-${grade}`,
                `exam-totals-${grade}`, `memos-${grade}-1`, `memos-${grade}-2`,
                `memo-notes-${grade}-1`, `memo-notes-${grade}-2`, `notes-${grade}`,
                `student-notes-${grade}`, `absences-${grade}`, `defaulters-${grade}`
            ];
            keysToRemove.forEach(key => localStorage.removeItem(key));

            // Clear DexieDB for curriculum
            try {
                await new Dexie(`curriculumDB_${grade}`).delete();
            } catch (error) {
                console.warn(`Could not delete curriculum DB for ${grade}:`, error);
            }
        }

        try {
            const result = await Swal.fire({
                title: 'تأكيد النقل السنوي',
                text: 'هل أنت متأكد من إجراء النقل السنوي؟ سيتم نقل جميع الطلاب للصف التالي.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'نقل',
                cancelButtonText: 'إلغاء',
                confirmButtonColor: '#0066cc',
                cancelButtonColor: '#dc3545',
                allowOutsideClick: false,
                allowEscapeKey: false,
                backdrop: true,
                preConfirm: () => {
                    return new Promise((resolve) => {
                        const confirmButton = Swal.getConfirmButton();
                        confirmButton.disabled = true;
                        let timeLeft = 10;
                        
                        const timerText = document.createElement('div');
                        timerText.className = 'timer-text';
                        confirmButton.appendChild(timerText);
                        
                        const timer = setInterval(() => {
                            timeLeft--;
                            timerText.textContent = `(${timeLeft})`;
                            
                            if (timeLeft === 0) {
                                clearInterval(timer);
                                confirmButton.disabled = false;
                                timerText.remove();
                                resolve();
                            }
                        }, 1000);
                        
                        Swal.getCancelButton().addEventListener('click', () => {
                            clearInterval(timer);
                        });
                    });
                }
            });

            if (result.isConfirmed) {
                const finalConfirm = await Swal.fire({
                    title: 'تأكيد نهائي',
                    text: 'هل أنت متأكد من إتمام عملية النقل؟ لا يمكن التراجع عن هذه العملية.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'نعم، قم بالنقل',
                    cancelButtonText: 'لا، إلغاء',
                    confirmButtonColor: '#0066cc',
                    cancelButtonColor: '#dc3545'
                });

                if (finalConfirm.isConfirmed) {
                    const gradeOrder = [
                        'prim1', 'prim2', 'prim3', 'prim4', 'prim5', 'prim6',
                        'prep1', 'prep2', 'prep3',
                        'sec1', 'sec2', 'sec3'
                    ];

                    // Clear defaulters for ALL grades first
                    const allKeys = Object.keys(localStorage);
                    allKeys.forEach(key => {
                        if (key.startsWith('defaulters-')) {
                            localStorage.removeItem(key);
                        }
                    });

                    // Process transfers from highest to lowest grade
                    for (let i = gradeOrder.length - 1; i >= 0; i--) {
                        const currentGrade = gradeOrder[i];
                        const nextGrade = i < gradeOrder.length - 1 ? gradeOrder[i + 1] : null;

                        // Get students from the current grade
                        const studentsToTransfer = JSON.parse(localStorage.getItem(`students-${currentGrade}`)) || [];

                        // Clear all data for the current grade
                        await clearGradeData(currentGrade);

                        // If there's a next grade, move the students there with reset data
                        if (nextGrade && studentsToTransfer.length > 0) {
                            const transferredStudents = studentsToTransfer.map(student => ({
                                name: student.name,
                                payments: {
                                    'august': false, 'september': false, 'october': false,
                                    'november': false, 'december': false, 'january': false,
                                    'february': false, 'march': false, 'april': false,
                                    'may': false, 'june': false
                                }
                            }));
                            // We clear the destination grade's data before setting new students
                            await clearGradeData(nextGrade);
                            localStorage.setItem(`students-${nextGrade}`, JSON.stringify(transferredStudents));
                        }
                    }
                    
                    // Final cleanup for the first grade, which should now be empty and its data cleared
                    await clearGradeData(gradeOrder[0]);

                    // Show success message
                    await Swal.fire({
                        title: 'تم النقل بنجاح',
                        text: 'تم نقل الطلاب ومسح جميع بيانات الصفوف القديمة بنجاح.',
                        icon: 'success',
                        confirmButtonText: 'حسناً',
                        confirmButtonColor: '#28a745'
                    });

                    // Refresh the page if we're on a students page or the main page
                    if (window.location.href.includes('students.html') || !window.location.pathname.includes('/')) {
                        window.location.reload();
                    }
                }
            }
        } catch (error) {
            console.error("Annual transfer failed:", error);
            await Swal.fire({
                title: 'خطأ',
                text: 'حدث خطأ أثناء عملية النقل السنوي.',
                icon: 'error',
                confirmButtonText: 'حسناً',
                confirmButtonColor: '#dc3545'
            });
        }
    }

    // Add the event listener to the annual transfer button
    const annualTransferBtn = document.querySelector('.annual-transfer-btn');
    if (annualTransferBtn) {
        annualTransferBtn.addEventListener('click', handleAnnualTransfer);
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

    const sweetAlertScript = document.createElement('script');
    sweetAlertScript.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
    document.head.appendChild(sweetAlertScript);

    // Backup functionality
    const createBackupBtn = document.querySelector('.create-backup-btn');
    const restoreBackupBtn = document.querySelector('.restore-backup-btn');
    const restoreBackupFile = document.getElementById('restoreBackupFile');

    if (createBackupBtn) {
        createBackupBtn.addEventListener('click', createBackup);
    }

    if (restoreBackupBtn) {
        restoreBackupBtn.addEventListener('click', () => {
            restoreBackupFile.click();
        });
    }

    if (restoreBackupFile) {
        restoreBackupFile.addEventListener('change', restoreBackup);
    }

    function createBackup() {
        // Collect all local storage items
        const backupData = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            backupData[key] = localStorage.getItem(key);
        }

        // Convert to JSON
        const backupJson = JSON.stringify(backupData, null, 2);
        
        // Create a Blob
        const blob = new Blob([backupJson], { type: 'application/json' });
        
        // Create a download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_${new Date().toISOString().replace(/:/g, '-')}.json`;
        a.click();

        // Free up memory
        URL.revokeObjectURL(url);

        showToast("تم إنشاء النسخة الاحتياطية بنجاح", "#28a745");
    }

    function restoreBackup(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const backupData = JSON.parse(e.target.result);

                // Confirm restoration
                Swal.fire({
                    title: 'تأكيد الاستعادة',
                    text: 'هل أنت متأكد من استعادة النسخة الاحتياطية؟ سيتم استبدال جميع البيانات الحالية.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'نعم، استعد',
                    cancelButtonText: 'إلغاء',
                    confirmButtonColor: '#0066cc',
                    cancelButtonColor: '#dc3545'
                }).then((result) => {
                    if (result.isConfirmed) {
                        // Clear existing data
                        localStorage.clear();

                        // Restore backup data
                        for (const [key, value] of Object.entries(backupData)) {
                            localStorage.setItem(key, value);
                        }

                        Swal.fire({
                            title: 'تمت الاستعادة',
                            text: 'تمت استعادة النسخة الاحتياطية بنجاح.',
                            icon: 'success',
                            confirmButtonText: 'حسناً',
                            confirmButtonColor: '#28a745'
                        }).then(() => {
                            // Refresh the page
                            window.location.reload();
                        });
                    }
                });
            } catch (error) {
                showToast("فشل في استعادة النسخة الاحتياطية", "#dc3545");
                console.error('Backup restoration error:', error);
            }
        };
        reader.readAsText(file);
    }

    // Add some CSS for the new backup buttons
    const backupStyles = document.createElement('style');
    backupStyles.textContent = `
        .backup-controls {
            display: flex;
            gap: 1rem;
            margin: 1rem 0;
        }

        .backup-btn {
            flex: 1;
            padding: 1rem;
            border: none;
            border-radius: 10px;
            font-size: 1rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.8rem;
            transition: all 0.3s ease;
            color: white;
            font-weight: bold;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }

        .create-backup-btn {
            background: linear-gradient(145deg, #28a745, #218838);
        }

        .restore-backup-btn {
            background: linear-gradient(145deg, #0066cc, #004d99);
        }

        .backup-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
        }

        body.dark .backup-btn {
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
        }

        body.dark .create-backup-btn {
            background: linear-gradient(145deg, #218838, #1e7e34);
        }

        body.dark .restore-backup-btn {
            background: linear-gradient(145deg, #004d99, #003366);
        }
    `;
    document.head.appendChild(backupStyles);

    // Background functionality
    const backgroundTargetSelect = document.getElementById('backgroundTargetSelect');
    const backgroundImageInput = document.getElementById('backgroundImageInput');
    const backgroundPreview = document.getElementById('backgroundPreview');
    const applyBackgroundBtn = document.getElementById('applyBackgroundBtn');
    const removeBackgroundBtn = document.getElementById('removeBackgroundBtn');

    // Show/hide grade selector based on selection
    backgroundTargetSelect.addEventListener('change', () => {
        updateBackgroundPreview();
    });

    // Preview uploaded image
    backgroundImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                showToast("حجم الصورة كبير جداً. الحد الأقصى 5 ميجابايت", "#dc3545");
                backgroundImageInput.value = '';
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                backgroundPreview.src = e.target.result;
                backgroundPreview.style.display = 'block';
                backgroundPreview.parentElement.classList.add('has-image');
            };
            reader.readAsDataURL(file);
        } else {
            backgroundPreview.style.display = 'none';
            backgroundPreview.parentElement.classList.remove('has-image');
        }
    });

    // Apply background
    applyBackgroundBtn.addEventListener('click', () => {
        const file = backgroundImageInput.files[0];
        if (!file) {
            showToast("الرجاء اختيار صورة أولاً", "#dc3545");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const imageData = e.target.result;
            const target = backgroundTargetSelect.value;
            const backgrounds = JSON.parse(localStorage.getItem('pageBackgrounds') || '{}');

            if (target === 'all') {
                backgrounds.all = imageData;
                delete backgrounds.main;
                showToast("تم تطبيق الخلفية على جميع الصفحات", "#28a745");
            } else if (target === 'main') {
                backgrounds.main = imageData;
                showToast("تم تطبيق الخلفية على الصفحة الرئيسية", "#28a745");
            }

            localStorage.setItem('pageBackgrounds', JSON.stringify(backgrounds));
            applyBackgroundToCurrentPage();
        };
        reader.readAsDataURL(file);
    });

    // Remove background
    removeBackgroundBtn.addEventListener('click', () => {
        const target = backgroundTargetSelect.value;
        const backgrounds = JSON.parse(localStorage.getItem('pageBackgrounds') || '{}');
        let message = '';

        if (target === 'all') {
            localStorage.removeItem('pageBackgrounds');
            message = 'تم إزالة جميع الخلفيات';
        } else if (target === 'main') {
            delete backgrounds.main;
            message = 'تم إزالة خلفية الصفحة الرئيسية';
            localStorage.setItem('pageBackgrounds', JSON.stringify(backgrounds));
        }

        backgroundPreview.style.display = 'none';
        backgroundPreview.parentElement.classList.remove('has-image');
        backgroundImageInput.value = '';
        applyBackgroundToCurrentPage();
        showToast(message, "#28a745");
    });

    // Function to update background preview based on current selection
    function updateBackgroundPreview() {
        const backgrounds = JSON.parse(localStorage.getItem('pageBackgrounds') || '{}');
        const target = backgroundTargetSelect.value;
        let currentBackground = null;

        if (target === 'all' && backgrounds.all) {
            currentBackground = backgrounds.all;
        } else if (target === 'main' && backgrounds.main) {
            currentBackground = backgrounds.main;
        }

        if (currentBackground) {
            backgroundPreview.src = currentBackground;
            backgroundPreview.style.display = 'block';
            backgroundPreview.parentElement.classList.add('has-image');
        } else {
            backgroundPreview.style.display = 'none';
            backgroundPreview.parentElement.classList.remove('has-image');
        }
    }

    // Function to apply background to current page
    function applyBackgroundToCurrentPage() {
        const backgrounds = JSON.parse(localStorage.getItem('pageBackgrounds') || '{}');
        let backgroundImage = null;

        // Check for main page background
        if (!window.location.search && backgrounds.main) {
            backgroundImage = backgrounds.main;
        }
        // Fall back to global background
        else if (backgrounds.all) {
            backgroundImage = backgrounds.all;
        }

        if (backgroundImage) {
            document.body.style.backgroundImage = `url(${backgroundImage})`;
            document.body.classList.add('custom-background');
        } else {
            document.body.style.backgroundImage = 'none';
            document.body.classList.remove('custom-background');
        }
    }

    // Apply background on page load
    window.addEventListener('load', () => {
        applyBackgroundToCurrentPage();
        updateBackgroundPreview();
    });

    // Add CSS styles to ensure background images are properly displayed
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
    .custom-background {
        background-size: cover !important;
        background-position: center !important;
        background-repeat: no-repeat !important;
        background-attachment: fixed !important;
        position: relative !important;
    }

    .custom-background::before {
        content: '';
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.85);
        z-index: -1;
        backdrop-filter: blur(2px);
    }

    body.dark .custom-background::before {
        background: rgba(0, 0, 0, 0.75);
    }
    `;
    document.head.appendChild(styleSheet);

    function createVirtualKeyboard() {
        const keyboard = document.querySelector('.virtual-keyboard');
        if (!keyboard) return; // Exit if keyboard container doesn't exist

        const keyboardLayout = [
            ['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج', 'د'],
            ['ش', 'س', 'ي', 'ب', 'ل', 'ا', 'ت', 'ن', 'م', 'ك', 'ط', 'ذ'],
            ['ئ', 'ء', 'ؤ', 'ر', 'لا', 'ى', 'ة', 'و', 'ز', 'ظ', 'آ'],
            ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']
        ];

        let currentInput = null;
        keyboard.innerHTML = ''; // Clear existing content

        // Create keyboard rows
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
                    }
                });
                keyboardRow.appendChild(keyButton);
            });
            keyboard.appendChild(keyboardRow);
        });

        // Add space and backspace row
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
    }

    const needsKeyboard = document.querySelector('.virtual-keyboard');
    if (needsKeyboard) {
        createVirtualKeyboard();
    }
});
