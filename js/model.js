/**
 * Caissa Chess Tournament Manager - Model Component
 * 
 * Manages the tournament state, Swiss pairings logic, and precise tie-breakers calculations.
 */

class Player {
    constructor(id, name, rating = 1200) {
        this.id = id;
        this.name = name;
        this.rating = parseInt(rating) || 1200;
        
        // Dynamic standings state (reset and calculated on every update)
        this.points = 0.0;
        this.wins = 0;
        this.buchholz = 0.0;
        this.sonnebornBerger = 0.0;
        
        // Completed matches list: { opponentId, result (1/0.5/0), color ('W'|'B'|'N'), round }
        this.history = [];
        
        // Stable deterministic seed for last-resort fallback
        this.seed = this._generateSeed(name, id);
    }

    _generateSeed(name, id) {
        let hash = 0;
        const str = name + id;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return Math.abs(hash) % 100000;
    }

    /**
     * Resets the player's dynamic standings statistics to guarantee a clean slate before recalculation.
     */
    resetStats() {
        this.points = 0.0;
        this.wins = 0;
        this.buchholz = 0.0;
        this.sonnebornBerger = 0.0;
        this.history = [];
    }
}

class Match {
    constructor(id, round, player1Id, player2Id, result = null) {
        this.id = id;
        this.round = round;
        this.player1Id = player1Id; // White player (usually, or randomized)
        this.player2Id = player2Id; // Black player (or 'bye')
        this.result = result;       // '1-0' (Player 1 Wins), '0-1' (Player 2 Wins), '0.5-0.5' (Draw), or null (Unplayed)
    }

    isPlayed() {
        return this.result !== null;
    }
    
    isBye() {
        return this.player2Id === 'bye';
    }
}

class TournamentModel {
    constructor() {
        this.players = [];
        this.matches = [];
        this.currentRound = 0;
        this.isStarted = false;
        this.isFinished = false;
        
        this.STORAGE_KEY = 'caissa_tournament_state';
    }

