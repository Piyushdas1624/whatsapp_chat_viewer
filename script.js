/**
 * WhatsApp Chat Viewer v4.0
 * Features:
 * - Dark/Light theme toggle (matching real WhatsApp)
 * - Group vs Personal chat detection
 * - Dynamic avatar label based on chat type
 * - Correct POV handling
 * - Message reactions with margin adjustment
 * - Emoji picker on hover (desktop) / hold (mobile)
 * - In-chat message search
 * - Close button for modal on reopen
 * - Clickable blue links
 * - Mobile responsive with duller background
 */

// =============================================
// STATE
// =============================================
const state = {
    chats: [],
    activeChatId: null,
    pendingChatData: null,
    customBgUrl: null,
    customAvatarUrl: null,
    userIdentifier: null,
    isDarkTheme: true,
    reactions: {},
    isFirstOpen: true,
    sidebarEditMode: false,
    chatEditMode: false,
    contextMsgId: null,
    selectedMsgId: null,
};

// =============================================
// DOM ELEMENTS
// =============================================
const $ = id => document.getElementById(id);
const dom = {
    // Modal
    uploadModal: $('uploadModal'),
    modalCloseBtn: $('modalCloseBtn'),
    uploadZone: $('uploadZone'),
    fileName: $('fileName'),
    userSelect: $('userSelect'),
    avatarOptionRow: $('avatarOptionRow'),
    avatarLabelText: $('avatarLabelText'),
    avatarUpload: $('avatarUpload'),
    avatarPreview: $('avatarPreview'),
    bgUpload: $('bgUpload'),
    bgPreview: $('bgPreview'),
    loadChatBtn: $('loadChatBtn'),
    chatFileInput: $('chatFileInput'),

    // Desktop
    desktopApp: $('desktopApp'),
    chatList: $('chatList'),
    searchInput: $('searchInput'),
    addChatBtn: $('addChatBtn'),
    myProfileImg: $('myProfileImg'),
    messagesArea: $('messagesArea'),
    emptyState: $('emptyState'),
    chatHeaderName: $('chatHeaderName'),
    chatHeaderStatus: $('chatHeaderStatus'),
    chatHeaderImg: $('chatHeaderImg'),
    themeToggleDesktop: $('themeToggleDesktop'),
    messageInput: $('messageInput'),
    sendBtn: $('sendBtn'),

    // Chat Search
    chatSearchBtn: $('chatSearchBtn'),
    chatSearchOverlay: $('chatSearchOverlay'),
    closeChatSearch: $('closeChatSearch'),
    chatSearchInput: $('chatSearchInput'),
    chatSearchResults: $('chatSearchResults'),

    // Edit Mode
    sidebarEditToggle: $('sidebarEditToggle'),
    chatEditToggle: $('chatEditToggle'),
    editControlsBar: $('editControlsBar'),
    addSenderMsgBtn: $('addSenderMsgBtn'),
    addReceiverMsgBtn: $('addReceiverMsgBtn'),
    addSystemMsgBtn: $('addSystemMsgBtn'),
    addDateBtn: $('addDateBtn'),

    // Attach Menu
    attachMenuBtn: $('attachMenuBtn'),
    attachMenu: $('attachMenu'),
    attachEditMsg: $('attachEditMsg'),
    attachSwapSide: $('attachSwapSide'),
    attachEditTime: $('attachEditTime'),
    attachEditDate: $('attachEditDate'),
    attachDeleteMsg: $('attachDeleteMsg'),

    // Message Editor Modal
    messageEditorModal: $('messageEditorModal'),
    editorTitle: $('editorTitle'),
    editorCloseBtn: $('editorCloseBtn'),
    editorMsgType: $('editorMsgType'),
    editorMsgText: $('editorMsgText'),
    editorMsgDate: $('editorMsgDate'),
    editorMsgTime: $('editorMsgTime'),
    statusField: $('statusField'),
    msgTextField: $('msgTextField'),
    editorCancelBtn: $('editorCancelBtn'),
    editorSaveBtn: $('editorSaveBtn'),

    // User Editor Modal
    userEditorModal: $('userEditorModal'),
    userEditorName: $('userEditorName'),
    userEditorLastMsg: $('userEditorLastMsg'),
    userEditorAvatar: $('userEditorAvatar'),
    userEditorCloseBtn: $('userEditorCloseBtn'),
    userEditorCancelBtn: $('userEditorCancelBtn'),
    userEditorSaveBtn: $('userEditorSaveBtn'),

    // Emoji Picker
    inputEmojiPicker: $('inputEmojiPicker'),
    emojiToggleBtn: $('emojiToggleBtn'),
    emojiGrid: $('emojiGrid'),
    mobileEmojiPicker: $('mobileEmojiPicker'),

    // Mobile
    mobileApp: $('mobileApp'),
    mobileListScreen: $('mobileListScreen'),
    mobileChatScreen: $('mobileChatScreen'),
    mobileChatList: $('mobileChatList'),
    mobileSearchInput: $('mobileSearchInput'),
    mobileAddChat: $('mobileAddChat'),
    mobileBackBtn: $('mobileBackBtn'),
    mobileChatName: $('mobileChatName'),
    mobileChatAvatar: $('mobileChatAvatar'),
    mobileMessagesArea: $('mobileMessagesArea'),
    themeToggleMobile: $('themeToggleMobile'),
    mobileMessageInput: $('mobileMessageInput'),
    mobileSendBtn: $('mobileSendBtn'),
    mobileEmojiBtn: $('mobileEmojiBtn'),
    mobileAttachBtn: $('mobileAttachBtn'),
    mobileChatEditToggle: $('mobileChatEditToggle'),

    // Mobile Screens
    mobileUpdatesScreen: $('mobileUpdatesScreen'),
    mobileCommunitiesScreen: $('mobileCommunitiesScreen'),
    mobileCallsScreen: $('mobileCallsScreen'),

    // Help Modal
    helpModal: $('helpModal'),
    helpCloseBtn: $('helpCloseBtn'),
    helpBtnDesktop: $('helpBtnDesktop'),
    helpBtnMobile: $('helpBtnMobile'),

    // Avatar File Upload
    userEditorAvatarFile: $('userEditorAvatarFile'),
    userAvatarPreview: $('userAvatarPreview'),

    // Reaction Picker
    reactionPicker: $('reactionPicker'),
};

// =============================================
// INITIALIZATION
// =============================================
document.addEventListener('DOMContentLoaded', async () => {
    // Load settings first (sync) to apply theme immediately
    loadSettingsFromStorage();
    applyTheme();

    // Load chats (async from IndexedDB)
    await loadFromStorage();

    if (state.chats.length === 0) {
        state.isFirstOpen = true;
        showModal();
    } else {
        state.isFirstOpen = false;
        hideModal();
        renderChatList();
        renderMobileChatList();

        if (state.activeChatId) {
            const chat = state.chats.find(c => c.id === state.activeChatId);
            if (chat) openChat(chat);
        }
    }

    bindEvents();
});

// IndexedDB wrapper for large data storage
const DB_NAME = 'WhatsAppViewerDB';
const DB_VERSION = 1;
const STORE_NAME = 'chats';

let db = null;

