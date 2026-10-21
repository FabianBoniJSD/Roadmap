import React from 'react';

interface ToggleSwitchProps {
  label: string;
  isOn: boolean;
  onToggle: () => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, isOn, onToggle }) => {
  return (
    <div className="flex items-center">
      <span className="mr-3 text-sm font-medium text-gray-300">{label}</span>
      <button
        type="button"
        onClick={onToggle}
        className={`
 relative inline-block w-12 h-6 rounded-full
 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500
 ${isOn ? 'bg-yellow-500' : 'bg-gray-600'}
 `}
        aria-pressed={isOn}
      >
        <span className="sr-only">
          {isOn ? 'Enable' : 'Disable'} {label}
        </span>
        <span
          className={`
 absolute top-0.5
 ${isOn ? 'right-0.5' : 'left-0.5'}
 bg-white w-5 h-5 rounded-full
 transition-colors duration-200 ease-in-out
 `}
        />
      </button>
    </div>
  );
};

export default ToggleSwitch;
