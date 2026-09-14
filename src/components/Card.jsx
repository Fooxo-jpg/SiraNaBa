import React from 'react';
import { cn } from '../utils/cn.js';

export default function Card({ children, className = '', as: Tag = 'div', ...rest }) {
  return (
    <Tag
      className={cn('rounded-card border border-black/5 bg-white shadow-card', className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}
