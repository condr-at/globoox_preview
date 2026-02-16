#!/bin/bash
# .claude/hooks/session-start.sh
# 3-Tier Context System for Globoox Preview (Next.js 16 + Supabase)
set -euo pipefail

echo "🚀 Globoox Preview Status"
echo "────────────────────────────"

# 1. Check Node.js
if command -v node &> /dev/null; then
    echo "✅ Node.js: $(node -v)"
else
    echo "❌ Node.js: Not installed"
fi

# 2. Check if node_modules exists
if [ -d "node_modules" ]; then
    echo "✅ Dependencies: Installed"
else
    echo "❌ Dependencies: Not installed"
    echo "   Quick fix: npm install"
fi

# 3. Check if .env.local file exists
if [ -f ".env.local" ]; then
    echo "✅ Environment: .env.local found"
    if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local 2>/dev/null; then
        echo "   ✅ SUPABASE_URL configured"
    else
        echo "   ⚠️  NEXT_PUBLIC_SUPABASE_URL missing"
    fi
    if grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local 2>/dev/null; then
        echo "   ✅ SUPABASE_ANON_KEY configured"
    else
        echo "   ⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY missing"
    fi
elif [ -f ".env" ]; then
    echo "✅ Environment: .env found"
else
    echo "⚠️  Environment: No .env.local file"
    echo "   Create one with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
fi

# 4. Check if dev server is running
if lsof -i :3000 &> /dev/null; then
    echo "✅ Dev Server: Running on :3000"
elif lsof -i :3001 &> /dev/null; then
    echo "✅ Dev Server: Running on :3001"
else
    echo "⚪ Dev Server: Not running"
    echo "   Start with: npm run dev"
fi

# 5. Show current branch
echo ""
echo "📍 Git: $(git branch --show-current 2>/dev/null || echo 'Not a git repo')"
if git log -1 --oneline &> /dev/null; then
    echo "   Last commit: $(git log -1 --oneline)"
fi

# 6. Environment-aware context
show_environment_context() {
    if [ -f ".env.production" ]; then
        echo ""
        echo "🔴 PRODUCTION environment detected"
        echo "   - All changes require careful review"
        echo "   - Test on staging first"
    elif [ -f ".env.staging" ]; then
        echo ""
        echo "� STAGING environment detected"
        echo "   - Safe to test changes"
    else
        echo ""
        echo "� DEVELOPMENT environment"
    fi
}
show_environment_context

# 7. Smart context detection based on git changes
detect_work_context() {
    local changed_files=$(git diff --name-only HEAD~1 2>/dev/null || echo "")
    
    if [ -z "$changed_files" ]; then
        return
    fi
    
    echo ""
    if echo "$changed_files" | grep -q "src/app/auth/\|auth/"; then
        echo "💡 Auth context detected"
        echo "   Key: src/app/auth/callback/route.ts"
        echo "   Uses @supabase/ssr for server auth"
        return
    fi
    
    if echo "$changed_files" | grep -q "components/ui/"; then
        echo "💡 UI components context detected"
        echo "   ⚠️  Don't modify shadcn components directly!"
        echo "   Add new: npx shadcn@latest add <component>"
        return
    fi
    
    if echo "$changed_files" | grep -q "components/\|src/app/"; then
        echo "💡 UI development context detected"
        echo "   Uses: shadcn/ui, Tailwind, Framer Motion"
        echo "   Docs: docs/QUICK_REF.md"
        return
    fi
    
    if echo "$changed_files" | grep -q "docs/"; then
        echo "💡 Documentation context detected"
        echo "   Key: docs/api-architecture.md, docs/faststart.md"
        return
    fi
}
detect_work_context

echo ""
echo "────────────────────────────"
echo "� Quick Ref: docs/QUICK_REF.md"
echo "📚 API Arch: docs/api-architecture.md"
echo "📖 Parent API: ../BACKEND_API.md"
echo "────────────────────────────"
