import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createOrganization } from '@/actions/organization';
import { useCreateOrganization } from '@/states/organization';
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

export function CreateOrganizationForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [, setShow] = useCreateOrganization();

  const form = useForm<OrganizationSchema>({
    resolver,
    defaultValues: {
      name: '',
    },
    mode: 'onChange',
  });

  const orgName = form.watch('name');

  const handleSubmit = async ({ name }: OrganizationSchema) => {
    const { data, error } = await createOrganization(name);
    if (error) {
      console.error(error);
      setError(error.message);
      return;
    }
    setShow(false);
    toast.success('Successfully created your organization', {
      description: 'Please wait while we redirect you!',
    });
    router.push(`/org/${data.slug}`);
    router.refresh();
  };

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
                  {`${window.location.origin}/org/${slugify(orgName)}`}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button
          disabled={form.formState.isSubmitting || !form.formState.isValid}
          className="w-full"
        >
          {form.formState.isSubmitting ? 'Creating...' : 'Create organization'}
        </Button>
      </form>
    </Form>
  );
}
