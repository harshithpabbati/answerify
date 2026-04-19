export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  messageId: string;
}

export async function sendEmailViaCF({
  to,
  subject,
  html,
  messageId,
}: SendEmailOptions): Promise<{ id: string }> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_EMAIL_API_TOKEN;

  if (!accountId || !apiToken) {
    throw new Error(
      'Missing Cloudflare email configuration: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_EMAIL_API_TOKEN are required'
    );
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/email/send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: { email: 'support@answerify.dev', name: 'Support' },
        to: [{ email: to }],
        subject,
        html,
        headers: { 'In-Reply-To': messageId },
      }),
    }
  );

  const result = await response.json();
  if (!result.success) {
    const errorMessages =
      result.errors?.map((e: { message: string }) => e.message).join(', ') ||
      'Unknown error';
    throw new Error(`Cloudflare Email Service error: ${errorMessages}`);
  }
  return result.result as { id: string };
}
