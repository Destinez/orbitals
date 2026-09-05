import { CHAPTERS } from '../../content/chapters';
import { useStory } from '../../store/story';

/**
 * Record index — right edge.
 *
 * Doubles as the accessible navigation for the report: real anchors, so
 * keyboard users can jump between records and the browser handles the
 * scroll. Labels are hidden until hover or focus so it stays a quiet
 * row of ticks at rest.
 */
export default function RecordIndex() {
  const activeId = useStory((s) => s.activeId);
  const booted = useStory((s) => s.booted);

  return (
    <nav
      aria-label="Report records"
      data-booted={booted}
      className="fixed right-0 top-1/2 z-40 hidden -translate-y-1/2 pr-3 transition-opacity duration-700 data-[booted=false]:opacity-0 sm:pr-5 lg:block"
    >
      <ul className="flex flex-col items-end gap-2.5">
        {CHAPTERS.filter((c) => c.rec).map((c) => {
          const isActive = c.id === activeId;
          return (
            <li key={c.id}>
              <a
                href={`#${c.id}`}
                aria-current={isActive ? 'true' : undefined}
                className="group flex items-center justify-end gap-2 py-0.5"
              >
                <span className="log whitespace-nowrap text-[0.5625rem] text-white/0 transition-colors duration-200 group-hover:text-white/60 group-focus-visible:text-white/60">
                  {c.title}
                </span>
                <span
                  data-active={isActive}
                  className="h-px w-3 bg-white/25 transition-all duration-300 group-hover:w-5 group-hover:bg-white/60 data-[active=true]:w-6 data-[active=true]:bg-white"
                />
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
