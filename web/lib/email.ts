import { Resend } from "resend";

export async function sendBroadcastEmails(
  to: string[],
  eventTitle: string,
  message: string
): Promise<void> {
  if (!to.length) return;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.batch.send(
    to.map((email) => ({
      from: process.env.EMAIL_FROM!,
      to: email,
      subject: `Update: ${eventTitle}`,
      text: message,
    }))
  );
  if (error) throw new Error(`Resend error: ${error.message}`);
}
