#!/bin/bash

# Setup script for Empleo Safari platform

set -e

echo "🏗️  Setting up Empleo Safari platform..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if we're authenticated with Cloudflare
echo "🔐 Checking Cloudflare authentication..."
if ! wrangler whoami >/dev/null 2>&1; then
    echo "⚠️  Not authenticated with Cloudflare. Please run:"
    echo "   wrangler login"
    echo ""
    read -p "Press Enter after authenticating with Cloudflare..."
fi

# Create environment file
if [ ! -f ".env.local" ]; then
    echo "📝 Creating environment file..."
    cp env.example .env.local
    echo "✅ Created .env.local - please update with your values"
else
    echo "✅ Environment file already exists"
fi

# Create D1 database
echo "🗄️  Creating D1 database..."
DB_OUTPUT=$(wrangler d1 create apoyoalempleo-db --json 2>/dev/null || echo "exists")
if [ "$DB_OUTPUT" != "exists" ]; then
    DB_ID=$(echo $DB_OUTPUT | jq -r '.result.database_id')
    echo "✅ Database created with ID: $DB_ID"
    echo "📝 Please update wrangler.toml with this database ID"
else
    echo "✅ Database already exists"
fi

# Create KV namespaces
echo "🗂️  Creating KV namespaces..."

SESSIONS_OUTPUT=$(wrangler kv:namespace create "SESSIONS" --preview 2>/dev/null || echo "exists")
if [ "$SESSIONS_OUTPUT" != "exists" ]; then
    echo "✅ SESSIONS KV namespace created"
    echo "$SESSIONS_OUTPUT"
fi

CONFIG_OUTPUT=$(wrangler kv:namespace create "CONFIG" --preview 2>/dev/null || echo "exists")
if [ "$CONFIG_OUTPUT" != "exists" ]; then
    echo "✅ CONFIG KV namespace created"
    echo "$CONFIG_OUTPUT"
fi

# Create R2 bucket
echo "🪣 Creating R2 bucket..."
R2_OUTPUT=$(wrangler r2 bucket create apoyoalempleo-storage 2>/dev/null || echo "exists")
if [ "$R2_OUTPUT" != "exists" ]; then
    echo "✅ R2 bucket created"
else
    echo "✅ R2 bucket already exists"
fi

echo ""
echo "🎉 Initial setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Update .env.local with your actual values"
echo "2. Update wrangler.toml with the correct resource IDs"
echo "3. Run database migrations: npm run db:migrate"
echo "4. Start development: npm run dev"
echo ""
echo "📖 For detailed instructions, see README.md"
