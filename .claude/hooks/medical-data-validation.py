#!/usr/bin/env python3
"""
Hook de validação para dados médicos - SOS Checkout Brinks
Executa após edições em formulários médicos e perfis
Garante LGPD compliance e validação de dados críticos
"""

import json
import sys
import re
import os

def validate_cpf(cpf):
    """Valida CPF brasileiro usando algoritmo oficial"""
    cpf_clean = re.sub(r'\D', '', cpf)
    
    if len(cpf_clean) != 11:
        return False
    
    # Verifica se todos os dígitos são iguais
    if len(set(cpf_clean)) == 1:
        return False
    
    # Validação dos dígitos verificadores
    for i in range(9, 11):
        value = sum((int(cpf_clean[j]) * ((i+1) - j) for j in range(0, i)))
        digit = ((value * 10) % 11) % 10
        if digit != int(cpf_clean[i]):
            return False
    
    return True

def check_medical_form_structure(content):
    """Verifica estrutura do formulário médico"""
    issues = []
    
    # Campos obrigatórios
    required_fields = [
        'fullName', 'cpf', 'dateOfBirth', 'bloodType',
        'emergencyContact', 'phone', 'relationship'
    ]
    
    missing_fields = [field for field in required_fields if field not in content]
    
    if missing_fields:
        issues.append(f"⚠️ Campos obrigatórios ausentes: {', '.join(missing_fields)}")
    
    # Validação de tipo sanguíneo
    if 'bloodType' in content:
        valid_types = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
        if not any(bt in content for bt in valid_types):
            issues.append("⚠️ Implementar validação de tipo sanguíneo válido")
    
    return issues

def check_data_sanitization(content):
    """Verifica sanitização de dados sensíveis"""
    issues = []
    
    # Verificar uso de DOMPurify
    if 'medical' in content.lower() or 'form' in content.lower():
        if 'DOMPurify' not in content and 'sanitize' not in content:
            issues.append("🚨 CRÍTICO: Dados médicos devem ser sanitizados (DOMPurify)")
        
        # Verificar se há console.log de dados sensíveis
        sensitive_patterns = [
            r'console\.log.*cpf',
            r'console\.log.*bloodType',
            r'console\.log.*medical',
            r'console\.log.*allerg'
        ]
        
        for pattern in sensitive_patterns:
            if re.search(pattern, content, re.IGNORECASE):
                issues.append("🚨 CRÍTICO: Não logar dados médicos sensíveis")
    
    return issues

def check_lgpd_compliance(content):
    """Verifica compliance com LGPD"""
    issues = []
    
    if 'medical' in content.lower() or 'profile' in content.lower():
        # Verificar consentimento
        if 'consent' not in content.lower() and 'termo' not in content.lower():
            issues.append("⚠️ LGPD: Implementar termo de consentimento")
        
        # Verificar criptografia
        if 'localStorage' in content or 'sessionStorage' in content:
            if 'encrypt' not in content.lower() and 'crypto' not in content.lower():
                issues.append("⚠️ LGPD: Dados sensíveis em storage devem ser criptografados")
        
        # Verificar direito ao esquecimento
        if 'delete' not in content.lower() and 'remove' not in content.lower():
            issues.append("⚠️ LGPD: Implementar funcão de exclusão de dados")
    
    return issues

def check_validation_schemas(content):
    """Verifica schemas de validação Zod"""
    issues = []
    
    if 'form' in content.lower() or 'medical' in content.lower():
        if 'z.object' not in content and 'zod' not in content.lower():
            issues.append("⚠️ Implementar validação Zod para formulário médico")
        
        # Verificar validação de CPF
        if 'cpf' in content.lower():
            if 'validateCPF' not in content and 'validarCPF' not in content:
                issues.append("⚠️ CPF deve ter validação algorítmica completa")
        
        # Verificar validação de telefone
        if 'phone' in content.lower() or 'telefone' in content.lower():
            if not re.search(r'regex.*phone|phone.*regex', content, re.IGNORECASE):
                issues.append("⚠️ Telefone deve validar formato (11) 98765-4321")
    
    return issues

