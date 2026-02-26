import { useEffect, useState } from 'react';
import { getSources } from '@/actions/source';
import { Tables } from '@/database.types';
import { Link2Icon } from '@radix-ui/react-icons';

interface Props {
  orgId: string;
}

export function ViewDataSourcesForm({ orgId }: Props) {
  const [data, setData] = useState<Tables<'datasource'>[]>([]);

  useEffect(() => {
    if (!orgId) return;

    const fetchSources = async () => {
      const { data, error } = await getSources(orgId);
      if (error) return;
      setData(data);
    };

    fetchSources();
  }, [orgId]);

  if (data.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-center text-sm">
        No data sources configured yet.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {data.map((source) => (
        <li
          key={source.id}
          className="bg-bg flex items-center gap-3 rounded-base border-2 border-border px-3 py-2 shadow-base"
        >
          <Link2Icon className="size-4 shrink-0" />
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-sm font-medium underline-offset-2 hover:underline"
          >
            {source.url}
          </a>
        </li>
      ))}
    </ul>
  );
}
