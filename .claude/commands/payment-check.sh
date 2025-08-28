#!/bin/bash
# /payment-check - Verifica implementação de pagamento MercadoPago

echo "💳 Verificando implementação de pagamento SOS Checkout..."
echo ""

# 1. Device ID Check
echo "1️⃣ Device ID Implementation:"
if grep -r "MP_DEVICE_SESSION_ID" src/ api/ 2>/dev/null | grep -v "node_modules"; then
    echo "✅ Device ID encontrado"
else
    echo "❌ Device ID NÃO ENCONTRADO - Taxa de aprovação será reduzida em 40%!"
fi
echo ""

# 2. HMAC Validation Check
echo "2️⃣ HMAC Validation:"
if grep -r "validateHMAC\|x-signature" api/ 2>/dev/null | grep -v "node_modules"; then
    echo "✅ HMAC validation encontrada"
else
    echo "❌ HMAC validation AUSENTE - Segurança de webhook comprometida!"
fi
echo ""

# 3. Payment Values Check
echo "3️⃣ Valores dos Planos:"
basic_found=$(grep -r "5\.00\|5,00\|500" src/ api/ 2>/dev/null | grep -v "node_modules" | wc -l)
premium_found=$(grep -r "10\.00\|10,00\|1000" src/ api/ 2>/dev/null | grep -v "node_modules" | wc -l)

if [ "$basic_found" -gt 0 ]; then
    echo "✅ Plano Básico (R$ 5,00) configurado"
else
    echo "❌ Plano Básico não encontrado"
fi

if [ "$premium_found" -gt 0 ]; then
    echo "✅ Plano Premium (R$ 10,00) configurado"
else
    echo "❌ Plano Premium não encontrado"
fi
echo ""

# 4. PIX Implementation
echo "4️⃣ PIX Payment:"
if grep -r "pix\|PIX" src/ api/ 2>/dev/null | grep -v "node_modules"; then
    echo "✅ PIX implementation encontrada"
else
    echo "⚠️ PIX não implementado - 40% dos usuários preferem PIX"
fi
echo ""

# 5. Idempotency Key
echo "5️⃣ Idempotency Key:"
if grep -r "X-Idempotency-Key\|idempotency" src/ api/ 2>/dev/null | grep -v "node_modules"; then
    echo "✅ Idempotency key implementada"
else
    echo "⚠️ Idempotency key ausente - Risco de pagamentos duplicados"
fi
echo ""

# 6. Error Handling
echo "6️⃣ Error Handling:"
payment_files=$(find src/ api/ -name "*.ts" -o -name "*.tsx" 2>/dev/null | xargs grep -l "payment\|checkout" 2>/dev/null)
if [ ! -z "$payment_files" ]; then
    for file in $payment_files; do
        if grep -q "try\|catch" "$file" 2>/dev/null; then
            echo "✅ Error handling em: $(basename $file)"
        else
            echo "⚠️ Sem error handling em: $(basename $file)"
        fi
    done
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESUMO DA VERIFICAÇÃO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Use este comando regularmente para garantir que"
echo "a implementação de pagamento está completa e segura."
echo ""
echo "💡 Dica: Execute 'npm run type-check' para validar tipos"