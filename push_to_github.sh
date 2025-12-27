#!/bin/bash

# Script to push Notedee code to GitHub
# Run this script: bash push_to_github.sh

cd /Users/bovorn/Desktop/aurasea/Projects/notedee

echo "🚀 Starting GitHub push process..."

# Initialize git if needed
if [ ! -d .git ]; then
  echo "📦 Initializing git repository..."
  git init
fi

# Configure git user (if not already configured)
if [ -z "$(git config user.name)" ]; then
  git config user.name "bovornv"
  git config user.email "bovornv@users.noreply.github.com"
fi

# Set remote repository
echo "🔗 Setting remote repository..."
git remote remove origin 2>/dev/null
git remote add origin https://github.com/bovornv/notedee.git

# Add all files
echo "📝 Staging all files..."
git add -A

# Show what will be committed
echo "📋 Files to be committed:"
git status --short

# Commit changes
echo "💾 Committing changes..."
git commit -m "Initial commit: Notedee MVP

Features:
- Violin practice app with hands-free recording
- Rhythm-aware auto-scroll (Mode A: structured notation, Mode B: measure-based)
- Tempo-synchronized scrolling aligned to metronome beats
- Real-time audio analysis with pitch detection
- Thai/English language support
- Free/Paid tier subscription model
- Profile management with image upload
- Session limits for free tier
- Recording countdown (3-2-1)
- Upgrade functionality"

# Set main branch and push
echo "🌿 Setting main branch..."
git branch -M main

echo "⬆️  Pushing to GitHub..."
echo "⚠️  Note: You may need to authenticate with GitHub"
git push -u origin main

echo "✅ Done! Check https://github.com/bovornv/notedee to verify."

