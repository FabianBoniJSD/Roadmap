import React, { useState } from 'react';
import { Category } from '../types';
import { getIconByName } from '../utils/reactIcons';
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
      return <span style={{ color: iconColor }}>?</span>;
    }

    const IconComponent = getIconByName(iconName);

    if (IconComponent) {
      return <IconComponent style={{ fontSize: '16px', color: iconColor }} />;
    } else {
      return <span style={{ color: iconColor }}>?</span>;
    }
  };

  return (
    <div className="ds-roadmap-category-sidebar">
      <div className="ds-roadmap-category-sidebar-header">
        <h2>Bereiche</h2>
        <button
          className="ds-roadmap-category-collapse"
          onClick={() => setIsCollapsed(!isCollapsed)}
          type="button"
        >
          {isCollapsed ? <Fa.FaChevronDown /> : <Fa.FaChevronUp />}
        </button>
      </div>

      <div className={`ds-roadmap-category-list ${isCollapsed ? 'is-collapsed' : ''}`}>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={`ds-roadmap-category-item ${activeCategories.includes(category.id) ? 'is-active' : ''}`}
            style={{
              borderLeftColor: activeCategories.includes(category.id)
                ? category.color
                : 'transparent',
            }}
            onClick={() => onToggleCategory(category.id)}
          >
            <div className="ds-roadmap-category-icon" style={{ backgroundColor: category.color }}>
              {renderIcon(category.icon || '', category.color || '#777777')}
            </div>
            <span>{category.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategorySidebar;
