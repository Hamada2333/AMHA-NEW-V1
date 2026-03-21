import React, { useState, useEffect, useRef } from 'react';
import THEME from '../../styles/theme';
import api from '../../api';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const ACCEPT = 'image/*,.pdf,.doc,.docx,.xls,.xlsx';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mimetype) {
  if (mimetype?.startsWith('image/')) return '🖼️';
  if (mimetype === 'application/pdf') return '📄';
  return '📎';
}

export const FileAttachment = ({ entityType, entityId }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  useEffect(() => {
    if (!entityId) return;
    api.get(`/attachments/${entityType}/${entityId}`)
      .then(setFiles)
      .catch(() => {});
  }, [entityType, entityId]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('Max file size is 10MB'); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result.split(',')[1];
      try {
        const res = await api.post('/attachments', {
          entityType, entityId,
          filename: file.name,
          mimetype: file.type,
          data: base64,
        });
        setFiles(p => [res, ...p]);
      } catch (err) { alert(err.message); }
      setUploading(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/attachments/${id}`);
      setFiles(p => p.filter(f => f.id !== id));
    } catch (err) { alert(err.message); }
  };

  return (
    <div style={{ marginTop: '20px', borderTop: `1px solid ${THEME.border}`, paddingTop: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: THEME.textMuted }}>Attachments</span>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading || !entityId}
          style={{ fontSize: '12px', color: THEME.accent, background: `${THEME.accent}15`, border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: entityId ? 'pointer' : 'not-allowed', fontWeight: 600 }}
        >
          {uploading ? 'Uploading...' : '+ Attach File'}
        </button>
        <input ref={inputRef} type="file" accept={ACCEPT} style={{ display: 'none' }} onChange={handleUpload} />
      </div>
      {!entityId && (
        <p style={{ fontSize: '12px', color: THEME.textDim }}>Save the record first to attach files.</p>
      )}
      {files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {files.map(f => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: THEME.surface, borderRadius: '8px', padding: '8px 10px' }}>
              <span style={{ fontSize: '16px' }}>{fileIcon(f.mimetype)}</span>
              <a
                href={`${API_BASE}/attachments/file/${f.id}`}
                target="_blank"
                rel="noreferrer"
                style={{ flex: 1, fontSize: '13px', color: THEME.text, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {f.filename}
              </a>
              <span style={{ fontSize: '11px', color: THEME.textDim, flexShrink: 0 }}>{formatSize(f.size)}</span>
              <button
                onClick={() => handleDelete(f.id)}
                style={{ background: 'none', border: 'none', color: THEME.danger, cursor: 'pointer', padding: '2px', fontSize: '14px', flexShrink: 0 }}
              >✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileAttachment;
