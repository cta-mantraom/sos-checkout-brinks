# 📋 CHECKLIST DE MIGRAÇÃO - Arquitetura de Configuração Desacoplada

## 📅 Data Início: _________
## 📅 Data Conclusão: _________

## 🎯 OBJETIVO
Migrar TODAS as configurações do sistema para a nova arquitetura desacoplada com lazy loading e separação total de responsabilidades.

## ⚠️ IMPORTANTE
- **NÃO** quebrar código existente durante migração
- **MANTER** backward compatibility
- **VALIDAR** cada etapa antes de prosseguir
- **ZERO** uso de `any` em configurações

---

## 📦 FASE 1: PREPARAÇÃO DA ESTRUTURA

### 1.1 Criar Estrutura de Pastas
```bash
mkdir -p lib/config/{schemas,contexts,validators,types,utils}
```
- [ ] Pasta `schemas/` criada
- [ ] Pasta `contexts/` criada
- [ ] Pasta `validators/` criada
- [ ] Pasta `types/` criada
- [ ] Pasta `utils/` criada

### 1.2 Criar Arquivos Base
- [ ] `/lib/config/index.ts` (barrel export)
- [ ] `/lib/config/schemas/index.ts`
- [ ] `/lib/config/contexts/index.ts`
- [ ] `/lib/config/validators/index.ts`
- [ ] `/lib/config/types/index.ts`
- [ ] `/lib/config/utils/index.ts`

---

## 📝 FASE 2: SCHEMAS ISOLADOS

### 2.1 Schema Firebase
- [ ] Criar `/lib/config/schemas/firebase.schema.ts`
- [ ] Definir `FirebaseConfigSchema`
- [ ] Exportar types derivados
- [ ] ZERO lógica no arquivo
- [ ] Validar com exemplo real

### 2.2 Schema Payment (MercadoPago)
- [ ] Criar `/lib/config/schemas/payment.schema.ts`
- [ ] Definir `MercadoPagoCredentialsSchema`
- [ ] Definir `PaymentConfigSchema`
- [ ] Incluir Device ID obrigatório
- [ ] Valores fixos: R$ 5,00 e R$ 10,00

### 2.3 Schema App
- [ ] Criar `/lib/config/schemas/app.schema.ts`
- [ ] Definir `AppConfigSchema`
- [ ] URLs da aplicação
- [ ] Environment (dev/staging/prod)
- [ ] Feature flags

### 2.4 Schema Email (AWS SES)
- [ ] Criar `/lib/config/schemas/email.schema.ts`
- [ ] Definir `EmailConfigSchema`
- [ ] Region e sender
- [ ] Templates IDs

### 2.5 Schema Redis (Upstash)
- [ ] Criar `/lib/config/schemas/redis.schema.ts`
- [ ] Definir `RedisConfigSchema`
- [ ] URL e token
- [ ] TTL defaults

---

## 🎨 FASE 3: CONTEXTS COM LAZY LOADING

### 3.1 Firebase Config
```typescript
// contexts/firebase.config.ts
export class FirebaseConfig {
  private static instance: FirebaseConfig | null = null;
  private config: FirebaseConfigType | null = null;
  // ...
}
```
- [ ] Implementar singleton pattern
- [ ] Implementar lazy loading
- [ ] Validar com schema
- [ ] Exportar helper function
- [ ] Testar lazy loading

### 3.2 Payment Config
- [ ] Implementar `PaymentConfig` class
- [ ] Singleton pattern
- [ ] Lazy loading
- [ ] Mascarar tokens em logs
- [ ] Helper: `getPaymentConfig()`

### 3.3 App Config
- [ ] Implementar `AppConfig` class
- [ ] Singleton pattern
- [ ] Lazy loading
- [ ] Helper: `getAppConfig()`

### 3.4 Email Config
- [ ] Implementar `EmailConfig` class
- [ ] Singleton pattern
- [ ] Lazy loading
- [ ] Helper: `getEmailConfig()`

### 3.5 Redis Config
- [ ] Implementar `RedisConfig` class
- [ ] Singleton pattern
- [ ] Lazy loading
- [ ] Helper: `getRedisConfig()`

---

## ✅ FASE 4: VALIDATORS

### 4.1 Environment Validator
```typescript
// validators/env.validator.ts
export class EnvValidator {
  static validate<T>(schema: ZodSchema<T>, data: unknown, context: string): T
  static validateWithFallback<T>(...): T
}
```
- [ ] Criar `EnvValidator` class
- [ ] Método `validate()`
- [ ] Método `validateWithFallback()`
- [ ] Mensagens de erro customizadas
- [ ] Context para debugging

### 4.2 URL Validator
- [ ] Criar `URLValidator` class
- [ ] Validar formato URL
- [ ] Validar HTTPS em produção
- [ ] Validar domínios permitidos

### 4.3 Key Validator
- [ ] Criar `KeyValidator` class
- [ ] Validar formato API keys
- [ ] Validar prefixos (APP_USR-)
- [ ] Validar tamanho mínimo

---

## 📝 FASE 5: TYPES

