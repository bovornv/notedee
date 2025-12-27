#!/bin/bash

echo "🧹 Cleaning build cache..."
rm -rf .next
rm -rf node_modules/.cache

echo "🚀 Starting Next.js dev server..."
npm run dev

