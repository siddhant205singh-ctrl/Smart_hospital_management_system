# 🏥 SmartCare – Smart Hospital Management System & LifeShare Network

> **Zero Waiting Time. Smarter Healthcare. Life-Saving Community Care.**

SmartCare is a production-grade, full-stack hospital management web application engineered to eliminate agonizing patient wait times through predictive consultation analytics, real-time Socket.IO queue streaming, consent-governed longitudinal health records, and an intelligent Gemini AI clinical concierge.

It integrates **LifeShare** – a voluntary, unpaid blood donor program that recognizes altruistic donors with official milestone badges, downloadable thank-you certificates, and Donor Family Fast-Track benefits (waived processing fees and expedited paperwork) during clinical emergencies.

---

## 🌟 Key Differentiators

1. **Dynamic Waiting-Time Prediction Engine**:
   - Calculates dynamic wait time using a rolling average ($T_{\text{avg}}$) of the doctor's actual completed consultations (last $N=10$) plus current patient elapsed time and accumulated delay.
   - Pushes live updates over **Socket.IO** whenever consultations start, end, or patients cancel / no-show.

2. **Smart "Leave Now" Arrival Notification**:
   - Computes departure deadlines dynamically: $\text{Ideal Departure} = T_{\text{est\_turn}} - T_{\text{travel}} - B_{\text{buffer}}$.
   - Alerts patient to depart only when necessary (via In-App, Nodemailer Email, and Twilio SMS interface).

3. **Multi-Hospital Network Search**:
   - Single real-time view across **3 connected premier hospitals** (Apollo, Fortis, Max) and **16+ specialist doctors**.

4. **Continuous Health Timeline & Consent Manager**:
   - Chronological stream of prescriptions, lab reports, plain-language AI summaries, and blood donation milestones.
   - Patient grants or revokes doctor access with an immutable access audit log.

5. **LifeShare – Voluntary Blood Donor Program**:
   - Strictly 100% voluntary and unpaid under National Blood Transfusion Council (NBTC) guidelines.
   - Verified physical donations logged only by Blood Bank Officers.
   - Next eligible donation countdown (enforcing 90-day gap for men and 120-day gap for women).
   - **Milestone Recognition (Non-Monetary)**: Badges (First Blood Gift, Dedicated Saver, Bronze Shield, Silver Pillar, Gold Star), lives-saved counter, and downloadable official printable thank-you certificate. All recognition carries zero monetary value.
   - **Donor Family Fast-Track**: Verified donors and their linked family members receive blood bank processing fee waiver (₹0), exemption from replacement donor requirements, and pre-verified paperwork status.
   - **Strict Urgency Rule**: Blood allocation is governed strictly by clinical emergency triage first; Fast-Track never bypasses a critically ill patient.

6. **SmartCare AI Concierge**:
   - Google Gemini proxy with safety triggers: immediately recognizes emergency symptoms (chest pain, stroke, severe bleeding) and renders red emergency alerts with a 108 direct call button.
   - Tool calling: checks live queue tokens, doctor availability, donor eligibility, and report summaries.

7. **Accessibility & Multilingual Support**:
   - Full localization in **English, हिन्दी (Hindi), and বাংলা (Bengali)** via `i18next`.
   - Large-font accessibility toggle ($118\%$) and dark mode.
   - SMS queue update service (mock Twilio) for non-smartphone users.

---

## 🛠️ Tech Stack

- **Frontend**: React (Vite) + Tailwind CSS + Framer Motion + React Router + Recharts + i18next + Lucide Icons
- **Backend**: Node.js + Express.js + Socket.IO (WebSockets)
- **Database**: MongoDB + Mongoose
- **Auth**: JWT (Access + Refresh tokens) + bcryptjs (Role-Based Access Control)
- **AI**: Google Gemini API via scoped backend proxy
- **Notifications**: In-App + Email (Nodemailer) + SMS (Twilio clean interface)

---

## 📂 Project Structure

