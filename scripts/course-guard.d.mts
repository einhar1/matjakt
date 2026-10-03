export function courseEnvironment<T extends Record<string, string | undefined>>(env?: T): T;

export function courseDatabaseUrl(env?: Record<string, string | undefined>): string;
