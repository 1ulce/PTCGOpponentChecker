/**
 * 検索フォームコンポーネント
 * プレイヤー名、国、Divisionで検索
 */

import type { DivisionFilter, SearchState } from '../types';

// 主要国リスト（rk9.ggで使用される国コード）
const COUNTRIES = [
  { code: '', label: 'All Countries' },
  { code: 'JP', label: 'Japan' },
  { code: 'US', label: 'United States' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'AU', label: 'Australia' },
  { code: 'CA', label: 'Canada' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
  { code: 'ES', label: 'Spain' },
  { code: 'IT', label: 'Italy' },
  { code: 'BR', label: 'Brazil' },
  { code: 'MX', label: 'Mexico' },
  { code: 'CL', label: 'Chile' },
  { code: 'AR', label: 'Argentina' },
  { code: 'NZ', label: 'New Zealand' },
  { code: 'SG', label: 'Singapore' },
  { code: 'TW', label: 'Taiwan' },
  { code: 'KR', label: 'South Korea' },
  { code: 'NL', label: 'Netherlands' },
  { code: 'BE', label: 'Belgium' },
  { code: 'SE', label: 'Sweden' },
  { code: 'NO', label: 'Norway' },
  { code: 'FI', label: 'Finland' },
  { code: 'DK', label: 'Denmark' },
  { code: 'AT', label: 'Austria' },
  { code: 'CH', label: 'Switzerland' },
  { code: 'PL', label: 'Poland' },
  { code: 'PT', label: 'Portugal' },
];

const DIVISIONS: { value: DivisionFilter; label: string }[] = [
  { value: 'all', label: 'All Divisions' },
  { value: 'Masters', label: 'Masters' },
  { value: 'Senior', label: 'Senior' },
  { value: 'Junior', label: 'Junior' },
];

interface SearchFormProps {
  searchState: SearchState;
  onSearchStateChange: (state: SearchState) => void;
  onSearch: () => void;
  isLoading: boolean;
}

export function SearchForm({
  searchState,
  onSearchStateChange,
  onSearch,
  isLoading,
}: SearchFormProps) {
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchStateChange({ ...searchState, name: e.target.value });
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSearchStateChange({ ...searchState, country: e.target.value });
  };

  const handleDivisionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSearchStateChange({
      ...searchState,
      division: e.target.value as DivisionFilter,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchState.name.trim()) {
      onSearch();
    }
  };

  const canSearch = searchState.name.trim().length > 0 && !isLoading;

  return (
    <form onSubmit={handleSubmit} className="search-form">
      <div className="form-group">
        <label htmlFor="name">Player Name</label>
        <input
          id="name"
          type="text"
          placeholder="First or Last name"
          value={searchState.name}
          onChange={handleNameChange}
          disabled={isLoading}
          autoComplete="off"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="country">Country</label>
          <select
            id="country"
            value={searchState.country}
            onChange={handleCountryChange}
            disabled={isLoading}
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="division">Division</label>
          <select
            id="division"
            value={searchState.division}
            onChange={handleDivisionChange}
            disabled={isLoading}
          >
            {DIVISIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button type="submit" disabled={!canSearch} className="search-button">
        {isLoading ? (
          <>
            <span className="spinner" /> Searching...
          </>
        ) : (
          'Search'
        )}
      </button>
    </form>
  );
}
