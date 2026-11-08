import React, { useState } from 'react';
import { db, GoalRecord, getLocalDateKey } from '../db/db';
import { X, Check, Target } from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface GoalModalProps {
  shortTermGoal: GoalRecord | undefined;
  longTermGoal: GoalRecord | undefined;
  onClose: () => void;
}

export const GoalModal: React.FC<GoalModalProps> = ({
  shortTermGoal,
  longTermGoal,
  onClose,
}) => {
  const [stTitle, setStTitle] = useState(shortTermGoal?.title || 'Ship Core Industrial Prototype');
  const [stDate, setStDate] = useState(
    shortTermGoal?.targetDate ||
      getLocalDateKey(new Date(Date.now() + 14 * 86400000))
  );

  const [ltTitle, setLtTitle] = useState(longTermGoal?.title || 'Publish Production Hardware Telemetry Suite');
  const [ltDate, setLtDate] = useState(
    longTermGoal?.targetDate ||
      getLocalDateKey(new Date(Date.now() + 90 * 86400000))
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    soundEngine.playKeyClick();

    await db.goals.bulkPut([
      {
        id: 'short_term',
        title: stTitle.trim() || 'Short-Term Milestone',
        targetDate: stDate,
        updatedAt: Date.now(),
      },
      {
        id: 'long_term',
        title: ltTitle.trim() || 'Long-Term Vision',
        targetDate: ltDate,
        updatedAt: Date.now(),
      },
    ]);

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-none p-4">
      <div className="w-full max-w-xl bg-panel border-2 border-text-ink shadow-2xl p-6 text-text-ink relative">
        {/* Monospace Stamped Header */}
        <div className="flex items-center justify-between border-plate-b pb-3 mb-5">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-braun-orange" />
            <span className="font-mono text-xs font-bold tracking-widest uppercase">
              SPECIFICATION // STRATEGIC GOALS CALIBRATION
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-text-dim hover:text-text-ink p-1 font-mono text-xs"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Short Term Goal Box */}
          <div className="bg-canvas border-plate p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold text-braun-orange uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 bg-braun-orange"></span>
                SHORT-TERM MILESTONE (14D - 30D FOCUS)
              </span>
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-text-dim mb-1">
                Objective Title
              </label>
              <input
                type="text"
                value={stTitle}
                onChange={(e) => setStTitle(e.target.value)}
                className="w-full bg-panel border border-grid-line px-3 py-1.5 text-sm font-sans focus:outline-none focus:border-text-ink"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-text-dim mb-1">
                Target Date
              </label>
              <input
                type="date"
                value={stDate}
                onChange={(e) => setStDate(e.target.value)}
                className="bg-panel border border-grid-line px-3 py-1 font-mono text-xs text-text-ink focus:outline-none focus:border-text-ink"
                required
              />
            </div>
          </div>

          {/* Long Term Goal Box */}
          <div className="bg-canvas border-plate p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 bg-text-primary"></span>
                LONG-TERM DIRECTION (90D HORIZON)
              </span>
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-text-dim mb-1">
                Objective Title
              </label>
              <input
                type="text"
                value={ltTitle}
                onChange={(e) => setLtTitle(e.target.value)}
                className="w-full bg-panel border border-grid-line px-3 py-1.5 text-sm font-sans focus:outline-none focus:border-text-ink"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-text-dim mb-1">
                Target Date
              </label>
              <input
                type="date"
                value={ltDate}
                onChange={(e) => setLtDate(e.target.value)}
                className="bg-panel border border-grid-line px-3 py-1 font-mono text-xs text-text-ink focus:outline-none focus:border-text-ink"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-plate-t">
            <button
              type="button"
              onClick={onClose}
              className="btn-mechanical px-4 py-2 text-xs"
            >
              DISCARD
            </button>
            <button
              type="submit"
              className="btn-mechanical-orange px-5 py-2 text-xs flex items-center gap-2 font-bold"
            >
              <Check size={14} />
              <span>COMMIT SPECIFICATION</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
