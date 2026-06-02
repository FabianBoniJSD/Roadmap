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
    <div className="ds-roadmap-year-nav">
      <button
        onClick={handlePreviousYear}
        className="ds-roadmap-year-button"
        aria-label="Previous Year"
      >
        <FaChevronLeft className="w-4 h-4" />
      </button>

      <span className="ds-roadmap-year-value">{currentYear}</span>

      <button onClick={handleNextYear} className="ds-roadmap-year-button" aria-label="Next Year">
        <FaChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default RoadmapYearNavigation;