function openDatabase() {
    return new Promise((resolve, reject) => {
        if (db) {
            resolve(db);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('IndexedDB error:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}

async function saveChatsToIndexedDB(chats) {
    try {
        const database = await openDatabase();
        const transaction = database.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        // Clear existing and add all chats
        store.clear();

        for (const chat of chats) {
            store.put(chat);
        }

        return new Promise((resolve, reject) => {
            transaction.oncomplete = resolve;
            transaction.onerror = () => reject(transaction.error);
        });
    } catch (e) {
        console.error('IndexedDB save error:', e);
        throw e;
    }
}

async function loadChatsFromIndexedDB() {
    try {
        const database = await openDatabase();
        const transaction = database.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error('IndexedDB load error:', e);
        return [];
    }
}

// Save settings to localStorage (small data)
function saveSettingsToStorage() {
    try {
        localStorage.setItem('wa_viewer_settings_v4', JSON.stringify({
            activeChatId: state.activeChatId,
            isDarkTheme: state.isDarkTheme,
            reactions: state.reactions,
        }));
    } catch (e) {
        console.error('Settings save error:', e);
    }
}

// Load settings from localStorage
function loadSettingsFromStorage() {
    try {
        const data = localStorage.getItem('wa_viewer_settings_v4');
        if (data) {
            const parsed = JSON.parse(data);
            state.activeChatId = parsed.activeChatId || null;
            state.isDarkTheme = parsed.isDarkTheme !== false;
            state.reactions = parsed.reactions || {};
        }
    } catch (e) {
        console.error('Settings load error:', e);
    }
}

// Combined load function
async function loadFromStorage() {
    // Load settings first (sync)
    loadSettingsFromStorage();

    // Try to load chats from IndexedDB first
    try {
        const chats = await loadChatsFromIndexedDB();
        if (chats && chats.length > 0) {
            state.chats = chats;
            return;
        }
    } catch (e) {
        console.warn('IndexedDB load failed, trying localStorage:', e);
    }

    // Fallback: try loading from old localStorage format
    try {
        const data = localStorage.getItem('wa_viewer_data_v4');
        if (data) {
            const parsed = JSON.parse(data);
            state.chats = parsed.chats || [];
            state.activeChatId = parsed.activeChatId || null;
            state.isDarkTheme = parsed.isDarkTheme !== false;
            state.reactions = parsed.reactions || {};

            // Migrate to new format
            if (state.chats.length > 0) {
                saveToStorage();
                // Clear old data after migration
                localStorage.removeItem('wa_viewer_data_v4');
            }
        }
    } catch (e) {
        console.error('Legacy storage load error:', e);
    }
}

// Combined save function
async function saveToStorage() {
    // Save settings to localStorage
    saveSettingsToStorage();

    // Save chats to IndexedDB
    try {
        await saveChatsToIndexedDB(state.chats);
    } catch (e) {
        console.error('Failed to save chats to IndexedDB:', e);

        // Show user-friendly error for quota issues
        if (e.name === 'QuotaExceededError') {
            alert('Storage limit reached! Try clearing some old chats or use a different browser.');
        }
    }
}

// =============================================
// THEME MANAGEMENT
// =============================================
function applyTheme() {
    if (state.isDarkTheme) {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
    updateThemeIcons();
}

function toggleTheme() {
    state.isDarkTheme = !state.isDarkTheme;
    applyTheme();
    saveToStorage();
}

function updateThemeIcons() {
    const icon = state.isDarkTheme ? 'light_mode' : 'dark_mode';
    if (dom.themeToggleDesktop) {
        dom.themeToggleDesktop.querySelector('span').textContent = icon;
    }
    if (dom.themeToggleMobile) {
        dom.themeToggleMobile.textContent = icon;
    }
}

// =============================================
// MODAL MANAGEMENT
// =============================================
function showModal() {
    dom.uploadModal.classList.remove('hidden');
    dom.desktopApp.style.display = 'none';
    dom.mobileApp.style.display = 'none';

    // Show close button if not first open (user has chats already)
    if (!state.isFirstOpen && state.chats.length > 0) {
        dom.modalCloseBtn.classList.remove('hidden');
    } else {
        dom.modalCloseBtn.classList.add('hidden');
    }

    resetModalState();
}

function hideModal() {
    dom.uploadModal.classList.add('hidden');
    dom.desktopApp.style.display = '';
    dom.mobileApp.style.display = '';
}

function resetModalState() {
    state.pendingChatData = null;
    state.customBgUrl = null;
    state.customAvatarUrl = null;
    state.userIdentifier = null;

    dom.uploadZone.classList.remove('has-file');
    dom.fileName.textContent = '';
    dom.userSelect.innerHTML = '<option value="">Upload a chat first...</option>';
    dom.userSelect.disabled = true;
    dom.avatarOptionRow.style.display = 'none';
    dom.avatarPreview.innerHTML = '';
    dom.bgPreview.innerHTML = '';
    dom.loadChatBtn.disabled = true;
    dom.chatFileInput.value = '';
    if (dom.avatarUpload) dom.avatarUpload.value = '';
    if (dom.bgUpload) dom.bgUpload.value = '';
}

// =============================================
// EVENT BINDINGS
// =============================================
function bindEvents() {
    // Modal close button
    dom.modalCloseBtn.addEventListener('click', () => {
        hideModal();
    });

    // Upload zone
    dom.uploadZone.addEventListener('click', () => dom.chatFileInput.click());

    dom.uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dom.uploadZone.classList.add('has-file');
    });

    dom.uploadZone.addEventListener('dragleave', () => {
        if (!state.pendingChatData) dom.uploadZone.classList.remove('has-file');
    });

    dom.uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].name.endsWith('.txt')) {
            processFile(files[0]);
        }
    });

    dom.chatFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            processFile(e.target.files[0]);
        }
    });

    // User select
    dom.userSelect.addEventListener('change', (e) => {
        state.userIdentifier = e.target.value;
        updateLoadButton();
        if (state.pendingChatData) {
            updateAvatarLabel();
        }
    });

    // Avatar upload
    dom.avatarUpload.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                state.customAvatarUrl = ev.target.result;
                dom.avatarPreview.innerHTML = `<img src="${state.customAvatarUrl}" alt="Avatar">`;
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    });

    // Background upload
    dom.bgUpload.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                state.customBgUrl = ev.target.result;
                dom.bgPreview.innerHTML = `<img src="${state.customBgUrl}" alt="Background">`;
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    });

    // Load button
    dom.loadChatBtn.addEventListener('click', loadChat);

    // Add chat buttons
    dom.addChatBtn.addEventListener('click', () => {
        state.isFirstOpen = false;
        showModal();
    });
    dom.mobileAddChat.addEventListener('click', () => {
        state.isFirstOpen = false;
        showModal();
    });

    // Theme toggles
    dom.themeToggleDesktop.addEventListener('click', toggleTheme);
    dom.themeToggleMobile.addEventListener('click', toggleTheme);

    // Sidebar search
    dom.searchInput.addEventListener('input', (e) => {
        renderChatList(e.target.value);
    });

    dom.mobileSearchInput.addEventListener('input', (e) => {
        renderMobileChatList(e.target.value);
    });

    // Mobile back button
    dom.mobileBackBtn.addEventListener('click', () => {
        dom.mobileChatScreen.classList.add('hidden');
        dom.mobileListScreen.classList.remove('hidden');
    });

    // Chat Search (inside conversation)
    dom.chatSearchBtn.addEventListener('click', () => {
        dom.chatSearchOverlay.classList.add('active');
        dom.chatSearchInput.focus();
    });

    dom.closeChatSearch.addEventListener('click', () => {
        dom.chatSearchOverlay.classList.remove('active');
        dom.chatSearchInput.value = '';
        dom.chatSearchResults.innerHTML = '';
    });

    dom.chatSearchInput.addEventListener('input', (e) => {
        searchInChat(e.target.value);
    });

    // Reaction picker
    document.querySelectorAll('.reaction-emoji').forEach(el => {
        el.addEventListener('click', handleReactionSelect);
    });

    // Close reaction picker on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.reaction-picker') && !e.target.closest('.msg-emoji-btn') && !e.target.closest('.mepop')) {
            dom.reactionPicker.classList.add('hidden');
        }
    });

    // Mobile long press for reactions
    let longPressTimer;
    document.addEventListener('touchstart', (e) => {
        const msgEl = e.target.closest('.mobile-msg');
        if (msgEl) {
            longPressTimer = setTimeout(() => {
                showReactionPicker(e, msgEl.dataset.msgId);
            }, 500);
        }
    });

    document.addEventListener('touchend', () => {
        clearTimeout(longPressTimer);
    });

    document.addEventListener('touchmove', () => {
        clearTimeout(longPressTimer);
    });
}

// =============================================
// FILE PROCESSING
// =============================================
async function processFile(file) {
    try {
        const text = await readFileAsText(file);
        const chatData = parseWhatsAppChat(text, file.name);

        state.pendingChatData = chatData;

        dom.uploadZone.classList.add('has-file');
        dom.fileName.textContent = file.name;

        populateUserDropdown(chatData.participants);
        showAvatarOption(chatData);
        updateLoadButton();

    } catch (error) {
        console.error('Error processing file:', error);
        alert('Failed to parse the chat file.');
    }
}

