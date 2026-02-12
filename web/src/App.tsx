/**
 * PTCG Opponent Checker - Main App
 * プレイヤー検索と参加記録表示
 */

import { SearchForm, PlayerList, ParticipationList } from './components';
import { usePlayerSearch, useParticipations } from './hooks';

function App() {
  const {
    searchState,
    setSearchState,
    players,
    hasSearched,
    isSearching,
    searchError,
    selectedPlayerId,
    setSelectedPlayerId,
    executeSearch,
  } = usePlayerSearch();

  const {
    player,
    participations,
    isLoading: isLoadingParticipations,
    error: participationsError,
  } = useParticipations(selectedPlayerId);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>PTCG Opponent Checker</h1>
        <p className="text-muted text-sm">
          Search for players and view their tournament history.
        </p>
      </header>

      <main>
        <section className="search-section">
          <SearchForm
            searchState={searchState}
            onSearchStateChange={setSearchState}
            onSearch={executeSearch}
            isLoading={isSearching}
          />
        </section>

        {searchError && (
          <div className="error-message">{searchError}</div>
        )}

        <section className="results-section">
          <PlayerList
            players={players}
            selectedPlayerId={selectedPlayerId}
            onSelectPlayer={setSelectedPlayerId}
            isLoading={isSearching}
            hasSearched={hasSearched}
          />

          <ParticipationList
            player={player}
            participations={participations}
            isLoading={isLoadingParticipations}
            error={participationsError}
          />
        </section>
      </main>

      <footer className="app-footer text-sm text-muted">
        <p>Data from rk9.gg</p>
      </footer>
    </div>
  );
}

export default App;
