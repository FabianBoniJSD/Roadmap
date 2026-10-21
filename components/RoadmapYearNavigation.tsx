import React from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface RoadmapYearNavigationProps {
  initialYear: number;
  onYearChange: (year: number) => void;
}

const RoadmapYearNavigation: React.FC<RoadmapYearNavigationProps> = ({
  initialYear,
  onYearChange,
}) => {
  const [currentYear, setCurrentYear] = React.useState(initialYear);

  const handlePreviousYear = () => {
    const newYear = currentYear - 1;
    setCurrentYear(newYear);
    onYearChange(newYear);
  };

  const handleNextYear = () => {
    const newYear = currentYear + 1;
    setCurrentYear(newYear);
    onYearChange(newYear);
  };

  return (
    <div className="ds-roadmap-year-nav [display:inline-flex] [align-items:center] [gap:6px] [padding:5px] [border:1px_solid_var(--ds-border-default)] [border-radius:var(--ds-radius-md)] [background:var(--ds-bg-soft)] max-[760px]:[width:100%]">
      <button
        onClick={handlePreviousYear}
        className="ds-roadmap-year-button [display:inline-flex] [min-height:42px] [align-items:center] [justify-content:center] [border:1px_solid_transparent] [border-radius:12px] [background:transparent] [color:var(--ds-text-default)] [font-size:0.875rem] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out),_color_var(--ds-duration-base)_var(--ds-ease-out)] hover:[border-color:var(--ds-border-strong)] hover:[color:var(--ds-text-strong)] [width:40px] [min-height:40px] [color:var(--ds-text-strong)]"
        aria-label="Previous Year"
      >
        <FaChevronLeft className="w-4 h-4" />
      </button>

      <span className="ds-roadmap-year-value [min-width:72px] [color:var(--ds-text-strong)] [font-size:1.125rem] [font-weight:600] [text-align:center]">
        {currentYear}
      </span>

      <button
        onClick={handleNextYear}
        className="ds-roadmap-year-button [display:inline-flex] [min-height:42px] [align-items:center] [justify-content:center] [border:1px_solid_transparent] [border-radius:12px] [background:transparent] [color:var(--ds-text-default)] [font-size:0.875rem] [font-weight:600] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out),_color_var(--ds-duration-base)_var(--ds-ease-out)] hover:[border-color:var(--ds-border-strong)] hover:[color:var(--ds-text-strong)] [width:40px] [min-height:40px] [color:var(--ds-text-strong)]"
        aria-label="Next Year"
      >
        <FaChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default RoadmapYearNavigation;
