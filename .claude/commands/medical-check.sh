#!/bin/bash
# /medical-check - Verifica implementação de formulários médicos e LGPD

echo "🏥 Verificando formulários médicos e compliance LGPD..."
echo ""

# 1. CPF Validation
echo "1️⃣ Validação de CPF:"
if grep -r "validateCPF\|validarCPF" src/ lib/ 2>/dev/null | grep -v "node_modules"; then
    echo "✅ Validação de CPF encontrada"
else
    echo "❌ Validação de CPF AUSENTE - Campo crítico sem validação!"
fi
echo ""

# 2. Data Sanitization
echo "2️⃣ Sanitização de Dados:"
if grep -r "DOMPurify\|sanitize" src/ lib/ 2>/dev/null | grep -v "node_modules"; then
    echo "✅ Sanitização implementada"
else
    echo "❌ Sanitização AUSENTE - Risco de XSS e dados maliciosos!"
fi
echo ""

# 3. Zod Validation
echo "3️⃣ Validação Zod:"
if grep -r "z\.object\|z\.string" src/ lib/ 2>/dev/null | grep -v "node_modules"; then
    echo "✅ Schemas Zod encontrados"
else
    echo "⚠️ Schemas Zod não encontrados - Validação fraca"
fi
echo ""

# 4. Blood Type Validation
echo "4️⃣ Tipo Sanguíneo:"
blood_types="A+\|A-\|B+\|B-\|AB+\|AB-\|O+\|O-"
if grep -r "$blood_types" src/ lib/ 2>/dev/null | grep -v "node_modules"; then
    echo "✅ Validação de tipo sanguíneo encontrada"
else
    echo "⚠️ Tipos sanguíneos não validados"
fi
echo ""

# 5. Emergency Contact
echo "5️⃣ Contato de Emergência:"
if grep -r "emergencyContact\|emergency.*phone" src/ lib/ 2>/dev/null | grep -v "node_modules"; then
    echo "✅ Contato de emergência implementado"
else
    echo "❌ Contato de emergência AUSENTE - Crítico para emergências!"
fi
echo ""

# 6. LGPD Compliance
echo "6️⃣ LGPD Compliance:"
consent_found=$(grep -r "consent\|termo\|LGPD" src/ lib/ 2>/dev/null | grep -v "node_modules" | wc -l)
encryption_found=$(grep -r "encrypt\|crypto" src/ lib/ 2>/dev/null | grep -v "node_modules" | wc -l)
deletion_found=$(grep -r "delete.*profile\|remove.*data" src/ lib/ 2>/dev/null | grep -v "node_modules" | wc -l)

if [ "$consent_found" -gt 0 ]; then
    echo "✅ Termo de consentimento encontrado"
else
    echo "⚠️ Termo de consentimento não encontrado"
fi

if [ "$encryption_found" -gt 0 ]; then
    echo "✅ Criptografia implementada"
else
    echo "⚠️ Considere criptografar dados sensíveis"
fi

if [ "$deletion_found" -gt 0 ]; then
    echo "✅ Exclusão de dados implementada"
else
    echo "⚠️ Implementar direito ao esquecimento (LGPD)"
fi
echo ""

# 7. QR Code Generation
echo "7️⃣ Geração de QR Code:"
if grep -r "qrcode\|QRCode\|generateQR" src/ lib/ 2>/dev/null | grep -v "node_modules"; then
    echo "✅ Geração de QR Code encontrada"
else
    echo "❌ QR Code NÃO implementado - Funcionalidade principal ausente!"
fi
echo ""

# 8. Offline Support
echo "8️⃣ Suporte Offline:"
if grep -r "localStorage\|sessionStorage\|cache" src/ 2>/dev/null | grep -v "node_modules"; then
    echo "✅ Storage local implementado"
else
    echo "⚠️ Sem suporte offline - Crítico para emergências"
fi
echo ""

# Check for sensitive data logging
echo "⚠️ Verificando logs de dados sensíveis..."
sensitive_logs=$(grep -r "console\.log.*cpf\|console\.log.*medical" src/ 2>/dev/null | grep -v "node_modules" | wc -l)
if [ "$sensitive_logs" -gt 0 ]; then
    echo "❌ ALERTA: Encontrados $sensitive_logs logs de dados sensíveis!"
else
    echo "✅ Nenhum log de dados sensíveis encontrado"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESUMO DA VERIFICAÇÃO MÉDICA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Dados médicos são críticos para salvar vidas."
echo "Garanta que todas as validações estejam implementadas."
echo ""
echo "💡 Dica: Use DOMPurify para sanitizar todos os inputs"