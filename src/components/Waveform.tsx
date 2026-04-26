import { wfHeight } from '@/lib/waveform';
import type { WaveShape } from '@/types';

const BAR_COUNT = 36;

export function Waveform({ shape }: { shape: WaveShape }) {
  return (
    <div className="waveform">
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <div
          key={i}
          className="bar"
          style={{ height: `${wfHeight(shape, i, BAR_COUNT)}%` }}
        />
      ))}
    </div>
  );
}
