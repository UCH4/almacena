import React, { useState } from 'react';

const EMOJIS = [
  '🧑', '👨', '👩', '🧔', '👱‍♀️', '👱‍♂️',
  '👨‍🦰', '👩‍🦰', '👨‍🦱', '👩‍🦱', '👨‍🦳', '👩‍🦳',
  '👦', '👧', '🧒', '👶', '🧑‍🦳',
  '😀', '😎', '🤩', '😇', '🧐', '🤓',
  '🦊', '🐼', '🐨', '🦁', '🐯', '🐸',
  '🐵', '🦄', '🐶', '🐱', '🐰', '🐻',
  '👑', '🦸', '🧙', '🧚'
];

export default function ProfileSetup({ user, onSave, onLogout }) {
  const [nickname, setNickname] = useState(user?.displayName || user?.nickname || '');
  const [emoji, setEmoji] = useState(user?.emoji || '🧑');
  const [birthDate, setBirthDate] = useState(user?.birthDate || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!nickname.trim()) return;
    setSaving(true);
    try {
      await onSave(nickname.trim(), emoji, birthDate);
    } catch (e) {
      // handled by App
    }
    setSaving(false);
  };

  return (
    <div className="app-container" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ maxWidth: '400px', width: '100%', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '8px' }}>🏡</div>
        <h1 style={{ fontSize: '22px', marginBottom: '4px' }}>Bienvenido a Alacena</h1>
        <p style={{ color: 'var(--text2)', fontSize: '14px', marginBottom: '24px' }}>
          Elegí cómo querés aparecer en la app
        </p>

        {/* Avatar preview */}
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          background: 'var(--surface2)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '40px', margin: '0 auto 20px',
          border: '3px solid var(--accent)'
        }}>
          {emoji}
        </div>

        {/* Nickname input */}
        <label style={{ display: 'block', textAlign: 'left', fontSize: '12px', color: 'var(--text3)', marginBottom: '6px' }}>
          Apodo
        </label>
        <input
          className="form-input"
          style={{ fontSize: '16px', padding: '10px 12px', marginBottom: '20px', textAlign: 'center', fontWeight: 600 }}
          placeholder="Tu apodo"
          maxLength={20}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          autoFocus
        />

        {/* Date of birth */}
        <label style={{ display: 'block', textAlign: 'left', fontSize: '12px', color: 'var(--text3)', marginBottom: '6px' }}>
          Fecha de nacimiento
        </label>
        <input
          type="date"
          className="form-input"
          style={{ fontSize: '14px', padding: '10px 12px', marginBottom: '20px', textAlign: 'center' }}
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          max={new Date().toISOString().split('T')[0]}
        />

        {/* Emoji grid */}
        <label style={{ display: 'block', textAlign: 'left', fontSize: '12px', color: 'var(--text3)', marginBottom: '6px' }}>
          Elegí un emoji que te represente
        </label>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px',
          marginBottom: '24px'
        }}>
          {EMOJIS.map((e) => (
            <button
              key={e}
              style={{
                fontSize: '24px', padding: '6px', borderRadius: '10px',
                border: e === emoji ? '2px solid var(--accent)' : '2px solid transparent',
                background: e === emoji ? 'var(--accent-bg)' : 'var(--surface2)',
                cursor: 'pointer', transition: 'all 0.15s',
                lineHeight: '1'
              }}
              onClick={() => setEmoji(e)}
            >
              {e}
            </button>
          ))}
        </div>

        <button
          className="btn btn-primary"
          style={{ width: '100%', fontSize: '16px', padding: '12px' }}
          onClick={handleSave}
          disabled={!nickname.trim() || saving}
        >
          {saving ? 'Guardando...' : 'Guardar y empezar'}
        </button>

        <div style={{ marginTop: '16px' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onLogout}
            style={{ color: 'var(--text3)', fontSize: '12px' }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
