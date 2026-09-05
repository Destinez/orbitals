import { useStory } from '../../store/story';
import { STATION } from '../../content/chapters';

/**
 * Instrument frame: hairline corner brackets and the top readouts.
 *
 * Also monochrome. Together with StationHUD this is the only persistent
 * chrome, and it is what makes a full-bleed WebGL sky read as *something
 * seen through an instrument* rather than a desktop wallpaper.
 */
export default function FrameChrome() {
  const booted = useStory((s) => s.booted);

  return (
    <div
      aria-hidden="true"
      data-booted={booted}
      className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-1000 data-[booted=false]:opacity-0"
    >
      {/* corner brackets */}
      <Bracket className="left-3 top-3 border-l border-t sm:left-5 sm:top-5" />
      <Bracket className="right-3 top-3 border-r border-t sm:right-5 sm:top-5" />
      <Bracket className="bottom-3 left-3 border-b border-l sm:bottom-5 sm:left-5" />
      <Bracket className="bottom-3 right-3 border-b border-r sm:bottom-5 sm:right-5" />

      {/* top-left: sector */}
      <div className="log absolute left-3 top-3 hidden text-white/45 sm:left-5 sm:top-5 sm:block">
        <span className="ml-4">{STATION.sector}</span>
      </div>

      {/* top-right: commission + a fixed bearing readout */}
      <div className="log absolute right-3 top-3 hidden text-right text-white/45 sm:right-5 sm:top-5 sm:block">
        <div className="mr-4">
          COMMISSIONED {STATION.commissioned}
        </div>
        <div className="mr-4 mt-1 text-white/25">
          AZ 214.7 <span className="text-white/15">/</span> EL −06.2
        </div>
      </div>

      {/* bottom-right: scroll affordance, fades once the log is running */}
      <div
        data-booted={booted}
        className="log absolute bottom-3 right-3 hidden text-right text-white/30 sm:bottom-5 sm:right-5 sm:block"
      >
        <a href="#tasks" className="mr-4 pointer-events-auto transition-colors hover:text-white/70 focus-visible:text-white/70">
          TASKS
        </a>
        <span>CONTINUOUS FEED ↓</span>
      </div>
    </div>
  );
}

function Bracket({ className }: { className: string }) {
  return (
    <span
      className={`absolute size-8 border-white/20 sm:size-12 ${className}`}
    />
  );
}
