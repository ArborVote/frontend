import { useEffect, useRef, useState } from 'react';
import { type WalletState } from '../wallet/useWallet';
import { AddressBadge } from './AddressBadge';

export function WalletMenu({ wallet }: { wallet: WalletState }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onEscape);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  if (wallet.account) {
    return (
      <div className="wallet" ref={menuRef}>
        <button type="button" className="wallet-button" onClick={() => setOpen((o) => !o)}>
          <AddressBadge address={wallet.account} />
        </button>
        {open && (
          <div className="wallet-menu" role="menu">
            <p className="wallet-menu-note">Connected with {wallet.walletName}</p>
            <button
              type="button"
              role="menuitem"
              className="wallet-menu-item"
              onClick={() => {
                wallet.disconnect();
                setOpen(false);
              }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="wallet" ref={menuRef}>
      <button type="button" className="wallet-button" onClick={() => setOpen((o) => !o)}>
        Connect wallet
      </button>
      {open && (
        <div className="wallet-menu" role="menu">
          {wallet.wallets.length === 0 ? (
            <p className="wallet-menu-note">
              No wallet extensions found. Install MetaMask or another browser wallet, then reload.
            </p>
          ) : (
            wallet.wallets.map((w) => (
              <button
                key={w.info.uuid}
                type="button"
                role="menuitem"
                className="wallet-menu-item"
                onClick={async () => {
                  await wallet.connect(w);
                  setOpen(false);
                }}
              >
                <img src={w.info.icon} alt="" className="wallet-icon" />
                {w.info.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
