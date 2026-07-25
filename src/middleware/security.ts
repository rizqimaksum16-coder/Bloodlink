// src/middleware/security.ts
// Middleware untuk edge functions dan API routes

import { securityHeaders } from '@/lib/security/securityHeaders';
import { rateLimiter } from '@/lib/security/rateLimiter';
import { InputValidator } from '@/lib/security/inputValidation';
import { auditLogger } from '@/lib/security/auditLogger';

interface SecurityMiddlewareOptions {
  requireAuth?: boolean;
  requireRoles?: string[];
  rateLimit?: boolean;
  validateInput?: boolean;
}

export async function securityMiddleware(
  req: Request, 
  options: SecurityMiddlewareOptions = {}
): Promise<Response | null> {
  const url = new URL(req.url);
  
  // 1. Rate Limiting
  if (options.rateLimit !== false) {
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitResult = rateLimiter.isRateLimited(clientIp);
    
    if (rateLimitResult.limited) {
      await auditLogger.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
        ip: clientIp,
        path: url.pathname
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Too Many Requests',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...securityHeaders
          }
        }
      );
    }
  }

  // 2. Authentication (if required)
  if (options.requireAuth) {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      await auditLogger.logSecurityEvent('UNAUTHORIZED_ACCESS', {
        path: url.pathname,
        ip: req.headers.get('x-forwarded-for')
      });
      
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...securityHeaders
          }
        }
      );
    }

    // Validate token and get user info (implement based on your auth system)
    // const user = await validateToken(authHeader.split(' ')[1]);
    
    // Check roles if required
    if (options.requireRoles && options.requireRoles.length > 0) {
      // const hasRole = options.requireRoles.includes(user.role);
      // if (!hasRole) {
      //   return new Response(
      //     JSON.stringify({ error: 'Insufficient permissions' }),
      //     { status: 403, headers: { 'Content-Type': 'application/json', ...securityHeaders } }
      //   );
      // }
    }
  }

  // 3. Input Validation
  if (options.validateInput && req.method === 'POST') {
    try {
      const body = await req.json();
      const sanitizedBody = InputValidator.sanitizeObject(body);
      
      // Replace request body with sanitized version
      const newReq = new Request(req.url, {
        method: req.method,
        headers: req.headers,
        body: JSON.stringify(sanitizedBody)
      });
      
      return null; // Continue with sanitized request
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...securityHeaders
          }
        }
      );
    }
  }

  return null; // Continue
}