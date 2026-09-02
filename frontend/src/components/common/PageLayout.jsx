import React from 'react'

/**
 * Left-right SaaS layout: sticky 260px panel (stats/summary) + flex-1 content area.
 * Mobile: stacks vertically. Desktop: side by side.
 */
const PageLayout = ({ leftPanel, children }) => (
  <div className="flex flex-col lg:flex-row gap-6 items-start">
    {leftPanel ? (
      <aside className="w-full lg:w-[260px] xl:w-[280px] flex-shrink-0 lg:sticky lg:top-4 space-y-4">
        {leftPanel}
      </aside>
    ) : null}
    <div className="flex-1 min-w-0 space-y-5">
      {children}
    </div>
  </div>
)

export default PageLayout
