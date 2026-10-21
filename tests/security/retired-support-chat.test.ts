import assert from 'node:assert/strict';
import test from 'node:test';
import type { NextApiRequest, NextApiResponse } from 'next';
import visitorApi from '../../pages/api/support-chat/messages';
import inboxApi from '../../pages/api/admin/support-chat/conversations/index';
import conversationApi from '../../pages/api/admin/support-chat/conversations/[id]';
import { getServerSideProps } from '../../pages/admin/support-chat';

test('retired chat routes reject reads and mutations without issuing session cookies', () => {
  for (const handler of [visitorApi, inboxApi, conversationApi]) {
    for (const method of ['GET', 'POST', 'PATCH', 'DELETE']) {
      const headers = new Map<string, unknown>();
      let status = 0;
      let payload: { supportUrl?: string; error?: string } = {};
      const response = {
        setHeader(name: string, value: unknown) {
          headers.set(name.toLowerCase(), value);
        },
        status(code: number) {
          status = code;
          return this;
        },
        json(body: typeof payload) {
          payload = body;
          return this;
        },
      };
      handler(
        { method, body: { message: 'Do not store this message.' } } as NextApiRequest,
        response as unknown as NextApiResponse
      );
      assert.equal(status, 410);
      assert.equal(payload.supportUrl, 'https://orbit.jsd.bs.ch');
      assert.equal(typeof payload.error, 'string');
      assert.equal(headers.get('cache-control'), 'no-store');
      assert.equal(headers.has('set-cookie'), false);
      assert.equal('conversation' in payload, false);
    }
  }
});

test('the retired admin inbox redirects to the fixed Orbit destination', async () => {
  const result = await getServerSideProps({
    query: { returnUrl: 'https://example.invalid', conversationId: 'old-conversation' },
  } as never);
  assert.deepEqual(result, {
    redirect: { destination: 'https://orbit.jsd.bs.ch', permanent: false },
  });
});
