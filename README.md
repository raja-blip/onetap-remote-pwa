# OneTap Remote PWA

Progressive Web App version of the OneTap Remote control application.

## Features

- ✅ Full meeting control (mute, camera, leave)
- ✅ Camera controls (pan, tilt, zoom, focus)
- ✅ Casting functionality
- ✅ QR code scanning for meeting URLs
- ✅ Calendar integration
- ✅ Bridge/Launcher service communication
- ✅ All hardware controls via API calls

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Sync changes from main project:**
   ```bash
   ./sync-from-main.sh
   ```

3. **Start development server:**
   ```bash
   npm start
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

5. **Serve production build:**
   ```bash
   npm run serve
   ```

## Key Differences from Native App

- **Camera**: Uses `expo-camera` instead of `react-native-vision-camera`
- **QR Scanner**: Web-compatible implementation
- **Build**: Web build instead of EAS build
- **Platform**: Runs in browser instead of native app

## Syncing with Main Project

The `sync-from-main.sh` script automatically copies:
- Services (LauncherService, etc.)
- Components (Logo, etc.)
- App screens (excluding native-specific files)
- Assets

**After syncing, you may need to:**
1. Update camera implementation if needed
2. Test navigation flows
3. Run `npm install` if dependencies changed
4. Test all functionality

## Deployment

This PWA can be deployed to any static hosting service:
- Vercel
- Netlify
- GitHub Pages
- Firebase Hosting
- Any web server

The built files will be in the `dist/` directory after running `npm run build`.
