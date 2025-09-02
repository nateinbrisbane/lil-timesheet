class LilTimesheet {
    constructor() {
        this.currentWeekOffset = 0;
        this.days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        this.dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        
        this.init();
    }

    async init() {
        try {
            await this.loadUserInfo();
            this.setupEventListeners();
            this.loadCurrentWeek();
            this.setDefaultValues();
            await this.loadSavedData();
        } catch (error) {
            console.error('Failed to initialize app:', error);
            if (error.message.includes('Authentication required')) {
                window.location.href = '/login';
            }
        }
    }

    setupEventListeners() {
        document.getElementById('prevWeek').addEventListener('click', () => this.navigateWeek(-1));
        document.getElementById('nextWeek').addEventListener('click', () => this.navigateWeek(1));
        document.getElementById('saveTimesheet').addEventListener('click', () => this.saveTimesheet());
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        this.days.forEach(day => {
            // Start and finish time inputs
            ['start', 'finish'].forEach(type => {
                const input = document.getElementById(`${type}-${day}`);
                input.addEventListener('change', () => this.calculateDayTotal(day));
            });
            
            // Break hours and minutes inputs
            const breakHoursInput = document.getElementById(`break-hours-${day}`);
            const breakMinutesInput = document.getElementById(`break-minutes-${day}`);
            breakHoursInput.addEventListener('change', () => this.calculateDayTotal(day));
            breakMinutesInput.addEventListener('change', () => this.calculateDayTotal(day));
        });
    }

    getMonday(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    }

    formatDate(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    loadCurrentWeek() {
        const today = new Date();
        const monday = this.getMonday(today);
        monday.setDate(monday.getDate() + (this.currentWeekOffset * 7));

        this.currentMonday = monday;
        this.updateWeekDisplay();
    }

    updateWeekDisplay() {
        const weekStart = new Date(this.currentMonday);
        const weekEnd = new Date(this.currentMonday);
        weekEnd.setDate(weekEnd.getDate() + 6);

        document.getElementById('weekRange').textContent = 
            `${this.formatDate(weekStart)} - ${this.formatDate(weekEnd)}`;

        this.days.forEach((day, index) => {
            const currentDate = new Date(this.currentMonday);
            currentDate.setDate(currentDate.getDate() + index);
            document.getElementById(`date-${day}`).textContent = this.formatDate(currentDate);
        });
    }

    async navigateWeek(direction) {
        this.currentWeekOffset += direction;
        this.loadCurrentWeek();
        this.setDefaultValues();
        await this.loadSavedData();
    }

    setDefaultValues() {
        this.days.forEach(day => {
            const isWeekend = day === 'sat' || day === 'sun';
            
            if (isWeekend) {
                document.getElementById(`start-${day}`).value = '';
                document.getElementById(`break-hours-${day}`).value = '';
                document.getElementById(`break-minutes-${day}`).value = '';
                document.getElementById(`finish-${day}`).value = '';
            } else {
                document.getElementById(`start-${day}`).value = '08:30';
                document.getElementById(`break-hours-${day}`).value = '0';
                document.getElementById(`break-minutes-${day}`).value = '30';
                document.getElementById(`finish-${day}`).value = '17:00';
            }
            
            this.calculateDayTotal(day);
        });
    }

    timeToMinutes(timeString) {
        if (!timeString) return 0;
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 + minutes;
    }

    minutesToTime(minutes) {
        if (minutes < 0) return '0:00';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}:${String(mins).padStart(2, '0')}`;
    }

    calculateDayTotal(day) {
        const startTime = document.getElementById(`start-${day}`).value;
        const finishTime = document.getElementById(`finish-${day}`).value;
        const breakHours = parseInt(document.getElementById(`break-hours-${day}`).value) || 0;
        const breakMinutes = parseInt(document.getElementById(`break-minutes-${day}`).value) || 0;

        if (!startTime || !finishTime) {
            document.getElementById(`total-${day}`).textContent = '0:00';
            this.calculateWeeklyTotal();
            return;
        }

        const startMinutes = this.timeToMinutes(startTime);
        const finishMinutes = this.timeToMinutes(finishTime);
        const totalBreakMinutes = (breakHours * 60) + breakMinutes;

        let totalMinutes = finishMinutes - startMinutes - totalBreakMinutes;
        
        if (totalMinutes < 0) totalMinutes = 0;

        document.getElementById(`total-${day}`).textContent = this.minutesToTime(totalMinutes);
        this.calculateWeeklyTotal();
    }

    calculateWeeklyTotal() {
        let totalWeeklyMinutes = 0;

        this.days.forEach(day => {
            const dayTotalText = document.getElementById(`total-${day}`).textContent;
            totalWeeklyMinutes += this.timeToMinutes(dayTotalText);
        });

        document.getElementById('weeklyTotal').textContent = this.minutesToTime(totalWeeklyMinutes);
    }

    getWeekKey() {
        return this.formatDate(this.currentMonday).replace(/\//g, '-');
    }

    async saveTimesheet() {
        const saveBtn = document.getElementById('saveTimesheet');
        const originalText = saveBtn.textContent;
        
        try {
            saveBtn.textContent = 'Saving...';
            saveBtn.disabled = true;

            const weekData = {
                weekStart: this.formatDate(this.currentMonday),
                data: {}
            };

            this.days.forEach(day => {
                weekData.data[day] = {
                    date: document.getElementById(`date-${day}`).textContent,
                    start: document.getElementById(`start-${day}`).value,
                    breakHours: document.getElementById(`break-hours-${day}`).value,
                    breakMinutes: document.getElementById(`break-minutes-${day}`).value,
                    finish: document.getElementById(`finish-${day}`).value,
                    total: document.getElementById(`total-${day}`).textContent
                };
            });

            weekData.weeklyTotal = document.getElementById('weeklyTotal').textContent;

            const response = await fetch('/api/timesheet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(weekData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to save timesheet');
            }

            this.showSaveConfirmation('Saved!', '#27ae60');
        } catch (error) {
            console.error('Error saving timesheet:', error);
            this.showSaveConfirmation('Save failed!', '#e74c3c');
        } finally {
            setTimeout(() => {
                saveBtn.textContent = originalText;
                saveBtn.disabled = false;
            }, 2000);
        }
    }

    async loadSavedData() {
        try {
            const weekStart = this.formatDate(this.currentMonday);
            const response = await fetch(`/api/timesheet/${encodeURIComponent(weekStart)}`);

            if (response.status === 404) {
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to load timesheet data');
            }

            const result = await response.json();
            const weekData = result.data;
            
            this.days.forEach(day => {
                const dayData = weekData.data[day];
                if (dayData) {
                    document.getElementById(`start-${day}`).value = dayData.start || '';
                    document.getElementById(`break-hours-${day}`).value = dayData.breakHours || '';
                    document.getElementById(`break-minutes-${day}`).value = dayData.breakMinutes || '';
                    document.getElementById(`finish-${day}`).value = dayData.finish || '';
                    this.calculateDayTotal(day);
                }
            });
        } catch (error) {
            console.error('Error loading timesheet data:', error);
        }
    }

    async loadUserInfo() {
        try {
            const response = await fetch('/api/user');
            
            if (!response.ok) {
                throw new Error('Authentication required');
            }

            const result = await response.json();
            const user = result.user;

            document.getElementById('userName').textContent = user.name;
            
            if (user.profilePicture) {
                const avatar = document.getElementById('userAvatar');
                avatar.src = user.profilePicture;
                avatar.style.display = 'block';
            }
        } catch (error) {
            console.error('Error loading user info:', error);
            throw error;
        }
    }

    async logout() {
        try {
            const response = await fetch('/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                window.location.href = '/login';
            } else {
                console.error('Logout failed');
            }
        } catch (error) {
            console.error('Error during logout:', error);
        }
    }

    showSaveConfirmation(message = 'Saved!', color = '#27ae60') {
        const saveBtn = document.getElementById('saveTimesheet');
        const originalText = saveBtn.textContent;
        const originalColor = saveBtn.style.background;
        
        saveBtn.textContent = message;
        saveBtn.style.background = color;
        
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.style.background = originalColor || '#27ae60';
        }, 2000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new LilTimesheet();
});