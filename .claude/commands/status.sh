#!/bin/bash
# /status - Status rápido do projeto SOS Checkout Brinks

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚨 SOS CHECKOUT BRINKS STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Project Info
echo "📁 Projeto: Sistema QR Code Emergência Médica"
echo "💰 Planos: Básico R$ 5,00 | Premium R$ 10,00"
echo "🔧 Stack: React + TypeScript + MercadoPago + Firebase"
echo ""

# Git Status
echo "📝 Git Status:"
branch=$(git branch --show-current 2>/dev/null || echo "não inicializado")
echo "Branch: $branch"
changes=$(git status --porcelain 2>/dev/null | wc -l)
if [ "$changes" -gt 0 ]; then
    echo "⚠️ $changes arquivos modificados"
else
    echo "✅ Working tree limpo"
fi
echo ""

# Quick Checks
echo "🔍 Quick Checks:"

# Device ID
if grep -r "MP_DEVICE_SESSION_ID" src/ api/ 2>/dev/null | grep -v "node_modules" > /dev/null; then
    echo "✅ Device ID implementado"
else
    echo "❌ Device ID não encontrado"
fi

# Medical Form
if grep -r "validateCPF\|medicalProfile" src/ lib/ 2>/dev/null | grep -v "node_modules" > /dev/null; then
    echo "✅ Formulário médico presente"
else
    echo "❌ Formulário médico não encontrado"
fi

# QR Code
if grep -r "qrcode\|QRCode" src/ lib/ 2>/dev/null | grep -v "node_modules" > /dev/null; then
    echo "✅ QR Code implementado"
else
    echo "❌ QR Code não encontrado"
fi
echo ""

# File Structure
echo "📂 Estrutura:"
if [ -d "src/components" ]; then echo "✅ src/components"; else echo "❌ src/components"; fi
if [ -d "src/pages" ]; then echo "✅ src/pages"; else echo "❌ src/pages"; fi
if [ -d "lib/schemas" ]; then echo "✅ lib/schemas"; else echo "❌ lib/schemas"; fi
if [ -d "api" ]; then echo "✅ api/"; else echo "❌ api/"; fi
if [ -d ".claude" ]; then echo "✅ .claude/"; else echo "❌ .claude/"; fi
echo ""

# Commands Available
echo "🛠️ Comandos Disponíveis:"
echo "  /payment-check - Verificar implementação de pagamento"
echo "  /medical-check - Verificar formulários médicos"
echo "  /deploy-check  - Verificar preparação para deploy"
echo "  /status        - Este comando"
echo ""

# Next Steps
echo "📋 Próximos Passos:"
if ! grep -r "MP_DEVICE_SESSION_ID" src/ api/ 2>/dev/null > /dev/null; then
    echo "1. Implementar Device ID do MercadoPago"
fi
if ! grep -r "validateCPF" src/ lib/ 2>/dev/null > /dev/null; then
    echo "2. Implementar validação de CPF"
fi
if ! grep -r "qrcode" src/ lib/ 2>/dev/null > /dev/null; then
    echo "3. Implementar geração de QR Code"
fi
echo ""

# Agents Status
echo "🤖 Agentes Disponíveis:"
if [ -f ".claude/agents/payment-checkout-specialist.md" ]; then
    echo "✅ payment-checkout-specialist"
else
    echo "❌ payment-checkout-specialist"
fi
if [ -f ".claude/agents/medical-form-specialist.md" ]; then
    echo "✅ medical-form-specialist"
else
    echo "❌ medical-form-specialist"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💡 Use 'npm run dev' para iniciar desenvolvimento"
echo "📚 Documentação completa em docs/ e .claude/"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"