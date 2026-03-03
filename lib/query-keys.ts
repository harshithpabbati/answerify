/** Centralised TanStack Query key factory */
export const sourcesQueryKey = (orgId: string) => ['sources', orgId] as const;
export const apiConnectionsQueryKey = (orgId: string) =>
  ['api-connections', orgId] as const;
export const workflowsQueryKey = (orgId: string) =>
  ['workflows', orgId] as const;