```
hospital_management_system/
├── backend/
│   ├── src/
│   │   ├── config/          # Database & environment configurations
│   │   ├── controllers/     # Auth, doctor, appointment, queue, lifeshare, ai, admin
│   │   ├── middleware/      # JWT auth, RBAC, audit log, error handler
│   │   ├── models/          # 18 Mongoose models (User, Doctor, Donor, BloodUnit, etc.)
│   │   ├── routes/          # REST route handlers
│   │   ├── scripts/         # Comprehensive database seed script (seed.js)
│   │   ├── services/        # Dynamic wait engine & Twilio/Nodemailer notification service
│   │   ├── sockets/         # Real-time Socket.IO gateway
│   │   ├── app.js           # Express app with Helmet, CORS, and Rate Limiting
│   │   └── server.js        # HTTP & Socket.IO server entry point
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Live progress ring, leave now banner, wallet card, AI widget
│   │   ├── contexts/        # AuthContext, SocketContext, ThemeA11yContext
│   │   ├── i18n/            # i18n setup with en.json, hi.json, bn.json
│   │   ├── pages/
│   │   │   ├── admin/       # Admin & Receptionist command center with Recharts
│   │   │   ├── ai/          # Dedicated full-page clinical concierge
│   │   │   ├── auth/        # Login & Register with role test switchers
│   │   │   ├── doctor/      # Live consultation room with start/end timer
│   │   │   ├── landing/     # Interactive landing page with live queue preview
│   │   │   ├── lifeshare/   # Donor portal, blood inventory, legal compliance charter
│   │   │   ├── patient/     # Doctor directory, live queue tracker, health timeline, consent
│   │   │   └── public/      # Public OPD waiting hall TV screen feed
│   │   ├── services/        # Axios API client with Bearer interceptors
│   │   ├── App.jsx          # Router & layout definitions
│   │   ├── main.jsx         # App bootstrapping
│   │   └── index.css        # Tailwind styles & accessibility classes
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
└── README.md
```

---

## ⚡ Quick Start & Installation

