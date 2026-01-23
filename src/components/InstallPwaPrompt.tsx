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

        // To test on desktop, you can uncomment this:
        // setShowPrompt(true);

        if (isIOS && !isStandalone && !isDismissed) {
            setShowPrompt(true);
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
            bottom: '24px',
            left: '20px',
            right: '20px',
            zIndex: 2000,
            animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
            <style>{`
        @keyframes slideUp {
          from { transform: translateY(120%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
            <div className="glass-panel" style={{
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Decorative background element */}
                <div style={{
                    position: 'absolute',
                    top: '-50px',
                    right: '-50px',
                    width: '100px',
                    height: '100px',
                    background: 'var(--primary-color)',
                    filter: 'blur(60px)',
                    opacity: 0.2,
                    pointerEvents: 'none'
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>📱</span>
                        <div style={{ fontWeight: '800', fontSize: '1.1rem', letterSpacing: '0.02em', color: 'var(--text-accent)' }}>
                            ホーム画面に追加
                        </div>
                    </div>
                    <button
                        onClick={handleDismiss}
                        style={{
                            padding: '6px',
                            color: 'var(--text-secondary)',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                <p style={{ fontSize: '0.95rem', lineHeight: '1.5', color: 'var(--text-primary)', fontWeight: '500' }}>
                    モチリストはホーム画面に追加してこそ本領を発揮します。
                </p>

                <div style={{
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    fontSize: '0.9rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.8rem',
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '8px',
                            background: 'rgba(255,255,255,0.1)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Share size={18} color="#38bdf8" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <span style={{ color: 'var(--text-secondary)' }}>1. </span>
                            <strong>共有</strong> ボタンをタップ
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: '8px' }}>
                        <div style={{ height: '12px', width: '2px', background: 'rgba(255,255,255,0.1)' }} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '8px',
                            background: 'rgba(255,255,255,0.1)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center'
                        }}>
                            <SquarePlus size={18} color="#38bdf8" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <span style={{ color: 'var(--text-secondary)' }}>2. </span>
                            <strong>ホーム画面に追加</strong> を選択
                        </div>
                    </div>
                </div>

                <div style={{
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    marginTop: '0.2rem',
                    fontStyle: 'italic'
                }}>
                    手順: 共有 <Share size={10} style={{ verticalAlign: 'middle' }} /> ➜ ホーム画面に追加 <SquarePlus size={10} style={{ verticalAlign: 'middle' }} />
                </div>
            </div>
        </div>
    );
};
