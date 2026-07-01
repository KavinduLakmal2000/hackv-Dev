import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import { TerminalBox, TerminalAlert, Spinner } from '../../components/ui/Terminal.jsx';
import WalletDisplay from '../../components/ui/WalletDisplay.jsx';
import ShopItemCard from '../../components/shop/ShopItemCard.jsx';
import PremiumPackCard from '../../components/shop/PremiumPackCard.jsx';
import useShopStore from '../../store/shopStore.js';
import useAuthStore from '../../store/authStore.js';
import { TIERS } from '../../theme/rankTiers.js';

const TABS = [
  { key: 'premium_pack', label: 'Tokens' },
  { key: 'credit_pack',  label: 'Credits' },
  { key: 'terminal_theme', label: 'Themes' },
  { key: 'avatar_frame',   label: 'Frames' },
  { key: 'player_banner',  label: 'Banners' },
  { key: 'xp_boost',       label: 'Boosts' },
];

const TIER_ORDER = TIERS.map((t) => t.name);

const ShopPage = () => {
  const { user } = useAuthStore();
  const {
    catalog, wallet, isLoading, error,
    fetchCatalog, buyItem, startCheckout, clearError, lastPurchase, clearLastPurchase,
  } = useShopStore();

  const [tab, setTab] = useState('premium_pack');

  useEffect(() => { fetchCatalog(); }, [fetchCatalog]);

  useEffect(() => {
    if (lastPurchase) {
      const t = setTimeout(() => clearLastPurchase(), 3000);
      return () => clearTimeout(t);
    }
  }, [lastPurchase, clearLastPurchase]);

  const userTierIdx = TIER_ORDER.indexOf(user?.rank?.tier ?? 'SCRIPT_KIDDIE');

  const tierMet = (item) => {
    if (!item.requiredTier) return true;
    return userTierIdx >= TIER_ORDER.indexOf(item.requiredTier);
  };

  const handleEquip = (itemId, slot) => useShopStore.getState().equipItem(itemId, slot);
  const handleUnequip = (slot) => useShopStore.getState().unequipItem(slot);

  const items = catalog?.[tab] ?? [];

  return (
    <AppShell>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <p style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', marginBottom: '4px' }}>
            SYS://BLACK-MARKET
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Shop</h1>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <WalletDisplay wallet={wallet} size="lg" />
          <Link to="/inventory" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            View inventory →
          </Link>
        </div>
      </div>

      {error && <TerminalAlert type="error" message={error} onClose={clearError} />}
      {lastPurchase && (
        <TerminalAlert type="success" message={`Purchased ${lastPurchase.item?.name}!`} onClose={clearLastPurchase} />
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '7px 16px', fontSize: '11px', fontFamily: 'var(--font-display)',
              letterSpacing: '0.05em', textTransform: 'uppercase',
              border: `1px solid ${tab === t.key ? 'var(--green-bright)' : 'var(--border-primary)'}`,
              background: tab === t.key ? 'var(--green-ghost)' : 'transparent',
              color: tab === t.key ? 'var(--green-bright)' : 'var(--text-dim)',
              borderRadius: 'var(--radius-md)', cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <TerminalBox>
        {isLoading && !catalog ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Spinner size={28} />
          </div>
        ) : items.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '30px', fontSize: '12px' }}>
            Nothing here yet.
          </p>
        ) : tab === 'premium_pack' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
            {items.map((pack) => (
              <PremiumPackCard key={pack.id} pack={pack} onCheckout={startCheckout} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
            {items.map((item) => (
              <ShopItemCard
                key={item.id}
                item={{ ...item, _tierMet: tierMet(item) }}
                owned={item.owned}
                equipped={item.equipped}
                canAfford={tierMet(item) && (wallet.premiumCurrency >= item.premiumCost)}
                onBuy={buyItem}
                onEquip={handleEquip}
                onUnequip={handleUnequip}
              />
            ))}
          </div>
        )}
      </TerminalBox>

      {tab !== 'premium_pack' && (
        <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '14px', textAlign: 'center' }}>
          Need more tokens? <button onClick={() => setTab('premium_pack')} style={{ background: 'none', border: 'none', color: 'var(--green-bright)', cursor: 'pointer', fontSize: '10px', textDecoration: 'underline' }}>Buy tokens</button>
        </p>
      )}
    </AppShell>
  );
};

export default ShopPage;
