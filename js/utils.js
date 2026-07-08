/**
 * Utility functions for StadiumSync AI
 * Extracted to improve code modularity and testability.
 */

'use strict';

/**
 * Returns a simulated demo response when the API key is missing or fails.
 * 
 * @param {string} prompt - The user's input prompt.
 * @returns {string} - The simulated markdown response.
 */
function getDemoResponse(prompt) {
    if (typeof prompt !== 'string') {
        throw new Error("Prompt must be a string");
    }
    
    const p = prompt.toLowerCase();
    
    if (p.includes("accessible") || p.includes("wheelchair")) {
        return "**Accessible Route Found:**\n\nTo ensure a smooth path from the South Stand to the West Gate, please use the **Level 2 Concourse**.\n\n*   **Elevator:** Take Elevator D (currently empty) down to Level 2.\n*   **Path:** Proceed down the main corridor which is wide and free of steps.\n*   **Assistance:** If needed, an accessibility steward is stationed near Section 120.";
    } 
    
    if (p.includes("gate c") || p.includes("route") || p.includes("exit") || p.includes("crowd")) {
        return "**Optimal Route Suggested:**\n\nI see you want to avoid the congestion at Gate C. Since you are at the South Stand, I recommend taking the **East Concourse** towards **Gate B**. \n\n*   **Current status:** Gate B is completely clear (2 min wait).\n*   **Directions:** Walk down staircase 4, take a right past the merchandise store, and Gate B will be straight ahead.";
    } 
    
    if (p.includes("food") || p.includes("hungry") || p.match(/\\beat\\b/)) {
        return "The shortest line for food right now is at **Burger Blast** near Section 112 (West Gate) with only a 3-minute wait. \n\nWould you like me to highlight the route on your map?";
    } 
    
    if (p.includes("translate")) {
        return "*Translation (Spanish):* \"¿Dónde está mi asiento?\"\n\nIf you need help finding your exact section, just provide your ticket number!";
    } 
    
    if (p.includes("ticket") || p.includes("lost")) {
        return "Don't worry! If you have lost your physical ticket, please head to the nearest **Guest Services Kiosk**. There is one located just behind Section 105. They can reprint your ticket using your photo ID and booking reference.";
    } 
    
    return "As your AI Concierge for the FIFA 2026 Smart Stadium, I can assist you with navigation, food recommendations, and translating phrases! *(Note: This is a simulated response since no API key was provided. To get real GenAI responses, please enter a Gemini API Key).*";
}

/**
 * Validates if a given API key string looks like a valid Gemini API key.
 * This is a basic structural check, not a cryptographic validation.
 * 
 * @param {string} apiKey - The API key to validate.
 * @returns {boolean} - True if it passes basic validation, false otherwise.
 */
function isValidApiKeyFormat(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') return false;
    return apiKey.trim().length > 20; // Gemini keys are typically long strings
}

// Export for Node.js testing environment, but don't break in browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getDemoResponse,
        isValidApiKeyFormat
    };
}
