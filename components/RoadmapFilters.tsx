import React, { useState } from 'react';

interface RoadmapFiltersProps {
	filterText: string;
	onFilterTextChange: (v: string) => void;
	availableStatuses: string[];
	selectedStatuses: string[];
	onToggleStatus: (status: string) => void;
	availableTags: string[];
	selectedTags: string[];
	onToggleTag: (tag: string) => void;
	onClearAll: () => void;
	// New: Zeitraum and running
	monthRange: { start: number; end: number };
	onMonthRangeChange: (r: { start: number; end: number }) => void;
	onlyRunning: boolean;
	onToggleOnlyRunning: (v: boolean) => void;
	// Optional: quick actions for categories
	categoriesCount?: { total: number; active: number };
	onSelectAllCategories?: () => void;
	onClearCategories?: () => void;
}

const pretty = (s: string) => s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const RoadmapFilters: React.FC<RoadmapFiltersProps> = ({
	filterText,
	onFilterTextChange,
	availableStatuses,
	selectedStatuses,
	onToggleStatus,
	availableTags,
	selectedTags,
	onToggleTag,
	onClearAll,
	monthRange,
	onMonthRangeChange,
	onlyRunning,
	onToggleOnlyRunning,
	categoriesCount,
	onSelectAllCategories,
	onClearCategories,
}) => {
		const [open, setOpen] = useState<boolean>(false);

	const activeCount = (filterText ? 1 : 0) + selectedStatuses.length + selectedTags.length;

	return (
		<div className="bg-gray-800/60 border border-gray-700 rounded-xl px-3 md:px-4 py-3">
					<button
						className="w-full flex items-center justify-between text-left"
						onClick={() => setOpen(o => !o)}
						aria-expanded={open}
					>
						<div className="flex items-center gap-3">
							{/* Rotating white chevron icon */}
							<svg
								className={`w-5 h-5 text-white transition-transform duration-200 ${open ? 'rotate-180' : 'rotate-0'}`}
								viewBox="0 0 20 20"
								fill="currentColor"
								aria-hidden="true"
							>
								<path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
							</svg>
							<span className="text-base md:text-lg font-semibold">Erweiterte Filter</span>
							{activeCount > 0 && (
								<span className="text-xs px-2 py-0.5 rounded-full bg-black/40 border border-white/10">{activeCount}</span>
							)}
						</div>
					</button>

					{open && (
						<div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
					{/* Text search */}
					<div>
						<label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">Suche</label>
						<input
							className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-600"
							placeholder="Titel oder Beschreibung…"
							value={filterText}
							onChange={(e) => onFilterTextChange(e.target.value)}
						/>
					</div>

					{/* Status pills */}
					<div>
						<label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">Status</label>
						<div className="flex flex-wrap gap-2">
							{availableStatuses.length === 0 ? (
								<span className="text-xs text-gray-400">–</span>
							) : availableStatuses.map(s => {
								const active = selectedStatuses.includes(s);
								return (
									<button
										key={s}
										onClick={() => onToggleStatus(s)}
										className={`text-xs px-2 py-1 rounded-full border ${active ? 'bg-yellow-600 text-black border-yellow-500' : 'bg-black/40 text-gray-200 border-white/10 hover:bg-black/60'}`}
										title={pretty(s)}
									>
										{pretty(s)}
									</button>
								);
							})}
						</div>
					</div>

					{/* Tags pills */}
					<div>
						<label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">Tags</label>
						<div className="flex flex-wrap gap-2 max-h-24 overflow-auto pr-1">
							{availableTags.length === 0 ? (
								<span className="text-xs text-gray-400">–</span>
							) : availableTags.map(t => {
								const active = selectedTags.includes(t);
								return (
									<button
										key={t}
										onClick={() => onToggleTag(t)}
										className={`text-xs px-2 py-1 rounded-full border ${active ? 'bg-yellow-600 text-black border-yellow-500' : 'bg-black/40 text-gray-200 border-white/10 hover:bg-black/60'}`}
										title={t}
									>
										{t}
									</button>
								);
							})}
						</div>
					</div>

								{/* Zeitraum + Running */}
								<div>
									<label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">Zeitraum (Monate)</label>
									<div className="px-1 py-2 bg-gray-900 border border-gray-700 rounded-lg">
										<div className="flex items-center gap-2 text-xs text-gray-300 mb-2">
											<span>Von</span>
											<input type="number" min={1} max={12} value={monthRange.start}
												onChange={(e) => onMonthRangeChange({ start: Math.min(Math.max(1, Number(e.target.value)||1), monthRange.end), end: monthRange.end })}
												className="w-14 bg-gray-800 border border-gray-700 rounded px-2 py-1" />
											<span>bis</span>
											<input type="number" min={1} max={12} value={monthRange.end}
												onChange={(e) => onMonthRangeChange({ start: monthRange.start, end: Math.max(Math.min(12, Number(e.target.value)||12), monthRange.start) })}
												className="w-14 bg-gray-800 border border-gray-700 rounded px-2 py-1" />
											<span className="ml-auto">{monthRange.start}–{monthRange.end}</span>
										</div>
										<div className="flex items-center gap-2">
											<input type="range" min={1} max={12} value={monthRange.start}
												onChange={(e) => onMonthRangeChange({ start: Math.min(Number(e.target.value)||1, monthRange.end), end: monthRange.end })}
												className="w-full" />
											<input type="range" min={1} max={12} value={monthRange.end}
												onChange={(e) => onMonthRangeChange({ start: monthRange.start, end: Math.max(Number(e.target.value)||12, monthRange.start) })}
												className="w-full" />
										</div>
									</div>
								</div>

								<div>
									<label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">Nur laufende Projekte</label>
									<div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2">
										<input type="checkbox" checked={onlyRunning} onChange={(e) => onToggleOnlyRunning(e.target.checked)} />
										<span className="text-sm">Start ≤ Heute ≤ Ende</span>
									</div>
								</div>

								{/* Category quick actions */}
								<div>
									<label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">Bereiche</label>
									<div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm">
										<span className="text-gray-300">{categoriesCount ? `${categoriesCount.active}/${categoriesCount.total} aktiv` : '—'}</span>
										{onSelectAllCategories && (
											<button className="ml-auto text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700" onClick={onSelectAllCategories}>Alle</button>
										)}
										{onClearCategories && (
											<button className="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700" onClick={onClearCategories}>Keine</button>
										)}
									</div>
								</div>

								{/* Clear */}
								<div className="md:col-span-3 flex justify-end">
						<button
							onClick={onClearAll}
							className="text-xs px-3 py-1 rounded bg-gray-900 border border-gray-700 hover:bg-gray-800"
						>
							Alle Filter zurücksetzen
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

export default RoadmapFilters;
