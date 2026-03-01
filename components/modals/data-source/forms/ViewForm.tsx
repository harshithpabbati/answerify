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
    <ul className="space-y-2 size-full overflow-x-auto max-h-96">
      {data.map((source) => (
        <li key={source.id}>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open data source: ${source.url}`}
            className="flex items-center gap-2 border border-[#FF4500]/20 bg-muted px-3 py-2 text-sm font-mono font-medium text-foreground transition-all hover:border-[#FF4500]/60"
          >
            <Link2Icon className="size-3.5 shrink-0" />
            <span className="truncate">{source.url}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
