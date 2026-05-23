/**
 * Caissa Chess Tournament Manager - View Component (Multi-Tournament Edition)
 * 
 * Interacts with the DOM, manages view state transitions, renders tables and pairings, 
 * and binds event handlers.
 */

class TournamentView {
    constructor() {
        // --- Cache DOM Elements ---
        this.themeToggleBtn = document.getElementById('theme-toggle');
        this.resetAppBtn = document.getElementById('reset-app-btn');
        this.toastContainer = document.getElementById('toast-container');
        
        // Headers & Selectors
        this.activeTournamentMenuBtn = document.getElementById('active-tournament-menu-btn');
        this.activeTournamentDisplayName = document.getElementById('active-tournament-display-name');
        this.tournamentsDropdown = document.getElementById('tournaments-dropdown');
        this.tournamentsList = document.getElementById('tournaments-list');
        this.createNewTourBtn = document.getElementById('create-new-tour-btn');
        this.noTourCreateBtn = document.getElementById('no-tour-create-btn');
        
        // Views containers
        this.noTournamentView = document.getElementById('no-tournament-view');
        this.activeTournamentView = document.getElementById('active-tournament-view');
        
        // Sidebar metadata display
        this.sidebarTournamentTitle = document.getElementById('sidebar-tournament-title');
        this.sidebarTourRoundsLimit = document.getElementById('sidebar-tour-rounds-limit');
        this.statRoundDisplay = document.getElementById('stat-round-display');
        this.statCompletedDisplay = document.getElementById('stat-completed-display');
        this.statPlayersDisplay = document.getElementById('stat-players-display');
        this.sidebarTiebreakersList = document.getElementById('sidebar-tiebreakers-list');
        this.deleteActiveTourBtn = document.getElementById('delete-active-tour-btn');

        // Navigation Tabs (Mobile + Desktop)
        this.tabBtns = document.querySelectorAll('.tab-btn, .nav-tab-btn');
        this.appPanels = document.querySelectorAll('.app-panel');
        this.pairingsTabTrigger = document.getElementById('pairings-tab-trigger');
        this.desktopPairingsTrigger = document.getElementById('desktop-pairings-trigger');
        this.playersTabTrigger = document.getElementById('players-tab-trigger');
        this.desktopPlayersTrigger = document.getElementById('desktop-players-trigger');

        // Panel: Standings
        this.standingsLegendContainer = document.getElementById('standings-legend-container');
        this.standingsTable = document.getElementById('standings-table');
        this.standingsTheadTr = document.getElementById('standings-thead-tr');
        this.standingsTbody = document.getElementById('standings-tbody');

        // Breakdown Explainer Panel
        this.tiebreakerExplainerPanel = document.getElementById('tiebreaker-explainer-panel');
        this.explainerPlayerName = document.getElementById('explainer-player-name');
        this.explainerBhVal = document.getElementById('explainer-bh-val');
        this.explainerSbVal = document.getElementById('explainer-sb-val');
        this.explainerBhList = document.getElementById('explainer-bh-list');
        this.explainerSbList = document.getElementById('explainer-sb-list');
        this.closeExplainerBtn = document.getElementById('close-explainer-btn');

        // Panel: Pairings
        this.currentRoundNumber = document.getElementById('current-round-number');
        this.prevRoundBtn = document.getElementById('prev-round-btn');
        this.nextRoundBtn = document.getElementById('next-round-btn');
        this.generateNextRoundBtn = document.getElementById('generate-next-round-btn');
        this.finishTournamentBtn = document.getElementById('finish-tournament-btn');
        this.pairingsContainer = document.getElementById('pairings-container');

        // Panel: Players registration
        this.addPlayerForm = document.getElementById('add-player-form');
        this.playerNameInput = document.getElementById('player-name-input');
        this.playerRatingInput = document.getElementById('player-rating-input');
        this.loadDummyPlayersBtn = document.getElementById('load-dummy-players-btn');
        this.rosterPlayerList = document.getElementById('roster-player-list');
        this.playersRosterCount = document.getElementById('players-roster-count');
        this.startTournamentBtn = document.getElementById('start-tournament-btn');
        this.playerEntryCard = document.getElementById('player-entry-card');

        // Panel: Settings
        this.renameTournamentForm = document.getElementById('rename-tournament-form');
        this.renameTourNameInput = document.getElementById('rename-tour-name-input');
        this.settingsTourCreated = document.getElementById('settings-tour-created');
        this.settingsTourRoundsLimit = document.getElementById('settings-tour-rounds-limit');
        this.settingsTourStatus = document.getElementById('settings-tour-status');
        this.settingsTiebreakerPriorityList = document.getElementById('settings-tiebreaker-priority-list');

        // Modals
        this.createTourModal = document.getElementById('create-tour-modal');
        this.createTournamentForm = document.getElementById('create-tournament-form');
        this.newTourName = document.getElementById('new-tour-name');
        this.newTourRounds = document.getElementById('new-tour-rounds');
        
        this.resetAppModal = document.getElementById('reset-app-modal');
        this.confirmResetAppBtn = document.getElementById('confirm-reset-app-btn');
        
        this.deleteTourModal = document.getElementById('delete-tour-modal');
        this.deleteTourNameDisplay = document.getElementById('delete-tour-name-display');
        this.confirmDeleteTourBtn = document.getElementById('confirm-delete-tour-btn');

        this.modalCloseBtns = document.querySelectorAll('.modal-close-btn');

        // Selected player cache for tie-breaker breakdowns
        this.selectedPlayerId = null;
        this.deleteTargetTourId = null; // Staged tournament for deletion
    }

