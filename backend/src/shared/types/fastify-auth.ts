import '@fastify/jwt';
import type { FastifyReply } from 'fastify';
import type { AuthTokenPayload } from '../lib/auth';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthTokenPayload;
    user: AuthTokenPayload;
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    authUser: AuthTokenPayload;
  }

  interface FastifyInstance {
    authenticate(request: import('fastify').FastifyRequest, reply: FastifyReply): Promise<void>;
  }
}
