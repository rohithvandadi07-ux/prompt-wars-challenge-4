'use strict';

/**
 * Calls the Gemini API with the given prompt, history, and stadium context.
 * 
 * @param {string} prompt - The user's input.
 * @param {string} apiKey - The Gemini API Key.
 * @param {Array} chatHistory - The array of previous chat messages.
 * @returns {Promise<string>} - The AI generated response.
 */
async function fetchGeminiResponse(prompt, apiKey, chatHistory) {
    if (!apiKey) {
        throw new Error("API Key is missing.");
    }

    const systemInstruction = `You are the AI Concierge for the FIFA World Cup 2026 Smart Stadium ("StadiumSync AI"). 
    Your job is to assist fans, organizers, and staff with navigation, crowd management, accessibility, transportation, sustainability, and multilingual assistance.
    
    Current Stadium Context:
    - Current Attendance: 68,432 (85% Capacity)
    - Weather: 72°F, Clear
    - Alerts: Gate C is highly congested. South Stand is busy.
    - Transit: Metro Line 1 is on time. Shuttle Bus at South Gate has a slight delay.
    - Food: Nearest low-queue food stand is "Burger Blast" near Section 112 (West Gate).
    
    Rules:
    - Keep responses concise, friendly, and helpful.
    - Use Markdown for formatting (bolding, lists).
    - If asked for navigation or avoiding crowds, always reference the current context (e.g., advising them to avoid Gate C).
    - You can translate on the fly if asked to.`;

    const requestBody = {
        contents: [
            ...chatHistory,
            {
                role: "user",
                parts: [{ text: prompt }]
            }
        ],
        systemInstruction: {
            parts: [{ text: systemInstruction }]
        },
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
        }
    };

    let data = null;
    let selectedModel = null;
    let availableModelNames = [];

    try {
        // Step 1: Dynamically fetch the list of available models for this specific API key
        // We use the global fetch which can be mocked in tests
        const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        
        if (!listResponse.ok) {
            const err = await listResponse.json();
            throw new Error(`ListModels Error: ${err.error?.message || 'Failed'}`);
        }
        
        const listData = await listResponse.json();
        const models = listData.models || [];
        
        // Find all models that support generateContent
        const generateModels = models.filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent"));
        availableModelNames = generateModels.map(m => m.name.replace('models/', ''));
        
        // Prefer the newest standard flash models first
        selectedModel = availableModelNames.find(name => name.includes('3.5-flash')) ||
                        availableModelNames.find(name => name.includes('3-flash')) ||
                        availableModelNames.find(name => name.includes('2.5-flash')) || 
                        availableModelNames[0];

        if (!selectedModel) {
            throw new Error("No models supporting generateContent were found for this API key.");
        }
    } catch (err) {
        console.warn(`Failed to list models: ${err.message}. Defaulting to gemini-2.5-flash`);
        selectedModel = 'gemini-2.5-flash';
    }

    // Clone request body
    let currentBody = JSON.parse(JSON.stringify(requestBody));
    
    // For maximum compatibility across all model generations, polyfill the system instruction
    delete currentBody.systemInstruction;
    currentBody.contents.unshift({
        role: "model",
        parts: [{ text: "Understood. I will act as the AI Concierge." }]
    });
    currentBody.contents.unshift({
        role: "user",
        parts: [{ text: "SYSTEM INSTRUCTION (Follow these strictly): " + systemInstruction }]
    });

    // Use the dynamically selected model
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(currentBody)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to connect to AI');
    }

    data = await response.json();

    if (!data || !data.candidates || data.candidates.length === 0) {
        throw new Error("Failed to generate response: Invalid API payload.");
    }

    return data.candidates[0].content.parts[0].text;
}

// Export for Node.js testing environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fetchGeminiResponse
    };
}
