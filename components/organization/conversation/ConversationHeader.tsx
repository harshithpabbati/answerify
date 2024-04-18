interface Props {
  subject: string;
  email_from: string;
}

export function ConversationHeader({ subject, email_from }: Props) {
  return (
    <div className="bg-background border-b px-4 py-2">
      <h3 className="font-semibold">{subject}</h3>
      <p className="text-muted-foreground text-xs">{email_from}</p>
    </div>
  );
}
