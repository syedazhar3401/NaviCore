# 🚢 NaviCore - Intelligent Maritime Operations Platform

Welcome to **NaviCore**, a next-generation AI-powered fleet management and global maritime intelligence platform. NaviCore provides real-time situational awareness, predictive AI insights, and seamless operational synchronization between headquarters and on-the-ground deckhands.

## 🌟 Elevator Pitch

NaviCore bridges the gap between high-level strategic intelligence and ground-level maritime operations. By aggregating real-time global news, weather alerts, and ship traffic, and pairing them with a dedicated mobile application for deckhands, NaviCore ensures that fleet operators have total visibility over their assets, routes, and potential threats—all displayed on a stunning 3D interactive dashboard.

---

## 🚀 Key Features

### 1. 🌎 Advanced 3D Geospatial Dashboard
- **Interactive Mapping:** Built with `deck.gl` and `maplibre-gl` for a highly performant 3D globe visualization.
- **Live Traffic & Routes:** Visualize critical trade routes, global ship traffic density, and port locations.
- **Weather & Disruptions:** Real-time rendering of active weather alerts and maritime disruptions directly on the map.

### 2. 🧠 AI Insights & Threat Intelligence (WorldMonitor)
- **News Aggregation:** Continuously pulls global news from over 60 RSS feeds (Reuters, AP, BBC, etc.).
- **Threat Classification:** Utilizes **Groq AI** to instantly classify news headlines by threat level (Critical, High, Medium, Low) and category (Conflict, Disaster, Economic).
- **Smart Clustering:** Deduplicates and groups similar news stories using advanced algorithms, providing operators with concise "Focal Points" rather than noise.

### 3. 📦 Smart Cargo & Vessel Management
- **Cargo Arrangement:** Visual interface for managing ship slots and containers (`ShipSlotGrid`).
- **Stability Gauge:** Real-time calculation and visualization of vessel stability based on cargo placement.
- **Manifest Tracking:** Keep a real-time digital log of all cargo statuses.

### 4. 📱 Deckhand App
- **Mobile-First Design:** A dedicated PWA/web-app tailored for operational staff on the ground or at the port.
- **QR Code Scanning:** Fast and reliable QR code scanning using `html5-qrcode` to verify cargo, update statuses, or log maintenance checks.
- **Real-time Sync:** Instant synchronization with the main dashboard using WebSockets.

---

## 🛠️ Architecture & Tech Stack

NaviCore is structured as a monorepo containing a full-stack JavaScript/TypeScript ecosystem.

### **Frontend (Dashboard & Deckhand App)**
- **Framework:** React 19, Vite
- **Styling:** TailwindCSS v4, PostCSS, Lucide React
- **Geospatial & Vis:** deck.gl, maplibre-gl, react-map-gl
- **Real-time:** Socket.io-client
- **Hardware Int:** html5-qrcode (Deckhand app)

### **Backend**
- **Runtime:** Node.js, Express, TypeScript (`tsx`)
- **Database / ORM:** Prisma ORM
- **Caching & High-speed data:** Upstash Redis
- **Real-time Engine:** Socket.io
- **AI Integrations:** Groq API

---

## 📂 Project Structure

```
NaviCore/
├── backend/               # Express.js API, Prisma ORM, Socket.io Server, AI Logic
├── dashboard/             # React/Vite web application for Headquarters (3D Map, AI Insights)
├── deckhand-app/          # Mobile-first React app for field workers (QR Scanner, Tasks)
├── docs/                  # Detailed integration guides and system documentation
├── vessel-node/           # Simulated vessel edge node (optional/experimental)
└── README.md              # Project documentation
```

---

## 🏁 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v20+ recommended)
- [npm](https://www.npmjs.com/)
- API Keys: 
  - [Groq API Key](https://console.groq.com/) for AI Insights
  - [Upstash Redis](https://upstash.com/) for caching

### 1. Clone the repository
```bash
git clone https://github.com/syedazhar3401/NaviCore.git
cd NaviCore
```

### 2. Setup the Backend
```bash
cd backend
npm install
```
- Create a `.env` file in the `backend/` directory based on the `.env.local` template (add your `GROQ_API_KEY`, `UPSTASH_REDIS_REST_URL`, etc.)
- Run the development server:
```bash
npm run dev
```

### 3. Setup the Dashboard
```bash
cd ../dashboard
npm install
npm run dev
```
The dashboard will be available at `http://localhost:5173`.

### 4. Setup the Deckhand App
```bash
cd ../deckhand-app
npm install
npm run dev
```

---

## 💡 What's Next / Roadmap

- **Predictive Maintenance:** Integrate historical part failure rates with machine learning to predict vessel equipment failures before they happen.
- **Edge Node Synchronization:** Enhance the `vessel-node` architecture to allow ships to operate offline while at sea and sync heavily via satellite link when available.
- **Automated Rerouting:** Suggest optimal alternative trade routes when severe weather or conflict zones are detected by the AI Threat Intelligence system.
