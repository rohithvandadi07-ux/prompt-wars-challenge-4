const { fetchGeminiResponse } = require('../js/api');

// Mock global fetch
global.fetch = jest.fn();

describe('API module - fetchGeminiResponse', () => {
    
    beforeEach(() => {
        fetch.mockClear();
    });

    test('should throw an error if API key is missing', async () => {
        await expect(fetchGeminiResponse('hello', '', [])).rejects.toThrow("API Key is missing");
    });

    test('should successfully fetch response from Gemini API', async () => {
        // Mock the first fetch (models list)
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                models: [
                    { name: 'models/gemini-1.5-flash', supportedGenerationMethods: ['generateContent'] }
                ]
            })
        });

        // Mock the second fetch (generateContent)
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                candidates: [
                    { content: { parts: [{ text: "This is a mock AI response." }] } }
                ]
            })
        });

        const response = await fetchGeminiResponse('test prompt', 'fake_key', []);
        
        expect(response).toBe("This is a mock AI response.");
        expect(fetch).toHaveBeenCalledTimes(2);
        
        // Verify the second fetch hit the correct endpoint
        const secondCallUrl = fetch.mock.calls[1][0];
        expect(secondCallUrl).toContain('gemini-1.5-flash:generateContent');
        expect(secondCallUrl).toContain('key=fake_key');
    });

    test('should handle network error on generateContent gracefully', async () => {
        // Mock the first fetch (models list)
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                models: [
                    { name: 'models/gemini-1.5-flash', supportedGenerationMethods: ['generateContent'] }
                ]
            })
        });

        // Mock the second fetch (generateContent error)
        fetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({
                error: { message: "API limit exceeded" }
            })
        });

        await expect(fetchGeminiResponse('test prompt', 'fake_key', [])).rejects.toThrow("API limit exceeded");
    });

    test('should default to gemini-2.5-flash if list models fails', async () => {
        // Mock the first fetch to fail
        fetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({
                error: { message: "Invalid key" }
            })
        });

        // Mock the second fetch (generateContent)
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                candidates: [
                    { content: { parts: [{ text: "Fallback worked." }] } }
                ]
            })
        });

        const response = await fetchGeminiResponse('test prompt', 'fake_key', []);
        
        expect(response).toBe("Fallback worked.");
        
        // Verify it defaulted correctly
        const secondCallUrl = fetch.mock.calls[1][0];
        expect(secondCallUrl).toContain('gemini-2.5-flash:generateContent');
    });
});
