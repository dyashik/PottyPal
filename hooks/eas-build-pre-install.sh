#!/usr/bin/env bash

set -e

echo "🔧 Setting up Mapbox authentication for CocoaPods..."

# Create .netrc file for Mapbox downloads
cat > ~/.netrc <<EOF
machine api.mapbox.com
login mapbox
password $MAPBOX_DOWNLOADS_TOKEN
EOF

# Set proper permissions
chmod 600 ~/.netrc

echo "✅ .netrc file created at ~/.netrc"
echo "📝 Token: ${MAPBOX_DOWNLOADS_TOKEN:0:20}..."

# Verify the file exists
if [ -f ~/.netrc ]; then
    echo "✅ Verified: .netrc exists and is readable"
    ls -la ~/.netrc
else
    echo "❌ Error: .netrc was not created!"
    exit 1
fi
