# Lil Timesheet

A simple, elegant multi-user timesheet tracking application with Google authentication and database persistence.

## Features

- **🔐 Multi-User Support**: Secure Google OAuth 2.0 authentication
- **📊 Weekly Timesheet Layout**: Monday to Sunday columns with intuitive time tracking
- **📅 Smart Date Display**: Automatic date formatting (dd/MM/yyyy) based on selected week
- **⏰ Flexible Time Inputs**: Start/finish time inputs and separate hours/minutes for breaks
- **🧮 Automatic Calculations**: Real-time daily and weekly total calculations
- **💾 Secure Database Storage**: User-isolated SQLite database with REST API
- **🔄 Week Navigation**: Easy navigation between weeks
- **⚙️ Default Values**: Pre-filled weekday defaults (Start: 08:30, Break: 0h 30m, Finish: 17:00)
- **📱 Responsive Design**: Works on desktop and mobile devices
- **🔒 Data Privacy**: Each user's data is completely isolated from others

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm (comes with Node.js)
- Google Cloud Console account (for OAuth setup)

### Installation

1. **Google OAuth Setup**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized origins: `http://localhost:3000` (for development)
   - Add redirect URIs: `http://localhost:3000/auth/google/callback`

2. **Environment Setup**:
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Edit .env file with your Google OAuth credentials
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   SESSION_SECRET=your_random_session_secret
   ```

3. **Install and Run**:
   ```bash
   # Navigate to project directory
   cd "Lil Timesheet"
   
   # Install dependencies
   npm install
   
   # Start the server
   npm start
   ```

4. **Access Application**:
   - Open http://localhost:3000
   - You'll be redirected to login page
   - Sign in with your Google account

## Usage

1. **Current Week**: The application loads with the current week by default
2. **Enter Time Data**: Fill in start times, break duration (hours/minutes), and finish times
3. **View Totals**: Daily and weekly totals are calculated automatically
4. **Save**: Click "Save Timesheet" to persist your data to the database
5. **Navigate**: Use Previous/Next Week buttons to view different weeks
6. **Weekend Defaults**: Saturday and Sunday start empty by default

## API Endpoints

The application provides a REST API for timesheet management:

- `GET /api/timesheets` - List all saved timesheets
- `GET /api/timesheet/:weekStart` - Get specific timesheet by week start date
- `POST /api/timesheet` - Save a timesheet
- `DELETE /api/timesheet/:weekStart` - Delete a specific timesheet
- `GET /api/health` - Health check endpoint

## Database

The application uses SQLite for data storage. The database file (`timesheet.db`) is automatically created in the project directory on first run.

### Database Schema

**timesheets** table:
- `id` - Primary key
- `week_start` - Week start date (unique)
- `weekly_total` - Total hours for the week
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

**day_entries** table:
- `id` - Primary key
- `timesheet_id` - Foreign key to timesheets table
- `day_name` - Day of week (mon, tue, wed, etc.)
- `date` - Specific date
- `start_time` - Work start time
- `break_hours` - Break hours
- `break_minutes` - Break minutes
- `finish_time` - Work finish time
- `total_hours` - Calculated total hours for the day

## Development

### Project Structure

```
Lil Timesheet/
├── index.html          # Frontend HTML
├── styles.css          # CSS styles
├── script.js           # Frontend JavaScript
├── server.js           # Express.js server
├── database.js         # Database operations
├── package.json        # Node.js dependencies
├── timesheet.db        # SQLite database (created automatically)
└── README.md           # This file
```

### Technologies Used

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Database**: SQLite3
- **Architecture**: REST API with JSON data exchange

## Deployment

For production deployment, see [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions on deploying to various hosting providers including Railway, Render, Vercel, and Heroku.

### Quick Deploy to Railway

1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Initialize: `railway init`
4. Set environment variables in Railway dashboard
5. Deploy: `railway up`

**Remember to update Google OAuth URLs with your production domain!**

## Security & Privacy

- All user data is isolated per Google account
- Session-based authentication with secure cookies
- No password storage - uses Google OAuth 2.0
- SQLite database with user-specific data separation
- HTTPS enforced in production

## License

MIT LicenseWebhook test: 03 Sep 2025 08:05:15
