import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

export function AuthPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: window.location.origin,
                    }
                });
                if (error) throw error;
                setMessage({ type: 'success', text: '登録確認メールを送信しました。メール内のリンクをクリックしてください。' });
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
            <div className="glass-panel" style={{ padding: '2rem', width: '100%', maxWidth: '400px' }}>
                <h1 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                    {isSignUp ? 'アカウント作成' : 'ログイン'}
                </h1>

                {message && (
                    <div style={{
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: '1rem',
                        background: message.type === 'error' ? 'rgba(252, 165, 165, 0.2)' : 'rgba(74, 222, 128, 0.2)',
                        color: message.type === 'error' ? 'var(--error-color)' : 'var(--success-color)',
                        fontSize: '0.9rem'
                    }}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input
                        type="email"
                        placeholder="メールアドレス"
                        className="input-premium"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="パスワード"
                        className="input-premium"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                    />

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            background: 'var(--primary-color)',
                            color: 'white',
                            padding: '0.75rem',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: 600,
                            marginTop: '0.5rem',
                            display: 'flex', justifyContent: 'center'
                        }}
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : (isSignUp ? '登録' : 'ログイン')}
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {isSignUp ? 'すでにアカウントをお持ちですか？' : 'アカウントをお持ちでないですか？'}
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        style={{ color: 'var(--text-accent)', marginLeft: '0.5rem', textDecoration: 'underline' }}
                    >
                        {isSignUp ? 'ログイン' : '新規登録'}
                    </button>
                </div>
            </div>
            <style>{`
        .input-premium {
          width: 100%;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--glass-border);
          padding: 0.75rem;
          border-radius: var(--radius-sm);
          color: white;
          outline: none;
          font-size: 16px;
        }
        .input-premium:focus {
          border-color: var(--primary-color);
        }
      `}</style>
        </div>
    );
}
