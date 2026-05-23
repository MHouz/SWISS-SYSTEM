/**
 * Caissa Chess Tournament Manager - View Component
 * 
 * Manages the User Interface, DOM manipulation, event listener registration, and animations.
 */

class TournamentView {
    constructor() {
        // Cache DOM Elements
        this.themeToggleBtn = document.getElementById('theme-toggle');
        this.resetTournamentBtn = document.getElementById('reset-tournament-btn');
        
        this.playerCountBadge = document.getElementById('player-count-badge');
        
        // Registration Section Elements
        this.registrationSection = document.getElementById('registration-section');
        this.addPlayerForm = document.getElementById('add-player-form');
        this.playerNameInput = document.getElementById('player-name-input');
        this.playerRatingInput = document.getElementById('player-rating-input');
        this.addDummyPlayersBtn = document.getElementById('add-dummy-players-btn');
        this.registrationPlayerList = document.getElementById('registration-player-list');
        this.startTournamentBtn = document.getElementById('start-tournament-btn');
        
        // Active Tournament Elements
        this.activePlayersSection = document.getElementById('active-players-section');
        this.activePlayerList = document.getElementById('active-player-list');
        this.tournamentStateTitle = document.getElementById('tournament-state-title');
        this.tournamentStateDesc = document.getElementById('tournament-state-desc');
        this.statCurrentRound = document.getElementById('stat-current-round');
        this.statCompletedMatches = document.getElementById('stat-completed-matches');
        this.statLeaderName = document.getElementById('stat-leader-name');
        
        // Tabs
        this.tabBtns = document.querySelectorAll('.tab-btn');
        this.tabPanels = document.querySelectorAll('.tab-panel');
        this.pairingsTabBtn = document.getElementById('pairings-tab-btn');
        
        // Standings
        this.standingsTable = document.getElementById('standings-table');
        this.standingsTbody = document.getElementById('standings-tbody');
        
        // Explainer UI
        this.tiebreakerExplainerPanel = document.getElementById('tiebreaker-explainer-panel');
        this.explainerPlayerName = document.getElementById('explainer-player-name');
        this.explainerBhVal = document.getElementById('explainer-bh-val');
        this.explainerSbVal = document.getElementById('explainer-sb-val');
        this.explainerBhList = document.getElementById('explainer-bh-list');
        this.explainerSbList = document.getElementById('explainer-sb-list');
        this.closeExplainerBtn = document.getElementById('close-explainer-btn');
        
        // Pairings Section
        this.currentRoundNumber = document.getElementById('current-round-number');
        this.prevRoundBtn = document.getElementById('prev-round-btn');
        this.nextRoundBtn = document.getElementById('next-round-btn');
        this.generateNextRoundBtn = document.getElementById('generate-next-round-btn');
        this.finishTournamentBtn = document.getElementById('finish-tournament-btn');
        this.pairingsContainer = document.getElementById('pairings-container');
        
        // Modals
        this.resetModal = document.getElementById('reset-modal');
        this.confirmResetBtn = document.getElementById('confirm-reset-btn');
        this.modalCloseTriggers = document.querySelectorAll('.modal-close-trigger');

        this.selectedPlayerId = null; // Currently selected player in standings for tie-breaker breakdowns
    }

