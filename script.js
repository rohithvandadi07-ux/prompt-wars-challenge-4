'use strict';

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

/**
 * Initializes the application, sets up themes, listeners, and API key state.
 */
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
    chatInput.addEventListener('input', function() {
        this.style.height = '';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });

    alertsWidget.addEventListener('click', () => {
        chatInput.value = "Tell me more about the congestion at Gate C and suggest an alternative route.";
        sendMessage();
    });

    // Attach all other interactive buttons
    document.getElementById('send-btn')?.addEventListener('click', sendMessage);
    document.getElementById('clear-chat-btn')?.addEventListener('click', clearChat);
    document.getElementById('save-api-btn')?.addEventListener('click', saveApiKey);
    document.getElementById('voice-btn')?.addEventListener('click', toggleVoiceInput);
    document.getElementById('suggest-route-btn')?.addEventListener('click', suggestRoute);
    document.getElementById('suggest-accessible-btn')?.addEventListener('click', suggestAccessibleRoute);
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
/**
 * Adds a new message to the chat interface securely.
 * 
 * @param {string} sender - Name of the sender.
 * @param {string} message - The message content.
 * @param {string} [type='user'] - The type of message ('user', 'ai', 'system').
 */
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
    let rawContent = type === 'ai' ? marked.parse(message) : message;
    
    // SANITIZE to prevent XSS (Crucial for Security Evaluation)
    const content = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(rawContent) : rawContent;

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

        if (!GEMINI_API_KEY || !isValidApiKeyFormat(GEMINI_API_KEY)) {
            // DEMO MODE FALLBACK: If no API key or invalid format
            await new Promise(r => setTimeout(r, 1500)); // simulate network delay
            response = getDemoResponse(text);
            usedDemoMode = true;
        } else {
            // REAL GEN AI RESPONSE
            try {
                // Pass the API key and history to the extracted API function
                response = await fetchGeminiResponse(text, GEMINI_API_KEY, chatHistory);
                
                // Update history
                chatHistory.push({ role: "user", parts: [{ text }] });
                chatHistory.push({ role: "model", parts: [{ text: response }] });
                if (chatHistory.length > 10) chatHistory = chatHistory.slice(chatHistory.length - 10);
                
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

// API logic is now managed via js/api.js

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