function populateUserDropdown(participants) {
    const options = participants.filter(p => p.toLowerCase() !== 'you');

    dom.userSelect.innerHTML = '<option value="">-- Select your identity --</option>';

    options.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        dom.userSelect.appendChild(opt);
    });

    dom.userSelect.disabled = false;
}

function showAvatarOption(chatData) {
    dom.avatarOptionRow.style.display = 'block';
    updateAvatarLabel();
}

function updateAvatarLabel() {
    const chatData = state.pendingChatData;
    if (!chatData) return;

    if (chatData.isGroup) {
        dom.avatarLabelText.textContent = 'Group Picture (optional)';
    } else {
        const selectedUser = state.userIdentifier?.toLowerCase();
        const otherPerson = chatData.participants.find(p =>
            p.toLowerCase() !== 'you' && p.toLowerCase() !== selectedUser
        );

        if (otherPerson) {
            dom.avatarLabelText.textContent = `Upload ${otherPerson}'s Picture (optional)`;
        } else if (chatData.participants.length > 0) {
            const fallback = chatData.participants.find(p => p.toLowerCase() !== selectedUser) || chatData.participants[0];
            dom.avatarLabelText.textContent = `Upload ${fallback}'s Picture (optional)`;
        } else {
            dom.avatarLabelText.textContent = 'Contact Picture (optional)';
        }
    }
}

function updateLoadButton() {
    dom.loadChatBtn.disabled = !(state.pendingChatData && state.userIdentifier);
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = e => reject(e);
        reader.readAsText(file);
    });
}

// =============================================
// CHAT PARSING
// =============================================
function parseWhatsAppChat(text, filename) {
    const lines = text.split(/\r?\n/);
    const messages = [];
    const participants = new Set();
    let isGroup = false;
    let groupName = null;

    const dateRegex = /^\[?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?)\]?(?:\s+-\s+|\s?)(.+)/i;

    let currentMessage = null;

    lines.forEach(line => {
        line = line.replace(/[\u200e\u200f\u202a-\u202e]/g, '').trim();
        if (!line) return;

        const match = line.match(dateRegex);

        if (match) {
            if (currentMessage && !shouldSkipMessage(currentMessage.content)) {
                messages.push(currentMessage);
            }

            const [, date, time, contentRaw] = match;
            let sender = null;
            let content = contentRaw;
            let type = 'chat';

            const lowerContent = contentRaw.toLowerCase();

            if (
                lowerContent.includes('messages and calls are end-to-end encrypted') ||
                lowerContent.includes('created group') ||
                lowerContent.includes('added you') ||
                lowerContent.includes(' left') ||
                lowerContent.includes('removed') ||
                lowerContent.includes("changed the subject") ||
                lowerContent.includes("changed this group") ||
                lowerContent.includes("changed the group") ||
                lowerContent.includes('joined using this group') ||
                lowerContent.includes("security code changed") ||
                lowerContent.includes("disappeared") ||
                lowerContent.includes("you're now an admin") ||
                lowerContent.includes("settings changed")
            ) {
                type = 'system';

                const groupMatch = contentRaw.match(/created group [""]([^""]+)[""]/i) ||
                    contentRaw.match(/created group "([^"]+)"/i);
                if (groupMatch) {
                    groupName = groupMatch[1];
                    isGroup = true;
                }
            } else {
                const colonIndex = contentRaw.indexOf(':');
                if (colonIndex !== -1 && colonIndex < 50) {
                    const potentialSender = contentRaw.substring(0, colonIndex).trim();
                    if (potentialSender.length < 50 &&
                        !potentialSender.includes('Messages to this chat') &&
                        !potentialSender.includes('http')) {
                        sender = potentialSender;
                        content = contentRaw.substring(colonIndex + 1).trim();
                        participants.add(sender);
                    } else {
                        type = 'system';
                    }
                } else {
                    type = 'system';
                }
            }

            currentMessage = {
                id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                date: formatDate(date),
                time: formatTime(time),
                sender: sender,
                content: content,
                type: type,
            };
        } else if (currentMessage && line) {
            currentMessage.content += '\n' + line;
        }
    });

    if (currentMessage && !shouldSkipMessage(currentMessage.content)) {
        messages.push(currentMessage);
    }

    if (participants.size > 2) isGroup = true;

    let chatName = groupName || filename.replace('.txt', '').replace('WhatsApp Chat with ', '').replace(/_/g, ' ');

    return {
        id: `chat_${Date.now()}`,
        name: chatName,
        isGroup: isGroup,
        participants: Array.from(participants),
        messages: messages,
        avatar: null,
        customBg: null,
        userIdentifier: null,
        createdAt: Date.now(),
    };
}

function shouldSkipMessage(content) {
    const c = content.toLowerCase().trim();
    return c === '<media omitted>' ||
        c.includes('<media omitted>') ||
        c === 'media omitted' ||
        c === 'null';
}

function formatDate(dateStr) {
    const parts = dateStr.split(/[\/\-\.]/);
    if (parts.length === 3) {
        let [d, m, y] = parts;
        if (y.length === 2) y = '20' + y;
        return `${d}/${m}/${y}`;
    }
    return dateStr;
}

function formatTime(timeStr) {
    let time = timeStr.trim();
    time = time.replace(/(\d{1,2}:\d{2}):\d{2}/, '$1');
    return time;
}

// =============================================
// LOAD CHAT
// =============================================
function loadChat() {
    if (!state.pendingChatData || !state.userIdentifier) return;

    const chat = state.pendingChatData;
    chat.userIdentifier = state.userIdentifier;
    chat.customBg = state.customBgUrl;
    chat.avatar = state.customAvatarUrl;

    state.chats = state.chats.filter(c => c.name !== chat.name);
    state.chats.unshift(chat);
    state.isFirstOpen = false;

    saveToStorage();
    hideModal();
    renderChatList();
    renderMobileChatList();
    openChat(chat);

    resetModalState();
}

// =============================================
// CHAT LIST RENDERING
// =============================================
function renderChatList(searchQuery = '') {
    const query = searchQuery.toLowerCase();

    let filtered = state.chats;
    if (query) {
        filtered = state.chats.filter(c =>
            c.name.toLowerCase().includes(query) ||
            c.messages.some(m => m.content?.toLowerCase().includes(query))
        );
    }

    if (filtered.length === 0) {
        dom.chatList.innerHTML = `
            <div style="padding: 30px; text-align: center; color: var(--text-secondary); font-size: 14px;">
                ${state.chats.length === 0 ? 'No chats yet. Click + to add.' : 'No chats found'}
            </div>
        `;
        return;
    }

    dom.chatList.innerHTML = filtered.map(chat => {
        const lastMsg = chat.messages[chat.messages.length - 1];
        const preview = lastMsg
            ? (lastMsg.type === 'system' ? 'System message' : truncate(lastMsg.content, 35))
            : 'No messages';
        const time = lastMsg?.time || '';
        const isActive = state.activeChatId === chat.id;
        const isMe = lastMsg?.sender?.toLowerCase() === chat.userIdentifier?.toLowerCase();
        const displayName = getChatDisplayName(chat);

        return `
            <div class="user user-container ${isActive ? 'selected' : ''}" data-chat-id="${chat.id}" onclick="handleChatClick('${chat.id}')">
                <div class="pfp">
                    <img src="${chat.customAvatar || chat.avatar || './img/icons8-account-96.png'}" alt="">
                </div>
                <div class="userinfo">
                    <div class="name">
                        <p>${escapeHtml(displayName)}</p>
                    </div>
                    <div class="message">
                        <div class="meicon">
                            ${isMe && lastMsg?.type === 'chat' ? '<span class="material-icons">done_all</span>' : ''}
                            <p>${escapeHtml(preview)}</p>
                        </div>
                    </div>
                </div>
                <div class="userdate">
                    <p>${time}</p>
                </div>
            </div>
        `;
    }).join('');
}

