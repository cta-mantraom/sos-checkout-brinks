import { NextRequest } from 'next/server';

interface RateLimitConfig {
  windowMs: number; // Janela de tempo em millisegundos
  maxRequests: number; // Máximo de requisições por janela
  message?: string;
  headers?: boolean; // Se deve adicionar headers de rate limit
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

// Cache em memória para rate limiting (em produção, use Redis ou similar)
const rateLimitCache = new Map<string, RateLimitEntry>();

// Limpar entradas expiradas periodicamente
setInterval(() => {
  const now = Date.now();
  Array.from(rateLimitCache.entries()).forEach(([key, entry]) => {
    if (now > entry.resetTime) {
      rateLimitCache.delete(key);
    }
  });
}, 60000); // Limpar a cada minuto

export const RATE_LIMIT_CONFIGS = {
  // Configurações padrão para diferentes tipos de endpoint
  default: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 100,
    message: 'Muitas requisições. Tente novamente em alguns minutos.',
    headers: true
  },
  
  payment: {
    windowMs: 5 * 60 * 1000, // 5 minutos
    maxRequests: 10,
    message: 'Muitas tentativas de pagamento. Aguarde antes de tentar novamente.',
    headers: true
  },
  
  profile: {
    windowMs: 10 * 60 * 1000, // 10 minutos
    maxRequests: 50,
    message: 'Muitas requisições de perfil. Tente novamente em alguns minutos.',
    headers: true
  },
  
  webhook: {
    windowMs: 1 * 60 * 1000, // 1 minuto
    maxRequests: 100,
    message: 'Webhook rate limit exceeded',
    headers: false // Webhooks não precisam de headers humanos
  },
  
  qrcode: {
    windowMs: 5 * 60 * 1000, // 5 minutos
    maxRequests: 20,
    message: 'Muitas requisições de QR Code. Tente novamente em alguns minutos.',
    headers: true
  }
};

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  message?: string;
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = RATE_LIMIT_CONFIGS.default
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitCache.get(identifier);
  
  // Se não existe entrada ou a janela expirou, criar nova
  if (!entry || now > entry.resetTime) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + config.windowMs,
      firstRequest: now
    };
    
    rateLimitCache.set(identifier, newEntry);
    
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      resetTime: newEntry.resetTime
    };
  }
  
  // Se ainda está dentro da janela
  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      message: config.message
    };
  }
  
  // Incrementar contador
  entry.count++;
  
  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime
  };
}

export function getRateLimitIdentifier(req: NextRequest, includeUserAgent = false): string {
  const ip = getClientIP(req);
  const userAgent = includeUserAgent ? req.headers.get('user-agent') : '';
  
  return `${ip}:${userAgent}`;
}

export function getClientIP(req: NextRequest): string {
  // Tentar diferentes headers para obter o IP real
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  const cloudflareIP = req.headers.get('cf-connecting-ip');
  const vercelIP = req.headers.get('x-vercel-forwarded-for');
  
  if (vercelIP) {
    return vercelIP.split(',')[0].trim();
  }
  
  if (cloudflareIP) {
    return cloudflareIP;
  }
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  // Fallback para localhost ou IP desconhecido
  return '127.0.0.1';
}

export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
  };
  
  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }
  
  return headers;
}

// Middleware helper para aplicar rate limiting em handlers
export function withRateLimit(
  config: RateLimitConfig = RATE_LIMIT_CONFIGS.default,
  identifierFn?: (req: NextRequest) => string
) {
  return function (handler: Function) {
    return async function (req: NextRequest, ...args: unknown[]) {
      const identifier = identifierFn ? identifierFn(req) : getRateLimitIdentifier(req);
      const rateLimitResult = checkRateLimit(identifier, config);
      
      if (!rateLimitResult.success) {
        const headers = config.headers ? createRateLimitHeaders(rateLimitResult) : {};
        
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Rate limit exceeded',
            message: rateLimitResult.message,
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: rateLimitResult.retryAfter
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              ...headers
            }
          }
        );
      }
      
      const response = await handler(req, ...args);
      
      // Adicionar headers de rate limit à resposta de sucesso
      if (config.headers && response instanceof Response) {
        const headers = createRateLimitHeaders(rateLimitResult);
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      }
      
      return response;
    };
  };
}