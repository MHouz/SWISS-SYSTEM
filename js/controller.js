/**
 * Caissa Chess Tournament Manager - Controller Component
 * 
 * Binds the Model and the View, governs control flows, and manages event delegation.
 */

class TournamentController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.displayedRound = 1; // Round currently visible in pairings tab

        this.init();
    }

    init() {
        // Initialize basic UI behaviors
        this.view.initTabs();
        this.loadTheme();

        // Bind Event Listeners
        this.bindEvents();

        // Load pre-existing state on application startup
        const loaded = this.model.loadFromStorage();
        if (loaded) {
            this.displayedRound = this.model.currentRound;
            this.view.setTournamentStartedUI(this.model.isStarted);
            this.refreshUI();
        } else {
            this.view.setTournamentStartedUI(false);
            this.refreshRegistrationUI();
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

    // --- Binding Listeners ---
    bindEvents() {
        // Theme & Reset
        this.view.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
        this.view.resetTournamentBtn.addEventListener('click', () => this.view.showResetModal());
        this.view.confirmResetBtn.addEventListener('click', () => this.handleResetTournament());
        
        this.view.modalCloseTriggers.forEach(btn => {
            btn.addEventListener('click', () => {
                this.view.hideResetModal();
            });
        });

        // Player registration listeners
        this.view.addPlayerForm.addEventListener('submit', (e) => this.handleAddPlayer(e));
        this.view.addDummyPlayersBtn.addEventListener('click', () => this.handleLoadDemoPlayers());
        this.view.startTournamentBtn.addEventListener('click', () => this.handleStartTournament());

        // Round Navigation
        this.view.prevRoundBtn.addEventListener('click', () => this.handleNavigateRound(-1));
        this.view.nextRoundBtn.addEventListener('click', () => this.handleNavigateRound(1));
        this.view.generateNextRoundBtn.addEventListener('click', () => this.handleGenerateNextRound());
        
        // Explainer close
        this.view.closeExplainerBtn.addEventListener('click', () => {
            this.view.selectedPlayerId = null;
            this.view.renderTiebreakerExplainer(null);
            // Remove selected row class
            document.querySelectorAll('#standings-tbody tr').forEach(row => row.classList.remove('selected'));
        });
    }

    // --- Controller Handlers ---
    handleAddPlayer(e) {
        e.preventDefault();
        const name = this.view.playerNameInput.value;
        const ratingVal = this.view.playerRatingInput.value;
        const rating = ratingVal ? parseInt(ratingVal) : 1200;

        try {
            this.model.addPlayer(name, rating);
            this.view.playerNameInput.value = '';
            this.view.playerRatingInput.value = '';
            this.refreshRegistrationUI();
        } catch (error) {
            alert(error.message);
        }
    }

    handleDeletePlayer(id) {
        this.model.deletePlayer(id);
        this.refreshRegistrationUI();
    }

    handleLoadDemoPlayers() {
        const demoPlayers = [
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
        demoPlayers.forEach(p => {
            try {
                this.model.addPlayer(p.name, p.rating);
                added++;
            } catch (e) {
                // Skip if duplicate name
            }
        });

        if (added > 0) {
            this.refreshRegistrationUI();
        }
    }

    handleStartTournament() {
        if (this.model.players.length < 2) return;
        
        const ok = this.model.startTournament();
        if (ok) {
            this.displayedRound = 1;
            this.view.setTournamentStartedUI(true);
            this.refreshUI();
            
            // Auto switch to pairings tab to prompt result entries
            this.view.pairingsTabBtn.click();
        }
    }

    handleNavigateRound(direction) {
        const targetRound = this.displayedRound + direction;
        if (targetRound < 1 || targetRound > this.model.currentRound) return;
        
        this.displayedRound = targetRound;
        this.refreshPairingsUI();
    }

    handleResultEntry(matchId, result) {
        this.model.setMatchResult(matchId, result);
        this.refreshUI();
    }

    handleGenerateNextRound() {
        // Validate if current round matches are completed
        if (!this.model.isRoundCompleted(this.model.currentRound)) {
            alert(`Please enter the results of all matches in Round ${this.model.currentRound} before generating Round ${this.model.currentRound + 1}.`);
            return;
        }

        const nextRound = this.model.currentRound + 1;
        
        // Prevent exceeding sensible rounds limit: e.g. for N players, max Swiss rounds is usually log2(N) rounded up.
        // But we can let them run as many rounds as they have opponents to play.
        const maxPossibleRounds = this.model.players.length - 1;
        if (nextRound > maxPossibleRounds) {
            alert(`Maximum Swiss rounds for ${this.model.players.length} players reached (${maxPossibleRounds} rounds). The tournament will now conclude.`);
            this.handleFinishTournament();
            return;
        }

        try {
            this.model.generatePairings(nextRound);
            this.displayedRound = nextRound;
            this.refreshUI();
            
            // Smoothly switch view to pairings
            this.view.pairingsTabBtn.click();
        } catch (e) {
            alert("Error generating pairings: " + e.message);
        }
    }

    handleFinishTournament() {
        this.model.isFinished = true;
        this.model.saveToStorage();
        this.view.generateNextRoundBtn.classList.add('hidden');
        alert("The tournament is completed! The final standings are now calculated and frozen.");
    }

    handleResetTournament() {
        this.model.resetTournament();
        this.displayedRound = 1;
        this.view.setTournamentStartedUI(false);
        this.view.selectedPlayerId = null;
        
        this.refreshRegistrationUI();
        this.view.renderStandings([], () => {});
        this.view.renderActivePlayerList([]);
        this.view.hideResetModal();
    }

    handleRowClick(playerId) {
        const breakdown = this.model.getPlayerTiebreakBreakdown(playerId);
        this.view.renderTiebreakerExplainer(breakdown);
    }

    // --- UI Update Pipeline ---
    refreshRegistrationUI() {
        this.view.renderRegistrationPlayerList(this.model.players, (id) => this.handleDeletePlayer(id));
    }

    refreshPairingsUI() {
        this.view.currentRoundNumber.textContent = this.displayedRound;
        
        // Disable navigation buttons at bounds
        this.view.prevRoundBtn.disabled = this.displayedRound <= 1;
        this.view.nextRoundBtn.disabled = this.displayedRound >= this.model.currentRound;

        const roundMatches = this.model.matches.filter(m => m.round === this.displayedRound);
        this.view.renderPairings(roundMatches, this.model.players, (mId, res) => this.handleResultEntry(mId, res));
        
        // Hide next round generators if navigating historical rounds or tournament completed
        if (this.displayedRound < this.model.currentRound || this.model.isFinished) {
            this.view.generateNextRoundBtn.classList.add('hidden');
        } else {
            this.view.generateNextRoundBtn.classList.remove('hidden');
        }
    }

    refreshUI() {
        // Redraw standings
        this.view.renderStandings(this.model.players, (id) => this.handleRowClick(id));
        this.view.renderActivePlayerList(this.model.players);
        
        // Redraw pairings
        this.refreshPairingsUI();

        // Update banners
        this.view.updateDashboardStats(this.model.currentRound, this.model.matches);
    }
}