function renderMobileChatList(searchQuery = '') {
    const query = searchQuery.toLowerCase();

    let filtered = state.chats;
    if (query) {
        filtered = state.chats.filter(c =>
            c.name.toLowerCase().includes(query) ||
            c.messages.some(m => m.content?.toLowerCase().includes(query))
        );
    }

    if (filtered.length === 0) {
        dom.mobileChatList.innerHTML = `
            <div style="padding: 40px; text-align: center; color: var(--text-secondary);">
                ${state.chats.length === 0 ? 'No chats yet' : 'No chats found'}
            </div>
        `;
        return;
    }

    dom.mobileChatList.innerHTML = filtered.map(chat => {
        const lastMsg = chat.messages[chat.messages.length - 1];
        const preview = lastMsg
            ? (lastMsg.type === 'system' ? 'System message' : truncate(lastMsg.content, 40))
            : 'No messages';
        const time = lastMsg?.time || '';
        const isMe = lastMsg?.sender?.toLowerCase() === chat.userIdentifier?.toLowerCase();
        const displayName = getChatDisplayName(chat);

        return `
            <div class="mobile-chat-item user-container" data-chat-id="${chat.id}" onclick="handleMobileChatClick('${chat.id}')">
                <div class="avatar">
                    <img src="${chat.customAvatar || chat.avatar || './img/icons8-account-96.png'}" alt="">
                </div>
                <div class="chat-info">
                    <div class="chat-name">${escapeHtml(displayName)}</div>
                    <div class="chat-preview">
                        ${isMe && lastMsg?.type === 'chat' ? '<span class="material-icons">done_all</span>' : ''}
                        ${escapeHtml(preview)}
                    </div>
                </div>
                <div class="chat-time">${time}</div>
            </div>
        `;
    }).join('');
}

function getChatDisplayName(chat) {
    if (chat.isGroup) {
        return chat.name;
    } else {
        const otherPerson = chat.participants.find(p =>
            p.toLowerCase() !== chat.userIdentifier?.toLowerCase() &&
            p.toLowerCase() !== 'you'
        );
        return otherPerson || chat.name;
    }
}

function handleChatClick(chatId) {
    const chat = state.chats.find(c => c.id === chatId);
    if (chat) openChat(chat);
}

function handleMobileChatClick(chatId) {
    const chat = state.chats.find(c => c.id === chatId);
    if (chat) {
        openChat(chat);
        dom.mobileListScreen.classList.add('hidden');
        dom.mobileChatScreen.classList.remove('hidden');
    }
}

// =============================================
// OPEN CHAT
// =============================================
function openChat(chat) {
    state.activeChatId = chat.id;
    saveToStorage();
    renderChatList();
    renderMobileChatList();

    const displayName = getChatDisplayName(chat);

    dom.chatHeaderName.textContent = displayName;
    dom.chatHeaderImg.src = chat.avatar || './img/icons8-account-96.png';

    if (chat.isGroup) {
        const list = chat.participants.slice(0, 5).join(', ');
        const more = chat.participants.length > 5 ? `, +${chat.participants.length - 5}` : '';
        dom.chatHeaderStatus.textContent = list + more;
    } else {
        dom.chatHeaderStatus.textContent = 'Online';
    }

    dom.mobileChatName.textContent = displayName;
    dom.mobileChatAvatar.src = chat.avatar || './img/icons8-account-96.png';

    if (chat.customBg) {
        dom.messagesArea.style.backgroundImage = `url(${chat.customBg})`;
        dom.messagesArea.classList.add('custom-bg');
        dom.mobileMessagesArea.style.backgroundImage = `url(${chat.customBg})`;
        dom.mobileMessagesArea.classList.add('custom-bg');
    } else {
        dom.messagesArea.style.backgroundImage = '';
        dom.messagesArea.classList.remove('custom-bg');
        dom.mobileMessagesArea.style.backgroundImage = '';
        dom.mobileMessagesArea.classList.remove('custom-bg');
    }

    renderMessages(chat);
    renderMobileMessages(chat);
}

// =============================================
// RENDER MESSAGES
// =============================================
function renderMessages(chat) {
    const userNames = [chat.userIdentifier]
        .filter(Boolean)
        .map(n => n.toLowerCase());

    if (chat.participants.some(p => p.toLowerCase() === 'you')) {
        userNames.push('you');
    }

    let html = '';
    let lastDate = null;
    let lastSender = null;

    dom.emptyState.classList.add('hidden');

    chat.messages.forEach((msg) => {
        if (msg.date !== lastDate) {
            html += `<div class="dateofm"><p>${msg.date}</p></div>`;
            lastDate = msg.date;
            lastSender = null;
        }

        if (msg.type === 'system') {
            // Only show content if it exists (date dividers may have empty content)
            if (msg.content) {
                html += `<div class="system-msg"><p>${linkify(escapeHtml(msg.content))}</p></div>`;
            }
            lastSender = null;
        } else {
            const isOutgoing = msg.sender && userNames.includes(msg.sender.toLowerCase());
            const isSameSender = lastSender === msg.sender;
            const reaction = state.reactions[msg.id];
            const hasReaction = reaction ? 'has-reaction' : '';

            if (isOutgoing) {
                html += renderOutgoingMessage(msg, reaction, isSameSender, hasReaction);
            } else {
                html += renderIncomingMessage(msg, chat, reaction, isSameSender, hasReaction);
            }

            lastSender = msg.sender;
        }
    });

    dom.messagesArea.innerHTML = html;

    requestAnimationFrame(() => {
        dom.messagesArea.scrollTop = dom.messagesArea.scrollHeight;
    });
}

function renderOutgoingMessage(msg, reaction, isSameSender, hasReaction) {
    // Determine status icon
    const status = msg.status || 'read';
    let statusIcon = '';
    if (status === 'sent') {
        statusIcon = '<span class="material-icons status-icon status-sent" onclick="cycleMessageStatus(\'' + msg.id + '\')">check</span>';
    } else if (status === 'delivered') {
        statusIcon = '<span class="material-icons status-icon status-delivered" onclick="cycleMessageStatus(\'' + msg.id + '\')">done_all</span>';
    } else {
        statusIcon = '<span class="material-icons status-icon status-read" onclick="cycleMessageStatus(\'' + msg.id + '\')">done_all</span>';
    }

    return `
        <div class="senderContainer ${hasReaction}">
            <div class="sender mepop" data-msg-id="${msg.id}" oncontextmenu="showContextMenu(event, '${msg.id}')">
                <div class="thereply">
                    <p>${linkify(escapeHtml(msg.content))}</p>
                    <div class="time">
                        <span>${msg.time}</span>
                        ${statusIcon}
                    </div>
                </div>
                ${reaction ? `<span class="message-reaction">${reaction}</span>` : ''}
            </div>
        </div>
    `;
}

function renderIncomingMessage(msg, chat, reaction, isSameSender, hasReaction) {
    let nameHtml = '';
    if (chat.isGroup && msg.sender && !isSameSender) {
        nameHtml = `<span class="sender-name" style="color: ${getSenderColor(msg.sender)}">${escapeHtml(msg.sender)}</span>`;
    }

    return `
        <div class="receiverContainer ${hasReaction}">
            <div class="reciver mepop" data-msg-id="${msg.id}" oncontextmenu="showContextMenu(event, '${msg.id}')">
                <!-- Emoji button shown on hover -->
                <div class="msg-emoji-btn" onclick="showReactionPicker(event, '${msg.id}')">
                    <img src="./img/icons8-happy-96.png" alt="">
                </div>
                <div class="thereply">
                    ${nameHtml}
                    <p>${linkify(escapeHtml(msg.content))}</p>
                    <div class="time">
                        <span>${msg.time}</span>
                    </div>
                </div>
                ${reaction ? `<span class="message-reaction">${reaction}</span>` : ''}
            </div>
        </div>
    `;
}

