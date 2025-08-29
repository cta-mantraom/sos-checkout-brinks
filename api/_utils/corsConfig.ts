import { z } from 'zod';

// Schema para validação de configuração CORS
const CorsConfigSchema = z.object({
  allowedOrigins: z.array(z.string()),
  allowedMethods: z.array(z.string()),
  allowedHeaders: z.array(z.string()),
  allowCredentials: z.boolean(),
  maxAge: z.number()
});

// Configuração lazy loading
let cachedConfig: z.infer<typeof CorsConfigSchema> | null = null;

export function getCorsConfig(): z.infer<typeof CorsConfigSchema> {
  if (cachedConfig) return cachedConfig;
  
  // Domínios permitidos base
  const baseOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'https://localhost:3000',
    'https://localhost:5173',
    'https://localhost:5174'
  ];
  
  // Domínios de produção
  const productionOrigins = [
    'https://sos-checkout-brinks.vercel.app',
    'https://sos-checkout-brinks-git-main.vercel.app',
    'https://*.vercel.app',
    'https://memoryys.com',
    'https://www.memoryys.com',
    'https://app.memoryys.com',
    'https://checkout.memoryys.com'
  ];
  
  // Domínios customizados via variável de ambiente (se disponível)
  const customOrigins: string[] = [];
  const envOrigins = globalThis.process?.env?.ALLOWED_ORIGINS;
  if (envOrigins) {
    customOrigins.push(...envOrigins.split(',').map(origin => origin.trim()));
  }
  
  const config = {
    allowedOrigins: [...baseOrigins, ...productionOrigins, ...customOrigins],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Cache-Control',
      'X-File-Name',
      'X-Signature',
      'X-Request-Id'
    ],
    allowCredentials: true,
    maxAge: 86400 // 24 horas
  };
  
  // Validar configuração com Zod
  cachedConfig = CorsConfigSchema.parse(config);
  return cachedConfig;
}

// Função para limpar cache (útil para testes)
export function clearCorsConfigCache(): void {
  cachedConfig = null;
}

// Função helper para verificar se uma origem é permitida
export function isOriginAllowed(origin: string): boolean {
  const config = getCorsConfig();
  
  return config.allowedOrigins.some(allowedOrigin => {
    if (allowedOrigin === '*') return true;
    
    // Suporte para wildcards
    if (allowedOrigin.includes('*')) {
      const regex = new RegExp(
        '^' + allowedOrigin.replace(/\*/g, '.*').replace(/\./g, '\\.') + '$'
      );
      return regex.test(origin);
    }
    
    return allowedOrigin === origin;
  });
}