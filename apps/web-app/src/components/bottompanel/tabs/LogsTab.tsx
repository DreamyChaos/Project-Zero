import React from 'react';
import { Info, AlertTriangle, ShieldCheck } from 'lucide-react';

export const LogsTab: React.FC = () => {
  const logs = [
    { time: '23:38:01', level: 'info', message: 'Project Zero IDE Workspace Initialized [v1.0.0-m2]' },
    { time: '23:38:02', level: 'success', message: 'Deterministic Core Solver WebAssembly Module Linked Successfully' },
    { time: '23:38:03', level: 'info', message: 'Loaded Automaton: DFA_Even_Binary_Strings.pz (2 States, 4 Transitions)' },
    { time: '23:38:04', level: 'warning', message: 'Non-fatal: WebGL2 Extension WEBGL_debug_renderer_info unavailable. Falling back to 2D Canvas.' },
    { time: '23:38:05', level: 'success', message: 'IndexedDB State Serialized cleanly in 4.2ms' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-3 text-xs font-mono select-none space-y-1.5 bg-bg-base/60">
      {logs.map((l, idx) => (
        <div key={idx} className="flex items-center space-x-2 py-0.5 text-txt-secondary hover:text-txt-primary">
          <span className="text-txt-muted text-[11px] shrink-0">[{l.time}]</span>
          {l.level === 'info' && <Info size={12} className="text-semantic-info shrink-0" />}
          {l.level === 'success' && <ShieldCheck size={12} className="text-semantic-accept shrink-0" />}
          {l.level === 'warning' && <AlertTriangle size={12} className="text-semantic-warning shrink-0" />}
          <span className="truncate">{l.message}</span>
        </div>
      ))}
    </div>
  );
};
