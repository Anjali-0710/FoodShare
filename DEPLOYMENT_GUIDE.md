# FoodShare AI Platform – Deployment and Setup Guide

This guide describes how to run the FoodShare AI application locally, connect to production services, and build/deploy the Android APK.

---

## 1. Project Directory Layout

```
foodshare-ai/
├── backend/            # Express, Node.js, Mongoose server config
└── frontend/           # React Native, Expo, Redux mobile application
```

---

## 2. Prerequisites
- **Node.js**: v18.0.0 or higher (Current local environment verified: v24.16.0)
- **NPM**: v9.0.0 or higher (Current local environment verified: 11.13.0)
- **MongoDB**: Local MongoDB community server (port 27017) OR a MongoDB Atlas cluster URI.
- **Expo CLI**: Installed automatically via npx (no global install required).

---

## 3. Running the Backend Service

1. Navigate to the `backend/` directory.
2. Configure environment values inside the `.env` file:
   ```env
   PORT=5000
   MONGO_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/foodshare
   JWT_SECRET=your-secure-jwt-secret-string
   ```
3. Run the development server (auto-reloads on TypeScript code changes):
   ```bash
   npm run dev
   ```
4. Verify server status by accessing `http://localhost:5000/health`.

---

## 4. Running the Frontend Mobile App (Expo Web/Mobile)

1. Navigate to the `frontend/` directory.
2. To configure real keys, edit `frontend/firebaseConfig.ts` and replace placeholders with credentials from the Firebase Console (Enable Email/Password Auth, Google OAuth, and FCM Cloud Messaging).
3. Start the Expo development server:
   ```bash
   npx expo start
   ```
4. **Choose Platform**:
   - Press **`w`** to open in Web Browser (highly recommended for rapid testing and matches browser verification).
   - Press **`a`** to load in an Android Emulator.
   - Scan the QR code shown on screen using the Expo Go mobile app (iOS or Android) to run it directly on a physical device.

---

## 5. Compiling Android APK (Production Build)

We use Expo Application Services (EAS) to compile APKs without needing complex local Android SDK and Java gradle chains configured.

1. Install the EAS Command Line Interface tool globally:
   ```bash
   npm install -g eas-cli
   ```
2. Log in or create a free Expo account:
   ```bash
   eas login
   ```
3. Initialize the build pipeline configurations inside the `frontend/` folder:
   ```bash
   eas project:init
   ```
4. Generate the `eas.json` build configuration profile:
   ```bash
   eas build:configure
   ```
5. Set up the android release configuration profile inside `eas.json` to compile directly to an APK (rather than an AAB Bundle) for rapid installation:
   ```json
   {
     "build": {
       "preview": {
         "android": {
           "buildType": "apk"
         }
       },
       "production": {}
     }
   }
   ```
6. Run the build command on Expo's cloud compiler (runs in parallel, outputting a downloadable APK link once completed):
   ```bash
   eas build -p android --profile preview
   ```
7. Download and install the generated APK on your Android device!
