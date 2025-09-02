const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'timesheet.db');

class Database {
    constructor() {
        this.db = null;
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    console.error('Error opening database:', err.message);
                    reject(err);
                } else {
                    console.log('Connected to SQLite database');
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }

    createTables() {
        return new Promise((resolve, reject) => {
            const createUsersTable = `
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    google_id TEXT UNIQUE NOT NULL,
                    email TEXT NOT NULL,
                    name TEXT NOT NULL,
                    profile_picture TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `;

            const createTimesheetTable = `
                CREATE TABLE IF NOT EXISTS timesheets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    week_start DATE NOT NULL,
                    weekly_total TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                    UNIQUE(user_id, week_start)
                )
            `;

            const createDayEntriesTable = `
                CREATE TABLE IF NOT EXISTS day_entries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timesheet_id INTEGER NOT NULL,
                    day_name TEXT NOT NULL,
                    date TEXT NOT NULL,
                    start_time TEXT,
                    break_hours INTEGER DEFAULT 0,
                    break_minutes INTEGER DEFAULT 0,
                    finish_time TEXT,
                    total_hours TEXT,
                    FOREIGN KEY (timesheet_id) REFERENCES timesheets (id) ON DELETE CASCADE,
                    UNIQUE(timesheet_id, day_name)
                )
            `;

            this.db.serialize(() => {
                this.db.run(createUsersTable, (err) => {
                    if (err) {
                        console.error('Error creating users table:', err.message);
                        reject(err);
                        return;
                    }
                });

                this.db.run(createTimesheetTable, (err) => {
                    if (err) {
                        console.error('Error creating timesheets table:', err.message);
                        reject(err);
                        return;
                    }
                });

                this.db.run(createDayEntriesTable, (err) => {
                    if (err) {
                        console.error('Error creating day_entries table:', err.message);
                        reject(err);
                        return;
                    }
                    console.log('Database tables created successfully');
                    resolve();
                });
            });
        });
    }

    createOrUpdateUser(googleProfile) {
        return new Promise((resolve, reject) => {
            const { id: googleId, emails, displayName, photos } = googleProfile;
            const email = emails && emails[0] ? emails[0].value : '';
            const profilePicture = photos && photos[0] ? photos[0].value : '';

            const insertOrUpdateUser = `
                INSERT INTO users (google_id, email, name, profile_picture, updated_at) 
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(google_id) DO UPDATE SET
                    email = excluded.email,
                    name = excluded.name,
                    profile_picture = excluded.profile_picture,
                    updated_at = CURRENT_TIMESTAMP
            `;

            this.db.run(insertOrUpdateUser, [googleId, email, displayName, profilePicture], function(err) {
                if (err) {
                    console.error('Error creating/updating user:', err.message);
                    reject(err);
                    return;
                }

                const getUserQuery = 'SELECT * FROM users WHERE google_id = ?';
                this.db.get(getUserQuery, [googleId], (err, user) => {
                    if (err) {
                        console.error('Error fetching user:', err.message);
                        reject(err);
                    } else {
                        resolve(user);
                    }
                });
            }.bind(this));
        });
    }

