export type SortBy = 'relevance' | 'price';

export const SORT_OPTIONS: { value: SortBy; label: string }[] = [
    { value: 'relevance', label: 'Relevans' },
    { value: 'price', label: 'Pris (lågt → högt)' },
];

type SortDropdownProps = {
    value: SortBy;
    onChange: (value: SortBy) => void;
    className?: string;
};

export function SortDropdown({ value, onChange, className }: SortDropdownProps) {
    return (
        <select
            className={`store-filter-dropdown${className ? ' ' + className : ''}`}
            value={value}
            onChange={(e) => onChange(e.target.value as SortBy)}
        >
            {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    );
}
