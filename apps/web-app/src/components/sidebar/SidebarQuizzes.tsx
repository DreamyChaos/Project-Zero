import React from 'react';
import { GraduationCap, Award, PlayCircle } from 'lucide-react';

export const SidebarQuizzes: React.FC = () => {
  const quizzes = [
    { id: 'q1', title: 'Quiz 2.1: Construct DFA for (0+1)*00', score: '100%', attempts: 1 },
    { id: 'q2', title: 'Quiz 2.2: Identify Non-Determinism', score: 'Pending', attempts: 0 },
    { id: 'q3', title: 'Quiz 2.3: Convert NFA to Minimal DFA', score: 'Pending', attempts: 0 },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
      <span className="font-mono text-[10px] uppercase text-txt-muted tracking-wider block mb-2">
        Active Interactive Challenges
      </span>

      {quizzes.map((quiz) => (
        <div
          key={quiz.id}
          className="bg-bg-surface2 p-3 rounded-lg border border-border-subtle space-y-2 hover:border-border-strong transition-all"
        >
          <div className="flex items-start justify-between">
            <span className="font-medium text-txt-primary">{quiz.title}</span>
            <GraduationCap size={15} className="text-accent-primary shrink-0 mt-0.5" />
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-txt-muted">Score: {quiz.score}</span>
            <button className="flex items-center space-x-1 px-2 py-0.5 bg-accent-primary text-white rounded text-[11px] font-medium hover:bg-accent-hover transition-colors">
              <PlayCircle size={12} />
              <span>Start</span>
            </button>
          </div>
        </div>
      ))}

      <div className="pt-2">
        <div className="bg-bg-surface2 p-3 rounded-lg border border-border-subtle flex items-center space-x-2 text-txt-muted">
          <Award size={16} className="text-semantic-warning shrink-0" />
          <span className="text-[11px]">Complete all 3 quizzes to unlock Module 3 Canvas verification.</span>
        </div>
      </div>
    </div>
  );
};
