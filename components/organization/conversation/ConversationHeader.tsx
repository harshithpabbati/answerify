import { Badge } from '@/components/ui/badge';

interface Props {
  subject: string;
  email_from: string;
  status: string;
}

export function ConversationHeader({ subject, email_from, status }: Props) {
  return (
    <div className="bg-background flex h-[60px] items-center justify-between border-b px-4 py-2">
      <div>
        <h3 className="font-semibold">{subject}</h3>
        <p className="text-muted-foreground text-xs">{email_from}</p>
      </div>
      {status === 'closed' && <Badge className="px-2 py-1">Closed</Badge>}
    </div>
  );
}