    // --- Tab Orchestrator ---
    initTabs() {
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetPanelId = btn.getAttribute('data-panel');
                
                // Sync active classes across all buttons targeting the same panel (desktop + mobile)
                this.tabBtns.forEach(b => {
                    if (b.getAttribute('data-panel') === targetPanelId) {
                        b.classList.add('active');
                    } else {
                        b.classList.remove('active');
                    }
                });

                // Display target panel
                this.appPanels.forEach(panel => {
                    if (panel.id === targetPanelId) {
                        panel.classList.add('active');
                    } else {
                        panel.classList.remove('active');
                    }
                });
            });
        });
    }

    navigateToPanel(panelId) {
        const matchingBtn = Array.from(this.tabBtns).find(btn => btn.getAttribute('data-panel') === panelId);
        if (matchingBtn) matchingBtn.click();
    }

    // --- Dynamic DOM Generators ---
    
    /**
     * Shows/hides elements based on active tournament selection
     */
    setTournamentActiveUI(hasActive, activeTour = null) {
        if (!hasActive) {
            this.noTournamentView.classList.remove('hidden');
            this.activeTournamentView.classList.add('hidden');
            this.activeTournamentDisplayName.textContent = "Select Tournament";
        } else {
            this.noTournamentView.classList.add('hidden');
            this.activeTournamentView.classList.remove('hidden');
            this.activeTournamentDisplayName.textContent = activeTour.name;
            
            // Sync settings panel inputs
            this.renameTourNameInput.value = activeTour.name;
            this.sidebarTournamentTitle.textContent = activeTour.name;
            this.sidebarTourRoundsLimit.textContent = activeTour.maxRounds ? activeTour.maxRounds : 'Auto';
            
            // Adjust form input states based on round status
            if (activeTour.isStarted) {
                this.playerEntryCard.classList.add('hidden');
                this.startTournamentBtn.classList.add('hidden');
                
                this.pairingsTabTrigger.removeAttribute('disabled');
                this.desktopPairingsTrigger.removeAttribute('disabled');
            } else {
                this.playerEntryCard.classList.remove('hidden');
                this.startTournamentBtn.classList.remove('hidden');
                this.startTournamentBtn.disabled = activeTour.players.length < 2;
                
                this.pairingsTabTrigger.setAttribute('disabled', 'true');
                this.desktopPairingsTrigger.setAttribute('disabled', 'true');
            }
        }
    }

    /**
     * Renders Lichess-style active list of tournaments inside the header dropdown menu
     */
    renderTournamentsDropdown(tournaments, activeId, onSelect, onDelete) {
        this.tournamentsList.innerHTML = '';
        
        if (tournaments.length === 0) {
            this.tournamentsList.innerHTML = '<li class="text-muted text-center" style="padding:1rem;">No tournaments.</li>';
            return;
        }

        tournaments.forEach(tour => {
            const li = document.createElement('li');
            li.className = tour.id === activeId ? 'active' : '';
            
            const dateStr = new Date(tour.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric'
            });

            li.innerHTML = `
                <div class="tour-item-info">
                    <span class="tour-item-name bold">${this._escapeHTML(tour.name)}</span>
                    <span class="tour-item-meta">${tour.players.length} players • ${dateStr}</span>
                </div>
                <button class="delete-tour-dropdown-btn" data-id="${tour.id}" aria-label="Delete Tournament">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            `;

            // Row click (select tournament)
            li.addEventListener('click', (e) => {
                // Prevent trigger when clicking trashcan button
                if (e.target.closest('.delete-tour-dropdown-btn')) return;
                onSelect(tour.id);
                this.tournamentsDropdown.classList.add('hidden');
            });

            // Trashcan click (delete tournament)
            li.querySelector('.delete-tour-dropdown-btn').addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                onDelete(id);
            });

            this.tournamentsList.appendChild(li);
        });
    }

    /**
     * Dynamically builds the standings table columns and values based on the active tie-breakers.
     */
    renderStandings(activeTour, onRowClick) {
        this.standingsTbody.innerHTML = '';

        if (!activeTour) return;

        const players = activeTour.players;
        const enabledTBs = activeTour.settings.tiebreakers || [];

        // 1. Dynamic Table Headers Render
        let theadHTML = `
            <th class="col-rank">Rank</th>
            <th class="col-name">Player Name</th>
            <th class="col-rating">Rating</th>
            <th class="col-val text-center text-accent">PTS</th>
        `;

        if (enabledTBs.includes('buchholz')) {
            theadHTML += `<th class="col-val text-center legend-color-bh" title="Buchholz: Opponents points">BH</th>`;
        }
        if (enabledTBs.includes('sonnebornBerger')) {
            theadHTML += `<th class="col-val text-center legend-color-sb" title="Sonneborn-Berger Score">SB</th>`;
        }
        if (enabledTBs.includes('directEncounter')) {
            theadHTML += `<th class="col-val text-center legend-color-de" title="Direct Encounter">DE</th>`;
        }
        if (enabledTBs.includes('wins')) {
            theadHTML += `<th class="col-val text-center legend-color-wins" title="Wins Count">W</th>`;
        }

        this.standingsTheadTr.innerHTML = theadHTML;

        // 2. Dynamic Legend Render
        let legendHTML = `<span class="legend-item"><strong class="legend-color-pts">PTS</strong> Points</span>`;
        if (enabledTBs.includes('buchholz')) {
            legendHTML += `<span class="legend-item"><strong class="legend-color-bh">BH</strong> Buchholz</span>`;
        }
        if (enabledTBs.includes('sonnebornBerger')) {
            legendHTML += `<span class="legend-item"><strong class="legend-color-sb">SB</strong> SB</span>`;
        }
        if (enabledTBs.includes('directEncounter')) {
            legendHTML += `<span class="legend-item"><strong class="legend-color-de">DE</strong> Direct</span>`;
        }
        if (enabledTBs.includes('wins')) {
            legendHTML += `<span class="legend-item"><strong class="legend-color-wins">W</strong> Wins</span>`;
        }
        this.standingsLegendContainer.innerHTML = legendHTML;

        // 3. Render Table Rows
        if (players.length === 0) {
            const colspanVal = 4 + enabledTBs.length;
            this.standingsTbody.innerHTML = `
                <tr>
                    <td colspan="${colspanVal}" class="empty-state">
                        <i class="fa-solid fa-chess empty-icon"></i>
                        <p>Roster is empty. Add players under the Roster tab to begin.</p>
                    </td>
                </tr>`;
            return;
        }

        players.forEach((player, index) => {
            const rank = index + 1;
            const tr = document.createElement('tr');
            tr.setAttribute('data-id', player.id);
            
            if (this.selectedPlayerId === player.id) {
                tr.classList.add('selected');
            }

            let rankClass = '';
            if (rank === 1) rankClass = 'row-rank-1';
            else if (rank === 2) rankClass = 'row-rank-2';
            else if (rank === 3) rankClass = 'row-rank-3';

            let rowHTML = `
                <td class="col-rank ${rankClass}">
                    ${rank === 1 ? '<i class="fa-solid fa-crown" style="color:#eab308;"></i>' : ''}
                    ${rank === 2 ? '<i class="fa-solid fa-medal" style="color:#94a3b8;"></i>' : ''}
                    ${rank === 3 ? '<i class="fa-solid fa-medal" style="color:#b45309;"></i>' : ''}
                    ${rank > 3 ? rank : ''}
                </td>
                <td class="col-name">${this._escapeHTML(player.name)}</td>
                <td class="col-rating">${player.rating}</td>
                <td class="col-val text-center text-accent">${player.points.toFixed(1)}</td>
            `;

            // Append enabled tiebreaker cell values dynamically
            if (enabledTBs.includes('buchholz')) {
                rowHTML += `<td class="col-val text-center legend-color-bh">${player.buchholz.toFixed(1)}</td>`;
            }
            if (enabledTBs.includes('sonnebornBerger')) {
                rowHTML += `<td class="col-val text-center legend-color-sb">${player.sonnebornBerger.toFixed(2)}</td>`;
            }
            if (enabledTBs.includes('directEncounter')) {
                rowHTML += `<td class="col-val text-center legend-color-de"><i class="fa-solid fa-code-compare"></i></td>`;
            }
            if (enabledTBs.includes('wins')) {
                rowHTML += `<td class="col-val text-center legend-color-wins">${player.wins}</td>`;
            }

            tr.innerHTML = rowHTML;

            // Clicking row reveals tiebreaker break-down details
            tr.addEventListener('click', () => {
                document.querySelectorAll('#standings-tbody tr').forEach(row => row.classList.remove('selected'));
                tr.classList.add('selected');
                
                this.selectedPlayerId = player.id;
                onRowClick(player.id);
            });

            this.standingsTbody.appendChild(tr);
        });

        // Retain active breakdown open if refreshed
        if (this.selectedPlayerId) {
            onRowClick(this.selectedPlayerId);
        }
    }

    renderTiebreakerExplainer(breakdown) {
        if (!breakdown) {
            this.tiebreakerExplainerPanel.classList.add('hidden');
            return;
        }

        this.tiebreakerExplainerPanel.classList.remove('hidden');
        this.explainerPlayerName.textContent = breakdown.playerName;
        this.explainerBhVal.textContent = breakdown.buchholz.toFixed(1);
        this.explainerSbVal.textContent = breakdown.sonnebornBerger.toFixed(2);

        this.explainerBhList.innerHTML = '';
        if (breakdown.bhList.length === 0) {
            this.explainerBhList.innerHTML = '<li class="text-muted text-center" style="padding:0.5rem 0;">No history</li>';
        } else {
            breakdown.bhList.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span>${this._escapeHTML(item.opponentName)}</span>
                    <span>+${item.contribution.toFixed(1)}</span>
                `;
                this.explainerBhList.appendChild(li);
            });
        }

        this.explainerSbList.innerHTML = '';
        if (breakdown.sbList.length === 0) {
            this.explainerSbList.innerHTML = '<li class="text-muted text-center" style="padding:0.5rem 0;">No history</li>';
        } else {
            breakdown.sbList.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span>${this._escapeHTML(item.opponentName)} (${item.resultText})</span>
                    <span>+${item.contribution.toFixed(2)}</span>
                `;
                this.explainerSbList.appendChild(li);
            });
        }
    }

    /**
     * Renders registered roster in Player tab
     */
    renderRosterList(activeTour, onDeleteClick) {
        this.rosterPlayerList.innerHTML = '';
        
        if (!activeTour) return;

        const players = activeTour.players;
        this.playersRosterCount.textContent = `${players.length} Players`;
        this.startTournamentBtn.disabled = players.length < 2;

        if (players.length === 0) {
            this.rosterPlayerList.innerHTML = `
                <li class="empty-state">
                    <i class="fa-solid fa-users empty-icon"></i>
                    No players registered. Add grandmasters to start.
                </li>`;
            return;
        }

        players.forEach(p => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="player-info">
                    <span class="player-name-label">${this._escapeHTML(p.name)}</span>
                    <span class="player-rating-label"><i class="fa-solid fa-chess-board"></i> Rating: ${p.rating}</span>
                </div>
                ${!activeTour.isStarted ? `
                <button class="delete-player-btn" data-id="${p.id}" aria-label="Delete player">
                    <i class="fa-solid fa-trash-can"></i>
                </button>` : ''}
            `;

            if (!activeTour.isStarted) {
                li.querySelector('.delete-player-btn').addEventListener('click', (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    onDeleteClick(id);
                });
            }

            this.rosterPlayerList.appendChild(li);
        });
    }

    /**
     * Renders active Swiss pairings board cards
     */
    renderPairings(activeTour, displayedRound, onResultChange) {
        this.pairingsContainer.innerHTML = '';
        
        if (!activeTour) return;

        const roundMatches = activeTour.matches.filter(m => m.round === displayedRound);
        const players = activeTour.players;

        if (roundMatches.length === 0) {
            this.pairingsContainer.innerHTML = `
                <div class="empty-state" style="padding:3rem 1rem;">
                    <i class="fa-solid fa-chess-board empty-icon"></i>
                    <p>No pairings generated for Round ${displayedRound}.</p>
                </div>`;
            return;
        }

        roundMatches.forEach((match, index) => {
            const card = document.createElement('div');
            card.className = 'match-card';
            
            const p1 = players.find(p => p.id === match.player1Id);
            
            let p2Name = 'BYE';
            let p2Points = 0;
            const p2 = match.isBye() ? null : players.find(p => p.id === match.player2Id);

            if (p2) {
                p2Name = p2.name;
                p2Points = p2.points;
            }

            // Style headers
            let statusHTML = '';
            if (match.isBye()) {
                statusHTML = '<span class="match-status-badge bye">BYE</span>';
            } else if (match.isPlayed()) {
                statusHTML = '<span class="match-status-badge completed">COMPLETED</span>';
            } else {
                statusHTML = '<span class="match-status-badge unplayed">UNPLAYED</span>';
            }

            // Row active scores class
            let p1RowClass = '';
            let p2RowClass = '';
            let score1 = '-';
            let score2 = '-';

            if (match.isBye()) {
                p1RowClass = 'winner';
                score1 = '1';
                score2 = '0';
            } else if (match.isPlayed()) {
                if (match.result === '1-0') {
                    p1RowClass = 'winner';
                    p2RowClass = 'loser';
                    score1 = '1';
                    score2 = '0';
                } else if (match.result === '0-1') {
                    p1RowClass = 'loser';
                    p2RowClass = 'winner';
                    score1 = '0';
                    score2 = '1';
                } else if (match.result === '0.5-0.5') {
                    p1RowClass = 'draw';
                    p2RowClass = 'draw';
                    score1 = '½';
                    score2 = '½';
                }
            }

            card.innerHTML = `
                <div class="match-header">
                    <span>Board ${index + 1}</span>
                    ${statusHTML}
                </div>
                
                <div class="match-players">
                    <!-- Player 1 (White) -->
                    <div class="match-player-row ${p1RowClass}">
                        <div class="player-side">
                            <span class="color-indicator white" title="White">W</span>
                            <span class="player-name">${this._escapeHTML(p1.name)} <span class="player-points-tag">(${p1.points.toFixed(1)} pts)</span></span>
                        </div>
                        <div class="match-score">${score1}</div>
                    </div>
                    
                    <!-- Player 2 (Black) -->
                    <div class="match-player-row ${p2RowClass}">
                        <div class="player-side">
                            <span class="color-indicator black" title="Black">${match.isBye() ? 'BYE' : 'B'}</span>
                            <span class="player-name">${this._escapeHTML(p2Name)} ${p2 ? `<span class="player-points-tag">(${p2Points.toFixed(1)} pts)</span>` : ''}</span>
                        </div>
                        <div class="match-score">${score2}</div>
                    </div>
                </div>
                
                <!-- Results Actions Selector -->
                <div class="results-selector-container ${match.isBye() ? 'hidden' : ''}">
                    <div class="results-selector" data-match-id="${match.id}">
                        <button class="btn-result btn-win-white ${match.result === '1-0' ? 'active-win1' : ''}" data-result="1-0">
                            White Wins
                        </button>
                        <button class="btn-result btn-draw ${match.result === '0.5-0.5' ? 'active-draw' : ''}" data-result="0.5-0.5">
                            Draw
                        </button>
                        <button class="btn-result btn-win-black ${match.result === '0-1' ? 'active-win2' : ''}" data-result="0-1">
                            Black Wins
                        </button>
                    </div>
                </div>
            `;

            if (!match.isBye()) {
                card.querySelectorAll('.btn-result').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const targetResult = e.currentTarget.getAttribute('data-result');
                        onResultChange(match.id, targetResult);
                    });
                });
            }

            this.pairingsContainer.appendChild(card);
        });
    }

    /**
     * Renders settings descriptions and tiebreaker active arrays
     */
    renderSettingsPanel(activeTour) {
        if (!activeTour) return;

        this.settingsTourCreated.textContent = new Date(activeTour.createdAt).toLocaleString();
        this.settingsTourRoundsLimit.textContent = activeTour.maxRounds ? `${activeTour.maxRounds} rounds` : 'No limit (Auto)';
        
        let statusText = 'Setup Phase';
        let statusClass = 'badge';
        if (activeTour.isFinished) {
            statusText = 'Completed';
            statusClass = 'badge btn-success';
        } else if (activeTour.isStarted) {
            statusText = 'Active In-Progress';
            statusClass = 'badge btn-accent';
        }
        
        this.settingsTourStatus.textContent = statusText;
        this.settingsTourStatus.className = statusClass;

        // Render settings active tiebreaker priorities
        this.settingsTiebreakerPriorityList.innerHTML = '';
        this.sidebarTiebreakersList.innerHTML = '';

        const enabledTBs = activeTour.settings.tiebreakers || [];

        // Points is always primary
        const ptsLi = document.createElement('li');
        ptsLi.innerHTML = `<strong>Total Points</strong> <span class="text-muted">(Primary, standard win/draw scores)</span>`;
        this.settingsTiebreakerPriorityList.appendChild(ptsLi);

        const sidePtsLi = document.createElement('li');
        sidePtsLi.innerHTML = `Points`;
        this.sidebarTiebreakersList.appendChild(sidePtsLi);

        // Optional list
        enabledTBs.forEach(tb => {
            const li = document.createElement('li');
            const sideLi = document.createElement('li');
            
            let labelText = '';
            let descText = '';

            if (tb === 'buchholz') {
                labelText = 'Buchholz Score';
                descText = 'Sum of all played opponents\' points';
            } else if (tb === 'sonnebornBerger') {
                labelText = 'Sonneborn-Berger Score';
                descText = 'Sum of opponent points &times; match outcome';
            } else if (tb === 'directEncounter') {
                labelText = 'Direct Encounter';
                descText = 'Head-to-head match winner ranks higher';
            } else if (tb === 'wins') {
                labelText = 'Wins Count';
                descText = 'Highest raw win count';
            }

            li.innerHTML = `<strong>${labelText}</strong> <span class="text-muted">(${descText})</span>`;
            this.settingsTiebreakerPriorityList.appendChild(li);

            sideLi.textContent = labelText;
            this.sidebarTiebreakersList.appendChild(sideLi);
        });

        // Fallback seed
        const fallbackLi = document.createElement('li');
        fallbackLi.innerHTML = `<strong>Stable Seed</strong> <span class="text-muted">(Deterministic fallback, ensures zero random shifts)</span>`;
        this.settingsTiebreakerPriorityList.appendChild(fallbackLi);

        const sideFallbackLi = document.createElement('li');
        sideFallbackLi.textContent = 'Stable Hash Seed';
        this.sidebarTiebreakersList.appendChild(sideFallbackLi);
    }

    /**
     * Updates top summary counts in side headers
     */
    updateDashboardStats(activeTour) {
        if (!activeTour) {
            this.statRoundDisplay.textContent = '-';
            this.statCompletedDisplay.textContent = '-';
            this.statPlayersDisplay.textContent = '-';
            return;
        }

        this.statRoundDisplay.textContent = activeTour.currentRound > 0 ? activeTour.currentRound : '-';
        this.statPlayersDisplay.textContent = activeTour.players.length;

        if (activeTour.currentRound === 0) {
            this.statCompletedDisplay.textContent = '-';
            return;
        }

        const roundMatches = activeTour.matches.filter(m => m.round === activeTour.currentRound);
        const completed = roundMatches.filter(m => m.isPlayed()).length;
        this.statCompletedDisplay.textContent = `${completed}/${roundMatches.length}`;
    }

    // --- Modal togglers ---
    showCreateTourModal() {
        this.createTourModal.classList.remove('hidden');
        this.newTourName.focus();
    }

    hideCreateTourModal() {
        this.createTourModal.classList.add('hidden');
        this.createTournamentForm.reset();
    }

    showResetAppModal() {
        this.resetAppModal.classList.remove('hidden');
    }

    hideResetAppModal() {
        this.resetAppModal.classList.add('hidden');
    }

    showDeleteTourModal(name, id) {
        this.deleteTargetTourId = id;
        this.deleteTourNameDisplay.textContent = name;
        this.deleteTourModal.classList.remove('hidden');
    }

    hideDeleteTourModal() {
        this.deleteTourModal.classList.add('hidden');
        this.deleteTargetTourId = null;
    }

    showToast(message, type = 'info') {
        if (!this.toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let iconClass = 'fa-circle-info';
        if (type === 'success') iconClass = 'fa-circle-check';
        else if (type === 'warning') iconClass = 'fa-triangle-exclamation';
        else if (type === 'error') iconClass = 'fa-circle-xmark';

        toast.innerHTML = `
            <i class="fa-solid ${iconClass}"></i>
            <span>${this._escapeHTML(message)}</span>
        `;

        this.toastContainer.appendChild(toast);

        // Slide out after 3 seconds
        setTimeout(() => {
            toast.classList.add('slide-out');
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }, 3000);
    }

    // --- Helpers ---
    _escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }
}
