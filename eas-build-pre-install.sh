#!/usr/bin/env bash

# Create .netrc file for Mapbox downloads
cat > ~/.netrc <<EOF
machine api.mapbox.com
login mapbox
password $MAPBOX_DOWNLOADS_TOKEN
EOF

# Set proper permissions
chmod 600 ~/.netrc

echo "✅ .netrc file created successfully for Mapbox downloads"