    getUserById(userId) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM users WHERE id = ?';
            this.db.get(query, [userId], (err, user) => {
                if (err) {
                    console.error('Error fetching user by ID:', err.message);
                    reject(err);
                } else {
                    resolve(user);
                }
            });
        });
    }

    getUserByGoogleId(googleId) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM users WHERE google_id = ?';
            this.db.get(query, [googleId], (err, user) => {
                if (err) {
                    console.error('Error fetching user by Google ID:', err.message);
                    reject(err);
                } else {
                    resolve(user);
                }
            });
        });
    }

    saveTimesheet(userId, weekData) {
        return new Promise((resolve, reject) => {
            const { weekStart, weeklyTotal, data } = weekData;

            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION');

                const insertTimesheet = `
                    INSERT OR REPLACE INTO timesheets (user_id, week_start, weekly_total, updated_at) 
                    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                `;

                this.db.run(insertTimesheet, [userId, weekStart, weeklyTotal], function(err) {
                    if (err) {
                        console.error('Error saving timesheet:', err.message);
                        reject(err);
                        return;
                    }

                    const timesheetId = this.lastID || this.changes;

                    if (this.changes === 0) {
                        const getTimesheetId = `SELECT id FROM timesheets WHERE user_id = ? AND week_start = ?`;
                        this.db.get(getTimesheetId, [userId, weekStart], (err, row) => {
                            if (err) {
                                console.error('Error getting timesheet ID:', err.message);
                                reject(err);
                                return;
                            }
                            saveDayEntries(row.id);
                        });
                    } else {
                        saveDayEntries(timesheetId);
                    }
                });

                const saveDayEntries = (timesheetId) => {
                    this.db.run('DELETE FROM day_entries WHERE timesheet_id = ?', [timesheetId], (err) => {
                        if (err) {
                            console.error('Error deleting old day entries:', err.message);
                            reject(err);
                            return;
                        }

                        const insertDayEntry = `
                            INSERT INTO day_entries 
                            (timesheet_id, day_name, date, start_time, break_hours, break_minutes, finish_time, total_hours) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        `;

                        const dayNames = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
                        let completed = 0;

                        dayNames.forEach(day => {
                            const dayData = data[day];
                            this.db.run(insertDayEntry, [
                                timesheetId,
                                day,
                                dayData.date,
                                dayData.start || null,
                                parseInt(dayData.breakHours) || 0,
                                parseInt(dayData.breakMinutes) || 0,
                                dayData.finish || null,
                                dayData.total || '0:00'
                            ], (err) => {
                                if (err) {
                                    console.error('Error saving day entry:', err.message);
                                    reject(err);
                                    return;
                                }

                                completed++;
                                if (completed === dayNames.length) {
                                    this.db.run('COMMIT', (err) => {
                                        if (err) {
                                            console.error('Error committing transaction:', err.message);
                                            reject(err);
                                        } else {
                                            resolve({ id: timesheetId });
                                        }
                                    });
                                }
                            });
                        });
                    });
                };
            });
        });
    }

    getTimesheet(userId, weekStart) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT t.*, d.day_name, d.date, d.start_time, d.break_hours, d.break_minutes, 
                       d.finish_time, d.total_hours
                FROM timesheets t
                LEFT JOIN day_entries d ON t.id = d.timesheet_id
                WHERE t.user_id = ? AND t.week_start = ?
                ORDER BY 
                    CASE d.day_name 
                        WHEN 'mon' THEN 1 
                        WHEN 'tue' THEN 2 
                        WHEN 'wed' THEN 3 
                        WHEN 'thu' THEN 4 
                        WHEN 'fri' THEN 5 
                        WHEN 'sat' THEN 6 
                        WHEN 'sun' THEN 7 
                    END
            `;

            this.db.all(query, [userId, weekStart], (err, rows) => {
                if (err) {
                    console.error('Error fetching timesheet:', err.message);
                    reject(err);
                    return;
                }

                if (rows.length === 0) {
                    resolve(null);
                    return;
                }

                const timesheet = {
                    weekStart: rows[0].week_start,
                    weeklyTotal: rows[0].weekly_total,
                    data: {}
                };

                rows.forEach(row => {
                    if (row.day_name) {
                        timesheet.data[row.day_name] = {
                            date: row.date,
                            start: row.start_time,
                            breakHours: row.break_hours ? row.break_hours.toString() : '',
                            breakMinutes: row.break_minutes ? row.break_minutes.toString() : '',
                            finish: row.finish_time,
                            total: row.total_hours
                        };
                    }
                });

                resolve(timesheet);
            });
        });
    }

    getAllTimesheets(userId) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT week_start, weekly_total, created_at, updated_at
                FROM timesheets
                WHERE user_id = ?
                ORDER BY week_start DESC
            `;

            this.db.all(query, [userId], (err, rows) => {
                if (err) {
                    console.error('Error fetching all timesheets:', err.message);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err.message);
                        reject(err);
                    } else {
                        console.log('Database connection closed');
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = Database;