import type { ApiErrorBody } from '@repo/shared';
import type { NextFunction, Request, Response } from 'express';
import { HttpError, notFound } from '../lib/errors';

function isBodyParserError(err: unknown): err is { type: string; status: number } {
  return typeof err === 'object' && err !== null && 'type' in err && 'status' in err;
}

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
  next(notFound('Route not found'));
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  let status = 500;
  let body: ApiErrorBody = { error: { code: 'INTERNAL', message: 'Internal server error' } };

  if (err instanceof HttpError) {
    status = err.status;
    body = { error: { code: err.code, message: err.message, details: err.details } };
  } else if (isBodyParserError(err) && err.type === 'entity.parse.failed') {
    status = 400;
    body = { error: { code: 'INVALID_JSON', message: 'Malformed JSON body' } };
  } else if (isBodyParserError(err) && err.type === 'entity.too.large') {
    status = 413;
    body = { error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large' } };
  }

  if (status >= 500) req.log.error({ err }, 'unhandled error');
  res.status(status).json(body);
}
