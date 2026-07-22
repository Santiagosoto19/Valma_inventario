import { Search, SlidersHorizontal, ArrowUpDown } from 'lucide-react';

const STOCK_FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'in_stock', label: 'Con stock' },
  { id: 'low', label: 'Stock bajo' },
  { id: 'out', label: 'Agotados' },
];

const SORT_OPTIONS = [
  { id: 'name_asc', label: 'Nombre A → Z' },
  { id: 'name_desc', label: 'Nombre Z → A' },
  { id: 'price_asc', label: 'Precio menor' },
  { id: 'price_desc', label: 'Precio mayor' },
  { id: 'stock_asc', label: 'Menos stock' },
  { id: 'stock_desc', label: 'Más stock' },
];

export function filterProducts(products, { search, stockFilter, sortBy, threshold }) {
  let list = [...products];

  const query = search.trim().toLowerCase();
  if (query) {
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
    );
  }

  switch (stockFilter) {
    case 'in_stock':
      list = list.filter((p) => p.stock > threshold);
      break;
    case 'low':
      list = list.filter((p) => p.stock > 0 && p.stock <= threshold);
      break;
    case 'out':
      list = list.filter((p) => p.stock === 0);
      break;
    default:
      break;
  }

  list.sort((a, b) => {
    switch (sortBy) {
      case 'name_desc':
        return b.name.localeCompare(a.name, 'es');
      case 'price_asc':
        return Number(a.price) - Number(b.price);
      case 'price_desc':
        return Number(b.price) - Number(a.price);
      case 'stock_asc':
        return a.stock - b.stock;
      case 'stock_desc':
        return b.stock - a.stock;
      default:
        return a.name.localeCompare(b.name, 'es');
    }
  });

  return list;
}

export default function InventoryFilters({
  search,
  onSearchChange,
  stockFilter,
  onStockFilterChange,
  sortBy,
  onSortChange,
  totalCount,
  filteredCount,
}) {
  const hasActiveFilters = search.trim() || stockFilter !== 'all';

  return (
    <div className="space-y-3">
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input-pastel pl-11 w-full"
            placeholder="Buscar por nombre o descripción..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1 sm:flex-none sm:min-w-[180px]">
            <ArrowUpDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              className="input-pastel pl-9 w-full text-sm font-semibold appearance-none cursor-pointer"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              aria-label="Ordenar productos"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          <SlidersHorizontal size={16} className="text-slate-400 shrink-0 self-center hidden sm:block" />
          {STOCK_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => onStockFilterChange(filter.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                stockFilter === filter.id
                  ? 'bg-pink-100 text-pink-700 ring-2 ring-pink-300'
                  : 'bg-white border border-pastel-lavender/40 text-slate-600 hover:bg-pastel-lavender/20'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <p className="text-xs font-semibold text-slate-500 shrink-0">
          {hasActiveFilters ? (
            <>
              <span className="text-pink-600">{filteredCount}</span>
              {' '}de {totalCount} productos
            </>
          ) : (
            <>{totalCount} producto{totalCount !== 1 ? 's' : ''}</>
          )}
        </p>
      </div>
    </div>
  );
}

export { STOCK_FILTERS, SORT_OPTIONS };