function renderMobileMessages(chat) {
    const userNames = [chat.userIdentifier]
        .filter(Boolean)
        .map(n => n.toLowerCase());

    if (chat.participants.some(p => p.toLowerCase() === 'you')) {
        userNames.push('you');
    }

    let html = '';
    let lastDate = null;
    let lastSender = null;

    chat.messages.forEach((msg) => {
        if (msg.date !== lastDate) {
            html += `<div class="mobile-date-badge">${msg.date}</div>`;
            lastDate = msg.date;
            lastSender = null;
        }

        if (msg.type === 'system') {
            // Only show content if it exists (date dividers may have empty content)
            if (msg.content) {
                html += `<div class="mobile-system-msg system-msg">${linkify(escapeHtml(msg.content))}</div>`;
            }
            lastSender = null;
        } else {
            const isOutgoing = msg.sender && userNames.includes(msg.sender.toLowerCase());
            const isSameSender = lastSender === msg.sender;
            const reaction = state.reactions[msg.id];
            const hasReaction = reaction ? 'has-reaction' : '';

            let senderHtml = '';
            if (chat.isGroup && msg.sender && !isOutgoing && !isSameSender) {
                senderHtml = `<div class="msg-sender" style="color: ${getSenderColor(msg.sender)}">${escapeHtml(msg.sender)}</div>`;
            }

            html += `
                <div class="mobile-msg ${isOutgoing ? 'outgoing' : 'incoming'} ${hasReaction}" data-msg-id="${msg.id}">
                    ${senderHtml}
                    <div class="msg-content">${linkify(escapeHtml(msg.content))}</div>
                    <div class="msg-time">
                        <span>${msg.time}</span>
                        ${isOutgoing ? '<span class="material-icons">done_all</span>' : ''}
                    </div>
                    ${reaction ? `<span class="message-reaction">${reaction}</span>` : ''}
                </div>
            `;

            lastSender = msg.sender;
        }
    });

    dom.mobileMessagesArea.innerHTML = html;

    requestAnimationFrame(() => {
        dom.mobileMessagesArea.scrollTop = dom.mobileMessagesArea.scrollHeight;
    });
}

// =============================================
// IN-CHAT SEARCH
// =============================================
function searchInChat(query) {
    const chat = state.chats.find(c => c.id === state.activeChatId);
    if (!chat || !query.trim()) {
        dom.chatSearchResults.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">Type to search messages</div>';
        return;
    }

    const q = query.toLowerCase();
    const results = chat.messages.filter(m =>
        m.type === 'chat' && m.content.toLowerCase().includes(q)
    );

    if (results.length === 0) {
        dom.chatSearchResults.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">No messages found</div>';
        return;
    }

    dom.chatSearchResults.innerHTML = results.map(msg => {
        const highlighted = msg.content.replace(
            new RegExp(`(${escapeRegex(query)})`, 'gi'),
            '<mark>$1</mark>'
        );
        return `
            <div class="search-result-item" onclick="scrollToMessage('${msg.id}')">
                <div class="search-result-sender">${escapeHtml(msg.sender || 'System')}</div>
                <div class="search-result-content">${highlighted}</div>
                <div class="search-result-time">${msg.date} ${msg.time}</div>
            </div>
        `;
    }).join('');
}

function scrollToMessage(msgId) {
    const msgEl = document.querySelector(`[data-msg-id="${msgId}"]`);
    if (msgEl) {
        msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        msgEl.style.animation = 'highlight 2s';
        setTimeout(() => {
            msgEl.style.animation = '';
        }, 2000);
    }
    dom.chatSearchOverlay.classList.remove('active');
}

// =============================================
// REACTIONS
// =============================================
let currentReactionMsgId = null;

function showReactionPicker(event, msgId) {
    event.stopPropagation();
    currentReactionMsgId = msgId;

    const rect = event.target.closest('.mepop, .mobile-msg, .msg-emoji-btn').getBoundingClientRect();

    dom.reactionPicker.style.top = (rect.top - 50) + 'px';
    dom.reactionPicker.style.left = Math.min(rect.left, window.innerWidth - 220) + 'px';
    dom.reactionPicker.classList.remove('hidden');
}

function handleReactionSelect(event) {
    const emoji = event.target.dataset.emoji;
    if (currentReactionMsgId && emoji) {
        if (state.reactions[currentReactionMsgId] === emoji) {
            delete state.reactions[currentReactionMsgId];
        } else {
            state.reactions[currentReactionMsgId] = emoji;
        }

        saveToStorage();

        const chat = state.chats.find(c => c.id === state.activeChatId);
        if (chat) {
            renderMessages(chat);
            renderMobileMessages(chat);
        }
    }

    dom.reactionPicker.classList.add('hidden');
    currentReactionMsgId = null;
}

// =============================================
// UTILITIES
// =============================================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function linkify(text) {
    // First convert URLs to links
    let result = text.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');

    // Then convert @mentions to styled spans
    result = result.replace(/@([\w\s]+?)(?=[\s,.:;!?)]|$)/g, '<span class="mention-link">@$1</span>');

    return result;
}

function truncate(text, max) {
    if (!text) return '';
    return text.length <= max ? text : text.substring(0, max) + '...';
}