### Prerequisites
- Node.js (v18+)
- MongoDB (Running locally on `mongodb://localhost:27017/smartcare` or MongoDB Atlas URI)

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env if using remote MongoDB or Gemini API Key (optional)
npm run seed     # Seeds 3 hospitals, 16 doctors, queue, donors, and Fast-Track scenario
npm run dev      # Runs backend API & Socket.IO on http://localhost:5000
```

### 2. Frontend Setup (in a separate terminal)
```bash
cd frontend
npm install
npm run dev      # Runs React Vite application on http://localhost:5173
```

---

## 🔑 Demo Credentials (Password for all: `Password123!`)

For quick testing during judge evaluations, click the **Quick Demo Role** buttons in the top navbar:

| Role | Demo Email | Key Capabilities |
| :--- | :--- | :--- |
| **Patient (Verified Donor)** | `patient@smartcare.hospital` | Token #03 in live queue, 11 donations, Milestone Badges, Fast-Track active, Health Timeline |
| **Doctor (Cardiology)** | `doctor1@smartcare.hospital` | Live OPD-101 desk, Call Next, Start/End consultation (recalculates wait times), Patient history |
| **Hospital Admin** | `admin@smartcare.hospital` | Flow analytics, overcrowding indices, receptionist walk-in token creator, Fast-Track governance |
| **Blood Bank Officer** | `bloodofficer@smartcare.hospital` | Verified donation logger, blood inventory, Fast-Track priority allocation queue |
| **Receptionist** | `reception@smartcare.hospital` | Triage check-in, walk-in token printer, patient check-in |

---

## 🎯 Step-by-Step Demo Walkthrough for Presentation & Judges

Follow this script to demonstrate the complete dynamic feedback loop:

1. **Patient Booking & Live Token Generation**:
   - Log in as Patient (`patient@smartcare.hospital`).
   - Navigate to **Find Doctors**, search "Cardiology", and select **Dr. Anita Desai**.
   - Book a slot: Notice the immediate generation of **Digital Token #03 (CARD-003)** and its QR code.

2. **Live Queue Tracking & Arrival Planner**:
   - Open **Live Queue Tracker** (`/my-queue`).
   - Notice the animated progress ring showing **Serving Token #01** with **1 patient ahead** and **18 min estimated wait**.
   - Review the **Smart Arrival Planner**: departure deadline is computed dynamically from estimated turn minus 25 min travel minus 15 min check-in buffer.
   - Click **Send SMS Alert to Phone** to demonstrate non-smartphone SMS dispatch via the Twilio interface.

3. **Doctor Consultation & Real-time Wait Recalculation**:
   - In a second browser tab (or using the quick switcher in navbar), switch to **Doctor (Dr. Anita)** (`doctor1@smartcare.hospital`).
   - In the **Doctor Console** (`/doctor-console`), notice Token #01 in consultation.
   - Click **End Consultation & Recalculate Wait Times**.
   - Switch back to the Patient tab: Notice the live queue immediately updates via **Socket.IO** without page reload—the estimated wait time updates dynamically based on the rolling average ($T_{\text{avg}} = 14\text{ min}$)!

4. **Public Waiting Room TV Screen**:
   - Navigate to `/waiting-room-display`.
   - Observe the high-contrast display for OPD waiting halls showing the currently consulting token and upcoming line.
   - When the doctor calls the next token, the TV screen pulses with an audio-visual **CALLING** banner!

5. **Continuous Health Timeline & Consent Manager**:
   - In the Patient portal, navigate to **Health Timeline** (`/health-timeline`).
   - Observe the unified chronological stream of prescriptions, cholesterol lab reports with AI-generated plain-language summaries, and verified blood donations.
   - Go to **Consent Manager** (`/consent`): Demonstrate granting and revoking doctor access; review the immutable cryptographic audit log.

6. **LifeShare Blood Donor Program & Donor Family Fast-Track**:
   - Go to **LifeShare** (`/lifeshare`).
   - View Rahul Sharma’s profile: **11 verified donations**, **33 lives impacted**, milestone badges, and the **Countdown Widget** confirming he is eligible to donate today.
   - Click **Download Official Certificate** to preview and download Rahul's official voluntary blood donation certificate.
   - Switch to **Blood Bank Officer** (`bloodofficer@smartcare.hospital`):
     - View the **Blood Allocation Queue**: Notice Request `REQ-BLD-0104` for Priya Sharma (Rahul's verified spouse) flagged with **⚡ Fast-Track (Pre-Verified)** and **Processing Fee: ₹0 (Fast-Track Waived)**!
     - Click **Allocate Blood** to assign inventory units.
   - Switch to **Admin** (`admin@smartcare.hospital`):
     - Scroll to **Donor Family Fast-Track Governance**.
     - View and configure Fast-Track policies: fee waiver toggle, replacement donor waiver, pre-verified paperwork toggle, and minimum donations threshold.
     - Note the compliance rule: Clinical urgency strictly dictates blood units allocation. Fast-Track provides administrative streamlining.

7. **SmartCare Gemini Clinical AI Concierge**:
   - Click the floating **SmartCare AI** widget at the bottom right.
   - Type *"I have severe chest pain and breathlessness"* $\to$ Immediate **Emergency Alert** with direct 108 ambulance hotline.
   - Type *"Am I eligible to donate blood?"* $\to$ Concierge evaluates gender-specific gap (90/120 days) and explains non-monetary recognition badges.

---

## 📜 Legal & Compliance Disclaimer

> **TODO / Regulatory Notice**: SmartCare LifeShare policy has been engineered to strictly comply with the **National Blood Transfusion Council (NBTC)** ethical guidelines and the **Drugs & Cosmetics Act** prohibiting the commercial sale of human blood. Donations are 100% voluntary and unpaid. Milestone badges and certificates carry zero monetary value, and blood unit allocation is strictly determined by clinical triage. Hospital administrators must review local state transfusion council statutes before clinical deployment.
