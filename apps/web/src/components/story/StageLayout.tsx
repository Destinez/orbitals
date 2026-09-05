import type { ReactNode } from 'react';

/**
 * Stage zoning.
 *
 * The first build had both the copy and the art on `inset-0`, which meant
 * the plot drew straight through the paragraphs — badly on desktop, and
 * unreadably on mobile once a trace was fully plotted. Zones fix that
 * structurally instead of by fiddling with opacity.
 *
 *   split           desktop: copy left, art in the right 56%
 *                   mobile:  art in the top 42%, copy in the bottom 58%
 *   stacked-center  copy centred in the upper half, art in the lower
 *   document        no absolute positioning; a normal vertical stack
 *
 * On mobile every variant separates the two along the vertical axis. There
 * is not enough width to put anything beside anything else, and layering
 * text over a dense additive plot is not legible at any opacity.
 */

export type LayoutKind = 'split' | 'stacked-center' | 'document';

interface Props {
  layout: LayoutKind;
  copySide?: 'left' | 'right';
  art?: ReactNode;
  copy: ReactNode;
  /** rendered above everything in the stage, e.g. the ratio readout */
  overlay?: ReactNode;
}

export default function StageLayout({ layout, copySide = 'left', art, copy, overlay }: Props) {
  if (layout === 'document') {
    return (
      <div className="absolute inset-0 z-20 flex flex-col overflow-hidden pb-16 sm:pb-20 lg:pb-0">
        {copy}
        {art}
        {overlay}
      </div>
    );
  }

  if (layout === 'stacked-center') {
    return (
      <div className="absolute inset-0">
        {/* copy: upper portion, centred */}
        <div className="absolute inset-x-0 top-0 z-20 flex h-[58%] items-center justify-center px-6 sm:px-12">
          {copy}
        </div>
        {/* art: lower portion, clear of the text and of the HUD bars */}
        {art ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[42%] pb-14 sm:pb-16 lg:pb-0"
          >
            {art}
          </div>
        ) : null}
        {overlay}
      </div>
    );
  }

  // split
  return (
    <div className="absolute inset-0">
      {/* art */}
      {art ? (
        <div
          aria-hidden="true"
          className={copySide === 'right' ? 'pointer-events-none absolute left-0 top-0 h-[42%] w-full lg:inset-y-0 lg:h-full lg:w-[56%]' : 'pointer-events-none absolute right-0 top-0 h-[42%] w-full lg:inset-y-0 lg:h-full lg:w-[56%]'}
        >
          {art}
        </div>
      ) : null}

      {/*
        copy — bottom padding clears the fixed readout and transmission
        control, which are both pinned to the bottom corners on mobile and
        were cropping the measurement row.
      */}
      <div className={copySide === 'right' ? 'absolute right-0 bottom-0 z-20 flex h-[58%] w-full items-center px-6 pb-16 sm:px-10 sm:pb-20 lg:inset-y-0 lg:h-full lg:w-[50%] lg:px-12 lg:pb-0 xl:pr-20' : 'absolute left-0 bottom-0 z-20 flex h-[58%] w-full items-center px-6 pb-16 sm:px-10 sm:pb-20 lg:inset-y-0 lg:h-full lg:w-[50%] lg:px-12 lg:pb-0 xl:pl-20'}>
        {copy}
      </div>

      {/* scrim: mobile only, under the copy zone, so the art can never
          bleed into the text block */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[15] h-[62%] bg-gradient-to-t from-[#04050a] via-[#04050a]/92 to-transparent lg:hidden"
      />

      {overlay}
    </div>
  );
}
