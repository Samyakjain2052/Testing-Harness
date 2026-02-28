import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Creates an Express middleware that validates the specified part of the request
 * against a Zod schema.
 */
export function validate(schema: ZodSchema, target: ValidationTarget = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      throw result.error;
    }
    // Replace with parsed (and transformed) data
    (req as unknown as Record<string, unknown>)[target] = result.data;
    next();
  };
}
