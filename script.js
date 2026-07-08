// State Management
let GEMINI_API_KEY = localStorage.getItem('stadiumsync_gemini_key') || '';
let chatHistory = [];

// DOM Elements
const themeToggleBtn = document.getElementById('theme-toggle');
const htmlElement = document.documentElement;
const apiKeyInput = document.getElementById('api-key-input');
const apiKeyBanner = document.getElementById('api-key-banner');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const alertsWidget = document.getElementById('alerts-widget');

// Initialize
function init() {
    // Theme setup
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        htmlElement.classList.add('dark');
    } else {
        htmlElement.classList.remove('dark');
    }

    // API Key setup
    if (GEMINI_API_KEY) {
        apiKeyBanner.classList.add('hidden');
    }

    // Event Listeners
    themeToggleBtn.addEventListener('click', toggleTheme);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    alertsWidget.addEventListener('click', () => {
        chatInput.value = "Tell me more about the congestion at Gate C and suggest an alternative route.";
        sendMessage();
    });
}

// Theme Toggle
function toggleTheme() {
    if (htmlElement.classList.contains('dark')) {
        htmlElement.classList.remove('dark');
        localStorage.theme = 'light';
    } else {
        htmlElement.classList.add('dark');
        localStorage.theme = 'dark';
    }
}

// API Key Management
function saveApiKey() {
    const key = apiKeyInput.value.trim();
    if (key) {
        GEMINI_API_KEY = key;
        localStorage.setItem('stadiumsync_gemini_key', key);
        apiKeyBanner.classList.add('hidden');
        
        // Notify user
        addMessageToChat("System", "API Key saved securely in your browser's local storage. You can now use the AI Concierge!", 'system');
    }
}

// Chat Functionality
function addMessageToChat(sender, message, type = 'user') {
    const msgDiv = document.createElement('div');
    msgDiv.className = `flex flex-col gap-1 ${type === 'user' ? 'items-end' : 'items-start'} animate-fade-in`;
    
    let bubbleClass = type === 'user' 
        ? 'bg-brand-500 text-white rounded-2xl rounded-tr-sm p-3 max-w-[85%] shadow-sm text-sm'
        : 'bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-sm p-3 max-w-[85%] shadow-sm text-sm markdown-body';
    
    if (type === 'system') {
        bubbleClass = 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 border border-yellow-500/20 rounded-lg p-2 max-w-[90%] mx-auto text-xs text-center';
    }

    // Parse markdown if it's from AI
    const content = type === 'ai' ? marked.parse(message) : message;

    msgDiv.innerHTML = `
        <div class="${bubbleClass}">
            ${content}
        </div>
        ${type !== 'system' ? `<span class="text-[10px] text-gray-400 mx-1">${sender} • Just now</span>` : ''}
    `;
    
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function clearChat() {
    chatHistory = [];
    const welcomeHTML = `
        <div class="flex flex-col gap-1 items-start">
            <div class="bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-sm p-3 max-w-[85%] shadow-sm text-sm">
                👋 Chat cleared! How can I help you in the FIFA 2026 Smart Stadium?
            </div>
            <span class="text-[10px] text-gray-400 ml-1">AI Concierge • Just now</span>
        </div>
    `;
    chatMessages.innerHTML = welcomeHTML;
}

async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    // Add user message
    addMessageToChat("You", text, 'user');
    chatInput.value = '';
    chatInput.style.height = 'auto'; // Reset height
    sendBtn.disabled = true;

    // Show loading
    const loadingId = 'loading-' + Date.now();
    const loadingDiv = document.createElement('div');
    loadingDiv.id = loadingId;
    loadingDiv.className = 'flex flex-col gap-1 items-start';
    loadingDiv.innerHTML = `
        <div class="bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-sm p-4 max-w-[85%] shadow-sm flex gap-1">
            <div class="w-2 h-2 bg-brand-500 rounded-full animate-bounce"></div>
            <div class="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
            <div class="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
        </div>
    `;
    chatMessages.appendChild(loadingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        let response;
        let usedDemoMode = false;

        if (!GEMINI_API_KEY) {
            // DEMO MODE FALLBACK: If no API key
            await new Promise(r => setTimeout(r, 1500)); // simulate network delay
            response = getDemoResponse(text);
            usedDemoMode = true;
        } else {
            // REAL GEN AI RESPONSE
            try {
                response = await fetchGeminiResponse(text);
            } catch (apiError) {
                console.error("API Error caught, falling back to Demo Mode:", apiError);
                
                // If the API fails (e.g. invalid key), clear the stored key and show the banner again
                GEMINI_API_KEY = '';
                localStorage.removeItem('stadiumsync_gemini_key');
                if (apiKeyBanner) {
                    apiKeyBanner.classList.remove('hidden');
                }

                // Show the exact error for debugging
                addMessageToChat("System", `API Error: ${apiError.message}. Falling back to Demo Mode...`, 'system');

                // Fallback to Demo Mode automatically
                await new Promise(r => setTimeout(r, 1500));
                response = getDemoResponse(text);
                usedDemoMode = true;
            }
        }
        
        // Remove loading
        document.getElementById(loadingId).remove();
        
        // Add Warning if demo mode was used
        if (usedDemoMode && !document.getElementById('demo-warning')) {
            addMessageToChat("System", "Running in Demo Mode. Real AI integration failed or no API key provided. Responses are simulated for evaluation purposes.", 'system');
            const warningDiv = chatMessages.lastElementChild;
            warningDiv.id = 'demo-warning';
        }

        // Add AI response
        addMessageToChat("AI Concierge", response, 'ai');
        
    } catch (error) {
        // This should theoretically never be reached now, but just in case
        document.getElementById(loadingId).remove();
        addMessageToChat("System", `Critical Error: ${error.message}`, 'system');
    } finally {
        sendBtn.disabled = false;
    }
}

