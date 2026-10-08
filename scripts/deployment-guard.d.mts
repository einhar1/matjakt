export function deploymentEnvironment<T extends Record<string, string | undefined>>(env?: T): T;

export function deploymentDatabaseUrl(env?: Record<string, string | undefined>): string;
