import React, { useId, useState } from 'react';
import { Category } from '../types';
import { getIconByName } from '../utils/reactIcons';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { FiLayers } from 'react-icons/fi';

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
  const categoryListId = useId();

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
    }
    return <FiLayers aria-label={`Unbekanntes Kategorie-Icon ${iconName}`} color={iconColor} />;
  };

  return (
    <div className="ds-roadmap-category-sidebar [display:grid] [gap:var(--ds-space-4)] [width:100%] [&_h2]:[margin:0] [&_h2]:[color:var(--ds-text-strong)] [&_h2]:[font-size:1.125rem] [&_h2]:[font-weight:600] [&_h2]:[letter-spacing:-0.02em]">
      <div className="ds-roadmap-category-sidebar-header [display:flex] [align-items:center] [justify-content:space-between] [gap:var(--ds-space-3)]">
        <h2>Bereiche</h2>
        <button
          className="ds-roadmap-category-collapse [display:none] [width:40px] [height:40px] [place-items:center] [border:1px_solid_var(--ds-border-default)] [border-radius:12px] [background:var(--ds-bg-soft)] [color:var(--ds-text-strong)] max-[760px]:[display:grid]"
          onClick={() => setIsCollapsed(!isCollapsed)}
          type="button"
          aria-label={isCollapsed ? 'Bereiche einblenden' : 'Bereiche ausblenden'}
          aria-expanded={!isCollapsed}
          aria-controls={categoryListId}
        >
          {isCollapsed ? <FaChevronDown /> : <FaChevronUp />}
        </button>
      </div>

      <div
        id={categoryListId}
        className={`ds-roadmap-category-list [display:grid] [gap:10px] max-[760px]:[&.is-collapsed]:[display:none] ${isCollapsed ? 'is-collapsed' : ''}`}
      >
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            aria-pressed={activeCategories.includes(category.id)}
            className={`ds-roadmap-category-item [display:flex] [width:100%] [align-items:center] [gap:12px] [padding:10px] [border:1px_solid_var(--ds-border-default)] [border-left-width:4px] [border-radius:14px] [background:var(--ds-bg-soft)] [color:var(--ds-text-default)] [text-align:left] [transition:transform_var(--ds-duration-fast)_var(--ds-ease-out),_border-color_var(--ds-duration-base)_var(--ds-ease-out),_background_var(--ds-duration-base)_var(--ds-ease-out),_color_var(--ds-duration-base)_var(--ds-ease-out)] hover:[background:var(--ds-bg-elevated-strong)] hover:[color:var(--ds-text-strong)] [&.is-active]:[background:var(--ds-bg-elevated-strong)] [&.is-active]:[color:var(--ds-text-strong)] [&.is-active]:[transform:translateY(-1px)] ${activeCategories.includes(category.id) ? 'is-active' : ''}`}
            style={{
              borderLeftColor: activeCategories.includes(category.id)
                ? category.color
                : 'transparent',
            }}
            onClick={() => onToggleCategory(category.id)}
          >
            <div
              className="ds-roadmap-category-icon [display:grid] [width:34px] [height:34px] [flex:0_0_auto] [place-items:center] [border-radius:11px]"
              style={{ backgroundColor: category.color }}
            >
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
