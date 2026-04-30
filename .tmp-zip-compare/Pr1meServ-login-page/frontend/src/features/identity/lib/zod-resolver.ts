import type { FieldValues, Resolver, ResolverResult } from 'react-hook-form';
import type { z } from 'zod';

export function zodResolver<TFieldValues extends FieldValues>(
  schema: z.ZodType<TFieldValues>,
): Resolver<TFieldValues> {
  return async (values) => {
    const result = schema.safeParse(values);

    if (result.success) {
      return {
        values: result.data,
        errors: {},
      } as ResolverResult<TFieldValues>;
    }

    const errors = result.error.issues.reduce<Record<string, { type: string; message: string }>>(
      (accumulator, issue) => {
        const path = issue.path.join('.');

        if (!path || accumulator[path]) {
          return accumulator;
        }

        accumulator[path] = {
          type: issue.code,
          message: issue.message,
        };

        return accumulator;
      },
      {},
    );

    return {
      values: {} as TFieldValues,
      errors,
    } as ResolverResult<TFieldValues>;
  };
}
