#!/usr/bin/env python3
"""
Hook de validação TypeScript - SOS Checkout Brinks
Executa após edições em arquivos .ts e .tsx
Garante type safety e boas práticas TypeScript
"""

import json
import sys
import re
import os
import subprocess

def check_any_usage(content):
    """Verifica uso de 'any' no TypeScript"""
    issues = []
    
    # Padrões de uso de any
    any_patterns = [
        r':\s*any\b',
        r'<any>',
        r'as\s+any\b',
        r'Array<any>',
        r'Promise<any>',
        r'any\[\]'
    ]
    
    for pattern in any_patterns:
        if re.search(pattern, content):
            issues.append("🚨 CRÍTICO: Uso de 'any' detectado - Type safety comprometida")
            break
    
    return issues

def check_type_assertions(content):
    """Verifica assertions perigosas"""
    issues = []
    
    # Verificar uso excessivo de '!'
    non_null_assertions = re.findall(r'\w+!\.', content)
    if len(non_null_assertions) > 3:
        issues.append("⚠️ Muitas non-null assertions (!) - Verificar nullability")
    
    # Verificar 'as' casting perigoso
    if re.search(r'as\s+unknown\s+as', content):
        issues.append("🚨 CRÍTICO: Double casting detectado (as unknown as)")
    
    # @ts-ignore é proibido
    if '@ts-ignore' in content:
        issues.append("🚨 CRÍTICO: @ts-ignore não é permitido - Corrigir erro TypeScript")
    
    # @ts-nocheck é proibido
    if '@ts-nocheck' in content:
        issues.append("🚨 CRÍTICO: @ts-nocheck não é permitido")
    
    return issues

def check_interface_conventions(content):
    """Verifica convenções de interfaces e tipos"""
    issues = []
    
    # Interfaces devem ter prefixo I
    interfaces = re.findall(r'interface\s+(\w+)', content)
    for interface in interfaces:
        if not interface.startswith('I'):
            issues.append(f"⚠️ Interface '{interface}' deve ter prefixo 'I'")
    
    # Types devem ter prefixo T
    types = re.findall(r'type\s+(\w+)', content)
    for type_name in types:
        if not type_name.startswith('T'):
            issues.append(f"⚠️ Type '{type_name}' deve ter prefixo 'T'")
    
    return issues

def check_strict_mode(content):
    """Verifica configurações strict do TypeScript"""
    issues = []
    
    if 'tsconfig' in content.lower():
        if '"strict": false' in content:
            issues.append("🚨 CRÍTICO: Strict mode deve estar ativo")
        
        required_flags = [
            'strictNullChecks',
            'strictFunctionTypes',
            'strictBindCallApply',
            'noImplicitAny',
            'noImplicitThis'
        ]
        
        for flag in required_flags:
            if f'"{flag}": false' in content:
                issues.append(f"⚠️ Flag {flag} deve estar true")
    
    return issues

def check_return_types(content):
    """Verifica se funções têm tipos de retorno explícitos"""
    issues = []
    
    # Funções sem tipo de retorno
    functions_without_return = re.findall(
        r'(?:async\s+)?function\s+\w+\([^)]*\)\s*{',
        content
    )
    
    arrow_functions_without_return = re.findall(
        r'const\s+\w+\s*=\s*(?:async\s+)?\([^)]*\)\s*=>',
        content
    )
    
    if len(functions_without_return) + len(arrow_functions_without_return) > 5:
        issues.append("⚠️ Muitas funções sem tipo de retorno explícito")
    
    return issues

def check_error_handling(content):
    """Verifica tratamento de erros tipado"""
    issues = []
    
    # Catch blocks sem tipo
    catch_blocks = re.findall(r'catch\s*\(\s*(\w+)\s*\)', content)
    for error_var in catch_blocks:
        if not re.search(f'{error_var}\\s*:\\s*\\w+', content):
            issues.append("⚠️ Variável de erro em catch sem tipo")
    
    # Promises sem tratamento de erro
    if 'Promise' in content and '.catch' not in content and 'try' not in content:
        issues.append("⚠️ Promises devem ter tratamento de erro")
    
    return issues

