export type StoreFilter = 'all' | 'ica' | 'coop';

export const STORE_FILTER_OPTIONS: { value: StoreFilter; label: string }[] = [
    { value: 'all', label: 'Alla butiker' },
    { value: 'ica', label: 'ICA' },
    { value: 'coop', label: 'Coop' },
];

type StoreFilterDropdownProps = {
    value: StoreFilter;
    onChange: (value: StoreFilter) => void;
    className?: string;
};

export function StoreFilterDropdown({ value, onChange, className }: StoreFilterDropdownProps) {
    return (
        <select
            className={`store-filter-dropdown${className ? ' ' + className : ''}`}
            value={value}
            onChange={(e) => onChange(e.target.value as StoreFilter)}
        >
            {STORE_FILTER_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    );
}
