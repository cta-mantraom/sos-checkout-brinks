import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getCorsConfig, isOriginAllowed } from './corsConfig.js';

interface CorsOptions {
  allowedOrigins?: string[];
  allowedMethods?: string[];
  allowedHeaders?: string[];
  allowCredentials?: boolean;
  maxAge?: number;
}

// Usar configuração centralizada com lazy loading
function getDefaultCorsOptions(): CorsOptions {
  const config = getCorsConfig();
  return {
    allowedOrigins: config.allowedOrigins,
    allowedMethods: config.allowedMethods,
    allowedHeaders: config.allowedHeaders,
    allowCredentials: config.allowCredentials,
    maxAge: config.maxAge
  };
}

export function addCorsHeaders(
  res: VercelResponse,
  origin?: string,
  options?: CorsOptions
): void {
  const defaultOptions = getDefaultCorsOptions();
  const { allowedOrigins, allowedMethods, allowedHeaders, allowCredentials, maxAge } = {
    ...defaultOptions,
    ...(options || {})
  };

  // Verificar origem permitida
  if (origin && allowedOrigins) {
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin === '*') return true;
      if (allowedOrigin.includes('*')) {
        const regex = new RegExp(allowedOrigin.replace(/\*/g, '.*'));
        return regex.test(origin);
      }
      return allowedOrigin === origin;
    });

    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  }

  // Definir outros headers CORS
  res.setHeader('Access-Control-Allow-Methods', allowedMethods?.join(', ') || '');
  res.setHeader('Access-Control-Allow-Headers', allowedHeaders?.join(', ') || '');
  
  if (allowCredentials) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  if (maxAge) {
    res.setHeader('Access-Control-Max-Age', maxAge.toString());
  }

  // Headers de segurança adicionais
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

export function handleCorsPreFlight(req: VercelRequest, res: VercelResponse, options?: CorsOptions): void {
  const origin = req.headers.origin as string | undefined;
  
  addCorsHeaders(res, origin, options);
  res.status(200).end();
}

export function createCorsResponse(
  data: unknown,
  status: number,
  req: VercelRequest,
  res: VercelResponse,
  options?: CorsOptions
): void {
  const origin = req.headers.origin as string | undefined;
  
  addCorsHeaders(res, origin, options);
  res.status(status).json(data);
}

export function validateCorsOrigin(req: VercelRequest, options?: CorsOptions): boolean {
  const origin = req.headers.origin as string | undefined;
  
  if (!origin) return true; // Permitir requisições sem origem (como Postman)
  
  // Usar função centralizada para verificar origem
  if (options?.allowedOrigins) {
    const { allowedOrigins } = options;
    return allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin === '*') return true;
      if (allowedOrigin.includes('*')) {
        const regex = new RegExp(allowedOrigin.replace(/\*/g, '.*'));
        return regex.test(origin);
      }
      return allowedOrigin === origin;
    });
  }
  
  // Usar configuração padrão com validação Zod
  return isOriginAllowed(origin);
}