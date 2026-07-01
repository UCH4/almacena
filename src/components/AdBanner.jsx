import { useState, useEffect } from 'react';

const BANNERS = [
  {
    id: 'donate',
    icon: '☕',
    title: '¿Te es útil AlacenaApp?',
    text: 'Ayudanos a mantenerla gratis con un cafecito',
    cta: 'Invitar un café',
    url: 'https://cafecito.app/alacenaapp',
    color: 'var(--accent)'
  },
  {
    id: 'share',
    icon: '📢',
    title: 'Compartí AlacenaApp',
    text: 'Ayudá a otros hogares a organizar sus gastos',
    cta: 'Compartir',
    color: 'var(--accent2)'
  },
  {
    id: 'review',
    icon: '⭐',
    title: 'Dejanos tu opinión',
    text: 'Tu feedback ayuda a mejorar la app',
    cta: 'Escribir reseña',
    url: '#',
    color: 'var(--green)'
  }
];

export default function AdBanner() {
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem('alacena_banner_dismissed') === 'true';
  });
  const [current, setCurrent] = useState(0);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (dismissed) return;
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % BANNERS.length);
    }, 15000);
    return () => clearInterval(timer);
  }, [dismissed]);

  if (dismissed) return null;

  const banner = BANNERS[current];

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('alacena_banner_dismissed', 'true');
  };

  const handleClick = async () => {
    if (banner.id === 'share') {
      try {
        await navigator.share?.({ title: 'AlacenaApp', text: 'Gestioná tu hogar con AlacenaApp', url: window.location.origin });
      } catch {
        try {
          await navigator.clipboard?.writeText(window.location.origin);
          setFeedback('✅ Link copiado al portapapeles');
        } catch {
          setFeedback('❌ No se pudo compartir. Copiá el link manualmente.');
        }
        setTimeout(() => setFeedback(''), 3000);
      }
    } else if (banner.url) {
      window.open(banner.url, '_blank');
    }
  };

  return (
    <div
      style={{
        background: 'var(--surface2)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '12px 16px',
        margin: '16px 0',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        cursor: banner.url || banner.id === 'share' ? 'pointer' : 'default',
        transition: 'all 0.3s',
        position: 'relative'
      }}
      onClick={handleClick}
    >
      <div style={{ fontSize: '28px', lineHeight: 1 }}>{banner.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '2px' }}>
          {banner.title}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text2)' }}>
          {banner.text}
        </div>
      </div>
      <button
        className="btn btn-xs"
        style={{
          background: banner.color,
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          padding: '6px 12px',
          fontSize: '11px',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          flexShrink: 0
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleClick();
        }}
      >
        {banner.cta}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDismiss();
        }}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text3)',
          fontSize: '18px',
          cursor: 'pointer',
          padding: '0 4px',
          lineHeight: 1,
          flexShrink: 0
        }}
        title="Cerrar"
      >
        ×
      </button>
      {feedback && (
        <div style={{
          position: 'absolute', bottom: '-24px', left: 0, right: 0,
          fontSize: '11px', color: 'var(--text2)', textAlign: 'center'
        }}>
          {feedback}
        </div>
      )}
    </div>
  );
}
