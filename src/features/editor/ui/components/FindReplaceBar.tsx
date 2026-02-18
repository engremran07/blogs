/**
 * ============================================================================
 * COMPONENT: FindReplaceBar
 * PURPOSE:   Find & Replace bar shown below the toolbar.
 *            Owns its own form state (findText, replaceText, findCount).
 * ============================================================================
 */

'use client';

import { useState } from 'react';
import { FindReplaceIcon, ReplaceIcon, CloseIcon } from '../editor.icons';

interface FindReplaceBarProps {
  onFindReplace: (action: 'find' | 'replace' | 'replaceAll', findText: string, replaceText: string) => number;
  onClose: () => void;
}

export default function FindReplaceBar({ onFindReplace, onClose }: FindReplaceBarProps) {
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [findCount, setFindCount] = useState(0);

  const handleAction = (action: 'find' | 'replace' | 'replaceAll') => {
    const count = onFindReplace(action, findText, replaceText);
    if (action === 'find') setFindCount(count);
    if (action === 'replaceAll') setFindCount(0);
  };

  return (
    <div className="find-replace-bar" role="search" aria-label="Find and replace">
      <div className="find-replace-inputs">
        <div className="find-replace-row">
          <FindReplaceIcon size={14} className="find-replace-icon" />
          <input
            type="text"
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
            placeholder="Find..."
            className="find-replace-input"
            aria-label="Find text"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleAction('find'); }}
          />
          {findCount > 0 && <span className="find-count">{findCount} found</span>}
          <button type="button" onClick={() => handleAction('find')} className="find-replace-btn" title="Find Next">Find</button>
        </div>
        <div className="find-replace-row">
          <ReplaceIcon size={14} className="find-replace-icon" />
          <input
            type="text"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            placeholder="Replace with..."
            className="find-replace-input"
            aria-label="Replace text"
            onKeyDown={(e) => { if (e.key === 'Enter') handleAction('replace'); }}
          />
          <button type="button" onClick={() => handleAction('replace')} className="find-replace-btn" title="Replace">Replace</button>
          <button type="button" onClick={() => handleAction('replaceAll')} className="find-replace-btn" title="Replace All">All</button>
        </div>
      </div>
      <button type="button" onClick={onClose} className="find-replace-close" title="Close" aria-label="Close find and replace"><CloseIcon size={16} /></button>
    </div>
  );
}
