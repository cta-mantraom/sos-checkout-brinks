#!/usr/bin/env python3
"""
Hook de validação para pagamentos MercadoPago - SOS Checkout Brinks
Executa após edições em arquivos relacionados a pagamento
Valida Device ID, valores dos planos e configurações críticas
"""

import json
import sys
import re
import os

def check_device_id(content):
    """Verifica se Device ID está implementado corretamente"""
    issues = []
    
    # Verificar se script de segurança está presente
    if 'payment' in content.lower() or 'checkout' in content.lower():
        if 'MP_DEVICE_SESSION_ID' not in content and 'deviceId' not in content:
            issues.append("🚨 CRÍTICO: Device ID ausente - Taxa de aprovação será reduzida em 40%")
        
        # Verificar validação do Device ID
        if 'deviceId' in content or 'device_id' in content:
            if 'if (!deviceId)' not in content and 'if (!device_id)' not in content:
                issues.append("⚠️ Device ID deve ser validado antes do uso")
    
    return issues

def check_plan_values(content):
    """Verifica se os valores dos planos estão corretos"""
    issues = []
    
    # Valores corretos: Básico R$ 5,00 e Premium R$ 10,00
    if 'basic' in content.lower() or 'básico' in content.lower():
        if not any(val in content for val in ['5.00', '5,00', '500']):
            issues.append("⚠️ Plano Básico deve custar R$ 5,00")
    
    if 'premium' in content.lower():
        if not any(val in content for val in ['10.00', '10,00', '1000']):
            issues.append("⚠️ Plano Premium deve custar R$ 10,00")
    
    return issues

def check_payment_security(content):
    """Verifica segurança em pagamentos"""
    issues = []
    
    # HMAC validation em webhooks
    if 'webhook' in content.lower():
        if 'validateHMAC' not in content and 'x-signature' not in content:
            issues.append("🚨 CRÍTICO: Webhook sem validação HMAC - Segurança comprometida")
        
        # Verificar retorno 200 sempre
        if 'res.status' in content and 'webhook' in content.lower():
            if 'status(200)' not in content:
                issues.append("⚠️ Webhook deve sempre retornar 200 para evitar retry do MercadoPago")
    
    # Idempotency Key
    if 'payment' in content and 'mercadopago' in content.lower():
        if 'X-Idempotency-Key' not in content and 'idempotency' not in content.lower():
            issues.append("⚠️ X-Idempotency-Key obrigatório para evitar pagamentos duplicados")
    
    return issues

def check_pix_implementation(content):
    """Verifica implementação PIX"""
    issues = []
    
    if 'pix' in content.lower():
        # Verificar componentes obrigatórios
        required_pix = ['qrCode', 'qrCodeBase64', 'expirationTime', 'polling']
        missing = [comp for comp in required_pix if comp not in content]
        
        if missing:
            issues.append(f"⚠️ Componentes PIX faltando: {', '.join(missing)}")
        
        # Verificar polling interval
        if 'polling' in content.lower() and '5000' not in content:
            issues.append("⚠️ Polling PIX deve ser a cada 5 segundos")
    
    return issues

def check_error_handling(content):
    """Verifica tratamento de erros"""
    issues = []
    
    if 'payment' in content.lower() or 'checkout' in content.lower():
        # Verificar try/catch
        if 'async' in content:
            if 'try' not in content or 'catch' not in content:
                issues.append("⚠️ Operações assíncronas de pagamento devem ter try/catch")
        
        # Verificar loading states
        if 'useState' in content and 'loading' not in content.lower():
            issues.append("⚠️ Implementar loading state durante processamento de pagamento")
    
    return issues

def main():
    try:
        # Ler dados do hook
        input_data = json.load(sys.stdin)
        file_path = input_data.get('tool_input', {}).get('file_path', '')
        
        # Verificar se é arquivo relacionado a pagamento
        payment_keywords = ['payment', 'checkout', 'mercadopago', 'pix', 'webhook']
        if not any(keyword in file_path.lower() for keyword in payment_keywords):
            # Não é arquivo de pagamento, sair silenciosamente
            sys.exit(0)
        
        print(f"💳 Validando pagamentos SOS Checkout: {file_path}")
        
        # Ler conteúdo do arquivo
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            print(f"Erro ao ler arquivo: {e}", file=sys.stderr)
            sys.exit(1)
        
        # Executar todas as validações
        all_issues = []
        all_issues.extend(check_device_id(content))
        all_issues.extend(check_plan_values(content))
        all_issues.extend(check_payment_security(content))
        all_issues.extend(check_pix_implementation(content))
        all_issues.extend(check_error_handling(content))
        
        # Separar issues críticos de warnings
        critical_issues = [issue for issue in all_issues if '🚨 CRÍTICO' in issue]
        warnings = [issue for issue in all_issues if '⚠️' in issue]
        
        # Reportar problemas críticos
        if critical_issues:
            print("❌ PROBLEMAS CRÍTICOS DE PAGAMENTO:", file=sys.stderr)
            for issue in critical_issues:
                print(f"  • {issue}", file=sys.stderr)
            print("🛑 Correção OBRIGATÓRIA - Taxa de aprovação será impactada!", file=sys.stderr)
            sys.exit(2)  # Bloqueia execução
        
        # Reportar warnings
        if warnings:
            print("⚠️ Avisos de pagamento encontrados:")
            for warning in warnings:
                print(f"  • {warning}")
            print("💡 Considere corrigir para melhor taxa de aprovação")
        
        if not all_issues:
            print("✅ Validação de pagamento passou!")
        
        # Dicas contextuais
        if 'checkout' in file_path.lower():
            print("💡 Lembre-se: Device ID é obrigatório para aprovação")
        elif 'webhook' in file_path.lower():
            print("💡 Lembre-se: Sempre retornar 200 no webhook")
        elif 'pix' in file_path.lower():
            print("💡 Lembre-se: Implementar polling a cada 5 segundos")
    
    except Exception as e:
        print(f"Erro no hook de validação de pagamento: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()