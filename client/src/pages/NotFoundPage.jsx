import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '24px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '380px' }}>
        <p style={{
          fontFamily:   'var(--font-display)', fontSize: '6rem', fontWeight: 900,
          color:        'var(--green-dim)', letterSpacing: '0.1em', lineHeight: 1,
          marginBottom: '8px',
        }}>
          404
        </p>
        <p style={{
          fontFamily:   'var(--font-display)', fontSize: '10px',
          color:        'var(--text-dim)', letterSpacing: '0.2em',
          textTransform:'uppercase', marginBottom: '20px',
        }}>
          SYS://PATH_NOT_FOUND
        </p>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '28px' }}>
          The terminal you're looking for doesn't exist or has been moved.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding:      '10px 20px', background: 'transparent',
              border:       '1px solid var(--border-primary)', color: 'var(--text-dim)',
              borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-display)',
              fontSize:     '12px', letterSpacing: '0.05em', cursor: 'pointer',
            }}
          >
            ← Go back
          </button>
          <Link
            to="/"
            style={{
              padding:        '10px 20px', background: 'var(--green-bright)',
              color:          'var(--text-inverse)', borderRadius: 'var(--radius-md)',
              fontFamily:     'var(--font-display)', fontSize: '12px',
              letterSpacing:  '0.05em', textDecoration: 'none',
            }}
          >
            Home terminal
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