def check_emergency_ux(content):
    """Verifica UX para situações de emergência"""
    issues = []
    
    if 'emergency' in content.lower() or 'emergência' in content.lower():
        # Verificar tamanho de fonte
        if 'fontSize' in content or 'text-' in content:
            if 'text-xs' in content or 'text-sm' in content:
                issues.append("⚠️ Fonte muito pequena para emergências (mín. 16px)")
        
        # Verificar contraste
        if 'text-gray-400' in content or 'text-gray-500' in content:
            issues.append("⚠️ Contraste baixo para emergências (use WCAG AAA)")
        
        # Verificar loading states
        if 'loading' not in content.lower() and 'spinner' not in content.lower():
            issues.append("⚠️ Implementar indicadores de carregamento claros")
    
    return issues

def check_offline_support(content):
    """Verifica suporte offline para dados críticos"""
    issues = []
    
    if 'medical' in content.lower() or 'qrcode' in content.lower():
        if 'offline' not in content.lower() and 'cache' not in content.lower():
            issues.append("⚠️ Implementar cache offline para dados médicos")
        
        if 'serviceWorker' not in content and 'service-worker' not in content:
            issues.append("⚠️ Considerar Service Worker para funcionalidade offline")
    
    return issues

def main():
    try:
        # Ler dados do hook
        input_data = json.load(sys.stdin)
        file_path = input_data.get('tool_input', {}).get('file_path', '')
        
        # Verificar se é arquivo relacionado a dados médicos
        medical_keywords = ['medical', 'form', 'profile', 'emergency', 'qrcode']
        if not any(keyword in file_path.lower() for keyword in medical_keywords):
            # Não é arquivo médico, sair silenciosamente
            sys.exit(0)
        
        print(f"🏥 Validando dados médicos SOS: {file_path}")
        
        # Ler conteúdo do arquivo
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            print(f"Erro ao ler arquivo: {e}", file=sys.stderr)
            sys.exit(1)
        
        # Executar todas as validações
        all_issues = []
        all_issues.extend(check_medical_form_structure(content))
        all_issues.extend(check_data_sanitization(content))
        all_issues.extend(check_lgpd_compliance(content))
        all_issues.extend(check_validation_schemas(content))
        all_issues.extend(check_emergency_ux(content))
        all_issues.extend(check_offline_support(content))
        
        # Separar issues críticos de warnings
        critical_issues = [issue for issue in all_issues if '🚨 CRÍTICO' in issue]
        warnings = [issue for issue in all_issues if '⚠️' in issue]
        
        # Reportar problemas críticos
        if critical_issues:
            print("❌ PROBLEMAS CRÍTICOS DE DADOS MÉDICOS:", file=sys.stderr)
            for issue in critical_issues:
                print(f"  • {issue}", file=sys.stderr)
            print("🛑 Correção OBRIGATÓRIA - Compliance LGPD em risco!", file=sys.stderr)
            sys.exit(2)  # Bloqueia execução
        
        # Reportar warnings
        if warnings:
            print("⚠️ Avisos de dados médicos encontrados:")
            for warning in warnings:
                print(f"  • {warning}")
            print("💡 Considere corrigir para melhor compliance e UX")
        
        if not all_issues:
            print("✅ Validação de dados médicos passou!")
        
        # Dicas contextuais
        if 'form' in file_path.lower():
            print("💡 Lembre-se: Validar CPF com algoritmo completo")
        elif 'profile' in file_path.lower():
            print("💡 Lembre-se: Sanitizar todos os dados de entrada")
        elif 'emergency' in file_path.lower():
            print("💡 Lembre-se: Interface clara e legível para emergências")
    
    except Exception as e:
        print(f"Erro no hook de validação médica: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()