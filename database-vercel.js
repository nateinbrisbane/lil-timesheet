const { sql } = require('@vercel/postgres');

class VercelDatabase {
    constructor() {
        this.db = sql;
    }

    async connect() {
        try {
            console.log('Connecting to Vercel Postgres...');
            await this.createTables();
            console.log('Connected to Vercel Postgres database');
        } catch (error) {
            console.error('Failed to connect to database:', error);
            throw error;
        }
    }

    async createTables() {
        try {
            // Create users table
            await sql`
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    google_id TEXT UNIQUE NOT NULL,
                    email TEXT NOT NULL,
                    name TEXT NOT NULL,
                    profile_picture TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `;

            // Create timesheets table
            await sql`
                CREATE TABLE IF NOT EXISTS timesheets (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    week_start DATE NOT NULL,
                    weekly_total TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, week_start)
                )
            `;

            // Create day_entries table
            await sql`
                CREATE TABLE IF NOT EXISTS day_entries (
                    id SERIAL PRIMARY KEY,
                    timesheet_id INTEGER NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
                    day_name TEXT NOT NULL,
                    date TEXT NOT NULL,
                    start_time TEXT,
                    break_hours INTEGER DEFAULT 0,
                    break_minutes INTEGER DEFAULT 0,
                    finish_time TEXT,
                    total_hours TEXT,
                    UNIQUE(timesheet_id, day_name)
                )
            `;

            console.log('Database tables created successfully');
        } catch (error) {
            console.error('Error creating tables:', error);
            throw error;
        }
    }

    async createOrUpdateUser(googleProfile) {
        try {
            const { id: googleId, emails, displayName, photos } = googleProfile;
            const email = emails && emails[0] ? emails[0].value : '';
            const profilePicture = photos && photos[0] ? photos[0].value : '';

            // Try to find existing user
            const existingUser = await sql`
                SELECT * FROM users WHERE google_id = ${googleId}
            `;

            if (existingUser.rows.length > 0) {
                // Update existing user
                const updatedUser = await sql`
                    UPDATE users 
                    SET email = ${email}, name = ${displayName}, profile_picture = ${profilePicture}, updated_at = CURRENT_TIMESTAMP
                    WHERE google_id = ${googleId}
                    RETURNING *
                `;
                return updatedUser.rows[0];
            } else {
                // Create new user
                const newUser = await sql`
                    INSERT INTO users (google_id, email, name, profile_picture)
                    VALUES (${googleId}, ${email}, ${displayName}, ${profilePicture})
                    RETURNING *
                `;
                return newUser.rows[0];
            }
        } catch (error) {
            console.error('Error creating/updating user:', error);
            throw error;
        }
    }

    async getUserById(userId) {
        try {
            const result = await sql`
                SELECT * FROM users WHERE id = ${userId}
            `;
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error fetching user by ID:', error);
            throw error;
        }
    }

    async getUserByGoogleId(googleId) {
        try {
            const result = await sql`
                SELECT * FROM users WHERE google_id = ${googleId}
            `;
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error fetching user by Google ID:', error);
            throw error;
        }
    }

    async saveTimesheet(userId, weekData) {
        try {
            const { weekStart, weeklyTotal, data } = weekData;

            // Insert or update timesheet
            const timesheet = await sql`
                INSERT INTO timesheets (user_id, week_start, weekly_total, updated_at)
                VALUES (${userId}, ${weekStart}, ${weeklyTotal}, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id, week_start) 
                DO UPDATE SET 
                    weekly_total = EXCLUDED.weekly_total,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING id
            `;

            const timesheetId = timesheet.rows[0].id;

            // Delete existing day entries
            await sql`
                DELETE FROM day_entries WHERE timesheet_id = ${timesheetId}
            `;

            // Insert new day entries
            const dayNames = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
            for (const day of dayNames) {
                const dayData = data[day];
                await sql`
                    INSERT INTO day_entries 
                    (timesheet_id, day_name, date, start_time, break_hours, break_minutes, finish_time, total_hours)
                    VALUES (
                        ${timesheetId}, ${day}, ${dayData.date},
                        ${dayData.start || null}, 
                        ${parseInt(dayData.breakHours) || 0},
                        ${parseInt(dayData.breakMinutes) || 0},
                        ${dayData.finish || null}, ${dayData.total || '0:00'}
                    )
                `;
            }

            return { id: timesheetId };
        } catch (error) {
            console.error('Error saving timesheet:', error);
            throw error;
        }
    }

    async getTimesheet(userId, weekStart) {
        try {
            const result = await sql`
                SELECT t.*, d.day_name, d.date, d.start_time, d.break_hours, d.break_minutes, 
                       d.finish_time, d.total_hours
                FROM timesheets t
                LEFT JOIN day_entries d ON t.id = d.timesheet_id
                WHERE t.user_id = ${userId} AND t.week_start = ${weekStart}
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

            if (result.rows.length === 0) {
                return null;
            }

            const timesheet = {
                weekStart: result.rows[0].week_start,
                weeklyTotal: result.rows[0].weekly_total,
                data: {}
            };

            result.rows.forEach(row => {
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

            return timesheet;
        } catch (error) {
            console.error('Error fetching timesheet:', error);
            throw error;
        }
    }

    async getAllTimesheets(userId) {
        try {
            const result = await sql`
                SELECT week_start, weekly_total, created_at, updated_at
                FROM timesheets
                WHERE user_id = ${userId}
                ORDER BY week_start DESC
            `;
            return result.rows;
        } catch (error) {
            console.error('Error fetching all timesheets:', error);
            throw error;
        }
    }

    async close() {
        // No explicit close needed for Vercel Postgres
        console.log('Database connection closed');
    }
}

module.exports = VercelDatabase;