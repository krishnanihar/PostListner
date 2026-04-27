'use client';

import { useStore } from '@/lib/store';
import { TopBar } from '@/components/TopBar';
import { Controls } from '@/components/Controls';
import { NotesDrawer } from '@/components/NotesDrawer';
import { Threshold } from '@/components/phases/Threshold';
import { Pairwise } from '@/components/phases/Pairwise';
import { Gems } from '@/components/phases/Gems';
import { ThreeSongs } from '@/components/phases/ThreeSongs';
import { Moment } from '@/components/phases/Moment';
import { Reflection } from '@/components/phases/Reflection';
import { Mirror } from '@/components/phases/Mirror';
import { Wait } from '@/components/phases/Wait';
import { Reveal } from '@/components/phases/Reveal';
import { Listening } from '@/components/phases/Listening';
import { Silence } from '@/components/phases/Silence';

const PHASE_COMPONENTS = [
  Threshold,    // 0  · i.    threshold
  Pairwise,     // 1  · ii.   spectrum
  Gems,         // 2  · iii.  emotion
  ThreeSongs,   // 3  · iv.   carry
  Moment,       // 4  · v.    moment
  Reflection,   // 5  · vi.   reflection
  Mirror,       // 6  · vii.  mirror
  Wait,         // 7  · viii. composing
  Reveal,       // 8  · ix.   recognition
  Listening,    // 9  · x.    orchestra
  Silence,      // 10 · xi.   silence
];

export default function Page() {
  const phase = useStore((s) => s.phase);
  const Phase = PHASE_COMPONENTS[phase] ?? Threshold;

  return (
    <>
      <TopBar />
      <main className="shell">
        <div className="page" key={phase}>
          <div className="scene-fade-enter" style={{ position: 'absolute', inset: 0 }}>
            <Phase />
          </div>
        </div>
      </main>
      <Controls />
      <NotesDrawer />
    </>
  );
}
