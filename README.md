# ResQNet (Disaster Response Platform)

This repo contains the mobile victim app and the responder dashboard for the ResQNet MVP.

## Repo Structure
- `D:\ResQNet\apps\mobile` - React Native (Expo) victim app
- `D:\ResQNet\apps\dashboard` - Vite + React responder dashboard
- `D:\ResQNet\supabase` - Database schema and policies
- `D:\ResQNet\packages\shared-types` - Shared type definitions

## Supabase Setup
1. Create a Supabase project.
2. In the Supabase SQL editor, run `D:\ResQNet\supabase\schema.sql`.
3. In Supabase Auth settings, confirm email confirmations are disabled (for hackathon speed) or use the admin script below to create seeded users.

## Environment Variables
No secrets are committed. Set environment variables locally.

### Mobile (Expo)
Create `D:\ResQNet\apps\mobile\.env.local`:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```
If you build with EAS, also add these as EAS environment variables. If you forget, the app now includes an in-app **Supabase Setup** screen to paste the URL/key once.

### Dashboard (Vite)
Create `D:\ResQNet\apps\dashboard\.env.local`:
```
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### Admin Scripts (Optional)
For `D:\ResQNet\setup-db.js` or `D:\ResQNet\apps\dashboard\fix-trigger.js`, set:
```
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

## Seed Demo Data
Run:
```
node D:\ResQNet\setup-db.js
```

This seeds:
- Admin, Official, NGO, and Volunteer demo users
- 3 demo shelters around Delhi

## Run the Apps

### Mobile
```
cd D:\ResQNet\apps\mobile
npm install
npx expo start
```

### Dashboard
```
cd D:\ResQNet\apps\dashboard
npm install
npm run dev
```

## Notes
- The mobile app queues SOS reports offline and auto-syncs on reconnect.
- The dashboard subscribes to realtime `sos_reports` changes for live updates.
- Public view fetches a safe subset of SOS fields (no phone numbers).

## Foreground Relay Mode (Android)
This build includes a foreground **Bluetooth Classic** relay (no Wi-Fi required).
- Offline device scans nearby Bluetooth devices and sends queued SOS to the relay phone.
- Online device runs Relay Mode and forwards received SOS to Supabase.

**To test:**
1. Install the dev client APK on both Android devices.
2. Start the dev server: `npx expo start --dev-client`
3. Open the app on both devices.
4. On the **online** device, open **Relay Mode** and tap **Start Relay Listener**.
5. On the **offline** device, open **Relay Mode**, tap **Scan for Relays**, select the relay device, then tap **Send Pending SOS**.
6. If pairing is required, tap **Bluetooth Settings** and pair once.
