/**
 * Caissa Chess Tournament Manager - Model Component (Multi-Tournament Edition)
 * 
 * Manages multiple independent tournament states, Swiss pairings, and the precise, 
 * dynamic, and deterministic tie-breaker engine.
 */

class Player {
    constructor(id, name, rating = 1200) {
        this.id = id;
        this.name = name;
        this.rating = parseInt(rating) || 1200;
        
        // Standings cache (cleared and recalculated dynamically)
        this.points = 0.0;
        this.wins = 0;
        this.buchholz = 0.0;
        this.sonnebornBerger = 0.0;
        
        // Opponents list for calculations: { opponentId, result (1/0.5/0), round }
        this.opponents = [];
        
        // Deterministic stable seed based on stable player attributes
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

    resetStats() {
        this.points = 0.0;
        this.wins = 0;
        this.buchholz = 0.0;
        this.sonnebornBerger = 0.0;
        this.opponents = [];
    }
}

class Match {
    constructor(id, round, player1Id, player2Id, result = null) {
        this.id = id;
        this.round = round;
        this.player1Id = player1Id; // Usually White
        this.player2Id = player2Id; // Black (or 'bye')
        this.result = result;       // '1-0' (Player 1 wins), '0-1' (Player 2 wins), '0.5-0.5' (Draw), or null (Unplayed)
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
        this.tournaments = [];
        this.activeTournamentId = null;
        this.STORAGE_KEY = 'caissa_multi_tournament_state';
        
        // Legacy storage key for auto-migration
        this.LEGACY_KEY = 'caissa_tournament_state';
    }

