const { getDemoResponse, isValidApiKeyFormat } = require('../js/utils');

describe('Utils module', () => {
    
    describe('isValidApiKeyFormat', () => {
        test('should return true for a valid long string', () => {
            expect(isValidApiKeyFormat('AIzaSyA8_some_long_random_string_here_12345')).toBe(true);
        });

        test('should return false for an empty string', () => {
            expect(isValidApiKeyFormat('')).toBe(false);
        });

        test('should return false for undefined or null', () => {
            expect(isValidApiKeyFormat(undefined)).toBe(false);
            expect(isValidApiKeyFormat(null)).toBe(false);
        });

        test('should return false for strings that are too short', () => {
            expect(isValidApiKeyFormat('shortkey')).toBe(false);
        });
    });

    describe('getDemoResponse', () => {
        test('should throw an error if prompt is not a string', () => {
            expect(() => getDemoResponse(123)).toThrow("Prompt must be a string");
            expect(() => getDemoResponse(null)).toThrow("Prompt must be a string");
        });

        test('should return accessible route for "wheelchair"', () => {
            const response = getDemoResponse('Where can I go with a wheelchair?');
            expect(response).toContain('Accessible Route Found');
            expect(response).toContain('Level 2 Concourse');
        });

        test('should return optimal route for "gate c"', () => {
            const response = getDemoResponse('gate c is crowded');
            expect(response).toContain('Optimal Route Suggested');
            expect(response).toContain('Gate B');
        });

        test('should return food recommendations for "hungry"', () => {
            const response = getDemoResponse('I am hungry');
            expect(response).toContain('Burger Blast');
        });

        test('should return translation for "translate"', () => {
            const response = getDemoResponse('translate where is my seat to spanish');
            expect(response).toContain('¿Dónde está mi asiento?');
        });

        test('should return ticket help for "lost ticket"', () => {
            const response = getDemoResponse('I lost my ticket');
            expect(response).toContain('Guest Services Kiosk');
        });

        test('should return default fallback response for unknown queries', () => {
            const response = getDemoResponse('hello world');
            expect(response).toContain('As your AI Concierge for the FIFA 2026 Smart Stadium');
            expect(response).toContain('simulated response');
        });
    });
});
