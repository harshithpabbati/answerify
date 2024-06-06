import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getOrganization, updateOrganization } from '@/actions/organization';
import { Tables } from '@/database.types';
import { useUpdateOrganization } from '@/states/organization';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { slugify } from '@/lib/slug';
import { OrganizationSchema, resolver } from '@/lib/zod/organization';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

export function UpdateOrganizationForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [orgId, setShow] = useUpdateOrganization();
  const [organization, setOrganization] =
    useState<Tables<'organization'> | null>(null);

  const form = useForm<OrganizationSchema>({
    resolver,
    values: {
      name: organization?.name ?? '',
      support_email: organization?.support_email ?? '',
    },
    mode: 'onChange',
  });

  const handleSubmit = async (org: OrganizationSchema) => {
    const { data, error } = await updateOrganization(orgId as string, org);
    if (error) {
      console.error(error);
      setError(error.message);
      return;
    }
    setShow(false);
    toast.success('Successfully updated your organization', {
      description: 'Please wait while we redirect you!',
    });
    router.push(`/org/${data?.slug}`);
    router.refresh();
  };

  useEffect(() => {
    if (!Boolean(orgId)) return;

    const fetchOrg = async () => {
      const { data, error } = await getOrganization(orgId as string);
      if (error) {
        setOrganization(null);
        return;
      }
      setOrganization(data);
    };

    fetchOrg();
  }, [orgId]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="w-full space-y-6"
      >
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error ?? 'Something went wrong, please try again'}
            </AlertDescription>
          </Alert>
        )}
        <div className="space-y-3">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Acme, Inc" {...field} />
                </FormControl>
                <FormDescription>
                  This will be the name of your organization. <br />
                  Your URL will be{' '}
                  {`${window.location.origin}/org/${slugify(field.value)}`}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="support_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Support Email</FormLabel>
                <FormControl>
                  <Input placeholder="support@acme.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button
          disabled={
            form.formState.isSubmitting ||
            !form.formState.isValid ||
            !form.formState.isDirty
          }
          className="w-full"
        >
          {form.formState.isSubmitting ? 'Updating...' : 'Update organization'}
        </Button>
      </form>
    </Form>
  );
}
