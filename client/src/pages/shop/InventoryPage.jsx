import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import { TerminalBox, Spinner, TerminalButton } from '../../components/ui/Terminal.jsx';
import WalletDisplay from '../../components/ui/WalletDisplay.jsx';
import useShopStore from '../../store/shopStore.js';

const SLOT_LABELS = {
  terminal_theme: 'Terminal Theme',
  avatar_frame:   'Avatar Frame',
  banner:         'Player Banner',
};

const InventoryPage = () => {
  const {
    inventory, equipped, wallet, purchases, isLoading,
    fetchInventory, fetchPurchaseHistory, equipItem, unequipItem,
  } = useShopStore();

  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  useEffect(() => {
    if (showHistory) fetchPurchaseHistory();
  }, [showHistory, fetchPurchaseHistory]);

  const grouped = inventory.reduce((acc, item) => {
    const key = item.type || 'other';
    (acc[key] ??= []).push(item);
    return acc;
  }, {});

  return (
    <AppShell>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <p style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', marginBottom: '4px' }}>
            SYS://INVENTORY
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Inventory</h1>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <WalletDisplay wallet={wallet} size="lg" />
          <Link to="/shop" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            ← Back to shop
          </Link>
        </div>
      </div>

      <TerminalBox title="Equipped" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
          {Object.entries(SLOT_LABELS).map(([slot, label]) => (
            <div key={slot} style={{
              padding: '12px', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-md)',
            }}>
              <p style={{ fontSize: '9px', color: 'var(--text-dim)', fontFamily: 'var(--font-display)', letterSpacing: '0.05em', marginBottom: '6px' }}>
                {label.toUpperCase()}
              </p>
              {equipped[slot] ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--green-bright)' }}>{equipped[slot]}</span>
                  <button
                    onClick={() => unequipItem(slot)}
                    style={{ background: 'none', border: 'none', color: 'var(--red-dim)', fontSize: '11px', cursor: 'pointer' }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Empty</span>
              )}
            </div>
          ))}
        </div>
      </TerminalBox>

      <TerminalBox title="Owned items">
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '30px' }}>
            <Spinner size={24} />
          </div>
        ) : inventory.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '24px', fontSize: '12px' }}>
            No items yet. <Link to="/shop" style={{ color: 'var(--green-bright)' }}>Visit the shop</Link>
          </p>
        ) : (
          Object.entries(grouped).map(([type, items]) => (
            <div key={type} style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-display)', letterSpacing: '0.05em', marginBottom: '10px' }}>
                {(SLOT_LABELS[type] || type).toUpperCase()}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {items.map((item) => (
                  <div key={item.itemId} style={{
                    padding: '12px', border: `1px solid ${item.equipped ? 'var(--green-bright)' : 'var(--border-dim)'}`,
                    borderRadius: 'var(--radius-md)', background: item.equipped ? 'var(--green-ghost)' : 'transparent',
                  }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-primary)', marginBottom: '8px' }}>{item.name}</p>
                    {item.slot && (
                      item.equipped ? (
                        <span style={{ fontSize: '10px', color: 'var(--green-bright)' }}>Equipped</span>
                      ) : (
                        <button
                          onClick={() => equipItem(item.itemId, item.slot)}
                          style={{
                            fontSize: '10px', color: 'var(--green-bright)', background: 'none',
                            border: '1px solid var(--green-mid)', borderRadius: 'var(--radius-sm)',
                            padding: '4px 10px', cursor: 'pointer',
                          }}
                        >
                          Equip
                        </button>
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </TerminalBox>

      <div style={{ marginTop: '20px' }}>
        <TerminalButton variant="ghost" size="sm" onClick={() => setShowHistory((s) => !s)}>
          {showHistory ? 'Hide' : 'Show'} purchase history
        </TerminalButton>

        {showHistory && (
          <TerminalBox style={{ marginTop: '10px' }}>
            {purchases.length === 0 ? (
              <p style={{ fontSize: '11px', color: 'var(--text-dim)', textAlign: 'center', padding: '16px' }}>
                No purchases yet.
              </p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
                    <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-dim)' }}>Item</th>
                    <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-dim)' }}>Method</th>
                    <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-dim)' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p) => (
                    <tr key={p._id} style={{ borderBottom: '1px solid var(--border-dim)' }}>
                      <td style={{ padding: '8px', color: 'var(--text-primary)' }}>{p.itemName}</td>
                      <td style={{ padding: '8px', color: 'var(--text-dim)', textTransform: 'capitalize' }}>
                        {p.paymentMethod.replace('_', ' ')}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', color: 'var(--text-muted)' }}>
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </TerminalBox>
        )}
      </div>
    </AppShell>
  );
};

export default InventoryPage;
