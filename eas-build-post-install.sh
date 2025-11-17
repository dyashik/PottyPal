#!/usr/bin/env bash

# This runs after npm install but before pod install
echo "🔧 Setting up Mapbox authentication..."

# Create .netrc file for Mapbox downloads
cat > ~/.netrc <<EOF
machine api.mapbox.com
login mapbox
password $MAPBOX_DOWNLOADS_TOKEN
EOF

# Set proper permissions
chmod 600 ~/.netrc

echo "✅ .netrc file created successfully"
echo "📍 Location: ~/.netrc"

# Verify the file was created
if [ -f ~/.netrc ]; then
    echo "✅ Verified: .netrc exists"
else
    echo "❌ Error: .netrc was not created"
    exit 1
fi
