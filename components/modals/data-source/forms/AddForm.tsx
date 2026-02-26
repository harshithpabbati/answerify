'use client';

import { useState } from 'react';
import { setupSources } from '@/actions/source';
import { GlobeIcon, PlusIcon } from '@radix-ui/react-icons';
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

import { CrawlDataSourceForm } from './CrawlForm';

type Mode = 'manual' | 'crawl';

interface Props {
  slug: string;
  onAdd?(): void;
}

export function AddDataSourceForm({ slug, onAdd }: Props) {
  const [mode, setMode] = useState<Mode>('manual');
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
    const { error } = await setupSources(slug as string, urls);
    if (error) {
      console.error(error);
      setError(error.message);
      return;
    }
    onAdd?.();
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex rounded-base border-2 border-black">
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 py-2 text-sm font-medium transition-colors',
            mode === 'manual' ? 'bg-main' : 'bg-white hover:bg-gray-50'
          )}
        >
          <PlusIcon />
          Manual
        </button>
        <button
          type="button"
          onClick={() => setMode('crawl')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 border-l-2 border-black py-2 text-sm font-medium transition-colors',
            mode === 'crawl' ? 'bg-main' : 'bg-white hover:bg-gray-50'
          )}
        >
          <GlobeIcon />
          Crawl Website
        </button>
      </div>

      {mode === 'crawl' ? (
        <CrawlDataSourceForm slug={slug} onAdd={onAdd} />
      ) : (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="w-full space-y-6"
          >
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
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
                variant="neutral"
                size="sm"
                className="mt-2"
                onClick={() => append({ url: '' })}
              >
                <PlusIcon className="mr-2" />
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
      )}
    </div>
  );
}