function getSenderColor(name) {
    const colors = [
        '#e542a3', '#1f7aec', '#00a884', '#c35817', '#15d855',
        '#f44336', '#9c27b0', '#673ab7', '#2196f3', '#ff9800'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

// =============================================
// MESSAGING FUNCTIONS
// =============================================
function sendMessage(text, asSender = true) {
    if (!text.trim() || !state.activeChatId) return;

    const chat = state.chats.find(c => c.id === state.activeChatId);
    if (!chat) return;

    const now = new Date();
    const date = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const senderName = asSender
        ? (chat.userIdentifier || 'You')
        : (chat.participants.find(p => p.toLowerCase() !== (chat.userIdentifier || 'you').toLowerCase()) || 'Other');

    const newMsg = {
        id: 'msg_' + Date.now(),
        type: 'chat',
        date: date,
        time: time,
        sender: senderName,
        content: text,
        status: 'read'
    };

    chat.messages.push(newMsg);
    saveToStorage();
    renderMessages(chat);
    renderMobileMessages(chat);
    renderChatList();
    renderMobileChatList();
}

function addSystemMessage(text) {
    if (!text.trim() || !state.activeChatId) return;

    const chat = state.chats.find(c => c.id === state.activeChatId);
    if (!chat) return;

    const now = new Date();
    const date = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const newMsg = {
        id: 'msg_' + Date.now(),
        type: 'system',
        date: date,
        time: '',
        sender: null,
        content: text
    };

    chat.messages.push(newMsg);
    saveToStorage();
    renderMessages(chat);
    renderMobileMessages(chat);
}

function addDateDivider(dateText) {
    if (!dateText.trim() || !state.activeChatId) return;

    const chat = state.chats.find(c => c.id === state.activeChatId);
    if (!chat) return;

    // Insert a dummy message that triggers new date rendering
    const newMsg = {
        id: 'msg_' + Date.now(),
        type: 'system',
        date: dateText,
        time: '',
        sender: null,
        content: ''
    };

    chat.messages.push(newMsg);
    saveToStorage();
    renderMessages(chat);
    renderMobileMessages(chat);
}

// =============================================
// EMOJI PICKER
// =============================================
function toggleEmojiPicker() {
    dom.inputEmojiPicker.classList.toggle('visible');
}

function insertEmoji(emoji) {
    dom.messageInput.value += emoji;
    dom.messageInput.focus();
    dom.inputEmojiPicker.classList.remove('visible');
}

// =============================================
// EDIT MODE TOGGLES
// =============================================
function toggleSidebarEditMode() {
    state.sidebarEditMode = !state.sidebarEditMode;
    document.querySelector('.contacts').classList.toggle('edit-mode-active', state.sidebarEditMode);
    if (dom.sidebarEditToggle) {
        dom.sidebarEditToggle.classList.toggle('active', state.sidebarEditMode);
    }
}

function toggleChatEditMode() {
    state.chatEditMode = !state.chatEditMode;
    document.querySelector('.conversation').classList.toggle('edit-mode-active', state.chatEditMode);
    if (dom.chatEditToggle) {
        dom.chatEditToggle.classList.toggle('active', state.chatEditMode);
    }
    // Clear selection when exiting edit mode
    if (!state.chatEditMode) {
        state.selectedMsgId = null;
        document.querySelectorAll('.sender.selected, .reciver.selected').forEach(el => {
            el.classList.remove('selected');
        });
    }
}

// =============================================
// CONTEXT MENU
// =============================================
function showContextMenu(e, msgId) {
    e.preventDefault();
    state.contextMsgId = msgId;

    const menu = dom.contextMenu;
    menu.style.left = e.pageX + 'px';
    menu.style.top = e.pageY + 'px';
    menu.classList.add('visible');
}

function hideContextMenu() {
    dom.contextMenu.classList.remove('visible');
    state.contextMsgId = null;
}

function editMessageText() {
    if (!state.contextMsgId) return;

    const chat = state.chats.find(c => c.id === state.activeChatId);
    if (!chat) return;

    const msg = chat.messages.find(m => m.id === state.contextMsgId);
    if (!msg) return;

    const newText = prompt('Edit message:', msg.content);
    if (newText !== null) {
        msg.content = newText;
        saveToStorage();
        renderMessages(chat);
        renderMobileMessages(chat);
    }
    hideContextMenu();
}

function editMessageTime() {
    if (!state.contextMsgId) return;

    const chat = state.chats.find(c => c.id === state.activeChatId);
    if (!chat) return;

    const msg = chat.messages.find(m => m.id === state.contextMsgId);
    if (!msg) return;

    const newTime = prompt('Edit time (e.g., 2:30 PM):', msg.time);
    if (newTime !== null) {
        msg.time = newTime;
        saveToStorage();
        renderMessages(chat);
        renderMobileMessages(chat);
    }
    hideContextMenu();
}

function swapMessageSide() {
    if (!state.contextMsgId) return;

    const chat = state.chats.find(c => c.id === state.activeChatId);
    if (!chat) return;

    const msg = chat.messages.find(m => m.id === state.contextMsgId);
    if (!msg || msg.type === 'system') return;

    const userNames = [chat.userIdentifier].filter(Boolean).map(n => n.toLowerCase());
    if (chat.participants.some(p => p.toLowerCase() === 'you')) userNames.push('you');

    const isCurrentlyOutgoing = msg.sender && userNames.includes(msg.sender.toLowerCase());

    if (isCurrentlyOutgoing) {
        // Swap to incoming
        const otherPerson = chat.participants.find(p => !userNames.includes(p.toLowerCase()));
        msg.sender = otherPerson || 'Other';
    } else {
        // Swap to outgoing
        msg.sender = chat.userIdentifier || 'You';
    }

    saveToStorage();
    renderMessages(chat);
    renderMobileMessages(chat);
    hideContextMenu();
}

function deleteMessage() {
    if (!state.contextMsgId) return;

    const chat = state.chats.find(c => c.id === state.activeChatId);
    if (!chat) return;

    chat.messages = chat.messages.filter(m => m.id !== state.contextMsgId);
    saveToStorage();
    renderMessages(chat);
    renderMobileMessages(chat);
    renderChatList();
    renderMobileChatList();
    hideContextMenu();
}

// =============================================
// STATUS CYCLING
// =============================================
function cycleMessageStatus(msgId) {
    const chat = state.chats.find(c => c.id === state.activeChatId);
    if (!chat) return;

    const msg = chat.messages.find(m => m.id === msgId);
    if (!msg) return;

    // Cycle: sent -> delivered -> read -> sent
    const statusOrder = ['sent', 'delivered', 'read'];
    const currentIndex = statusOrder.indexOf(msg.status || 'read');
    msg.status = statusOrder[(currentIndex + 1) % statusOrder.length];

    saveToStorage();
    renderMessages(chat);
    renderMobileMessages(chat);
}

// =============================================
// HEADER EDITING
// =============================================
function editChatHeaderName() {
    const chat = state.chats.find(c => c.id === state.activeChatId);
    if (!chat) return;

    const newName = prompt('Edit chat name:', chat.name);
    if (newName !== null) {
        chat.name = newName;
        saveToStorage();
        openChat(chat);
        renderChatList();
        renderMobileChatList();
    }
}

function editChatHeaderStatus() {
    const newStatus = prompt('Edit status:', dom.chatHeaderStatus.textContent);
    if (newStatus !== null) {
        dom.chatHeaderStatus.textContent = newStatus;
    }
}

// =============================================
// BIND EDIT MODE EVENTS
// =============================================
function bindEditModeEvents() {
    // Send button - opens Message Editor in edit mode, sends message otherwise
    if (dom.sendBtn) {
        dom.sendBtn.addEventListener('click', () => {
            if (state.chatEditMode) {
                openMessageEditor('sender');
            } else {
                sendMessage(dom.messageInput.value, true);
                dom.messageInput.value = '';
            }
        });
    }

    // Enter to send
    if (dom.messageInput) {
        dom.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (state.chatEditMode) {
                    openMessageEditor('sender');
                } else {
                    sendMessage(dom.messageInput.value, true);
                    dom.messageInput.value = '';
                }
            }
        });
    }

    // Mobile send - opens Message Editor in edit mode
    if (dom.mobileSendBtn) {
        dom.mobileSendBtn.addEventListener('click', () => {
            if (state.chatEditMode) {
                openMessageEditor('sender');
            } else {
                sendMessage(dom.mobileMessageInput.value, true);
                dom.mobileMessageInput.value = '';
            }
        });
    }

    if (dom.mobileMessageInput) {
        dom.mobileMessageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (state.chatEditMode) {
                    openMessageEditor('sender');
                } else {
                    sendMessage(dom.mobileMessageInput.value, true);
                    dom.mobileMessageInput.value = '';
                }
            }
        });
    }

    // Emoji picker toggle
    if (dom.emojiToggleBtn) {
        dom.emojiToggleBtn.addEventListener('click', toggleEmojiPicker);
    }

    // Emoji grid clicks
    if (dom.emojiGrid) {
        dom.emojiGrid.addEventListener('click', (e) => {
            if (e.target.dataset.emoji) {
                insertEmoji(e.target.dataset.emoji);
            }
        });
    }

    // Mobile emoji button
    if (dom.mobileEmojiBtn) {
        dom.mobileEmojiBtn.addEventListener('click', () => {
            if (dom.mobileEmojiPicker) {
                dom.mobileEmojiPicker.classList.toggle('visible');
            }
        });
    }

    // Mobile emoji picker clicks
    if (dom.mobileEmojiPicker) {
        dom.mobileEmojiPicker.addEventListener('click', (e) => {
            if (e.target.dataset.emoji) {
                if (dom.mobileMessageInput) {
                    dom.mobileMessageInput.value += e.target.dataset.emoji;
                    dom.mobileMessageInput.focus();
                }
                dom.mobileEmojiPicker.classList.remove('visible');
            }
        });
    }

    // Edit mode toggles
    if (dom.sidebarEditToggle) {
        dom.sidebarEditToggle.addEventListener('click', toggleSidebarEditMode);
    }

    if (dom.chatEditToggle) {
        dom.chatEditToggle.addEventListener('click', toggleChatEditMode);
    }

    // Mobile edit toggle
    if (dom.mobileChatEditToggle) {
        dom.mobileChatEditToggle.addEventListener('click', () => {
            state.chatEditMode = !state.chatEditMode;
            dom.mobileChatEditToggle.classList.toggle('active', state.chatEditMode);
        });
    }

    // Attach Menu toggle
    if (dom.attachMenuBtn) {
        dom.attachMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dom.attachMenu.classList.toggle('visible');
        });
    }

    // Mobile attach menu
    if (dom.mobileAttachBtn) {
        dom.mobileAttachBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (state.chatEditMode) {
                dom.attachMenu.classList.toggle('visible');
            }
        });
    }

    // Attach Menu items
    if (dom.attachEditMsg) {
        dom.attachEditMsg.addEventListener('click', () => {
            editSelectedMessage();
            dom.attachMenu.classList.remove('visible');
        });
    }

    if (dom.attachSwapSide) {
        dom.attachSwapSide.addEventListener('click', () => {
            if (state.selectedMsgId) {
                swapSelectedMessage();
            } else {
                swapAllMessages();
            }
            dom.attachMenu.classList.remove('visible');
        });
    }

    if (dom.attachEditTime) {
        dom.attachEditTime.addEventListener('click', () => {
            editSelectedTime();
            dom.attachMenu.classList.remove('visible');
        });
    }

    if (dom.attachEditDate) {
        dom.attachEditDate.addEventListener('click', () => {
            editSelectedDate();
            dom.attachMenu.classList.remove('visible');
        });
    }

    if (dom.attachDeleteMsg) {
        dom.attachDeleteMsg.addEventListener('click', () => {
            deleteSelectedMessage();
            dom.attachMenu.classList.remove('visible');
        });
    }

    // Message Editor Modal
    if (dom.editorCloseBtn) {
        dom.editorCloseBtn.addEventListener('click', closeMessageEditor);
    }

    if (dom.editorCancelBtn) {
        dom.editorCancelBtn.addEventListener('click', closeMessageEditor);
    }

    if (dom.editorSaveBtn) {
        dom.editorSaveBtn.addEventListener('click', saveMessageFromEditor);
    }

    // Toggle fields visibility based on message type
    if (dom.editorMsgType) {
        dom.editorMsgType.addEventListener('change', () => {
            const type = dom.editorMsgType.value;
            if (dom.statusField) {
                dom.statusField.style.display = (type === 'sender') ? 'block' : 'none';
            }
            if (dom.msgTextField) {
                dom.msgTextField.style.display = (type === 'date') ? 'none' : 'block';
            }
        });
    }

    // User Editor Modal
    if (dom.userEditorCloseBtn) {
        dom.userEditorCloseBtn.addEventListener('click', closeUserEditor);
    }

    if (dom.userEditorCancelBtn) {
        dom.userEditorCancelBtn.addEventListener('click', closeUserEditor);
    }

    if (dom.userEditorSaveBtn) {
        dom.userEditorSaveBtn.addEventListener('click', saveUserFromEditor);
    }

    // Avatar file upload handler
    if (dom.userEditorAvatarFile) {
        dom.userEditorAvatarFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const dataUrl = ev.target.result;
                    if (dom.userAvatarPreview) {
                        dom.userAvatarPreview.src = dataUrl;
                        dom.userAvatarPreview.style.display = 'block';
                    }
                    // Store the data URL temporarily
                    state.pendingAvatarDataUrl = dataUrl;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Header editing in edit mode - click on profile info area opens user editor
    const profileInfo = document.querySelector('.profileInformation');
    if (profileInfo) {
        profileInfo.addEventListener('click', () => {
            if (state.chatEditMode && state.activeChatId) {
                openUserEditor();
            }
        });
    }

    if (dom.chatHeaderName) {
        dom.chatHeaderName.addEventListener('click', () => {
            if (state.chatEditMode && state.activeChatId) openUserEditor();
        });
    }

    if (dom.chatHeaderStatus) {
        dom.chatHeaderStatus.addEventListener('click', () => {
            if (state.chatEditMode && state.activeChatId) openUserEditor();
        });
    }

    // Mobile back button
    if (dom.mobileBackBtn) {
        dom.mobileBackBtn.addEventListener('click', () => {
            if (dom.mobileChatScreen) dom.mobileChatScreen.classList.add('hidden');
            if (dom.mobileListScreen) dom.mobileListScreen.classList.remove('hidden');
        });
    }

    // Help button events
    if (dom.helpBtnDesktop) {
        dom.helpBtnDesktop.addEventListener('click', openHelpModal);
    }

    if (dom.helpBtnMobile) {
        dom.helpBtnMobile.addEventListener('click', openHelpModal);
    }

    if (dom.helpCloseBtn) {
        dom.helpCloseBtn.addEventListener('click', closeHelpModal);
    }

    // Close help modal when clicking outside
    if (dom.helpModal) {
        dom.helpModal.addEventListener('click', (e) => {
            if (e.target === dom.helpModal) {
                closeHelpModal();
            }
        });
    }

    // Close menus when clicking outside
    document.addEventListener('click', (e) => {
        if (dom.inputEmojiPicker && !dom.inputEmojiPicker.contains(e.target) &&
            dom.emojiToggleBtn && !dom.emojiToggleBtn.contains(e.target)) {
            dom.inputEmojiPicker.classList.remove('visible');
        }
        if (dom.mobileEmojiPicker && !dom.mobileEmojiPicker.contains(e.target) &&
            dom.mobileEmojiBtn && !dom.mobileEmojiBtn.contains(e.target)) {
            dom.mobileEmojiPicker.classList.remove('visible');
        }
        if (dom.attachMenu && !dom.attachMenu.contains(e.target) &&
            !dom.attachMenuBtn?.contains(e.target) && !dom.mobileAttachBtn?.contains(e.target)) {
            dom.attachMenu.classList.remove('visible');
        }
    });

    // Mobile tab navigation
    document.querySelectorAll('.mobile-nav .nav-item').forEach(item => {
        item.addEventListener('click', () => {
            switchMobileTab(item.dataset.tab);
        });
    });

    // Message selection on click - only in edit mode
    document.addEventListener('click', (e) => {
        if (!state.chatEditMode) return;
        const msgEl = e.target.closest('.sender, .reciver');
        if (msgEl && msgEl.dataset.msgId) {
            selectMessage(msgEl.dataset.msgId);
        }
    });

    // User container click in sidebar edit mode - store which chat was clicked
    document.addEventListener('click', (e) => {
        if (!state.sidebarEditMode) return;
        const userContainer = e.target.closest('.user-container');
        if (userContainer && userContainer.dataset.chatId) {
            e.preventDefault();
            e.stopPropagation();
            // Set active chat to the clicked one before opening editor
            const clickedChatId = userContainer.dataset.chatId;
            if (clickedChatId) {
                state.activeChatId = clickedChatId;
                openUserEditor();
            }
        }
    });
}

