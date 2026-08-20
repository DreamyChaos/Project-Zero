import React from 'react';
import { BookOpen, CheckCircle, Clock } from 'lucide-react';

export const SidebarSyllabus: React.FC = () => {
  const topics = [
    { id: 't1', title: '2.1 Deterministic Finite Automata', status: 'completed', duration: '15 mins' },
    { id: 't2', title: '2.2 Non-Deterministic Automata', status: 'in-progress', duration: '20 mins' },
    { id: 't3', title: '2.3 Subset Construction Algorithm', status: 'locked', duration: '25 mins' },
    { id: 't4', title: '2.4 Hopcroft Minimization Engine', status: 'locked', duration: '30 mins' },
    { id: 't5', title: '2.5 Pumping Lemma Verification', status: 'locked', duration: '40 mins' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
      <div>
        <span className="font-mono text-[10px] uppercase text-txt-muted tracking-wider block mb-2">
          Module 2: Models of Computation
        </span>

        <div className="space-y-1.5">
          {topics.map((topic) => (
            <div
              key={topic.id}
              className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                topic.status === 'in-progress'
                  ? 'bg-accent-primary/10 border-accent-primary/40 text-txt-primary'
                  : 'bg-bg-surface2/60 border-border-subtle hover:bg-bg-surface2 text-txt-secondary'
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="font-medium">{topic.title}</span>
                {topic.status === 'completed' && (
                  <CheckCircle size={14} className="text-semantic-accept shrink-0 mt-0.5" />
                )}
                {topic.status === 'in-progress' && (
                  <Clock size={14} className="text-accent-primary shrink-0 mt-0.5" />
                )}
              </div>
              <div className="mt-1 text-[10px] text-txt-muted flex items-center space-x-2">
                <BookOpen size={11} />
                <span>{topic.duration}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
