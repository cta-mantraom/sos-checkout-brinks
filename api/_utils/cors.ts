import type { VercelRequest, VercelResponse } from '@vercel/node';

interface CorsOptions {
  allowedOrigins?: string[];
  allowedMethods?: string[];
  allowedHeaders?: string[];
  allowCredentials?: boolean;
  maxAge?: number;
}

const DEFAULT_CORS_OPTIONS: CorsOptions = {
  allowedOrigins: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://sos-checkout-brinks.vercel.app',
    'https://sos-checkout-brinks-git-main.vercel.app',
    'https://*.vercel.app'
  ],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'X-File-Name'
  ],
  allowCredentials: true,
  maxAge: 86400 // 24 horas
};

export function addCorsHeaders(
  res: VercelResponse,
  origin?: string,
  options: CorsOptions = DEFAULT_CORS_OPTIONS
): void {
  const { allowedOrigins, allowedMethods, allowedHeaders, allowCredentials, maxAge } = {
    ...DEFAULT_CORS_OPTIONS,
    ...options
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
  
  const { allowedOrigins } = { ...DEFAULT_CORS_OPTIONS, ...options };
  
  if (!allowedOrigins) return true;
  
  return allowedOrigins.some(allowedOrigin => {
    if (allowedOrigin === '*') return true;
    if (allowedOrigin.includes('*')) {
      const regex = new RegExp(allowedOrigin.replace(/\*/g, '.*'));
      return regex.test(origin);
    }
    return allowedOrigin === origin;
  });
}