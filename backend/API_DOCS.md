# FoodShare AI Platform API Documentation

The backend service runs by default on `http://localhost:5000/api`.
All endpoints except user sign-up/login require a `Bearer <JWT_TOKEN>` authorization header.

---

## 1. Authentication Endpoints (`/auth`)

### Register User
* **URL**: `/auth/register`
* **Method**: `POST`
* **Headers**: `Content-Type: application/json`
* **Request Body**:
  ```json
  {
    "name": "Green Bakery",
    "email": "donor@foodshare.com",
    "password": "password123",
    "role": "donor", // 'donor', 'ngo', 'volunteer', 'admin'
    "contactNumber": "+919876543210",
    "address": "Connaught Place, New Delhi",
    "latitude": 28.6304,
    "longitude": 77.2177,
    "ngoCapacity": 150, // NGO only
    "foodTypePreference": ["Cooked Food", "Bakery Items"] // NGO/Volunteer only
  }
  ```
* **Response (Success 201)**:
  ```json
  {
    "success": true,
    "message": "Registration successful",
    "token": "eyJhbGciOi...",
    "user": { "id": "usr_...", "name": "Green Bakery", "role": "donor" }
  }
  ```

### Login User
* **URL**: `/auth/login`
* **Method**: `POST`
* **Request Body**:
  ```json
  {
    "email": "donor@foodshare.com",
    "password": "password123"
  }
  ```
* **Response (Success 200)**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "token": "eyJhbGciOi...",
    "user": { ... }
  }
  ```

---

## 2. Donation Workflows (`/donations`)

### Create Food Listing
* **URL**: `/donations`
* **Method**: `POST`
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Request Body**:
  ```json
  {
    "foodType": "Cooked Food",
    "quantity": 30,
    "unit": "Plates",
    "bestBeforeDate": "2026-06-16T22:00:00.000Z",
    "preparationTime": "2026-06-16T14:00:00.000Z",
    "temperature": 26,
    "pickupAddress": "Gate 3 Connaught Place Metro Station",
    "latitude": 28.6304,
    "longitude": 77.2177,
    "contactNumber": "+919876543210",
    "additionalNotes": "Fragile packing",
    "imageUrls": []
  }
  ```
* **Response (Success 201)**:
  ```json
  {
    "success": true,
    "donation": {
      "id": "don_...",
      "foodType": "Cooked Food",
      "freshnessScore": 92, // Predicted instantly by AI engine
      "qrCode": "QR_DON_8546",
      "status": "Pending",
      ...
    }
  }
  ```

### Browse/Filter Listings
* **URL**: `/donations`
* **Method**: `GET`
* **Query Params**:
  * `status`: Filter by status (e.g. `Pending`, `Accepted`, `Assigned`)
  * `foodType`: Filter by category (e.g. `Cooked Food`)
  * `mine`: `true` to fetch listings associated with the logged-in user

---

## 3. AI Capabilities (`/ai`)

### Freshness Predictor
* **URL**: `/ai/freshness`
* **Method**: `GET`
* **Query Params**: `foodType`, `preparationTime`, `bestBeforeDate`, `temperature`
* **Response (Success 200)**:
  ```json
  {
    "success": true,
    "freshnessScore": 82,
    "status": "Excellent",
    "safetyWarning": "Safe for direct immediate consumption."
  }
  ```

### Smart NGO Matchmaker
* **URL**: `/ai/recommend-ngos`
* **Method**: `POST`
* **Request Body**:
  ```json
  {
    "latitude": 28.6304,
    "longitude": 77.2177,
    "foodType": "Cooked Food",
    "quantity": 50
  }
  ```
* **Response (Success 200)**: Recommended list sorted by Match score descending using Haversine Geodesics + capacity checks.
  ```json
  {
    "success": true,
    "recommendations": [
      {
        "ngoId": "usr_ngo_1",
        "name": "Care & Feed Foundation NGO",
        "distanceKm": 1.24,
        "matchScore": 95,
        "capacityRemaining": 250
      }
    ]
  }
  ```
