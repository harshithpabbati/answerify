import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

export const OrganizationSchema = z.object({
  name: z.string().min(3, 'Please enter at least 3 characters'),
});

export type OrganizationSchema = z.infer<typeof OrganizationSchema>;

export const resolver = zodResolver(OrganizationSchema);