### 5.1 Config Types
```typescript
// types/config.types.ts
export interface ConfigError extends Error {
  context: string;
  validationErrors?: Array<{path: string; message: string;}>;
}
```
- [ ] Definir `ConfigError` interface
- [ ] Definir `ConfigOptions` interface
- [ ] Definir `StrictConfig<T>` type
- [ ] Exportar todos os types

### 5.2 Environment Types
- [ ] Criar types para `process.env`
- [ ] Garantir type safety
- [ ] Documentar cada variável

---

## 🛠️ FASE 6: UTILITIES

### 6.1 Singleton Pattern
```typescript
// utils/singleton.ts
export class Singleton<T> {
  protected static instances: Map<string, any> = new Map();
  // ...
}
```
- [ ] Criar classe `Singleton` genérica
- [ ] Implementar cache de instâncias
- [ ] Thread safety (se necessário)

### 6.2 Lazy Loader
- [ ] Criar `LazyLoader` class
- [ ] Cache de configs carregadas
- [ ] Invalidação de cache
- [ ] Métricas de performance

### 6.3 Config Mask (LGPD)
```typescript
// utils/mask.ts
export class ConfigMask {
  static mask(key: string, value: string): string
  static logConfig(config: Record<string, any>): void
}
```
- [ ] Implementar mascaramento
- [ ] Patterns sensíveis
- [ ] Método `mask()`
- [ ] Método `logConfig()`

---

## 🔄 FASE 7: MIGRAÇÃO DE CÓDIGO EXISTENTE

### 7.1 Identificar Usos Atuais
```bash
grep -r "process.env" src/ lib/ api/ --include="*.ts" --include="*.tsx"
```
- [ ] Listar todos os usos de `process.env`
- [ ] Mapear para novas configs
- [ ] Criar plano de migração

### 7.2 Atualizar Imports
- [ ] Substituir imports antigos
- [ ] Adicionar novos imports
- [ ] Manter backward compatibility

### 7.3 Migrar Por Módulo
- [ ] Migrar módulo de pagamento
- [ ] Migrar módulo Firebase
- [ ] Migrar módulo de email
- [ ] Migrar módulo Redis
- [ ] Migrar configurações gerais

---

## 🧪 FASE 8: VALIDAÇÃO

### 8.1 Performance
- [ ] Medir cold start antes
- [ ] Medir cold start depois
- [ ] Confirmar redução de 75%
- [ ] Medir bundle size

### 8.2 Type Safety
- [ ] Rodar `npm run type-check`
- [ ] Zero erros TypeScript
- [ ] Zero uso de `any`
- [ ] Validar todos os schemas

### 8.3 Funcionamento
- [ ] Testar lazy loading
- [ ] Testar singleton
- [ ] Testar validações
- [ ] Testar mascaramento

---

## 📊 FASE 9: DOCUMENTAÇÃO

### 9.1 Atualizar README
- [ ] Documentar nova estrutura
- [ ] Exemplos de uso
- [ ] Migration guide

### 9.2 Atualizar Agentes
- [ ] payment-checkout-specialist
- [ ] firebase-config-agent
- [ ] webhook-handler
- [ ] Outros agentes afetados

### 9.3 Criar Guias
- [ ] Guia de configuração
- [ ] Guia de troubleshooting
- [ ] Best practices

---

## ✅ FASE 10: DEPLOY

### 10.1 Staging
- [ ] Deploy em staging
- [ ] Testar todas as configs
- [ ] Monitorar logs
- [ ] Validar performance

### 10.2 Produção
- [ ] Backup configs atuais
- [ ] Deploy gradual
- [ ] Monitorar métricas
- [ ] Rollback plan pronto

---

## 📈 MÉTRICAS DE SUCESSO

### Performance
- [ ] Cold start: -75% (target: <1.3ms)
- [ ] Bundle size: -30%
- [ ] Memory usage: -20%

### Qualidade
- [ ] 100% type safe
- [ ] Zero acoplamento
- [ ] 100% configs validadas

### Segurança
- [ ] 100% dados sensíveis mascarados
- [ ] Zero hardcoded secrets
- [ ] LGPD compliance

---

## 🚨 CRITÉRIOS DE ROLLBACK

Se qualquer um destes ocorrer, fazer rollback:
- [ ] Erro ao carregar config crítica
- [ ] Performance degradada >10%
- [ ] Type errors em produção
- [ ] Configs não validando

---

## 📝 NOTAS E OBSERVAÇÕES

_Use este espaço para anotar problemas encontrados, soluções e aprendizados:_

```
Data: ________
Nota: 
_________________________________
_________________________________
_________________________________
```

---

## ✅ SIGN-OFF FINAL

- [ ] Todas as fases completadas
- [ ] Métricas de sucesso atingidas
- [ ] Zero breaking changes
- [ ] Documentação atualizada
- [ ] Agentes atualizados

**Responsável**: _________________
**Data Conclusão**: _________________

---

**THINKING BUDGETS** aplicado em cada fase - "Pensar mais ao fundo" antes de implementar!