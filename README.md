# NFC Door Control System

A complete NFC door control system.

## 🏗️ Project Structure

```
nfc-door-control/
├── server/          # NestJS Backend API
├── client/          # React Web UI
├── arduino/         # Arduino/ESP32 Client Code
└── README.md        # This file
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup
```bash
npm run db:setup
```

### 3. Create Admin User
```bash
npm run db:seed
```
The interactive script will ask for:
- Username (default: admin)
- Password (with confirmation)
- Optional: Create example data

### 4. Start Development
```bash
npm run dev
```

This starts:
- **Server**: http://localhost:3005 (NestJS API)
- **Client**: http://localhost:3001 (React Web UI)

## 📁 Modules

### 🖥️ Server (NestJS + Prisma)
- **Location**: `./server/`
- **Tech Stack**: NestJS, Prisma, SQLite, JWT
- **Features**:
  - 🔐 JWT Auth with Guards
  - 🚪 Door Management API
  - 🏷️ NFC Tag Management
  - 📊 Access History & Stats
  - 🛡️ Client Validation API

**Login**: Use the credentials created with `npm run db:seed`

### 🌐 Client (React + TypeScript)
- **Location**: `./client/`
- **Tech Stack**: React, TypeScript, Vite, TailwindCSS, i18n
- **Features**:
  - 📱 Responsive Web UI
  - 🔑 Login/Auth Interface
  - 🚪 Door Configuration
  - 🏷️ Tag Management
  - 📈 Access History Dashboard
  - 🌓 Dark/Light Mode Theme
  - 🌐 Multi-language Support (EN/DE)

### 🔧 Arduino (ESP32 + MFRC522)
- **Location**: `./arduino/`
- **Hardware**: ESP32, MFRC522 NFC Reader, Relay
- **Features**:
  - 📡 WiFi-connected NFC Reader
  - 🔓 Relay-controlled Door Lock
  - 🚨 Status LEDs & Buzzer
  - 🔄 Auto-reconnection

## 🔧 Available Scripts

```bash
# Development
npm run dev                    # Start server + client
npm run server:dev             # Server only
npm run client:dev             # Client only

# Installation
npm install                    # Install all dependencies (workspaces)

# Build
npm run build                  # Build both
npm run server:build           # Build server
npm run client:build           # Build client

# Database
npm run db:setup               # Generate + push schema
npm run db:seed                # Create admin user + optional example data
npm run db:studio              # Open Prisma Studio
```

## 🌐 API Endpoints

### 🔓 Public (for Arduino Clients)
- `POST /tags/validate` - NFC Tag Validation

### 🔐 Protected (JWT Required)
- `POST /auth/login` - User Login
- `GET /doors` - List doors
- `POST /doors` - Create new door
- `GET /tags` - List tags
- `POST /tags` - Create new tag
- `GET /access-history` - Access history

## 🔌 Example Hardware Setup

### ESP32 + MFRC522
```
MFRC522  →  ESP32
VCC      →  3.3V
GND      →  GND
RST      →  GPIO 22
MISO     →  GPIO 19
MOSI     →  GPIO 23
SCK      →  GPIO 18
SDA      →  GPIO 5
```

### Configuration
1. Edit `arduino/nfc_door_client/config.h`
2. Enter WiFi credentials
3. Set server IP
4. Define client ID

## 🔧 Development

### Server Development
```bash
cd server
npm run start:dev              # Auto-reload
npm run db:studio              # Database admin
```

### Client Development
```bash
cd client
npm run dev                    # Vite dev server
```

### Arduino Development
1. Open Arduino IDE
2. Install ESP32 Board Package
3. Install libraries: MFRC522, ArduinoJson
4. Edit `config.h`
5. Upload code to ESP32

## 🛡️ Security

- JWT-based Authentication
- Protected API Routes with Guards
- Secure Tag Validation
- Input Validation with class-validator

## 📊 Features

✅ **Complete Monorepo**  
✅ **Professional NestJS Backend**  
✅ **Modern React Frontend**  
✅ **Arduino/ESP32 Integration**  
✅ **JWT Authentication**  
✅ **Real-time Tag Validation**  
✅ **Access History & Analytics**  
✅ **Responsive Web Interface**  
✅ **Dark/Light Mode Theme**  
✅ **Multi-language Support (EN/DE)**