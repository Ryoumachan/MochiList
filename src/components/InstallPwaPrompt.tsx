import React, { useState, useEffect } from 'react';
import { X, Share, SquarePlus } from 'lucide-react';

export const InstallPwaPrompt: React.FC = () => {
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        // Check if it's iOS
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

        // Check if it's already in standalone mode
        const isStandalone = (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;

        // Check if user has dismissed it before
        const isDismissed = localStorage.getItem('pwaPromptDismissed') === 'true';

        // If iOS and in browser and not dismissed, show after short delay
        if (isIOS && !isStandalone && !isDismissed) {
            const timer = setTimeout(() => setShowPrompt(true), 2000);
            return () => clearTimeout(timer);
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
            zIndex: 1000,
            animation: 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            pointerEvents: 'none' // Allow background interaction outside the panel
        }}>
            <style>{`
        @keyframes slideUp {
          from { transform: translateY(120%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

            <div className="glass-panel" style={{
                padding: '1rem',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.8rem',
                maxWidth: '400px',
                margin: '0 auto',
                pointerEvents: 'auto' // Re-enable interaction for the panel itself
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.1rem' }}>💡</span>
                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-accent)' }}>
                            ホーム画面に追加でもっと快適に
                        </div>
                    </div>
                    <button
                        onClick={handleDismiss}
                        style={{
                            color: 'var(--text-secondary)',
                            padding: '4px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', margin: 0, lineHeight: '1.4' }}>
                    ブラウザのままでもご利用いただけますが、ホーム画面に追加すると全画面でより使いやすくなります。
                </p>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    background: 'rgba(0,0,0,0.2)',
                    padding: '8px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Share size={14} color="#38bdf8" /> <span>共有</span>
                    </div>
                    <span style={{ opacity: 0.3 }}>➜</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <SquarePlus size={14} color="#38bdf8" /> <span>ホーム画面に追加</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
