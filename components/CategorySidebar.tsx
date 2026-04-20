import React, { useState } from 'react';
import { Category } from '../types';
import { getIconByName } from '../utils/reactIcons';
// Importieren Sie Fa für die Chevron-Icons
import * as Fa from 'react-icons/fa';

interface CategorySidebarProps {
  categories: Category[];
  activeCategories: string[];
  onToggleCategory: (categoryId: string) => void;
}

const CategorySidebar: React.FC<CategorySidebarProps> = ({
  categories,
  activeCategories,
  onToggleCategory,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const getReadableIconColor = (backgroundColor: string) => {
    const normalized = backgroundColor.trim();
    const hexMatch = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!hexMatch) return '#ffffff';

    const hex =
      hexMatch[1].length === 3
        ? hexMatch[1]
            .split('')
            .map((char) => char + char)
            .join('')
        : hexMatch[1];

    const red = parseInt(hex.slice(0, 2), 16) / 255;
    const green = parseInt(hex.slice(2, 4), 16) / 255;
    const blue = parseInt(hex.slice(4, 6), 16) / 255;

    const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    return luminance > 0.62 ? '#0f172a' : '#ffffff';
  };

  const renderIcon = (iconName: string, backgroundColor: string) => {
    const iconColor = getReadableIconColor(backgroundColor);

    if (!iconName) {
      return <span style={{ color: iconColor }}>❓</span>;
    }

    // Verwenden der getIconByName-Funktion aus utils/reactIcons.ts
    const IconComponent = getIconByName(iconName);

    if (IconComponent) {
      return <IconComponent style={{ fontSize: '16px', color: iconColor }} />;
    } else {
      return <span style={{ color: iconColor }}>❓</span>;
    }
  };

  return (
    <div className="w-full lg:w-64 lg:pr-6">
      {/* Mobile toggle button */}
      <div className="flex justify-between items-center mb-2 lg:mb-4">
        <h2 className="text-xl font-bold">Bereiche</h2>
        <button
          className="lg:hidden bg-gray-700 p-2 rounded-md"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <Fa.FaChevronDown className="text-white" />
          ) : (
            <Fa.FaChevronUp className="text-white" />
          )}
        </button>
      </div>

      {/* Categories list - hidden on mobile when collapsed */}
      <div className={`space-y-2 ${isCollapsed ? 'hidden lg:block' : 'block'}`}>
        {categories.map((category) => (
          <div
            key={category.id}
            className={`flex items-center p-2 rounded cursor-pointer transition-all ${
              activeCategories.includes(category.id)
                ? 'bg-gray-700 border-l-4'
                : 'bg-gray-800 opacity-70'
            }`}
            style={{
              borderLeftColor: activeCategories.includes(category.id)
                ? category.color
                : 'transparent',
            }}
            onClick={() => onToggleCategory(category.id)}
          >
            <div
              className="w-6 h-6 md:w-8 md:h-8 rounded flex items-center justify-center mr-2 md:mr-3"
              style={{ backgroundColor: category.color }}
            >
              {renderIcon(category.icon || '', category.color || '#777777')}
            </div>
            <span className="text-sm md:text-base">{category.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategorySidebar;
