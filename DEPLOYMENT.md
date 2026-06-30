# Deployment Guide: Recruitment ATS Production Go-Live

This guide provides a comprehensive, step-by-step walkthrough to deploy your full-stack recruitment ATS to production, configure environment variables, deploy Firestore security rules, set up Firebase Hosting integrated with Google Cloud Run (to serve the Express server), and map your custom domain.

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Step 1: Firebase Security Rules & Database Setup](#step-1-firebase-security-rules--database-setup)
4. [Step 2: Deploying the Full-Stack Backend (Google Cloud Run)](#step-2-deploying-the-full-stack-backend-google-cloud-run)
5. [Step 3: Setting Up Firebase Hosting with Cloud Run Routing](#step-3-setting-up-firebase-hosting-with-cloud-run-routing)
6. [Step 4: Configuring Production Environment Variables](#step-4-configuring-production-environment-variables)
7. [Step 5: Mapping a Custom Domain & SSL Setup](#step-5-mapping-a-custom-domain--ssl-setup)
8. [Production Maintenance & Verification Checklist](#production-maintenance--verification-checklist)

---

## 1. Architecture Overview

Your recruitment ATS is designed as a **full-stack Node.js application** (Express backend + React/Vite frontend).
* **Frontend**: Compiled into highly optimized static assets using Vite.
* **Backend (Express)**: Handles secure admin operations, proxies Gemini AI API calls (preventing key leakage), and interfaces with Firestore.
* **Database**: Google Firestore (utilizing a named/custom database instance).

### Recommended Deployment Model
To support the Express backend in production, we deploy the compiled application inside a lightweight container to **Google Cloud Run** and route traffic through **Firebase Hosting**. This gives you the speed and global caching of Firebase's CDN with the processing power of an autoscaling, serverless container.

---

## 2. Prerequisites

Before beginning, ensure you have the following installed and configured on your machine:

1. **Google Cloud SDK (`gcloud` CLI)**: [Install gcloud](https://cloud.google.com/sdk/docs/install)
2. **Firebase CLI (`firebase` CLI)**: Run `npm install -g firebase-tools`
3. **Docker**: Required for building and packaging the container locally, or you can use Google Cloud Build (no local Docker required).
4. **Node.js 18+ & npm**: To build assets locally.

Make sure you are logged in:
```bash
gcloud auth login
gcloud auth configure-docker
firebase login
```

---

## 3. Step 1: Firebase Security Rules & Database Setup

Your ATS is configured to use Firestore. Ensure the security rules are deployed to your production database.

### 1. Ensure the custom database exists
Your application connects to a specific database ID: `ai-studio-remixremixrecrui-f7f5a9da-2a0d-49b3-8c1f-3d0d92ebbf03`.
In your production Firebase project:
1. Go to the **Firebase Console** -> **Firestore Database**.
2. If using a named database, ensure you create a database with ID `ai-studio-remixremixrecrui-f7f5a9da-2a0d-49b3-8c1f-3d0d92ebbf03` (or update your environment configuration to use your default database).

### 2. Deploy Security Rules
Deploy the `firestore.rules` file located at the root of your workspace:
```bash
firebase deploy --only firestore:rules --project <YOUR_FIREBASE_PROJECT_ID>
```

---

## 4. Step 2: Deploying the Full-Stack Backend (Google Cloud Run)

We package your app into a production-ready container and host it on Google Cloud Run.

### 1. Create a `Dockerfile`
Create a `Dockerfile` at the root of your project:

```dockerfile
# Build phase
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Run phase
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/firebase-applet-config.json ./firebase-applet-config.json

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/server.cjs"]
```

### 2. Build and Push Container using Google Cloud Build
Build the container in the cloud without needing local Docker:
```bash
gcloud builds submit --tag gcr.io/<YOUR_PROJECT_ID>/recruitment-ats --project <YOUR_PROJECT_ID>
```

### 3. Deploy to Google Cloud Run
Deploy the container as a serverless service:
```bash
gcloud run deploy recruitment-ats \
  --image gcr.io/<YOUR_PROJECT_ID>/recruitment-ats \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --project <YOUR_PROJECT_ID>
```
*Take note of the service URL returned by this command (e.g., `https://recruitment-ats-xyz.a.run.app`). This is your backend service endpoint.*

---

## 5. Step 3: Setting Up Firebase Hosting with Cloud Run Routing

To leverage Firebase Hosting’s globally distributed CDN and clean URL structures, configure Firebase Hosting to rewrite all requests directly to your Cloud Run service.

### 1. Configure `firebase.json`
Update the `firebase.json` file in your project root to contain the rewrite rules:

```json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "run": {
          "serviceId": "recruitment-ats",
          "region": "us-central1"
        }
      }
    ]
  }
}
```

### 2. Initialize and Deploy Firebase Hosting
Initialize Hosting in your terminal (if not done already) or deploy directly:
```bash
firebase deploy --only hosting --project <YOUR_PROJECT_ID>
```

Firebase Hosting will now forward all client requests (including API endpoints and routing) directly to the high-performance Express container on Cloud Run!

---

## 6. Step 4: Configuring Production Environment Variables

For security and standard container patterns, sensitive environment keys and dynamic configs are injected into the Cloud Run instance.

### Required Environment Variables
Configure these variables directly inside the Cloud Run configuration panel or via the `gcloud` command line:

1. **`GEMINI_API_KEY`**: Your Google Gemini AI API key.
2. **`APP_URL`**: The final canonical domain of your application (e.g., `https://careers.yourcompany.com`).

Set them using the CLI:
```bash
gcloud run services update recruitment-ats \
  --set-env-vars GEMINI_API_KEY="AIzaSyYourProductionGeminiKey..." \
  --set-env-vars APP_URL="https://careers.yourcompany.com" \
  --region us-central1 \
  --project <YOUR_PROJECT_ID>
```

### Firebase Service Account (For server authentication)
When running on Cloud Run, the application uses the default Compute Engine service account. Ensure this service account has the necessary IAM permissions to access Firestore:
1. Go to **Google Cloud Console** -> **IAM & Admin** -> **IAM**.
2. Locate the Compute Engine default service account (usually `PROJECT_NUMBER-compute@developer.gserviceaccount.com`).
3. Verify it has the **Cloud Datastore User** or **Firebase Firestore Admin** role.

---

## 7. Step 5: Mapping a Custom Domain & SSL Setup

To go live tomorrow under your custom brand (e.g., `careers.yourcompany.com`), map your custom domain directly through Firebase Hosting.

### 1. Connect Custom Domain in Firebase Console
1. Go to the **Firebase Console** -> **Hosting**.
2. Click **Add Custom Domain** under the domains section.
3. Enter your custom domain (e.g., `careers.yourcompany.com`) and choose whether to redirect `www` traffic.

### 2. Add DNS Verification TXT Record
Firebase will present a unique TXT record for verification. Add this record to your domain registrar (e.g., GoDaddy, Namecheap, Route 53):
* **Type**: `TXT`
* **Host/Name**: `@` or `careers` (depending on whether it is a root or subdomain)
* **Value**: `google-site-verification=...`

### 3. Add DNS A Records
Once verified, Firebase Hosting will display the IP addresses to point your domain to:
* Add two `A` records at your DNS host pointing to the IP addresses supplied by Firebase.
* **Type**: `A`
* **Host**: `careers`
* **Value/IP**: `199.36.158.100` (example IPs, copy exact ones from console)

### 4. Automatic SSL Provisioning
* Once DNS records are updated, Google will automatically provision an SSL certificate (Let's Encrypt) for your domain.
* **Duration**: This process usually takes from **30 minutes up to several hours** to propagate globally. Make sure to do this early tomorrow!

---

## Production Maintenance & Verification Checklist

- [ ] **Database Verification**: Ensure default administrative users and roles are seeded or configured in the database.
- [ ] **CORS Settings**: Check if external clients or extensions need explicit CORS headers from the Express backend.
- [ ] **Daily Backups**: Enable Firestore daily backups in the GCP Console to protect candidate and recruitment data.
- [ ] **Warm-up Instances**: Set the minimum instances on Cloud Run to `1` in production if you want to completely eliminate "cold starts" during vital recruitment reviews tomorrow.

```bash
gcloud run services update recruitment-ats --min-instances 1 --region us-central1 --project <YOUR_PROJECT_ID>
```

---

*Your recruitment ATS is now ready for production! Keep this documentation safe for future continuous deployments.*