    // --- State Persistence & Migration ---
    saveToStorage() {
        const state = {
            tournaments: this.tournaments.map(t => ({
                id: t.id,
                name: t.name,
                createdAt: t.createdAt,
                maxRounds: t.maxRounds,
                isStarted: t.isStarted,
                isFinished: t.isFinished,
                currentRound: t.currentRound,
                settings: t.settings,
                players: t.players.map(p => ({ id: p.id, name: p.name, rating: p.rating })),
                matches: t.matches.map(m => ({
                    id: m.id,
                    round: m.round,
                    player1Id: m.player1Id,
                    player2Id: m.player2Id,
                    result: m.result
                }))
            })),
            activeTournamentId: this.activeTournamentId
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    }

    loadFromStorage() {
        // 1. Attempt to load multi-tournament state
        const multiDataStr = localStorage.getItem(this.STORAGE_KEY);
        if (multiDataStr) {
            try {
                const state = JSON.parse(multiDataStr);
                this.tournaments = state.tournaments.map(t => {
                    const tournament = {
                        id: t.id,
                        name: t.name,
                        createdAt: t.createdAt || Date.now(),
                        maxRounds: t.maxRounds || null,
                        isStarted: t.isStarted || false,
                        isFinished: t.isFinished || false,
                        currentRound: t.currentRound || 0,
                        settings: t.settings || { tiebreakers: ['buchholz', 'sonnebornBerger', 'directEncounter', 'wins'] },
                        players: t.players.map(p => new Player(p.id, p.name, p.rating)),
                        matches: t.matches.map(m => new Match(m.id, m.round, m.player1Id, m.player2Id, m.result))
                    };
                    return tournament;
                });
                this.activeTournamentId = state.activeTournamentId;
                
                // Recalculate standings for the active tournament
                if (this.activeTournamentId) {
                    this.recalculateStandings();
                }
                return true;
            } catch (e) {
                console.error("Failed to parse multi-tournament data:", e);
            }
        }

        // 2. Auto-migrate legacy format
        const legacyDataStr = localStorage.getItem(this.LEGACY_KEY);
        if (legacyDataStr) {
            try {
                const legacy = JSON.parse(legacyDataStr);
                const newId = 'tour_' + Date.now();
                const migrated = {
                    id: newId,
                    name: 'Migrated Tournament',
                    createdAt: Date.now(),
                    maxRounds: null,
                    isStarted: legacy.isStarted || false,
                    isFinished: legacy.isFinished || false,
                    currentRound: legacy.currentRound || 0,
                    settings: { tiebreakers: ['buchholz', 'sonnebornBerger', 'directEncounter', 'wins'] },
                    players: legacy.players.map(p => new Player(p.id, p.name, p.rating)),
                    matches: legacy.matches.map(m => new Match(m.id, m.round, m.player1Id, m.player2Id, m.result))
                };
                
                this.tournaments = [migrated];
                this.activeTournamentId = newId;
                
                this.recalculateStandings();
                this.saveToStorage();
                
                // Clean up legacy storage
                localStorage.removeItem(this.LEGACY_KEY);
                console.log("Successfully migrated legacy tournament structure to Multi-Tournament schema.");
                return true;
            } catch (e) {
                console.error("Failed to migrate legacy tournament:", e);
            }
        }

        // 3. Setup empty defaults if no storage exists
        this.tournaments = [];
        this.activeTournamentId = null;
        return false;
    }

    resetAll() {
        this.tournaments = [];
        this.activeTournamentId = null;
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem(this.LEGACY_KEY);
    }

    // --- Multi-Tournament Controls ---
    getActiveTournament() {
        return this.tournaments.find(t => t.id === this.activeTournamentId) || null;
    }

    createTournament(name, maxRounds, tiebreakers) {
        const cleanName = name.trim();
        if (!cleanName) throw new Error("Tournament name cannot be empty.");

        const id = 'tour_' + Math.random().toString(36).substr(2, 9);
        const newTour = {
            id: id,
            name: cleanName,
            createdAt: Date.now(),
            maxRounds: maxRounds ? parseInt(maxRounds) : null,
            isStarted: false,
            isFinished: false,
            currentRound: 0,
            settings: {
                tiebreakers: tiebreakers || ['buchholz', 'sonnebornBerger', 'directEncounter', 'wins']
            },
            players: [],
            matches: []
        };

        this.tournaments.push(newTour);
        this.activeTournamentId = id;
        this.saveToStorage();
        return newTour;
    }

    selectTournament(id) {
        const exists = this.tournaments.some(t => t.id === id);
        if (!exists) return false;

        this.activeTournamentId = id;
        this.recalculateStandings();
        this.saveToStorage();
        return true;
    }

    deleteTournament(id) {
        this.tournaments = this.tournaments.filter(t => t.id !== id);
        if (this.activeTournamentId === id) {
            this.activeTournamentId = this.tournaments.length > 0 ? this.tournaments[0].id : null;
        }
        
        if (this.activeTournamentId) {
            this.recalculateStandings();
        }
        
        this.saveToStorage();
        return true;
    }

    renameTournament(id, newName) {
        const cleanName = newName.trim();
        if (!cleanName) throw new Error("Name cannot be empty.");
        
        const tour = this.tournaments.find(t => t.id === id);
        if (!tour) return false;

        tour.name = cleanName;
        this.saveToStorage();
        return true;
    }

    // --- Player Management ---
    addPlayer(name, rating) {
        const active = this.getActiveTournament();
        if (!active) throw new Error("No active tournament selected.");
        if (active.isStarted) throw new Error("Cannot add players after tournament starts.");

        const cleanName = name.trim();
        if (!cleanName) throw new Error("Player name cannot be empty.");

        // Check duplicates inside active tournament
        if (active.players.some(p => p.name.toLowerCase() === cleanName.toLowerCase())) {
            throw new Error(`A player named "${cleanName}" already exists in this tournament.`);
        }

        const id = 'player_' + Math.random().toString(36).substr(2, 9);
        const player = new Player(id, cleanName, rating);
        active.players.push(player);
        this.saveToStorage();
        return player;
    }

    deletePlayer(id) {
        const active = this.getActiveTournament();
        if (!active || active.isStarted) return false;

        active.players = active.players.filter(p => p.id !== id);
        this.saveToStorage();
        return true;
    }

    getPlayer(id) {
        const active = this.getActiveTournament();
        if (!active) return null;
        return active.players.find(p => p.id === id) || null;
    }

    // --- Tournament Controls ---
    startTournament() {
        const active = this.getActiveTournament();
        if (!active || active.isStarted || active.players.length < 2) return false;

        active.isStarted = true;
        active.currentRound = 1;
        this.generatePairings(1);
        this.recalculateStandings();
        this.saveToStorage();
        return true;
    }

    // --- Dynamic Standings & Tie-Breakers Engine ---
    recalculateStandings() {
        const active = this.getActiveTournament();
        if (!active) return;

        // 1. Reset all player statistics first to prevent stale calculations
        active.players.forEach(p => p.resetStats());

        // 2. Iterate through all completed matches and build points/wins/opponents history
        active.matches.forEach(match => {
            if (!match.isPlayed()) return;

            const p1 = active.players.find(p => p.id === match.player1Id);
            if (!p1) return;

            if (match.isBye()) {
                p1.points += 1.0;
                // Byes do not add to opponents list for Buchholz/SB calculations
                return;
            }

            const p2 = active.players.find(p => p.id === match.player2Id);
            if (!p2) return;

            if (match.result === '1-0') {
                p1.points += 1.0;
                p1.wins += 1;
                p1.opponents.push({ opponentId: p2.id, result: 1.0, round: match.round });
                p2.opponents.push({ opponentId: p1.id, result: 0.0, round: match.round });
            } else if (match.result === '0-1') {
                p2.points += 1.0;
                p2.wins += 1;
                p1.opponents.push({ opponentId: p2.id, result: 0.0, round: match.round });
                p2.opponents.push({ opponentId: p1.id, result: 1.0, round: match.round });
            } else if (match.result === '0.5-0.5') {
                p1.points += 0.5;
                p2.points += 0.5;
                p1.opponents.push({ opponentId: p2.id, result: 0.5, round: match.round });
                p2.opponents.push({ opponentId: p1.id, result: 0.5, round: match.round });
            }
        });

        // 3. Since all players' total points are computed, compute Buchholz & Sonneborn-Berger
        active.players.forEach(player => {
            player.opponents.forEach(op => {
                const opponent = active.players.find(p => p.id === op.opponentId);
                if (!opponent) return;

                // Buchholz: Sum of all opponents' total points
                player.buchholz += opponent.points;

                // Sonneborn-Berger: Sum of opponent points * result weight
                player.sonnebornBerger += (opponent.points * op.result);
            });
        });

        // 4. Stable Multi-Key Tie-Breaker Sort (does not mutate original array order randomly)
        // Perform sorting on a copied array to keep sorting process purely functional
        const sorted = [...active.players].sort((a, b) => this.comparePlayers(a, b, active));
        
        // Re-assign sorted array back to active tournament
        active.players = sorted;
    }

    /**
     * Deterministic comparePlayers engine.
     * Returns negative if player A ranks higher, positive if player B ranks higher, or uses deterministic seed.
     */
    comparePlayers(a, b, tournament) {
        // Primary Rank: Total Points (always active)
        if (b.points !== a.points) return b.points - a.points;

        const activeTiebreakers = tournament.settings.tiebreakers || [];

        // Check optional tie-breakers in exact order of priority config
        for (const tb of activeTiebreakers) {
            if (tb === 'buchholz') {
                if (Math.abs(b.buchholz - a.buchholz) > 0.0001) {
                    return b.buchholz - a.buchholz;
                }
            }
            if (tb === 'sonnebornBerger') {
                if (Math.abs(b.sonnebornBerger - a.sonnebornBerger) > 0.0001) {
                    return b.sonnebornBerger - a.sonnebornBerger;
                }
            }
            if (tb === 'directEncounter') {
                const de = this._compareDirectEncounter(a, b, tournament);
                if (de !== 0) return de;
            }
            if (tb === 'wins') {
                if (b.wins !== a.wins) return b.wins - a.wins;
            }
        }

        // 6. Stable last-resort fallback: seed
        return a.seed - b.seed;
    }

    _compareDirectEncounter(a, b, tournament) {
        // Find latest match between a and b
        const encounters = tournament.matches.filter(m => 
            m.isPlayed() && !m.isBye() &&
            ((m.player1Id === a.id && m.player2Id === b.id) || (m.player1Id === b.id && m.player2Id === a.id))
        );

        if (encounters.length === 0) return 0; // Did not play each other

        // Use latest match result
        encounters.sort((m1, m2) => m2.round - m1.round);
        const latestMatch = encounters[0];

        if (latestMatch.result === '0.5-0.5') return 0; // Drawn match

        if (latestMatch.player1Id === a.id) {
            return latestMatch.result === '1-0' ? -1 : 1;
        } else {
            return latestMatch.result === '0-1' ? -1 : 1;
        }
    }

    getPlayerTiebreakBreakdown(playerId) {
        const active = this.getActiveTournament();
        if (!active) return null;

        const player = active.players.find(p => p.id === playerId);
        if (!player) return null;

        const bhBreakdown = [];
        const sbBreakdown = [];

        player.opponents.forEach(game => {
            const opp = active.players.find(p => p.id === game.opponentId);
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
        const active = this.getActiveTournament();
        if (!active) return false;

        const match = active.matches.find(m => m.id === matchId);
        if (!match) return false;

        match.result = result;
        this.recalculateStandings();
        this.saveToStorage();
        return true;
    }

    isRoundCompleted(roundNum) {
        const active = this.getActiveTournament();
        if (!active) return false;

        const roundMatches = active.matches.filter(m => m.round === roundNum);
        if (roundMatches.length === 0) return false;
        return roundMatches.every(m => m.isPlayed());
    }

    // --- Swiss Matchmaker with Backtracking Solver ---
    generatePairings(roundNumber) {
        const active = this.getActiveTournament();
        if (!active) return false;

        // 1. Clean out any pre-existing matches for this round
        active.matches = active.matches.filter(m => m.round !== roundNumber);

        // 2. Prepare candidates
        // Sort candidates based on points (descending), rating (descending), then deterministic seed
        const candidates = [...active.players];
        candidates.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.rating !== a.rating) return b.rating - a.rating;
            return a.seed - b.seed;
        });

        // 3. Keep track of already played opponent IDs inside this tournament
        const playedOpponents = {};
        active.players.forEach(p => {
            playedOpponents[p.id] = new Set(
                active.matches
                    .filter(m => m.isPlayed() && !m.isBye())
                    .filter(m => m.player1Id === p.id || m.player2Id === p.id)
                    .map(m => m.player1Id === p.id ? m.player2Id : m.player1Id)
            );
        });

        // 4. Handle Odd Players count -> assign BYE to lowest scorer who hasn't had a bye
        let byePlayerId = null;
        if (candidates.length % 2 !== 0) {
            const hadBye = new Set(
                active.matches.filter(m => m.isBye()).map(m => m.player1Id)
            );

            for (let i = candidates.length - 1; i >= 0; i--) {
                const p = candidates[i];
                if (!hadBye.has(p.id)) {
                    byePlayerId = p.id;
                    const byeMatchId = `match_${active.id}_r${roundNumber}_bye`;
                    const byeMatch = new Match(byeMatchId, roundNumber, byePlayerId, 'bye', '1-0');
                    active.matches.push(byeMatch);
                    candidates.splice(i, 1);
                    break;
                }
            }

            // Backup bye assignment
            if (!byePlayerId && candidates.length > 0) {
                const lastIdx = candidates.length - 1;
                byePlayerId = candidates[lastIdx].id;
                const byeMatchId = `match_${active.id}_r${roundNumber}_bye`;
                const byeMatch = new Match(byeMatchId, roundNumber, byePlayerId, 'bye', '1-0');
                active.matches.push(byeMatch);
                candidates.splice(lastIdx, 1);
            }
        }

        // 5. Backtracking Swiss Solver
        const pairings = [];
        const success = this._solvePairings(candidates, playedOpponents, pairings);

        if (!success) {
            console.warn("Backtracking Swiss solver failed to find duplicate-free pairings. Falling back to top-down relaxed pairing.");
            this._generateRelaxedPairings(candidates, pairings);
        }

        // 6. Convert to Matches and allocate balanced colors
        pairings.forEach((pair, idx) => {
            const p1 = pair[0];
            const p2 = pair[1];
            const matchId = `match_${active.id}_r${roundNumber}_${idx + 1}`;
            
            // Color balance checks
            const p1WhiteCount = active.matches.filter(m => m.player1Id === p1.id && m.isPlayed()).length;
            const p2WhiteCount = active.matches.filter(m => m.player1Id === p2.id && m.isPlayed()).length;
            
            let whiteId = p1.id;
            let blackId = p2.id;

            if (p1WhiteCount > p2WhiteCount) {
                whiteId = p2.id;
                blackId = p1.id;
            }

            const match = new Match(matchId, roundNumber, whiteId, blackId, null);
            active.matches.push(match);
        });

        active.currentRound = roundNumber;
        this.saveToStorage();
        return true;
    }

    _solvePairings(players, playedOpponents, pairings) {
        if (players.length === 0) return true;

        const first = players[0];
        
        for (let i = 1; i < players.length; i++) {
            const candidate = players[i];

            if (!playedOpponents[first.id].has(candidate.id)) {
                pairings.push([first, candidate]);
                
                const subProblemList = players.filter(p => p.id !== first.id && p.id !== candidate.id);
                
                if (this._solvePairings(subProblemList, playedOpponents, pairings)) {
                    return true;
                }
                
                pairings.pop();
            }
        }

        return false;
    }

    _generateRelaxedPairings(players, pairings) {
        for (let i = 0; i < players.length; i += 2) {
            if (i + 1 < players.length) {
                pairings.push([players[i], players[i+1]]);
            }
        }
    }
}
