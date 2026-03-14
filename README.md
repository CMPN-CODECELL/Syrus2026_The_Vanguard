# MedVision AI

**AI-Powered Smart Healthcare Platform**

MedVision AI is a comprehensive telemedicine platform that leverages Google's Gemini AI to provide intelligent healthcare assistance for doctors and patients. It features AI-powered medical analysis, real-time consultations, and smart document processing.

---

## Features

### For Doctors

| Feature | Description |
|---------|-------------|
| **AI Clinical Assistant** | Get AI-powered insights during consultations with differential diagnosis suggestions |
| **Smart Document Analysis** | Upload and analyze medical reports, prescriptions, lab results, and imaging scans |
| **Patient Timeline** | View complete patient history with AI-generated summaries |
| **Queue Management** | Manage patient appointments with intelligent scheduling |
| **Analytics Dashboard** | Track consultation metrics, patient outcomes, and practice insights |
| **Professional Network** | Connect with other healthcare professionals |

### For Patients

| Feature | Description |
|---------|-------------|
| **Find Doctors** | Search and book appointments with verified specialists |
| **Medical Records** | Upload and securely store medical documents |
| **Live Consultations** | Real-time video/chat consultations with doctors |
| **AI Health Library** | Access AI-powered medical knowledge base |
| **Appointment History** | Track past and upcoming appointments |
| **Profile Management** | Manage health information and preferences |

### AI Capabilities (Powered by Gemini)

- **Medical Document OCR**: Extract text from scanned prescriptions and handwritten notes
- **Lab Report Analysis**: Interpret blood tests, imaging reports, and diagnostic results
- **Clinical Summarization**: Generate comprehensive patient summaries from medical history
- **Differential Diagnosis**: AI-assisted diagnosis suggestions based on symptoms and findings
- **Smart Q&A**: Answer medical queries with context-aware responses

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15, React 18, TypeScript, TailwindCSS |
| **Backend** | Python FastAPI, Uvicorn |
| **Database** | Firebase Firestore (Cloud) |
| **AI Engine** | Google Gemini 2.5 Flash (Vision + Text) |
| **Authentication** | Firebase Auth |
| **File Storage** | Local storage with cloud sync |

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Google Gemini API Key
- Firebase Project (with Firestore enabled)

### One-Click Installation (Windows)

1. Clone the repository:
   ```bash
   git clone https://github.com/sarthakskd20/medvision-ai.git
   cd medvision-ai
   ```

2. Set up environment variables:

   **Backend** (`backend/.env`):
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_CLIENT_EMAIL=your_service_account_email
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

   **Frontend** (`frontend/.env.local`):
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8001
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

3. Run the application:
   ```bash
   run_app.bat
   ```

   This will:
   - Install Python dependencies
   - Install Node.js dependencies
   - Start the backend server (port 8001)
   - Start the frontend server (port 3000)
   - Open the application in your browser

---

## Manual Installation

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

## Project Structure

```
medvision-ai/
├── backend/
│   ├── app/
│   │   ├── routers/          # API endpoints
│   │   ├── services/         # Business logic
│   │   │   ├── ai_chat_service.py    # Gemini AI integration
│   │   │   ├── firebase_service.py   # Database operations
│   │   │   ├── pdf_service.py        # Document processing
│   │   │   └── gemini_service.py     # Vision AI
│   │   └── models/           # Data models
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js pages
│   │   │   ├── dashboard/    # Doctor dashboard
│   │   │   ├── patient/      # Patient portal
│   │   │   └── auth/         # Authentication
│   │   ├── components/       # Reusable components
│   │   └── lib/              # Utilities
│   └── package.json
└── run_app.bat               # One-click launcher
```

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### Appointments
- `GET /api/appointments/doctors/search` - Search doctors
- `POST /api/appointments/` - Book appointment
- `GET /api/appointments/patient/{id}` - Get patient appointments

### Consultations
- `POST /api/consultation/start/{appointment_id}` - Start consultation
- `POST /api/consultation/ai/analysis/{consultation_id}` - AI analysis
- `POST /api/consultation/ai/chat/{consultation_id}` - AI chat

### Documents
- `POST /api/appointments/upload` - Upload medical document
- `GET /api/appointments/files/{file_id}` - Get document

---

## Gemini AI Integration

MedVision AI uses Google Gemini 2.5 Flash for:

1. **Document Vision Analysis**
   - Scanned prescription extraction
   - Lab report interpretation
   - Medical imaging analysis

2. **Clinical Intelligence**
   - Patient context understanding
   - Differential diagnosis suggestions
   - Treatment recommendations

3. **Natural Language Processing**
   - Medical Q&A responses
   - Clinical note summarization
   - Symptom analysis

The AI maintains medical context throughout consultations and provides evidence-based suggestions while clearly indicating that final decisions rest with healthcare professionals.

---

## Deployment

### Frontend (Vercel)
1. Connect GitHub repository
2. Set root directory to `frontend`
3. Add environment variables
4. Deploy

### Backend (Render.com)
1. Connect GitHub repository
2. Set root directory to `backend`
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables

---

## Security

- Firebase Authentication for user management
- Role-based access control (Doctor/Patient)
- Encrypted data transmission (HTTPS)
- HIPAA-compliant data handling practices
- No storage of raw AI conversations

---

## License

This project is developed for educational and demonstration purposes.

---

## Contributors

MedVision AI Team

---

## Support

For issues or feature requests, please open a GitHub issue.
