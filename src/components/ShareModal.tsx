'use client';

import { useEffect, useRef, useState } from 'react';
import type { RepSynthesis } from '@/lib/types';

interface Props {
  repName: string;
  synthesis: RepSynthesis;
  onClose: () => void;
}

export default function ShareModal({ repName, synthesis, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const message = `Hi ${repName},

Quick note ahead of your calls this week.

You're doing well: ${synthesis.doing_well}

One thing to work on: ${synthesis.focus_on}

This week, try: ${synthesis.this_week}

Good luck out there — you've got this.

— Elizna`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard API
      if (textAreaRef.current) {
        textAreaRef.current.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  }

  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-gray-200 rounded-xl p-6 w-full max-w-lg shadow-xl">
        <h2 className="text-gray-900 font-semibold text-lg mb-4">
          Message for {repName}
        </h2>

        <textarea
          ref={textAreaRef}
          readOnly
          value={message}
          rows={14}
          className="w-full bg-gray-50 text-gray-700 text-sm rounded-md p-4 border border-gray-200 resize-none focus:outline-none font-mono leading-relaxed"
        />

        <div className="flex gap-3 mt-4">
          <button
            onClick={() => void handleCopy()}
            className="flex-1 bg-amber-500 text-white font-medium text-sm py-2 rounded-md hover:bg-amber-600 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-md hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
