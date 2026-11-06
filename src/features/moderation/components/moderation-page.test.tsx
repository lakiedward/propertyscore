import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import roCommon from '@/i18n/locales/ro/common.json';
import ro from '@/i18n/locales/ro/moderation.json';
import { signedInAs } from '@/test/factories/auth';
import { moderationListingsResponse, SEEDED_REVIEW_LISTINGS } from '@/test/msw/handlers/moderation';
import { server } from '@/test/msw/server';
import { supabaseUrl } from '@/test/msw/supabase-url';
import { renderAppRoute } from '@/test/render';

const [FIRST_LISTING] = SEEDED_REVIEW_LISTINGS;

function captureDecisions() {
  const bodies: unknown[] = [];
  server.use(
    http.post(supabaseUrl('/rest/v1/rpc/decide_listing'), async ({ request }) => {
      bodies.push(await request.json());
      return HttpResponse.json({
        id: 'd1000000-0000-4000-8000-000000000009',
        listing_id: FIRST_LISTING?.id,
        decision: 'approved',
        reasons: [],
        message: null,
        decided_by: null,
        created_at: '2026-11-06T12:00:00.000Z',
      });
    }),
  );
  return bodies;
}

async function openModeration() {
  const view = await renderAppRoute('/admin/listings', { auth: signedInAs('admin') });
  await screen.findByRole('heading', { level: 1, name: ro.head.title });
  return view;
}

async function tickEveryCheck(user: Awaited<ReturnType<typeof renderAppRoute>>['user']) {
  for (const label of [
    ro.checklist.photos.label,
    ro.checklist.personalData.label,
    ro.checklist.price.label,
    ro.checklist.description.label,
  ]) {
    await user.click(screen.getByRole('checkbox', { name: label }));
  }
}

describe('ModerationPage', { timeout: 20_000 }, () => {
  it('lists the listings waiting for review and opens the first one', async () => {
    await openModeration();

    const queue = screen.getByRole('navigation', { name: ro.queue.label });
    expect(within(queue).getAllByRole('link')).toHaveLength(2);
    expect(
      screen.getByRole('heading', { level: 2, name: FIRST_LISTING?.title }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /De verificat/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('approves a listing only after every check is ticked', async () => {
    const bodies = captureDecisions();
    const { user } = await openModeration();

    const approve = screen.getByRole('button', { name: ro.decision.approve });
    expect(approve).toBeDisabled();
    expect(screen.getByText(ro.decision.approveHint)).toBeInTheDocument();

    await tickEveryCheck(user);
    expect(approve).toBeEnabled();
    await user.click(approve);

    await waitFor(() => {
      expect(bodies).toEqual([
        { p_listing_id: FIRST_LISTING?.id, p_decision: 'approved', p_reasons: [], p_message: '' },
      ]);
    });
    expect(
      await screen.findByText(ro.toast.approved.replace('{{title}}', FIRST_LISTING?.title ?? '')),
    ).toBeInTheDocument();
  });

  it('asks for a reason before rejecting and sends the reason with its message', async () => {
    const bodies = captureDecisions();
    const { user } = await openModeration();

    await user.click(screen.getByRole('button', { name: ro.decision.reject }));
    await user.click(screen.getByRole('button', { name: ro.decision.form.rejected.submit }));

    expect(
      await screen.findByText(roCommon.errors.reasons.decision_reason_invalid),
    ).toBeInTheDocument();
    expect(bodies).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: ro.reasons.photos.label }));
    expect(screen.getByLabelText(ro.decision.form.message)).toHaveValue(ro.reasons.photos.message);
    await user.click(screen.getByRole('button', { name: ro.decision.form.rejected.submit }));

    await waitFor(() => {
      expect(bodies).toEqual([
        {
          p_listing_id: FIRST_LISTING?.id,
          p_decision: 'rejected',
          p_reasons: ['photos'],
          p_message: ro.reasons.photos.message,
        },
      ]);
    });
  });

  it('blocks a listing only after the confirmation', async () => {
    const bodies = captureDecisions();
    const { user } = await openModeration();

    await user.click(screen.getByRole('button', { name: ro.decision.block }));
    await user.click(screen.getByRole('button', { name: ro.reasons.duplicate.label }));
    await user.click(screen.getByRole('button', { name: ro.decision.form.blocked.submit }));

    const dialog = await screen.findByRole('alertdialog', { name: ro.decision.confirmBlock.title });
    expect(bodies).toHaveLength(0);
    await user.click(
      within(dialog).getByRole('button', { name: ro.decision.confirmBlock.confirm }),
    );

    await waitFor(() => {
      expect(bodies).toEqual([
        {
          p_listing_id: FIRST_LISTING?.id,
          p_decision: 'blocked',
          p_reasons: ['duplicate'],
          p_message: ro.reasons.duplicate.message,
        },
      ]);
    });
  });

  it('explains when another admin already decided the listing', async () => {
    server.use(
      http.post(supabaseUrl('/rest/v1/rpc/decide_listing'), () =>
        HttpResponse.json(
          { code: 'P0001', message: 'listing_not_pending', details: null, hint: null },
          { status: 400 },
        ),
      ),
    );
    const { user } = await openModeration();

    await tickEveryCheck(user);
    await user.click(screen.getByRole('button', { name: ro.decision.approve }));

    expect(
      await screen.findByText(roCommon.errors.reasons.listing_not_pending),
    ).toBeInTheDocument();
  });

  it('shows the empty state when nothing waits for review', async () => {
    server.use(moderationListingsResponse([]));
    await renderAppRoute('/admin/listings', { auth: signedInAs('admin') });

    expect(await screen.findByText(ro.queue.empty.pending.title)).toBeInTheDocument();
  });
});