    // --- Tab Switcher ---
    initTabs() {
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.getAttribute('data-tab');
                
                this.tabBtns.forEach(b => b.classList.remove('active'));
                this.tabPanels.forEach(p => p.classList.remove('active'));
                
                btn.classList.add('active');
                const activePanel = document.getElementById(targetTab);
                if (activePanel) activePanel.classList.add('active');
            });
        });
    }

    // --- UI State Toggles ---
    setTournamentStartedUI(isStarted) {
        if (isStarted) {
            this.registrationSection.classList.add('hidden');
            this.activePlayersSection.classList.remove('hidden');
            this.pairingsTabBtn.removeAttribute('disabled');
            this.tournamentStateTitle.textContent = "Tournament Active";
            this.tournamentStateDesc.textContent = "Standings and pairings update dynamically.";
        } else {
            this.registrationSection.classList.remove('hidden');
            this.activePlayersSection.classList.add('hidden');
            this.pairingsTabBtn.setAttribute('disabled', 'true');
            this.tournamentStateTitle.textContent = "Tournament Setup";
            this.tournamentStateDesc.textContent = "Register players and launch the Swiss system tournament.";
            this.tiebreakerExplainerPanel.classList.add('hidden');
            
            // Switch back to standings tab
            const firstTab = this.tabBtns[0];
            firstTab.click();
        }
    }

    // --- Dynamic Rendering ---
    
    /**
     * Renders players list in the pre-start registration side panel
     */
    renderRegistrationPlayerList(players, onDeleteClick) {
        this.registrationPlayerList.innerHTML = '';
        this.playerCountBadge.textContent = `${players.length} Players`;
        this.startTournamentBtn.disabled = players.length < 2;

        if (players.length === 0) {
            this.registrationPlayerList.innerHTML = `
                <li class="empty-state">
                    <i class="fa-solid fa-users empty-icon"></i>
                    No players registered.
                </li>`;
            return;
        }

        players.forEach(player => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="player-info">
                    <span class="player-name-label">${this._escapeHTML(player.name)}</span>
                    <span class="player-rating-label"><i class="fa-solid fa-chess-board"></i> Elo: ${player.rating}</span>
                </div>
                <button class="delete-player-btn" data-id="${player.id}" aria-label="Delete Player">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            `;

            li.querySelector('.delete-player-btn').addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                onDeleteClick(id);
            });

            this.registrationPlayerList.appendChild(li);
        });
    }

    /**
     * Renders the running sidebar list of players sorted by score
     */
    renderActivePlayerList(players) {
        this.activePlayerList.innerHTML = '';
        if (players.length === 0) return;

        players.forEach((player, index) => {
            const li = document.createElement('li');
            li.className = 'active-player-item';
            li.innerHTML = `
                <span class="active-player-rank">#${index + 1}</span>
                <span class="active-player-name">${this._escapeHTML(player.name)}</span>
                <span class="active-player-score">${player.points.toFixed(1)} <span class="player-points-tag">pts</span></span>
            `;
            this.activePlayerList.appendChild(li);
        });
    }

    /**
     * Renders Standings Table incorporating precise tie-breaker details
     */
    renderStandings(players, onRowClick) {
        this.standingsTbody.innerHTML = '';

        if (players.length === 0) {
            this.standingsTbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <i class="fa-solid fa-chess empty-icon"></i>
                        <p>Register players and start the tournament to generate standings.</p>
                    </td>
                </tr>`;
            return;
        }

        // Leader stat card update
        this.statLeaderName.textContent = players[0].name;

        players.forEach((player, index) => {
            const rank = index + 1;
            const tr = document.createElement('tr');
            tr.setAttribute('data-id', player.id);
            
            if (this.selectedPlayerId === player.id) {
                tr.classList.add('selected');
            }

            // Style top ranks
            let rankClass = '';
            if (rank === 1) rankClass = 'row-rank-1';
            else if (rank === 2) rankClass = 'row-rank-2';
            else if (rank === 3) rankClass = 'row-rank-3';

            tr.innerHTML = `
                <td class="col-rank ${rankClass}">
                    ${rank === 1 ? '<i class="fa-solid fa-trophy"></i>' : ''} 
                    ${rank === 2 ? '<i class="fa-solid fa-medal"></i>' : ''} 
                    ${rank === 3 ? '<i class="fa-solid fa-medal"></i>' : ''} 
                    ${rank > 3 ? rank : ''}
                </td>
                <td class="col-name">${this._escapeHTML(player.name)}</td>
                <td class="col-rating">${player.rating}</td>
                <td class="col-val text-center text-accent">${player.points.toFixed(1)}</td>
                <td class="col-val text-center legend-color-bh">${player.buchholz.toFixed(1)}</td>
                <td class="col-val text-center legend-color-sb">${player.sonnebornBerger.toFixed(2)}</td>
                <td class="col-val text-center legend-color-de">${this._getDirectEncounterSymbol(player)}</td>
                <td class="col-val text-center legend-color-wins">${player.wins}</td>
            `;

            tr.addEventListener('click', () => {
                // Highlight row
                document.querySelectorAll('#standings-tbody tr').forEach(row => row.classList.remove('selected'));
                tr.classList.add('selected');
                
                this.selectedPlayerId = player.id;
                onRowClick(player.id);
            });

            this.standingsTbody.appendChild(tr);
        });

        // Keep explainer widget updated if open
        if (this.selectedPlayerId) {
            onRowClick(this.selectedPlayerId);
        }
    }

    _getDirectEncounterSymbol(player) {
        // Return check if the player has any Direct Encounter history points
        return '<i class="fa-solid fa-code-compare"></i>';
    }

    /**
     * Renders the interactive Tie-Breaker Breakdown widget
     */
    renderTiebreakerExplainer(breakdown) {
        if (!breakdown) {
            this.tiebreakerExplainerPanel.classList.add('hidden');
            return;
        }

        this.tiebreakerExplainerPanel.classList.remove('hidden');
        this.explainerPlayerName.textContent = breakdown.playerName;
        this.explainerBhVal.textContent = breakdown.buchholz.toFixed(1);
        this.explainerSbVal.textContent = breakdown.sonnebornBerger.toFixed(2);

        // Render Buchholz lists
        this.explainerBhList.innerHTML = '';
        if (breakdown.bhList.length === 0) {
            this.explainerBhList.innerHTML = '<li class="text-muted">No rounds played yet</li>';
        } else {
            breakdown.bhList.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span>${this._escapeHTML(item.opponentName)}</span>
                    <span>+${item.contribution.toFixed(1)} pts</span>
                `;
                this.explainerBhList.appendChild(li);
            });
        }

        // Render SB lists
        this.explainerSbList.innerHTML = '';
        if (breakdown.sbList.length === 0) {
            this.explainerSbList.innerHTML = '<li class="text-muted">No rounds played yet</li>';
        } else {
            breakdown.sbList.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span>${this._escapeHTML(item.opponentName)} (${item.resultText})</span>
                    <span>+${item.contribution.toFixed(2)} pts</span>
                `;
                this.explainerSbList.appendChild(li);
            });
        }
    }

    /**
     * Renders pairings and match cards for the selected round
     */
    renderPairings(roundMatches, players, onResultChange) {
        this.pairingsContainer.innerHTML = '';

        if (roundMatches.length === 0) {
            this.pairingsContainer.innerHTML = `
                <div class="empty-state btn-full">
                    <i class="fa-solid fa-chess-board empty-icon"></i>
                    No matches scheduled for this round.
                </div>`;
            return;
        }

        roundMatches.forEach((match, index) => {
            const card = document.createElement('div');
            card.className = 'match-card';
            
            const p1 = players.find(p => p.id === match.player1Id);
            
            let p2 = null;
            let p2Name = 'BYE';
            let p2Rating = '-';
            let p2Points = 0;

            if (!match.isBye()) {
                p2 = players.find(p => p.id === match.player2Id);
                p2Name = p2.name;
                p2Rating = p2.rating;
                p2Points = p2.points;
            }

            // Check match states
            let statusBadge = '';
            if (match.isBye()) {
                statusBadge = '<span class="match-status-badge bye">BYE</span>';
            } else if (match.isPlayed()) {
                statusBadge = '<span class="match-status-badge completed">COMPLETED</span>';
            } else {
                statusBadge = '<span class="match-status-badge unplayed">UNPLAYED</span>';
            }

            // Check row winner styling classes
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
                    ${statusBadge}
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
                            <span class="player-name">${this._escapeHTML(p2Name)} ${!match.isBye() ? `<span class="player-points-tag">(${p2Points.toFixed(1)} pts)</span>` : ''}</span>
                        </div>
                        <div class="match-score">${score2}</div>
                    </div>
                </div>
                
                <!-- Result Selector Form (Hidden if Bye match) -->
                <div class="results-selector-container ${match.isBye() ? 'hidden' : ''}">
                    <div class="results-selector" data-match-id="${match.id}">
                        <button class="btn-result btn-r-win1 ${match.result === '1-0' ? 'active-win1' : ''}" data-result="1-0">
                            White Wins
                        </button>
                        <button class="btn-result btn-r-draw ${match.result === '0.5-0.5' ? 'active-draw' : ''}" data-result="0.5-0.5">
                            Draw
                        </button>
                        <button class="btn-result btn-r-win2 ${match.result === '0-1' ? 'active-win2' : ''}" data-result="0-1">
                            Black Wins
                        </button>
                    </div>
                </div>
            `;

            // Bind click events to results selectors
            if (!match.isBye()) {
                card.querySelectorAll('.btn-result').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const targetResult = e.currentTarget.getAttribute('data-result');
                        // Trigger controller update
                        onResultChange(match.id, targetResult);
                    });
                });
            }

            this.pairingsContainer.appendChild(card);
        });
    }

    /**
     * Renders top dashboard stats (Round indices, completed counts)
     */
    updateDashboardStats(currentRound, matches) {
        this.statCurrentRound.textContent = currentRound > 0 ? currentRound : '-';
        
        if (currentRound === 0 || matches.length === 0) {
            this.statCompletedMatches.textContent = '-';
            return;
        }

        const roundMatches = matches.filter(m => m.round === currentRound);
        const completed = roundMatches.filter(m => m.isPlayed()).length;
        this.statCompletedMatches.textContent = `${completed}/${roundMatches.length}`;
    }

    // --- Modal Controls ---
    showResetModal() {
        this.resetModal.classList.remove('hidden');
    }

    hideResetModal() {
        this.resetModal.classList.add('hidden');
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
