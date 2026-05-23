/**
 * Caissa Chess Tournament Manager - Controller Component (Multi-Tournament Edition)
 * 
 * Intercepts events, commands the Model, coordinates view refresh cycles, and manages localStorage.
 */

class TournamentController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.displayedRound = 1; // Round currently visible in pairings tab

        this.init();
    }

    init() {
        // Initialize UI tabs & theme
        this.view.initTabs();
        this.loadTheme();

        // Bind Event Listeners
        this.bindEvents();

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.tournament-selector-container')) {
                this.view.tournamentsDropdown.classList.add('hidden');
            }
        });

        // Load storage & state migration
        const loaded = this.model.loadFromStorage();
        if (loaded && this.model.activeTournamentId) {
            const active = this.model.getActiveTournament();
            this.displayedRound = active.currentRound || 1;
            this.view.setTournamentActiveUI(true, active);
            this.refreshUI();
        } else {
            this.view.setTournamentActiveUI(false);
            this.refreshDropdownUI();
        }
    }

    // --- Theme Loader ---
    loadTheme() {
        const savedTheme = localStorage.getItem('caissa_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', nextTheme);
        localStorage.setItem('caissa_theme', nextTheme);
    }

    // --- Event Binding ---
    bindEvents() {
        // Theme & Global Modals
        this.view.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
        this.view.resetAppBtn.addEventListener('click', () => this.view.showResetAppModal());
        this.view.confirmResetAppBtn.addEventListener('click', () => this.handleResetApp());
        
        // Tournament Selection dropdown togglers
        this.view.activeTournamentMenuBtn.addEventListener('click', () => {
            this.view.tournamentsDropdown.classList.toggle('hidden');
        });
        
        // Create Tournament trigger buttons
        this.view.createNewTourBtn.addEventListener('click', () => {
            this.view.tournamentsDropdown.classList.add('hidden');
            this.view.showCreateTourModal();
        });
        this.view.noTourCreateBtn.addEventListener('click', () => {
            this.view.showCreateTourModal();
        });

        // Create Tournament Form Submit
        this.view.createTournamentForm.addEventListener('submit', (e) => this.handleCreateTournament(e));

        // Delete Active Tournament
        this.view.deleteActiveTourBtn.addEventListener('click', () => {
            const active = this.model.getActiveTournament();
            if (active) {
                this.view.showDeleteTourModal(active.name, active.id);
            }
        });
        this.view.confirmDeleteTourBtn.addEventListener('click', () => this.handleDeleteTournament());

        // Close button handlers for all modals
        this.view.modalCloseBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.view.hideCreateTourModal();
                this.view.hideResetAppModal();
                this.view.hideDeleteTourModal();
            });
        });

        // Player entries listeners
        this.view.addPlayerForm.addEventListener('submit', (e) => this.handleAddPlayer(e));
        this.view.loadDummyPlayersBtn.addEventListener('click', () => this.handleLoadDemoPlayers());
        this.view.startTournamentBtn.addEventListener('click', () => this.handleStartTournament());

        // Settings actions listeners
        this.view.renameTournamentForm.addEventListener('submit', (e) => this.handleRenameTournament(e));

        // Pairings navigation listeners
        this.view.prevRoundBtn.addEventListener('click', () => this.handleNavigateRound(-1));
        this.view.nextRoundBtn.addEventListener('click', () => this.handleNavigateRound(1));
        this.view.generateNextRoundBtn.addEventListener('click', () => this.handleGenerateNextRound());
        
        // Close explainer card
        this.view.closeExplainerBtn.addEventListener('click', () => {
            this.view.selectedPlayerId = null;
            this.view.renderTiebreakerExplainer(null);
            document.querySelectorAll('#standings-tbody tr').forEach(row => row.classList.remove('selected'));
        });
    }

    // --- Multi-Tournament Operations ---
    handleCreateTournament(e) {
        e.preventDefault();
        const name = this.view.newTourName.value;
        const maxRoundsVal = this.view.newTourRounds.value;
        const maxRounds = maxRoundsVal ? parseInt(maxRoundsVal) : null;

        // Extract selected checkboxes tiebreakers values
        const tiebreakers = [];
        if (document.getElementById('tb-cb-buchholz').checked) tiebreakers.push('buchholz');
        if (document.getElementById('tb-cb-sb').checked) tiebreakers.push('sonnebornBerger');
        if (document.getElementById('tb-cb-de').checked) tiebreakers.push('directEncounter');
        if (document.getElementById('tb-cb-wins').checked) tiebreakers.push('wins');

        try {
            const tour = this.model.createTournament(name, maxRounds, tiebreakers);
            this.displayedRound = 1;
            this.view.hideCreateTourModal();
            
            // Activate views
            this.view.setTournamentActiveUI(true, tour);
            this.refreshUI();
            
            // Switch directly to Players panel to register rosters
            this.view.navigateToPanel('players-panel');
        } catch (error) {
            alert("Error: " + error.message);
        }
    }

    handleSelectTournament(id) {
        const ok = this.model.selectTournament(id);
        if (ok) {
            const active = this.model.getActiveTournament();
            this.displayedRound = active.currentRound || 1;
            this.view.selectedPlayerId = null;
            this.view.renderTiebreakerExplainer(null);
            this.view.setTournamentActiveUI(true, active);
            this.refreshUI();
        }
    }

    handleDeleteTournament() {
        const id = this.view.deleteTargetTourId;
        if (!id) return;

        this.model.deleteTournament(id);
        this.view.hideDeleteTourModal();
        
        const active = this.model.getActiveTournament();
        if (active) {
            this.displayedRound = active.currentRound || 1;
            this.view.selectedPlayerId = null;
            this.view.renderTiebreakerExplainer(null);
            this.view.setTournamentActiveUI(true, active);
            this.refreshUI();
        } else {
            this.view.setTournamentActiveUI(false);
            this.refreshDropdownUI();
        }
    }

    handleRenameTournament(e) {
        e.preventDefault();
        const active = this.model.getActiveTournament();
        if (!active) return;

        const newName = this.view.renameTourNameInput.value;
        try {
            this.model.renameTournament(active.id, newName);
            this.view.setTournamentActiveUI(true, active);
            this.refreshDropdownUI();
        } catch (error) {
            alert(error.message);
        }
    }

    handleResetApp() {
        this.model.resetAll();
        this.displayedRound = 1;
        this.view.selectedPlayerId = null;
        this.view.renderTiebreakerExplainer(null);
        this.view.setTournamentActiveUI(false);
        this.view.hideResetAppModal();
        this.refreshDropdownUI();
    }

    // --- Player Management ---
    handleAddPlayer(e) {
        e.preventDefault();
        const name = this.view.playerNameInput.value;
        const ratingVal = this.view.playerRatingInput.value;
        const rating = ratingVal ? parseInt(ratingVal) : 1200;

        try {
            this.model.addPlayer(name, rating);
            this.view.playerNameInput.value = '';
            this.view.playerRatingInput.value = '';
            this.refreshRosterUI();
            this.view.updateDashboardStats(this.model.getActiveTournament());
        } catch (error) {
            alert(error.message);
        }
    }

    handleDeletePlayer(id) {
        this.model.deletePlayer(id);
        this.refreshRosterUI();
        this.view.updateDashboardStats(this.model.getActiveTournament());
    }

    handleLoadDemoPlayers() {
        const active = this.model.getActiveTournament();
        if (!active) return;

        const demoGMs = [
            { name: "Magnus Carlsen", rating: 2882 },
            { name: "Hikaru Nakamura", rating: 2875 },
            { name: "Fabiano Caruana", rating: 2804 },
            { name: "Ding Liren", rating: 2780 },
            { name: "Ian Nepomniachtchi", rating: 2774 },
            { name: "Alireza Firouzja", rating: 2777 },
            { name: "Praggnanandhaa R", rating: 2747 },
            { name: "Gukesh D", rating: 2763 }
        ];

        let added = 0;
        demoGMs.forEach(p => {
            try {
                this.model.addPlayer(p.name, p.rating);
                added++;
            } catch (e) {
                // Ignore duplicates
            }
        });

        if (added > 0) {
            this.refreshRosterUI();
            this.view.updateDashboardStats(active);
        }
    }

    handleStartTournament() {
        const active = this.model.getActiveTournament();
        if (!active || active.players.length < 2) return;

        const ok = this.model.startTournament();
        if (ok) {
            this.displayedRound = 1;
            this.view.setTournamentActiveUI(true, active);
            this.refreshUI();
            
            // Auto switch directly to pairings page to begin result entries
            this.view.navigateToPanel('pairings-panel');
        }
    }

    // --- Pairings Navigation & Result Entries ---
    handleNavigateRound(direction) {
        const active = this.model.getActiveTournament();
        if (!active) return;

        const targetRound = this.displayedRound + direction;
        if (targetRound < 1 || targetRound > active.currentRound) return;

        this.displayedRound = targetRound;
        this.refreshPairingsUI();
    }

    handleResultEntry(matchId, result) {
        // Points calculation and sorting updates dynamically inside model on match edit
        this.model.setMatchResult(matchId, result);
        this.refreshUI();
    }

    handleGenerateNextRound() {
        const active = this.model.getActiveTournament();
        if (!active) return;

        // Verify current round completeness
        if (!this.model.isRoundCompleted(active.currentRound)) {
            alert(`Please enter all Board results for Round ${active.currentRound} before generating the next round.`);
            return;
        }

        const nextRound = active.currentRound + 1;
        
        // Evaluate custom rounds limits constraints
        const maxPossibleRounds = active.players.length - 1;
        let roundsLimit = active.maxRounds;

        if (!roundsLimit) {
            roundsLimit = maxPossibleRounds;
        } else if (roundsLimit > maxPossibleRounds) {
            // Cap round limits to possible opponents pairs count
            roundsLimit = maxPossibleRounds;
        }

        if (nextRound > roundsLimit) {
            this.handleFinishTournament();
            return;
        }

        try {
            this.model.generatePairings(nextRound);
            this.displayedRound = nextRound;
            this.refreshUI();
            
            // Slide immediately to pairings tab
            this.view.navigateToPanel('pairings-panel');
        } catch (error) {
            alert("Error: " + error.message);
        }
    }

    handleFinishTournament() {
        const active = this.model.getActiveTournament();
        if (!active) return;

        active.isFinished = true;
        this.model.saveToStorage();
        this.view.generateNextRoundBtn.classList.add('hidden');
        this.view.finishTournamentBtn.classList.add('hidden');
        
        this.refreshUI();
        
        alert("The tournament is completed! The final standings are now calculated and frozen.");
        this.view.navigateToPanel('standings-panel');
    }

    handleRowClick(playerId) {
        const breakdown = this.model.getPlayerTiebreakBreakdown(playerId);
        this.view.renderTiebreakerExplainer(breakdown);
    }

    // --- UI Synchronizer Pipeline ---
    refreshDropdownUI() {
        this.view.renderTournamentsDropdown(
            this.model.tournaments,
            this.model.activeTournamentId,
            (id) => this.handleSelectTournament(id),
            (id) => {
                const tour = this.model.tournaments.find(t => t.id === id);
                if (tour) {
                    this.view.tournamentsDropdown.classList.add('hidden');
                    this.view.showDeleteTourModal(tour.name, tour.id);
                }
            }
        );
    }

    refreshRosterUI() {
        const active = this.model.getActiveTournament();
        this.view.renderRosterList(active, (id) => this.handleDeletePlayer(id));
    }

    refreshPairingsUI() {
        const active = this.model.getActiveTournament();
        if (!active) return;

        this.view.currentRoundNumber.textContent = this.displayedRound;
        this.view.prevRoundBtn.disabled = this.displayedRound <= 1;
        this.view.nextRoundBtn.disabled = this.displayedRound >= active.currentRound;

        this.view.renderPairings(active, this.displayedRound, (mId, res) => this.handleResultEntry(mId, res));

        // Manage action buttons display
        if (this.displayedRound < active.currentRound || active.isFinished) {
            this.view.generateNextRoundBtn.classList.add('hidden');
            this.view.finishTournamentBtn.classList.add('hidden');
        } else {
            // Check if it is the final round
            const maxPossibleRounds = active.players.length - 1;
            let roundsLimit = active.maxRounds;
            if (!roundsLimit || roundsLimit > maxPossibleRounds) {
                roundsLimit = maxPossibleRounds;
            }

            if (active.currentRound === roundsLimit) {
                this.view.generateNextRoundBtn.classList.add('hidden');
                
                // Only show end tournament button if round completed
                if (this.model.isRoundCompleted(active.currentRound)) {
                    this.view.finishTournamentBtn.classList.remove('hidden');
                } else {
                    this.view.finishTournamentBtn.classList.add('hidden');
                }
            } else {
                this.view.generateNextRoundBtn.classList.remove('hidden');
                this.view.finishTournamentBtn.classList.add('hidden');
            }
        }
    }

    refreshUI() {
        const active = this.model.getActiveTournament();
        if (!active) return;

        // 1. Redraw Dropdown & sidebar stats
        this.refreshDropdownUI();
        this.view.updateDashboardStats(active);

        // 2. Redraw Standings
        this.view.renderStandings(active, (id) => this.handleRowClick(id));

        // 3. Redraw roster list
        this.refreshRosterUI();

        // 4. Redraw pairings
        this.refreshPairingsUI();

        // 5. Redraw settings metadata
        this.view.renderSettingsPanel(active);
    }
}
