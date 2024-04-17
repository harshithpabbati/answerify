export async function POST(request: Request) {
  const { session } = await request.json();

  if (
    session.mta !== 'mx1.forwardemail.net' &&
    session.mta !== 'mx2.forwardemail.net'
  ) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 404,
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
  });
}
