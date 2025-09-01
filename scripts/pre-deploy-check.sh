#!/bin/bash

# Script de verificação pré-deploy
# Executa todas as validações necessárias antes do deploy na Vercel

echo "🔍 Iniciando verificações pré-deploy..."
echo ""

# 1. Verificar TypeScript
echo "📝 Verificando TypeScript..."
npm run type-check
if [ $? -ne 0 ]; then
    echo "❌ Erro no TypeScript! Corrija antes do deploy."
    exit 1
fi
echo "✅ TypeScript OK"
echo ""

# 2. Build de produção
echo "🏗️ Executando build de produção..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Erro no build! Corrija antes do deploy."
    exit 1
fi
echo "✅ Build OK"
echo ""

# 3. Verificar uso de 'any'
echo "🚫 Verificando uso de 'any'..."
ANY_COUNT=$(grep -r "any" --include="*.ts" --include="*.tsx" lib/ src/ api/ | grep -v "// eslint-disable" | grep -v "eslint-disable-next-line" | wc -l)
if [ $ANY_COUNT -gt 0 ]; then
    echo "⚠️ Aviso: Encontrados $ANY_COUNT usos de 'any'"
    grep -r "any" --include="*.ts" --include="*.tsx" lib/ src/ api/ | grep -v "// eslint-disable" | head -5
else
    echo "✅ Nenhum uso de 'any' encontrado"
fi
echo ""

# 4. Verificar imports de config
echo "📦 Verificando imports de configuração..."
WRONG_IMPORTS=$(grep -r "process\.env\." --include="*.ts" --include="*.tsx" lib/ src/ api/ | grep -v "fallback" | wc -l)
if [ $WRONG_IMPORTS -gt 0 ]; then
    echo "⚠️ Aviso: Encontrados $WRONG_IMPORTS acessos diretos a process.env"
else
    echo "✅ Configurações desacopladas OK"
fi
echo ""

# 5. Verificar arquivos críticos
echo "📄 Verificando arquivos críticos..."
CRITICAL_FILES=(
    "lib/config/exports.ts"
    "api/process-payment.ts"
    "src/components/payment/PaymentBrick.tsx"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file existe"
    else
        echo "  ❌ $file não encontrado!"
        exit 1
    fi
done
echo ""

# 6. Resumo final
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESUMO DA VERIFICAÇÃO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ TypeScript: OK"
echo "✅ Build: OK"
echo "✅ Arquivos críticos: OK"
echo ""
echo "🚀 Sistema pronto para deploy!"
echo ""
echo "Para fazer o deploy, execute:"
echo "  vercel --prod"
echo ""