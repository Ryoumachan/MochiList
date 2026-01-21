import { X, Search, ExternalLink, Loader2 } from 'lucide-react';

interface SearchResult {
    title: string;
    url: string;
    snippet: string;
}

interface RangeSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    query: string;
    results: SearchResult[];
    isLoading: boolean;
    onSearch: (q: string) => void;
}

export function RangeSearchModal({ isOpen, onClose, query: initialQuery, results, isLoading, onSearch }: RangeSearchModalProps) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
        }} onClick={onClose}>
            <div style={{
                background: 'rgba(30, 41, 59, 0.95)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-lg)',
                width: '100%',
                maxWidth: '600px',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid var(--glass-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Search size={20} />
                        音域検索
                    </h2>
                    <button onClick={onClose} style={{ color: 'var(--text-secondary)' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ pading: '1rem', overflowY: 'auto' }}>
                    {isLoading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <Loader2 className="animate-spin" style={{ margin: '0 auto 1rem', display: 'block' }} />
                            検索中...
                        </div>
                    ) : results.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            見つかりませんでした。<br />
                            <button
                                onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(initialQuery)}`, '_blank')}
                                style={{ marginTop: '1rem', color: 'var(--primary-color)', textDecoration: 'underline' }}
                            >
                                Googleで検索してみる
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {results.map((r, i) => (
                                <div key={i} style={{
                                    padding: '1rem 1.5rem',
                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                }}>
                                    <a
                                        href={r.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            fontSize: '1rem',
                                            fontWeight: 'bold',
                                            color: 'var(--primary-color)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            marginBottom: '0.25rem',
                                            textDecoration: 'none'
                                        }}
                                    >
                                        {r.title}
                                        <ExternalLink size={14} />
                                    </a>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--success-color)', marginBottom: '0.25rem', wordBreak: 'break-all' }}>
                                        {r.url}
                                    </div>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                                        {r.snippet}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