    // --- State Persistence ---
    saveToStorage() {
        const state = {
            players: this.players.map(p => ({ id: p.id, name: p.name, rating: p.rating })),
            matches: this.matches,
            currentRound: this.currentRound,
            isStarted: this.isStarted,
            isFinished: this.isFinished
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    }

    loadFromStorage() {
        try {
            const dataStr = localStorage.getItem(this.STORAGE_KEY);
            if (!dataStr) return false;

            const state = JSON.parse(dataStr);
            this.players = state.players.map(p => new Player(p.id, p.name, p.rating));
            this.matches = state.matches.map(m => new Match(m.id, m.round, m.player1Id, m.player2Id, m.result));
            this.currentRound = state.currentRound;
            this.isStarted = state.isStarted;
            this.isFinished = state.isFinished;

            this.recalculateStandings();
            return true;
        } catch (e) {
            console.error("Failed to load tournament state:", e);
            this.resetTournament();
            return false;
        }
    }

    resetTournament() {
        this.players = [];
        this.matches = [];
        this.currentRound = 0;
        this.isStarted = false;
        this.isFinished = false;
        localStorage.removeItem(this.STORAGE_KEY);
    }

    // --- Player Management ---
    addPlayer(name, rating) {
        if (this.isStarted) return false;
        const cleanName = name.trim();
        if (!cleanName) return false;
        
        // Prevent duplicate names
        if (this.players.some(p => p.name.toLowerCase() === cleanName.toLowerCase())) {
            throw new Error(`A player named "${cleanName}" already exists.`);
        }

        const id = 'player_' + Math.random().toString(36).substr(2, 9);
        const player = new Player(id, cleanName, rating);
        this.players.push(player);
        this.saveToStorage();
        return player;
    }

    deletePlayer(id) {
        if (this.isStarted) return false;
        this.players = this.players.filter(p => p.id !== id);
        this.saveToStorage();
        return true;
    }

    getPlayer(id) {
        return this.players.find(p => p.id === id);
    }

    // --- Tournament Operations ---
    startTournament() {
        if (this.isStarted || this.players.length < 2) return false;
        this.isStarted = true;
        this.currentRound = 1;
        this.generatePairings(1);
        this.recalculateStandings();
        this.saveToStorage();
        return true;
    }

    // --- Core Tie-Breakers Calculations ---
    recalculateStandings() {
        // 1. Reset all player statistics first to prevent stale calculations
        this.players.forEach(p => p.resetStats());

        // 2. Iterate through all completed matches and accumulate Points, Wins, and Head-to-Head history
        this.matches.forEach(match => {
            if (!match.isPlayed()) return;

            const p1 = this.getPlayer(match.player1Id);
            if (!p1) return;

            if (match.isBye()) {
                // A bye gives 1.0 point
                p1.points += 1.0;
                p1.history.push({
                    opponentId: 'bye',
                    result: 1.0,
                    color: 'N',
                    round: match.round
                });
                return;
            }

            const p2 = this.getPlayer(match.player2Id);
            if (!p2) return;

            if (match.result === '1-0') {
                p1.points += 1.0;
                p1.wins += 1;
                
                p1.history.push({ opponentId: p2.id, result: 1.0, color: 'W', round: match.round });
                p2.history.push({ opponentId: p1.id, result: 0.0, color: 'B', round: match.round });
            } else if (match.result === '0-1') {
                p2.points += 1.0;
                p2.wins += 1;
                
                p1.history.push({ opponentId: p2.id, result: 0.0, color: 'W', round: match.round });
                p2.history.push({ opponentId: p1.id, result: 1.0, color: 'B', round: match.round });
            } else if (match.result === '0.5-0.5') {
                p1.points += 0.5;
                p2.points += 0.5;
                
                p1.history.push({ opponentId: p2.id, result: 0.5, color: 'W', round: match.round });
                p2.history.push({ opponentId: p1.id, result: 0.5, color: 'B', round: match.round });
            }
        });

        // 3. Since all players' total points are computed, we can calculate Buchholz & Sonneborn-Berger
        this.players.forEach(player => {
            player.history.forEach(game => {
                if (game.opponentId === 'bye') return; // Byes do not contribute to opponents' scores
                
                const opponent = this.getPlayer(game.opponentId);
                if (!opponent) return;

                // Buchholz: Sum of all opponents' total points
                player.buchholz += opponent.points;

                // Sonneborn-Berger: Sum of opponent points * result weight
                player.sonnebornBerger += (opponent.points * game.result);
            });
        });

        // 4. Stable Multi-Key Tie-Breaker Sort
        this.players.sort((a, b) => {
            // Tie-breaker 1: Total Points
            if (b.points !== a.points) return b.points - a.points;

            // Tie-breaker 2: Buchholz Score
            if (Math.abs(b.buchholz - a.buchholz) > 0.0001) return b.buchholz - a.buchholz;

            // Tie-breaker 3: Sonneborn-Berger Score
            if (Math.abs(b.sonnebornBerger - a.sonnebornBerger) > 0.0001) return b.sonnebornBerger - a.sonnebornBerger;

            // Tie-breaker 4: Direct Encounter (Head-to-Head)
            const de = this._compareDirectEncounter(a, b);
            if (de !== 0) return de;

            // Tie-breaker 5: Number of Wins
            if (b.wins !== a.wins) return b.wins - a.wins;

            // Tie-breaker 6: Deterministic Seed Fallback
            return a.seed - b.seed;
        });
    }

    /**
     * Direct Encounter: If tied players played each other, the winner ranks higher.
     * Returns -1 if player A is ranked higher, 1 if player B is ranked higher, or 0 if tied.
     */
    _compareDirectEncounter(a, b) {
        const matchRecord = a.history.find(game => game.opponentId === b.id);
        if (!matchRecord) return 0; // Did not play each other

        if (matchRecord.result === 1.0) return -1; // A beat B, so A ranks higher (comes first)
        if (matchRecord.result === 0.0) return 1;  // B beat A, so B ranks higher
        return 0; // Drawn match
    }

    /**
     * Gets a detailed breakdown of tie-breakers for UI presentation.
     */
    getPlayerTiebreakBreakdown(playerId) {
        const player = this.getPlayer(playerId);
        if (!player) return null;

        const bhBreakdown = [];
        const sbBreakdown = [];

        player.history.forEach(game => {
            if (game.opponentId === 'bye') {
                bhBreakdown.push({ opponentName: 'BYE (Excluded)', points: 0, contribution: 0 });
                sbBreakdown.push({ opponentName: 'BYE (Excluded)', points: 0, contribution: 0 });
                return;
            }

            const opp = this.getPlayer(game.opponentId);
            if (!opp) return;

            bhBreakdown.push({
                opponentName: opp.name,
                points: opp.points,
                contribution: opp.points
            });

            sbBreakdown.push({
                opponentName: opp.name,
                points: opp.points,
                contribution: opp.points * game.result,
                resultText: game.result === 1.0 ? 'Win (1.0x)' : (game.result === 0.5 ? 'Draw (0.5x)' : 'Loss (0.0x)')
            });
        });

        return {
            playerName: player.name,
            points: player.points,
            buchholz: player.buchholz,
            sonnebornBerger: player.sonnebornBerger,
            bhList: bhBreakdown,
            sbList: sbBreakdown
        };
    }

    // --- Result Entries ---
    setMatchResult(matchId, result) {
        const match = this.matches.find(m => m.id === matchId);
        if (!match) return false;

        match.result = result;
        this.recalculateStandings();
        this.saveToStorage();
        return true;
    }

    isRoundCompleted(roundNum) {
        const roundMatches = this.matches.filter(m => m.round === roundNum);
        if (roundMatches.length === 0) return false;
        return roundMatches.every(m => m.isPlayed());
    }

    // --- Swiss Pairings Generation Engine ---
    generatePairings(roundNumber) {
        // 1. Clean out any pre-existing matches for this round
        this.matches = this.matches.filter(m => m.round !== roundNumber);

        // 2. Prepare candidates
        // Sort candidates based on current points (descending), then rating (descending), then deterministic seed
        const candidates = [...this.players];
        candidates.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.rating !== a.rating) return b.rating - a.rating;
            return a.seed - b.seed;
        });

        // 3. Keep track of already played opponent IDs for each player
        const playedOpponents = {};
        this.players.forEach(p => {
            playedOpponents[p.id] = new Set(
                this.matches
                    .filter(m => m.isPlayed() && !m.isBye())
                    .filter(m => m.player1Id === p.id || m.player2Id === p.id)
                    .map(m => m.player1Id === p.id ? m.player2Id : m.player1Id)
            );
        });

        // 4. Handle Odd Number of Players: assign a BYE to the lowest score player who hasn't had one yet
        let byePlayerId = null;
        if (candidates.length % 2 !== 0) {
            // Find lowest player (reverse candidates order) who hasn't had a bye
            const hadBye = new Set(
                this.matches.filter(m => m.isBye()).map(m => m.player1Id)
            );

            for (let i = candidates.length - 1; i >= 0; i--) {
                const p = candidates[i];
                if (!hadBye.has(p.id)) {
                    byePlayerId = p.id;
                    // Create the bye match
                    const byeMatchId = `match_r${roundNumber}_bye`;
                    const byeMatch = new Match(byeMatchId, roundNumber, byePlayerId, 'bye', '1-0'); // Bye counts as Win
                    this.matches.push(byeMatch);
                    
                    // Remove bye player from active candidates to pair
                    candidates.splice(i, 1);
                    break;
                }
            }

            // If somehow everyone had a bye (rare but mathematically possible in long tournaments), 
            // give it to the lowest ranked player overall
            if (!byePlayerId && candidates.length > 0) {
                const lastIdx = candidates.length - 1;
                byePlayerId = candidates[lastIdx].id;
                const byeMatchId = `match_r${roundNumber}_bye`;
                const byeMatch = new Match(byeMatchId, roundNumber, byePlayerId, 'bye', '1-0');
                this.matches.push(byeMatch);
                candidates.splice(lastIdx, 1);
            }
        }

        // 5. Backtracking Swiss Pairing Solver
        // This solves pairing matches within scores avoiding duplicate pairings
        const pairings = [];
        const success = this._solvePairings(candidates, playedOpponents, pairings);

        if (!success) {
            // If pairing is mathematically impossible because of strict head-to-head exclusions,
            // fall back to pairing without head-to-head checking (should not happen in ordinary round numbers, but safe fallback)
            console.warn("Backtracking Swiss solver failed to find duplicate-free pairings. Falling back to relaxed pairings.");
            this._generateRelaxedPairings(candidates, pairings);
        }

        // 6. Convert solved pairings into Match instances and allocate colors
        pairings.forEach((pair, idx) => {
            const p1 = pair[0];
            const p2 = pair[1];
            const matchId = `match_r${roundNumber}_${idx + 1}`;
            
            // Color balance: Try to assign white to the player who has played white fewer times
            const p1WhiteCount = this.matches.filter(m => m.player1Id === p1.id && m.isPlayed()).length;
            const p2WhiteCount = this.matches.filter(m => m.player1Id === p2.id && m.isPlayed()).length;
            
            let whiteId = p1.id;
            let blackId = p2.id;

            if (p1WhiteCount > p2WhiteCount) {
                whiteId = p2.id;
                blackId = p1.id;
            }

            const match = new Match(matchId, roundNumber, whiteId, blackId, null);
            this.matches.push(match);
        });

        this.currentRound = roundNumber;
        this.saveToStorage();
        return true;
    }

    /**
     * Backtracking recursive solver to search for valid, duplicate-free matches.
     */
    _solvePairings(players, playedOpponents, pairings) {
        if (players.length === 0) return true;

        const first = players[0];
        
        // Find candidates to pair with 'first'
        for (let i = 1; i < players.length; i++) {
            const candidate = players[i];

            // Check if they have already played each other
            if (!playedOpponents[first.id].has(candidate.id)) {
                // Try this pairing
                pairings.push([first, candidate]);
                
                // Form a new sub-problem list excluding 'first' and 'candidate'
                const subProblemList = players.filter(p => p.id !== first.id && p.id !== candidate.id);
                
                // Recurse
                if (this._solvePairings(subProblemList, playedOpponents, pairings)) {
                    return true;
                }
                
                // Backtrack if failed
                pairings.pop();
            }
        }

        return false;
    }

    /**
     * Relaxed fallback pairing if strict pairing fails (pairs order top-down).
     */
    _generateRelaxedPairings(players, pairings) {
        for (let i = 0; i < players.length; i += 2) {
            if (i + 1 < players.length) {
                pairings.push([players[i], players[i+1]]);
            }
        }
    }
}
