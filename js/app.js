/**
 * Caissa Chess Tournament Manager - Application Entry Point
 * 
 * Instantiates the MVC modules once the DOM is fully loaded.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Instantiate MVC Components
    const model = new TournamentModel();
    const view = new TournamentView();
    const controller = new TournamentController(model, view);
    
    console.log("Caissa Swiss Chess Tournament Manager successfully booted!");
});