// =============================================
// MESSAGE SELECTION
// =============================================
function selectMessage(msgId) {
    // If clicking the same message, deselect it
    if (state.selectedMsgId === msgId) {
        state.selectedMsgId = null;
        document.querySelectorAll('.sender.selected, .reciver.selected').forEach(el => {
            el.classList.remove('selected');
        });
        return;
    }

    state.selectedMsgId = msgId;

    // Remove previous selection
    document.querySelectorAll('.sender.selected, .reciver.selected').forEach(el => {
        el.classList.remove('selected');
    });

    // Add selection to current
    document.querySelectorAll(`[data-msg-id="${msgId}"]`).forEach(el => {
        el.classList.add('selected');
    });
}

function editSelectedMessage() {
    if (!state.selectedMsgId) {
        alert('Please select a message first by clicking on it.');
        return;
    }
    state.contextMsgId = state.selectedMsgId;
    editMessageText();
}

function swapSelectedMessage() {
    if (!state.selectedMsgId) {
        alert('Please select a message first by clicking on it.');
        return;
    }
    state.contextMsgId = state.selectedMsgId;
    swapMessageSide();
}

function editSelectedTime() {
    if (!state.selectedMsgId) {
        alert('Please select a message first by clicking on it.');
        return;
    }
    state.contextMsgId = state.selectedMsgId;
    editMessageTime();
}

function editSelectedDate() {
    if (!state.selectedMsgId) {
        alert('Please select a message first by clicking on it.');
        return;
    }
    const chat = state.chats.find(c => c.id === state.activeChatId);
    if (!chat) return;

    const msg = chat.messages.find(m => m.id === state.selectedMsgId);
    if (!msg) return;

    const newDate = prompt('Edit date:', msg.date);
    if (newDate !== null) {
        msg.date = newDate;
        saveToStorage();
        renderMessages(chat);
        renderMobileMessages(chat);
    }
}

function deleteSelectedMessage() {
    if (!state.selectedMsgId) {
        alert('Please select a message first by clicking on it.');
        return;
    }
    state.contextMsgId = state.selectedMsgId;
    deleteMessage();
    state.selectedMsgId = null;
}