def check_imports(content):
    """Verifica imports e dependencies"""
    issues = []
    
    # Import com require (não usar em TypeScript)
    if 'require(' in content and '.tsx' in content:
        issues.append("⚠️ Usar import ES6 ao invés de require()")
    
    # Imports sem tipos
    if 'import ' in content:
        untyped_imports = re.findall(r'import\s+{[^}]+}\s+from\s+["\']([^"\']+)["\']', content)
        for imp in untyped_imports:
            if not imp.startswith('.') and '@types/' not in content:
                if imp in ['react', 'react-dom', 'axios', 'zod']:
                    issues.append(f"⚠️ Verificar se @types/{imp} está instalado")
    
    return issues

def check_component_types(content):
    """Verifica tipos em componentes React"""
    issues = []
    
    if '.tsx' in content or 'React' in content:
        # Props sem tipo
        if 'props)' in content and 'props:' not in content:
            issues.append("⚠️ Props de componente sem tipo")
        
        # useState sem tipo genérico
        if 'useState(' in content and 'useState<' not in content:
            issues.append("⚠️ useState deve ter tipo genérico")
        
        # useEffect sem cleanup quando necessário
        if 'setInterval' in content or 'addEventListener' in content:
            if 'return () =>' not in content:
                issues.append("⚠️ useEffect com side effects precisa cleanup")
    
    return issues

def run_type_check():
    """Executa npm run type-check se disponível"""
    try:
        result = subprocess.run(
            ['npm', 'run', 'type-check'],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode != 0:
            return ["🚨 CRÍTICO: TypeScript compilation failed - Corrigir erros"]
        return []
    except:
        return []  # Comando não disponível, ignorar

def main():
    try:
        # Ler dados do hook
        input_data = json.load(sys.stdin)
        file_path = input_data.get('tool_input', {}).get('file_path', '')
        
        # Verificar se é arquivo TypeScript
        if not file_path.endswith(('.ts', '.tsx', 'tsconfig.json')):
            # Não é arquivo TypeScript, sair silenciosamente
            sys.exit(0)
        
        print(f"📘 Validando TypeScript: {file_path}")
        
        # Ler conteúdo do arquivo
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            print(f"Erro ao ler arquivo: {e}", file=sys.stderr)
            sys.exit(1)
        
        # Executar todas as validações
        all_issues = []
        all_issues.extend(check_any_usage(content))
        all_issues.extend(check_type_assertions(content))
        all_issues.extend(check_interface_conventions(content))
        all_issues.extend(check_strict_mode(content))
        all_issues.extend(check_return_types(content))
        all_issues.extend(check_error_handling(content))
        all_issues.extend(check_imports(content))
        all_issues.extend(check_component_types(content))
        
        # Se for alteração significativa, rodar type-check
        if len(content.splitlines()) > 50:
            all_issues.extend(run_type_check())
        
        # Separar issues críticos de warnings
        critical_issues = [issue for issue in all_issues if '🚨 CRÍTICO' in issue]
        warnings = [issue for issue in all_issues if '⚠️' in issue]
        
        # Reportar problemas críticos
        if critical_issues:
            print("❌ PROBLEMAS CRÍTICOS TYPESCRIPT:", file=sys.stderr)
            for issue in critical_issues:
                print(f"  • {issue}", file=sys.stderr)
            print("🛑 Correção OBRIGATÓRIA - Type safety em risco!", file=sys.stderr)
            sys.exit(2)  # Bloqueia execução
        
        # Reportar warnings
        if warnings:
            print("⚠️ Avisos TypeScript encontrados:")
            for warning in warnings:
                print(f"  • {warning}")
            print("💡 Considere corrigir para melhor type safety")
        
        if not all_issues:
            print("✅ Validação TypeScript passou!")
        
        # Dicas contextuais
        if '.tsx' in file_path:
            print("💡 Lembre-se: Componentes devem ter props tipadas")
        elif 'schema' in file_path.lower():
            print("💡 Lembre-se: Usar Zod para validação runtime")
        elif 'api' in file_path.lower():
            print("💡 Lembre-se: Tipar requests e responses")
    
    except Exception as e:
        print(f"Erro no hook de validação TypeScript: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()