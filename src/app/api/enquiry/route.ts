import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const ENQUIRY_RECIPIENTS = ['winnerflags@gmail.com', 'hello@cuigg.com'];
const FROM_ADDRESS = process.env.ENQUIRY_FROM_ADDRESS ?? 'WinnerFlags Enquiries <onboarding@resend.dev>';

interface EnquiryPayload {
  name: string;
  email: string;
  phone?: string;
  quantity: string;
  eventDescription: string;
  details?: string;
}

function escape(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<EnquiryPayload>;

    const name = body.name?.trim();
    const email = body.email?.trim();
    const quantity = body.quantity?.trim();
    const eventDescription = body.eventDescription?.trim();
    const phone = body.phone?.trim() ?? '';
    const details = body.details?.trim() ?? '';

    if (!name || !email || !quantity || !eventDescription) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('RESEND_API_KEY not configured');
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    const resend = new Resend(apiKey);

    const subject = `WinnerFlags bulk enquiry — ${name} (${quantity} cards)`;
    const text = [
      `New bulk order enquiry from WinnerFlags`,
      ``,
      `Name:      ${name}`,
      `Email:     ${email}`,
      `Phone:     ${phone || '—'}`,
      `Quantity:  ${quantity}`,
      ``,
      `Event / occasion:`,
      eventDescription,
      ``,
      `Additional details:`,
      details || '—',
    ].join('\n');

    const html = `
      <div style="font-family:system-ui,sans-serif;color:#121212;max-width:560px">
        <h2 style="color:#121212;margin:0 0 16px">New bulk order enquiry</h2>
        <table style="border-collapse:collapse;width:100%;font-size:14px">
          <tr><td style="padding:6px 0;color:#3D3830;width:120px">Name</td><td style="padding:6px 0"><strong>${escape(name)}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#3D3830">Email</td><td style="padding:6px 0"><a href="mailto:${escape(email)}">${escape(email)}</a></td></tr>
          <tr><td style="padding:6px 0;color:#3D3830">Phone</td><td style="padding:6px 0">${escape(phone) || '&mdash;'}</td></tr>
          <tr><td style="padding:6px 0;color:#3D3830">Quantity</td><td style="padding:6px 0"><strong>${escape(quantity)}</strong></td></tr>
        </table>
        <h3 style="margin:20px 0 6px;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#3D3830">Event / occasion</h3>
        <p style="white-space:pre-wrap;margin:0">${escape(eventDescription)}</p>
        <h3 style="margin:20px 0 6px;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#3D3830">Additional details</h3>
        <p style="white-space:pre-wrap;margin:0">${details ? escape(details) : '&mdash;'}</p>
      </div>
    `;

    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: ENQUIRY_RECIPIENTS,
      replyTo: email,
      subject,
      text,
      html,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: 'Failed to send enquiry' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Enquiry error:', e);
    return NextResponse.json({ error: 'Could not submit enquiry' }, { status: 500 });
  }
}