// Demo Mode Fallback logic
function getDemoResponse(prompt) {
    const p = prompt.toLowerCase();
    if (p.includes("accessible") || p.includes("wheelchair")) {
        return "**Accessible Route Found:**\n\nTo ensure a smooth path from the South Stand to the West Gate, please use the **Level 2 Concourse**.\n\n*   **Elevator:** Take Elevator D (currently empty) down to Level 2.\n*   **Path:** Proceed down the main corridor which is wide and free of steps.\n*   **Assistance:** If needed, an accessibility steward is stationed near Section 120.";
    } else if (p.includes("gate c") || p.includes("route") || p.includes("exit") || p.includes("crowd")) {
        return "**Optimal Route Suggested:**\n\nI see you want to avoid the congestion at Gate C. Since you are at the South Stand, I recommend taking the **East Concourse** towards **Gate B**. \n\n*   **Current status:** Gate B is completely clear (2 min wait).\n*   **Directions:** Walk down staircase 4, take a right past the merchandise store, and Gate B will be straight ahead.";
    } else if (p.includes("food") || p.includes("hungry") || p.includes("eat")) {
        return "The shortest line for food right now is at **Burger Blast** near Section 112 (West Gate) with only a 3-minute wait. \n\nWould you like me to highlight the route on your map?";
    } else if (p.includes("translate")) {
        return "*Translation (Spanish):* \"¿Dónde está mi asiento?\"\n\nIf you need help finding your exact section, just provide your ticket number!";
    } else if (p.includes("ticket") || p.includes("lost")) {
        return "Don't worry! If you have lost your physical ticket, please head to the nearest **Guest Services Kiosk**. There is one located just behind Section 105. They can reprint your ticket using your photo ID and booking reference.";
    } else {
        return "As your AI Concierge for the FIFA 2026 Smart Stadium, I can assist you with navigation, food recommendations, and translating phrases! *(Note: This is a simulated response since no API key was provided. To get real GenAI responses, please enter a Gemini API Key).*";
    }
}

// Gemini API Integration
async function fetchGeminiResponse(prompt) {
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
    let lastError = null;
    let selectedModel = null;
    let availableModelNames = [];

    try {
        // Step 1: Dynamically fetch the list of available models for this specific API key
        const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);
        
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

    try {
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
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${GEMINI_API_KEY}`, {
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
    } catch (err) {
        lastError = err;
        throw err;
    }

    if (!data) {
        throw new Error(lastError ? lastError.message : "Failed to generate response.");
    }

    const aiText = data.candidates[0].content.parts[0].text;

    // Update history
    chatHistory.push({ role: "user", parts: [{ text: prompt }] });
    chatHistory.push({ role: "model", parts: [{ text: aiText }] });

    // Keep history manageable
    if (chatHistory.length > 10) chatHistory = chatHistory.slice(chatHistory.length - 10);

    return aiText;
}

// Interactive Map Functions
function suggestRoute() {
    chatInput.value = "I am at the South Stand and want to exit the stadium. What is the optimal route to avoid crowds?";
    sendMessage();
}

function suggestAccessibleRoute() {
    chatInput.value = "I need an accessible (wheelchair-friendly) route from the South Stand to the West Gate. Please guide me.";
    sendMessage();
}

let isListening = false;
function toggleVoiceInput() {
    const voiceBtn = document.getElementById('voice-btn');
    if (!isListening) {
        isListening = true;
        voiceBtn.classList.add('text-red-500', 'animate-pulse');
        voiceBtn.classList.remove('text-gray-400');
        chatInput.placeholder = "Listening...";
        
        // Simulate voice recognition
        setTimeout(() => {
            chatInput.value = "Where is the nearest food stand with a short line?";
            isListening = false;
            voiceBtn.classList.remove('text-red-500', 'animate-pulse');
            voiceBtn.classList.add('text-gray-400');
            chatInput.placeholder = "Ask anything... (supports multiple languages)";
            setTimeout(sendMessage, 500);
        }, 2000);
    }
}

// Run init
init();
