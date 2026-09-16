import { useState } from 'react';
import { NavLink } from 'react-router-dom';

import './Navbar.css';

/** 顶部导航项。end 用于让「首页」只在完全匹配时才高亮。 */
const NAV_ITEMS = [
  { to: '/', label: '首页', end: true },
  { to: '/converter', label: '转换器' },
  { to: '/practice', label: '练习' },
  { to: '/dashboard', label: '统计' },
  { to: '/mistakes', label: '错题本' },
  { to: '/algorithm', label: '实现说明' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <NavLink to="/" className="navbar__brand" onClick={closeMenu}>
          <span className="navbar__mark" aria-hidden="true">
            2A
          </span>
          <span className="navbar__brand-text">
            Base Converter <strong>Trainer</strong>
          </span>
        </NavLink>

        <button
          type="button"
          className="navbar__toggle"
          aria-label={isOpen ? '收起导航菜单' : '展开导航菜单'}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
        >
          <span className={`navbar__burger ${isOpen ? 'is-open' : ''}`} aria-hidden="true" />
        </button>

        <nav className={`navbar__nav ${isOpen ? 'is-open' : ''}`} aria-label="主导航">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={closeMenu}
              className={({ isActive }) => `navbar__link${isActive ? ' is-active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
