#!/bin/bash
# /deploy-check - Verifica se aplicação está pronta para deploy

echo "🚀 Verificando preparação para deploy..."
echo ""

# Counter for issues
critical=0
warnings=0

# 1. TypeScript Check
echo "1️⃣ TypeScript Compilation:"
if npm run type-check 2>/dev/null; then
    echo "✅ TypeScript compilando sem erros"
else
    echo "❌ TypeScript com erros de compilação"
    ((critical++))
fi
echo ""

# 2. Build Check
echo "2️⃣ Build Production:"
if npm run build 2>/dev/null; then
    echo "✅ Build de produção bem sucedido"
else
    echo "❌ Build falhando"
    ((critical++))
fi
echo ""

# 3. Environment Variables
echo "3️⃣ Variáveis de Ambiente:"
env_vars=(
    "VITE_MP_PUBLIC_KEY"
    "MP_ACCESS_TOKEN"
    "WEBHOOK_SECRET"
    "FIREBASE_API_KEY"
    "FIREBASE_PROJECT_ID"
)

for var in "${env_vars[@]}"; do
    if [ ! -z "${!var}" ] || grep -q "$var" .env* 2>/dev/null; then
        echo "✅ $var configurada"
    else
        echo "⚠️ $var não encontrada"
        ((warnings++))
    fi
done
echo ""

# 4. Critical Files Check
echo "4️⃣ Arquivos Críticos:"
critical_files=(
    "vercel.json"
    "package.json"
    "tsconfig.json"
    ".gitignore"
)

for file in "${critical_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file presente"
    else
        echo "❌ $file ausente"
        ((critical++))
    fi
done
echo ""

# 5. Security Check
echo "5️⃣ Segurança:"

# Check for any usage
any_usage=$(grep -r ":\s*any" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
if [ "$any_usage" -eq 0 ]; then
    echo "✅ Sem uso de 'any' no TypeScript"
else
    echo "⚠️ Encontrados $any_usage usos de 'any'"
    ((warnings++))
fi

# Check for console.log
console_logs=$(grep -r "console\.log" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
if [ "$console_logs" -eq 0 ]; then
    echo "✅ Sem console.log em produção"
else
    echo "⚠️ Encontrados $console_logs console.log"
    ((warnings++))
fi

# Check for sensitive data
if grep -r "password\|secret\|token" src/ 2>/dev/null | grep -v "//\|/\*" | grep "=\s*[\"']" > /dev/null; then
    echo "❌ ALERTA: Possíveis secrets hardcoded!"
    ((critical++))
else
    echo "✅ Nenhum secret hardcoded encontrado"
fi
echo ""

# 6. Dependencies Check
echo "6️⃣ Dependencies:"
if [ -f "package-lock.json" ] || [ -f "yarn.lock" ] || [ -f "pnpm-lock.yaml" ]; then
    echo "✅ Lock file presente"
else
    echo "⚠️ Lock file ausente - Instabilidade possível"
    ((warnings++))
fi

# Check for vulnerabilities
echo "🔍 Verificando vulnerabilidades..."
if command -v npm &> /dev/null; then
    vulnerabilities=$(npm audit --json 2>/dev/null | grep -c '"severity"' || echo "0")
    if [ "$vulnerabilities" -eq 0 ]; then
        echo "✅ Sem vulnerabilidades conhecidas"
    else
        echo "⚠️ $vulnerabilities vulnerabilidades encontradas"
        ((warnings++))
    fi
fi
echo ""

# 7. Performance Check
echo "7️⃣ Performance:"
if [ -d "dist" ] || [ -d "build" ]; then
    build_size=$(du -sh dist 2>/dev/null || du -sh build 2>/dev/null | cut -f1)
    echo "📦 Tamanho do build: $build_size"
    
    # Check for large files
    large_files=$(find dist build -size +1M 2>/dev/null | wc -l)
    if [ "$large_files" -gt 0 ]; then
        echo "⚠️ $large_files arquivos maiores que 1MB"
        ((warnings++))
    fi
fi
echo ""

# 8. Tests
echo "8️⃣ Testes:"
if npm test -- --watchAll=false 2>/dev/null; then
    echo "✅ Testes passando"
else
    echo "⚠️ Testes falhando ou ausentes"
    ((warnings++))
fi
echo ""

# Final Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESUMO DO DEPLOY CHECK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$critical" -eq 0 ] && [ "$warnings" -eq 0 ]; then
    echo "✅ PRONTO PARA DEPLOY!"
    echo "Execute: vercel --prod"
elif [ "$critical" -eq 0 ]; then
    echo "⚠️ Deploy possível com $warnings avisos"
    echo "Recomenda-se corrigir os avisos primeiro"
else
    echo "❌ NÃO ESTÁ PRONTO PARA DEPLOY"
    echo "Problemas críticos: $critical"
    echo "Avisos: $warnings"
    echo ""
    echo "Corrija os problemas críticos antes do deploy!"
fi
echo ""
echo "💡 Checklist pré-deploy em .claude/CLAUDE.md"