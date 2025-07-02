# AstroPsyche - Cosmic Blueprint Generator

A beautiful, interactive web application that combines astrology and psychology to create personalized cosmic blueprints through AI-powered conversations.

## Features

- **3D Solar System Background**: Interactive Three.js visualization with planetary animations
- **Conversational AI**: Dynamic questionnaire that adapts based on user responses
- **Astrological Analysis**: Birth chart calculations and cosmic insights
- **Psychological Profiling**: Deep personality analysis through conversation
- **PDF Generation**: Downloadable cosmic blueprint reports
- **Responsive Design**: Works seamlessly across all devices

## Setup Instructions

### 1. Supabase Configuration

This application requires a Supabase backend for full functionality. Follow these steps:

#### Enable Anonymous Authentication
1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **Anonymous** in the list and toggle it **ON**
4. Save the changes

#### Apply Database Migrations
1. In your Supabase dashboard, go to **Database** → **Migrations**
2. Apply the pending migrations found in `supabase/migrations/`
3. Alternatively, copy and run the SQL from the migration files in the SQL Editor

#### Environment Variables
Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 2. Demo Mode

If you don't have Supabase configured, the app will automatically run in demo mode:
- All data is stored locally in the browser
- Full functionality is preserved
- Perfect for testing and development

### 3. Installation

```bash
npm install
npm run dev
```

## Database Schema

The application uses the following main tables:
- `users` - User profiles with birth data
- `astrology_reports` - Generated astrological charts
- `conversation_messages` - AI conversation history
- `psych_responses` - Psychology questionnaire answers
- `final_reports` - Complete personality reports

## Technologies Used

- **Frontend**: React, TypeScript, Tailwind CSS, Framer Motion
- **3D Graphics**: Three.js
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **AI Integration**: Ready for OpenAI/Gemini integration
- **Build Tool**: Vite

## Key Components

- **ThreeBackground**: Animated 3D solar system
- **ConversationalQuestionnaire**: AI-powered personality assessment
- **BirthDataPage**: Multi-step form for astrological data
- **FinalReportPage**: Beautiful report display with sharing options

## Error Handling

The application includes comprehensive error handling:
- Graceful fallback to demo mode if Supabase is unavailable
- Clear error messages for configuration issues
- Automatic retry mechanisms for network issues
- Local storage backup for all user data

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details