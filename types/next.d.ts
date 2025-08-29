declare module 'next/server' {
  export interface NextRequest extends Request {
    method: string;
    headers: Headers;
    url: string;
    nextUrl: {
      pathname: string;
      searchParams: URLSearchParams;
    };
    cookies: {
      get(name: string): { value: string } | undefined;
      set(name: string, value: string): void;
    };
    json(): Promise<unknown>;
    text(): Promise<string>;
  }
  
  export class NextResponse extends Response {
    static json(body: unknown, init?: ResponseInit): NextResponse;
    static redirect(url: string | URL, status?: number): NextResponse;
    static rewrite(url: string | URL): NextResponse;
    static next(init?: ResponseInit): NextResponse;
    
    cookies: {
      get(name: string): { value: string } | undefined;
      set(name: string, value: string, options?: Record<string, unknown>): void;
      delete(name: string): void;
    };
  }
}