// =============================================
// MESSAGE EDITOR MODAL
// =============================================
function openMessageEditor(type = 'sender') {
    if (!state.activeChatId) {
        alert('Please open a chat first.');
        return;
    }

    // Reset form
    dom.editorMsgType.value = type;
    dom.editorMsgText.value = '';

    // Set current date/time as defaults
    const now = new Date();
    dom.editorMsgDate.value = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    dom.editorMsgTime.value = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    // Set default status
    const statusRadio = document.querySelector('input[name="msgStatus"][value="read"]');
    if (statusRadio) statusRadio.checked = true;

    // Show/hide status field (only for sender)
    if (dom.statusField) {
        dom.statusField.style.display = (type === 'sender') ? 'block' : 'none';
    }

    // Show/hide message text field (hide for date divider)
    if (dom.msgTextField) {
        dom.msgTextField.style.display = (type === 'date') ? 'none' : 'block';
    }

    // Update title
    if (type === 'date') {
        dom.editorTitle.textContent = 'Add Date Divider';
        dom.editorSaveBtn.textContent = 'Add Date';
    } else {
        dom.editorTitle.textContent = 'Add Message';
        dom.editorSaveBtn.textContent = 'Add Message';
    }

    // Show modal
    dom.messageEditorModal.classList.remove('hidden');
    if (type !== 'date') {
        dom.editorMsgText.focus();
    } else {
        dom.editorMsgDate.focus();
    }
}

function closeMessageEditor() {
    dom.messageEditorModal.classList.add('hidden');
}

function saveMessageFromEditor() {
    const type = dom.editorMsgType.value;
    const text = dom.editorMsgText.value.trim();
    const date = dom.editorMsgDate.value.trim();
    const time = dom.editorMsgTime.value.trim();
    const status = document.querySelector('input[name="msgStatus"]:checked')?.value || 'read';

    if (!text && type !== 'date') {
        alert('Please enter a message.');
        return;
    }

    const chat = state.chats.find(c => c.id === state.activeChatId);
    if (!chat) return;

    if (type === 'sender') {
        const senderName = chat.userIdentifier || 'You';
        chat.messages.push({
            id: 'msg_' + Date.now(),
            type: 'chat',
            date: date,
            time: time,
            sender: senderName,
            content: text,
            status: status
        });
    } else if (type === 'receiver') {
        const receiverName = chat.participants.find(p =>
            p.toLowerCase() !== (chat.userIdentifier || 'you').toLowerCase()
        ) || 'Other';
        chat.messages.push({
            id: 'msg_' + Date.now(),
            type: 'chat',
            date: date,
            time: time,
            sender: receiverName,
            content: text,
            status: null
        });
    } else if (type === 'system') {
        chat.messages.push({
            id: 'msg_' + Date.now(),
            type: 'system',
            date: date,
            time: '',
            sender: null,
            content: text
        });
    } else if (type === 'date') {
        chat.messages.push({
            id: 'msg_' + Date.now(),
            type: 'system',
            date: date || text,
            time: '',
            sender: null,
            content: ''
        });
    }

    saveToStorage();
    renderMessages(chat);
    renderMobileMessages(chat);
    renderChatList();
    renderMobileChatList();
    closeMessageEditor();
}

// =============================================
// USER EDITOR MODAL
// =============================================
function openUserEditor() {
    const chat = state.chats.find(c => c.id === state.activeChatId);
    if (!chat) {
        alert('Please open a chat first.');
        return;
    }

    // Populate form with current values
    dom.userEditorName.value = chat.name || '';

    // Get last message for preview
    const lastMsg = chat.messages.filter(m => m.type === 'chat').pop();
    dom.userEditorLastMsg.value = lastMsg ? lastMsg.content : '';

    // Avatar URL if custom
    dom.userEditorAvatar.value = chat.customAvatar || '';

    // Reset file input and preview
    if (dom.userEditorAvatarFile) dom.userEditorAvatarFile.value = '';
    if (dom.userAvatarPreview) {
        if (chat.customAvatar) {
            dom.userAvatarPreview.src = chat.customAvatar;
            dom.userAvatarPreview.style.display = 'block';
        } else {
            dom.userAvatarPreview.src = '';
            dom.userAvatarPreview.style.display = 'none';
        }
    }
    state.pendingAvatarDataUrl = null;

    // Show modal
    dom.userEditorModal.classList.remove('hidden');
    dom.userEditorName.focus();
}

function closeUserEditor() {
    dom.userEditorModal.classList.add('hidden');
    state.pendingAvatarDataUrl = null;
}

function saveUserFromEditor() {
    const chat = state.chats.find(c => c.id === state.activeChatId);
    if (!chat) return;

    const newName = dom.userEditorName.value.trim();
    const newLastMsg = dom.userEditorLastMsg.value.trim();
    const newAvatarUrl = dom.userEditorAvatar.value.trim();

    if (newName) {
        chat.name = newName;
    }

    // Update last message if provided
    if (newLastMsg) {
        const lastMsg = chat.messages.filter(m => m.type === 'chat').pop();
        if (lastMsg) {
            lastMsg.content = newLastMsg;
        }
    }

    // Update avatar - prioritize file upload over URL
    if (state.pendingAvatarDataUrl) {
        chat.customAvatar = state.pendingAvatarDataUrl;
    } else if (newAvatarUrl) {
        chat.customAvatar = newAvatarUrl;
    }

    saveToStorage();

    // Update displays
    if (dom.chatHeaderName) dom.chatHeaderName.textContent = chat.name;
    if (dom.mobileChatName) dom.mobileChatName.textContent = chat.name;

    // Update avatar in header
    if (chat.customAvatar) {
        if (dom.chatHeaderImg) dom.chatHeaderImg.src = chat.customAvatar;
        if (dom.mobileChatAvatar) dom.mobileChatAvatar.src = chat.customAvatar;
    }

    renderChatList();
    renderMobileChatList();
    closeUserEditor();
}

// =============================================
// SWAP ALL MESSAGES
// =============================================
function swapAllMessages() {
    const chat = state.chats.find(c => c.id === state.activeChatId);
    if (!chat) return;

    const userNames = [chat.userIdentifier].filter(Boolean).map(n => n.toLowerCase());
    if (chat.participants.some(p => p.toLowerCase() === 'you')) userNames.push('you');

    chat.messages.forEach(msg => {
        if (msg.type !== 'chat') return;

        const isCurrentlyOutgoing = msg.sender && userNames.includes(msg.sender.toLowerCase());

        if (isCurrentlyOutgoing) {
            const otherPerson = chat.participants.find(p => !userNames.includes(p.toLowerCase()));
            msg.sender = otherPerson || 'Other';
        } else {
            msg.sender = chat.userIdentifier || 'You';
        }
    });

    saveToStorage();
    renderMessages(chat);
    renderMobileMessages(chat);
}

// =============================================
// MOBILE TAB NAVIGATION
// =============================================
function switchMobileTab(tabName) {
    // Update nav items
    document.querySelectorAll('.mobile-nav .nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tabName);
    });

    // Hide all screens
    dom.mobileListScreen?.classList.add('hidden');
    dom.mobileUpdatesScreen?.classList.add('hidden');
    dom.mobileCommunitiesScreen?.classList.add('hidden');
    dom.mobileCallsScreen?.classList.add('hidden');

    // Show selected screen
    switch (tabName) {
        case 'chats':
            dom.mobileListScreen?.classList.remove('hidden');
            break;
        case 'updates':
            dom.mobileUpdatesScreen?.classList.remove('hidden');
            break;
        case 'communities':
            dom.mobileCommunitiesScreen?.classList.remove('hidden');
            break;
        case 'calls':
            dom.mobileCallsScreen?.classList.remove('hidden');
            break;
    }
}

// =============================================
// HELP MODAL
// =============================================
function openHelpModal() {
    if (dom.helpModal) {
        dom.helpModal.classList.remove('hidden');
    }
}

function closeHelpModal() {
    if (dom.helpModal) {
        dom.helpModal.classList.add('hidden');
    }
}

// Call this in the existing DOMContentLoaded or after bindEvents
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(bindEditModeEvents, 100);
});

// Expose to global
window.handleChatClick = handleChatClick;
window.handleMobileChatClick = handleMobileChatClick;
window.showReactionPicker = showReactionPicker;
window.scrollToMessage = scrollToMessage;
window.cycleMessageStatus = cycleMessageStatus;
window.selectMessage = selectMessage;

