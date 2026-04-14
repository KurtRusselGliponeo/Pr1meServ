import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import type { UserRole } from '@a1prime/schemas';
import { ForbiddenError, UnauthorizedError } from '../lib/errors';

/**
 * Builds a Fastify pre-handler that authorizes only the provided roles.
 *
 * @param roles Roles that are allowed to access the route.
 * @returns A Fastify pre-handler enforcing backend role checks.
 * @throws {UnauthorizedError} When the request has no authenticated user.
 * @throws {ForbiddenError} When the authenticated user role is not allowed.
 */
export function requireRole(roles: UserRole[]): preHandlerHookHandler {
  return async function requireRoleHandler(
    request: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> {
    if (!request.authUser) {
      throw new UnauthorizedError('Authentication is required.');
    }

    if (!roles.includes(request.authUser.role)) {
      request.log.warn(
        {
          userId: request.authUser.sub,
          role: request.authUser.role,
          route: request.routeOptions.url,
        },
        'Forbidden route access attempt.',
      );

      throw new ForbiddenError('You do not have permission to access this resource.');
    }
  };
}
