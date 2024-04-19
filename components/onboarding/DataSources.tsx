'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { updateUser } from '@/actions/auth';
import { setupSources } from '@/actions/source';
import { useFieldArray, useForm } from 'react-hook-form';

import { cn } from '@/lib/utils';
import { DataSourcesSchema, resolver } from '@/lib/zod/data-source';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

export function DataSources() {
  const router = useRouter();
  const params = useParams();

  const [error, setError] = useState('');
  const form = useForm<DataSourcesSchema>({
    resolver,
    defaultValues: {
      urls: [{ url: '' }],
    },
    mode: 'onChange',
  });
  const { fields, append } = useFieldArray({
    name: 'urls',
    control: form.control,
  });

  const handleSubmit = async ({ urls }: DataSourcesSchema) => {
    const { error } = await setupSources(params.slug as string, urls);
    if (error) {
      console.error(error);
      setError(error.message);
      return;
    }
    await updateUser({
      data: {
        onboarding: {
          hasOnboarded: true,
          onboardingStep: 4,
          slug: params.slug,
        },
      },
    });
    router.push(`/onboarding/${params.slug}/configurations`);
  };

  return (
    <div>
      <h2 className="text-3xl font-semibold">Setup Datasources</h2>
      <p className="text-muted-foreground mt-1">
        Add your links to the docs, blogs & other help center docs
      </p>
      <div className="mt-4">
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
              {fields.map((field, index) => (
                <FormField
                  control={form.control}
                  key={field.id}
                  name={`urls.${index}.url`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={cn(index !== 0 && 'sr-only')}>
                        URLs
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/docs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => append({ url: '' })}
              >
                Add URL
              </Button>
            </div>
            <Button
              disabled={form.formState.isSubmitting || !form.formState.isValid}
              className="w-full"
            >
              {form.formState.isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
