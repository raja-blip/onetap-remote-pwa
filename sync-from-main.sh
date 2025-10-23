#!/bin/bash

# Sync script to copy changes from main project to PWA project
# Run this from the PWA project directory

MAIN_PROJECT="/Users/rajaganeshsethupathi/Documents/onetapdev/vc-mobile-remote"
PWA_PROJECT="/Users/rajaganeshsethupathi/Documents/onetapdev/vc-mobile-remote-pwa"

echo "🔄 Syncing changes from main project to PWA..."

# Sync shared services
echo "📁 Syncing services..."
rsync -av --delete "$MAIN_PROJECT/services/" "$PWA_PROJECT/shared/services/"

# Sync shared components  
echo "🧩 Syncing components..."
rsync -av --delete "$MAIN_PROJECT/components/" "$PWA_PROJECT/shared/components/"

# Sync app screens (but exclude native-specific files)
echo "📱 Syncing app screens..."
rsync -av --delete --exclude="qr-scanner.tsx" "$MAIN_PROJECT/app/" "$PWA_PROJECT/app/"

# Copy assets
echo "🎨 Syncing assets..."
rsync -av --delete "$MAIN_PROJECT/assets/" "$PWA_PROJECT/assets/"

echo "✅ Sync complete!"
echo ""
echo "⚠️  Remember to:"
echo "1. Update camera implementation for web (replace qr-scanner.tsx)"
echo "2. Test navigation flows"
echo "3. Run 'npm install' if package.json changed"
echo "4. Run 'npm run build' to build PWA"
