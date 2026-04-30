'use client';

import { useState } from 'react';
import CategoryIcon from './CategoryIcon';
import { ChevronDown, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function CategoryTreeItem({ category, depth = 0 }) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = category.children?.length > 0;
  const isLeaf = category.isLeaf ?? !hasChildren;
  const productCount = category.totalProductCount ?? category.productCount ?? 0;

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <div
        className="flex items-center gap-3 py-3 px-3 rounded-lg hover:bg-gray-50 transition-colors"
        style={{ paddingLeft: `${Math.min(depth * 20 + 12, 72)}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="flex-shrink-0 p-0.5 text-gray-500 hover:text-primary rounded"
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? (
              <ChevronDown className="w-5 h-5" strokeWidth={2} />
            ) : (
              <ChevronRight className="w-5 h-5" strokeWidth={2} />
            )}
          </button>
        ) : (
          <span className="w-5 flex-shrink-0" aria-hidden />
        )}
        <Link
          href={`/products?category=${encodeURIComponent(category.name)}`}
          className="flex flex-1 items-center gap-3 min-w-0"
        >
          <CategoryIcon category={category} size="sm" className="flex-shrink-0 w-10 h-10" />
          <div className="min-w-0 flex-1">
            <span className="font-medium text-gray-900 block truncate">{category.name}</span>
            {category.path && category.path !== category.name && (
              <span className="text-xs text-gray-500 truncate block">{category.path}</span>
            )}
          </div>
          {productCount > 0 && (
            <span className="flex-shrink-0 text-xs text-gray-500 tabular-nums">{productCount} products</span>
          )}
        </Link>
      </div>
      {hasChildren && expanded && (
        <div className="bg-gray-50/50">
          {category.children
            .filter((c) => c.isActive)
            .map((child) => (
              <CategoryTreeItem key={child.id} category={child} depth={depth + 1} />
            ))}
        </div>
      )}
    </div>
  );
}
