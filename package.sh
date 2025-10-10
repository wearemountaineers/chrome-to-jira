#!/bin/bash

# Chrome Extension Packaging Script
# This script prepares the extension for Chrome Web Store submission

echo "🚀 Preparing Chrome Extension for Publication..."

# Create a clean package directory
PACKAGE_DIR="jira-ticket-creator-package"
rm -rf "$PACKAGE_DIR"
mkdir "$PACKAGE_DIR"

# Copy essential files
echo "📦 Copying extension files..."
cp manifest.json "$PACKAGE_DIR/"
cp popup.html "$PACKAGE_DIR/"
cp popup.js "$PACKAGE_DIR/"
cp content.js "$PACKAGE_DIR/"
cp background.js "$PACKAGE_DIR/"
cp modal.html "$PACKAGE_DIR/"
cp modal.js "$PACKAGE_DIR/"

# Copy icons
echo "🎨 Copying icons..."
cp -r icons "$PACKAGE_DIR/"

# Copy documentation
echo "📚 Copying documentation..."
cp README.md "$PACKAGE_DIR/"
cp LICENSE "$PACKAGE_DIR/"
cp PRIVACY.md "$PACKAGE_DIR/"

# Remove test files (not needed for production)
echo "🧹 Cleaning up test files..."
# test.html and test.js are not copied

# Create a zip file for Chrome Web Store
echo "📦 Creating zip package..."
cd "$PACKAGE_DIR"
zip -r "../jira-ticket-creator-v1.0.0.zip" .
cd ..

echo "✅ Package created: jira-ticket-creator-v1.0.0.zip"
echo "📋 Files included:"
echo "   - manifest.json"
echo "   - popup.html, popup.js"
echo "   - content.js, background.js"
echo "   - modal.html, modal.js"
echo "   - icons/ (16px, 48px, 128px)"
echo "   - README.md, LICENSE, PRIVACY.md"
echo ""
echo "🎯 Next steps:"
echo "   1. Upload jira-ticket-creator-v1.0.0.zip to Chrome Web Store"
echo "   2. Use STORE_LISTING.md for the store description"
echo "   3. Submit for review"
echo ""
echo "🔗 Chrome Web Store Developer Dashboard:"
echo "   https://chrome.google.com/webstore/devconsole/"


