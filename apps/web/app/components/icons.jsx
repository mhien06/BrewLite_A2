import React from 'react';

export function Icon({ name, size = 20, strokeWidth = 1.7, ...props }) {
  const paths = {
    bag: <><path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></>,
    user: <><circle cx="12" cy="8" r="3.5"/><path d="M5 21a7 7 0 0 1 14 0"/></>,
    search: <><circle cx="10.8" cy="10.8" r="6.7"/><path d="m16 16 4.3 4.3"/></>,
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    back: <><path d="M19 12H5"/><path d="m11 6-6 6 6 6"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    minus: <path d="M5 12h14"/>,
    close: <path d="M6 6l12 12M18 6 6 18"/>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"/><path d="M10 10v7m4-7v7"/></>,
    check: <path d="m4 12 5 5L20 6"/>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    shield: <><path d="M12 2 4 6v6c0 5 3.1 8.1 8 10 4.9-1.9 8-5 8-10V6l-8-4Z"/><path d="m9 12 2 2 4-4"/></>,
    coffee: <><path d="M4 9h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z"/><path d="M17 10h2a3 3 0 0 1 0 6h-2M8 3v3m4-3v3"/></>,
    menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
    sparkle: <><path d="m12 2 2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2L12 2Z"/></>,
    heart: <path d="M20 9c0 5-8 11-8 11S4 14 4 9a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9Z"/>,
    leaf: <><path d="M20 4C9 3 4 8 4 15a5 5 0 0 0 5 5c7 0 12-7 11-16Z"/><path d="M6 18c2-3 5-6 10-9"/></>,
  };
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.coffee}</svg>;
}
