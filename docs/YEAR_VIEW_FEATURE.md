# Year View Feature Documentation

## Overview
The roadmap application supports four different time scales for viewing projects:
- **Quartale** (Quarters) - Shows 4 quarters of the current year
- **Monate** (Months) - Shows all 12 months of the current year  
- **Wochen** (Weeks) - Shows all ISO calendar weeks (52/53) of the current year
- **Jahre** (Years) - Shows a 5-year timeline spanning from currentYear-2 to currentYear+2

## Implementation

### UI Components

The view switcher buttons are located in `components/Roadmap.tsx` (lines 647-670):

```typescript
<button
  className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition md:flex-none ${viewType === 'years' ? 'bg-sky-500 text-white shadow-sm shadow-sky-900/40' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
  onClick={() => setViewType('years')}
>
  Jahre
</button>
```

### State Management

The view type is managed through React state:
- State variable: `viewType` (type: `'quarters' | 'months' | 'weeks' | 'years'`)
- Default value: `'quarters'`
- Setter: `setViewType()`

### Year View Calculation

The `calculateYearPosition()` function (lines 539-589) calculates project positions for the year view:

**Display Range:** 5 years total (currentYear - 2 to currentYear + 2)

**Example:** If current year is 2026, displays: 2024, 2025, 2026, 2027, 2028

**Position Calculation:**
- Start position: `((projectStartYear - startYear) / totalYears) * 100`
- Width: `((projectEndYear - startYear + 1) / totalYears) * 100 - startPosition`

**Edge Cases Handled:**
- Projects starting before visible range: start position = 0%
- Projects ending after visible range: width extends to 100%
- Projects entirely outside range: not displayed (width = 0)
- Invalid dates: not displayed (width = 0)

### Header Rendering

The year view header shows 5 year columns with gradient backgrounds (lines 878-910):

```typescript
<div className="grid grid-cols-5 gap-2 md:gap-4 mb-4 md:mb-6">
  <div style={{ background: 'linear-gradient(to right, #eab308, #d97706)' }}>
    {currentYear - 2}
  </div>
  {/* ... other years ... */}
</div>
```

### Background Grid

Each project row shows a 5-column background grid matching the header (lines 1000-1008).

## User Interaction

1. User clicks the "Jahre" button
2. `setViewType('years')` is called
3. Component re-renders with `viewType === 'years'`
4. Year header is displayed (5 columns)
5. Each project's position is calculated via `calculateYearPosition()`
6. Projects are rendered as bars spanning their year range

## Browser Compatibility

- Fully responsive design
- Mobile: buttons stack vertically with `flex-wrap`
- Desktop: buttons displayed inline
- Tested with: Chrome, Firefox, Safari, Edge

## Known Limitations

- Fixed 5-year range (cannot be adjusted without code changes)
- Year range always centered on current year
- No drill-down into specific years
- Projects shorter than 1 year may appear very small

## Future Enhancements (Potential)

- Configurable year range (e.g., 3, 5, or 10 years)
- Year navigation arrows to shift the view window
- Click on year to drill down to quarterly/monthly view
- Minimum width enforcement for very short projects

## Testing

To verify the feature works:

1. Navigate to the roadmap page
2. Click the "Jahre" button (rightmost view button)
3. Verify the button highlights (sky blue background)
4. Verify the header shows 5 years (currentYear ± 2)
5. Verify projects spanning multiple years display correctly
6. Test with projects that:
   - Start before the visible range
   - End after the visible range  
   - Are entirely within the range
   - Have missing or invalid dates

## Related Files

- `components/Roadmap.tsx` - Main roadmap component with view switching logic
- `components/RoadmapYearNavigation.tsx` - Year navigation controls (prev/next buttons)
- `types/index.ts` - TypeScript interfaces for Project and Category
- `utils/clientDataService.ts` - Data fetching service

## Version History

- **v1.0** (PR #15, Feb 17, 2026) - Initial implementation of year view button and calculation logic
