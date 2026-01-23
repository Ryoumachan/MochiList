import React, { useState, useEffect } from 'react';

// Using minimal icons to ensure no crashes
const XIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

const ShareIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
);

const PlusIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
);

export const InstallPwaPrompt: React.FC = () => {
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        try {
            // Check if it's iOS
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

            // Check if it's already in standalone mode
            const isStandalone = (window.navigator as any).standalone === true ||
                (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);

            // Check if user has dismissed it before
            const isDismissed = localStorage.getItem('pwaPromptDismissed') === 'true';

            if (isIOS && !isStandalone && !isDismissed) {
                const timer = setTimeout(() => setShowPrompt(true), 2000);
                return () => clearTimeout(timer);
            }
        } catch (e) {
            console.error('PWA prompt check failed', e);
        }
    }, []);

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('pwaPromptDismissed', 'true');
    };

    if (!showPrompt) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '16px',
            left: '16px',
            right: '16px',
            zIndex: 10000, // Very high to ensure visibility but not interfering
            pointerEvents: 'none',
            display: 'flex',
            justifyContent: 'center'
        }}>
            <div className="glass-panel" style={{
                padding: '0.75rem 1rem',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                maxWidth: '320px',
                width: '100%',
                pointerEvents: 'auto',
                animation: 'slideUpPrompt 0.5s ease-out'
            }}>
                <style>{`
          @keyframes slideUpPrompt {
            from { transform: translateY(100px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1rem' }}>💡</span>
                        <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-accent)' }}>
                            ホーム画面に追加
                        </div>
                    </div>
                    <button
                        onClick={handleDismiss}
                        style={{
                            color: 'var(--text-secondary)',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(255,255,255,0.1)',
                            borderRadius: '50%'
                        }}
                    >
                        <XIcon />
                    </button>
                </div>

                <p style={{ fontSize: '0.75rem', color: 'var(--text-primary)', margin: 0, lineHeight: '1.4' }}>
                    Safariのメニューから追加すると快適に使えます。
                </p>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: 'rgba(0,0,0,0.3)',
                    padding: '6px',
                    borderRadius: '8px',
                    fontSize: '0.7rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ShareIcon /> <span>共有</span>
                    </div>
                    <span style={{ opacity: 0.3 }}>➜</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <PlusIcon /> <span>ホーム画面に追加</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
