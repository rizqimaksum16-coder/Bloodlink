// src/lib/security/cors.ts
// CORS configuration

export const corsConfig = {
  allowedOrigins: [
    'https://bloodlink.vercel.app',
    'https://bloodlink-git-main.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-CSRF-Token',
    'Accept',
    'Origin',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Headers'
  ],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400 // 24 hours
};

export function corsMiddleware(req: Request): Response | null {
  const origin = req.headers.get('origin');
  
  // Check if origin is allowed
  if (origin && corsConfig.allowedOrigins.includes(origin)) {
    // Continue with request
    return null;
  }

  // Return CORS headers for OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': corsConfig.allowedMethods.join(', '),
        'Access-Control-Allow-Headers': corsConfig.allowedHeaders.join(', '),
        'Access-Control-Max-Age': corsConfig.maxAge.toString()
      }
    });
  }

  // Block request if origin is not allowed
  if (origin && !corsConfig.allowedOrigins.includes(origin)) {
    return new Response(
      JSON.stringify({ error: 'CORS policy violation' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  return null;
}