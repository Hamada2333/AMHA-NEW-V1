import React from 'react';
import THEME from '../../styles/theme';
import Icon from './Icon';

export const SearchBar = ({ value, onChange, placeholder }) => (
  <div style={{ position: "relative" }}>
    <div style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: THEME.textDim }}>
      <Icon name="search" size={16} />
    </div>
    <input
      value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder || "Search..."}
      style={{ paddingLeft: "38px", background: THEME.surface, width: "280px" }}
    />
  </div>
);

export default SearchBar;
