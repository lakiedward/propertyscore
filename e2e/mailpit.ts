import { expect, type APIRequestContext } from '@playwright/test';
import { z } from 'zod';

const MAILPIT_URL = 'http://127.0.0.1:54324';

const searchSchema = z.object({ messages: z.array(z.object({ ID: z.string() })) });

const messageSchema = z.object({ Text: z.string() });

async function latestMessageId(request: APIRequestContext, email: string) {
  const response = await request.get(`${MAILPIT_URL}/api/v1/search`, {
    params: { query: `to:${email}` },
  });
  return searchSchema.parse(await response.json()).messages[0]?.ID;
}

export async function emailLinkFor(request: APIRequestContext, email: string): Promise<string> {
  let messageId: string | undefined;
  await expect
    .poll(async () => {
      messageId = await latestMessageId(request, email);
      return messageId;
    })
    .toBeTruthy();
  const response = await request.get(`${MAILPIT_URL}/api/v1/message/${String(messageId)}`);
  const { Text: text } = messageSchema.parse(await response.json());
  const link = /https?:\/\/\S+\/auth\/confirm\?[^\s)\]]+/u.exec(text)?.[0];
  if (!link) {
    throw new Error(`No confirmation link in the email to ${email}`);
  }
  return link;
}
