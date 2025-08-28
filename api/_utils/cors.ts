import { NextRequest, NextResponse } from 'next/server';

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
  response: NextResponse,
  origin?: string,
  options: CorsOptions = DEFAULT_CORS_OPTIONS
): NextResponse {
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
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
  }

  // Definir outros headers CORS
  response.headers.set('Access-Control-Allow-Methods', allowedMethods?.join(', ') || '');
  response.headers.set('Access-Control-Allow-Headers', allowedHeaders?.join(', ') || '');
  
  if (allowCredentials) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  if (maxAge) {
    response.headers.set('Access-Control-Max-Age', maxAge.toString());
  }

  // Headers de segurança adicionais
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export function handleCorsPreFlight(req: NextRequest, options?: CorsOptions): NextResponse {
  const origin = req.headers.get('origin');
  const response = new NextResponse(null, { status: 200 });
  
  return addCorsHeaders(response, origin || undefined, options);
}

export function createCorsResponse(
  data: any,
  status: number,
  req: NextRequest,
  options?: CorsOptions
): NextResponse {
  const origin = req.headers.get('origin');
  const response = NextResponse.json(data, { status });
  
  return addCorsHeaders(response, origin || undefined, options);
}

export function validateCorsOrigin(req: NextRequest, options?: CorsOptions): boolean {
  const origin = req.headers.get('origin');
  
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