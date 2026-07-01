import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import { TerminalBox, TerminalButton, Spinner, TerminalAlert } from '../../components/ui/Terminal.jsx';
import useShopStore from '../../store/shopStore.js';

// ─────────────────────────────────────────────────────────────────────────────
// CheckoutSuccessPage — Stripe redirects here after payment.
// This page does NOT credit the wallet itself. It only asks the server
// "did this session actually complete?" via /shop/checkout/verify. The
// real crediting already happened server-side via the Stripe webhook,
// which is signature-verified and runs independently of whether the
// player's browser ever loads this page at all.
// ─────────────────────────────────────────────────────────────────────────────

const POLL_INTERVAL = 2000;
const MAX_POLLS      = 5;

const CheckoutSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const sessionId       = searchParams.get('session_id');
  const navigate         = useNavigate();
  const { verifyCheckout } = useShopStore();

  const [status, setStatus]   = useState('checking'); // checking | completed | pending | error
  const [purchase, setPurchase] = useState(null);
  const pollCount = useRef(0);

  useEffect(() => {
    if (!sessionId) { setStatus('error'); return; }

    let timer;
    const poll = async () => {
      const result = await verifyCheckout(sessionId);
      if (!result.ok) { setStatus('error'); return; }

      if (result.status === 'completed') {
        setStatus('completed');
        setPurchase(result.purchase);
        return;
      }

      // Still pending — webhook may not have fired yet. Retry briefly.
      pollCount.current += 1;
      if (pollCount.current >= MAX_POLLS) {
        setStatus('pending');
        return;
      }
      timer = setTimeout(poll, POLL_INTERVAL);
    };

    poll();
    return () => clearTimeout(timer);
  }, [sessionId, verifyCheckout]);

  return (
    <AppShell>
      <div style={{ maxWidth: '480px', margin: '60px auto' }}>
        <TerminalBox style={{ textAlign: 'center' }}>
          {status === 'checking' && (
            <>
              <Spinner size={32} />
              <p style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-dim)' }}>
                Confirming payment<span className="cursor" />
              </p>
            </>
          )}

          {status === 'completed' && (
            <>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>✓</div>
              <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--green-bright)', marginBottom: '8px' }}>
                Payment confirmed
              </h2>
              {purchase && (
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  +{purchase.premiumGained?.toLocaleString()} tokens added to your account.
                </p>
              )}
              <TerminalButton variant="primary" onClick={() => navigate('/shop')}>
                Back to shop
              </TerminalButton>
            </>
          )}

          {status === 'pending' && (
            <>
              <TerminalAlert
                type="warning"
                message="Payment is still processing. This can take a minute — check your inventory shortly."
              />
              <TerminalButton variant="secondary" onClick={() => navigate('/inventory')}>
                Check inventory
              </TerminalButton>
            </>
          )}

          {status === 'error' && (
            <>
              <TerminalAlert type="error" message="Could not verify this payment session." />
              <Link to="/shop" style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                ← Back to shop
              </Link>
            </>
          )}
        </TerminalBox>
      </div>
    </AppShell>
  );
};

export default CheckoutSuccessPage;
