/**
 * Agora Conversational AI API for Web (JavaScript)
 * Based on the official Agora Conversational AI Demo implementation
 * Simplified JavaScript version of the TypeScript original
 */

// Event types
const EConversationalAIAPIEvents = {
    TRANSCRIPTION_UPDATED: 'transcription-updated',
    AGENT_STATE_CHANGED: 'agent-state-changed',
    AGENT_INTERRUPTED: 'agent-interrupted',
    AGENT_METRICS: 'agent-metrics',
    AGENT_ERROR: 'agent-error',
    DEBUG_LOG: 'debug-log',
    MESSAGE_RECEIPT_UPDATED: 'message-receipt-updated',
    MESSAGE_ERROR: 'message-error'
};

const ESubtitleHelperMode = {
    TEXT: 'text',
    WORD: 'word',
    UNKNOWN: 'unknown'
};

const EMessageType = {
    USER_TRANSCRIPTION: 'user.transcription',
    AGENT_TRANSCRIPTION: 'assistant.transcription',
    MSG_INTERRUPTED: 'message.interrupt',
    MSG_METRICS: 'message.metrics',
    MSG_ERROR: 'message.error',
    IMAGE_UPLOAD: 'image.upload',
    MESSAGE_INFO: 'message.info',
    IMAGE: 'IMAGE',
    TEXT: 'TEXT'
};

const ERTCEvents = {
    AUDIO_METADATA: 'audio-metadata',
    USER_PUBLISHED: 'user-published',
    USER_UNPUBLISHED: 'user-unpublished',
    USER_JOINED: 'user-joined',
    USER_LEFT: 'user-left'
};

const ERTMEvents = {
    MESSAGE: 'message',
    PRESENCE: 'presence',
    STATUS: 'status'
};

/**
 * Simple EventHelper class for event management
 */
class EventHelper {
    constructor() {
        this.eventListeners = new Map();
    }

    on(event, handler) {
        console.log(`🔗 EventHelper.on: Registering handler for event: ${event}`);
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(handler);
        console.log(`🔗 Total handlers for ${event}: ${this.eventListeners.get(event).length}`);
    }

    off(event, handler) {
        if (this.eventListeners.has(event)) {
            const handlers = this.eventListeners.get(event);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    emit(event, ...args) {
        console.log(`📡 EventHelper.emit: ${event} with ${args.length} arguments`);
        if (this.eventListeners.has(event)) {
            const handlers = this.eventListeners.get(event);
            console.log(`📡 Found ${handlers.length} handlers for event: ${event}`);
            handlers.forEach(handler => {
                try {
                    handler(...args);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        } else {
            console.log(`📡 No handlers found for event: ${event}`);
        }
    }

    removeAllListeners() {
        this.eventListeners.clear();
    }
}

/**
 * Simple SubRender Controller for handling subtitle messages
 */
class CovSubRenderController extends EventHelper {
    constructor(options = {}) {
        super(); // Call parent constructor
        console.log('CovSubRenderController v1.1 loaded - improved duplicate detection');
        
        this.mode = options.mode || ESubtitleHelperMode.UNKNOWN;
        this.pts = options.pts || 0;
        this.chatHistory = [];
        this.processedMessageIds = new Set();
        this.pendingAssistantTranscriptions = new Map();
        this.expectedAgentId = options.expectedAgentId || null;
        this.onChatHistoryUpdated = options.onChatHistoryUpdated || null;
        this.onAgentStateChanged = options.onAgentStateChanged || null;
        this.onAgentInterrupted = options.onAgentInterrupted || null;
        this.onDebugLog = options.onDebugLog || null;
        this.onAgentMetrics = options.onAgentMetrics || null;
        this.onMessageReceipt = options.onMessageReceipt || null;
        this.onMessageError = options.onMessageError || null;
        
        this.agentStates = new Map(); // Track agent states
        this.processedContentHashes = new Set(); // Track processed content hashes to prevent duplicates
        this.processedKeys = new Map(); // New map for deduplication based on content and speaker
    }

    setMode(mode) {
        this.mode = mode;
    }

    setPts(pts) {
        this.pts = pts;
    }

    run() {
        // Initialize the controller
        console.log('CovSubRenderController started');
    }

    cleanup() {
        this.chatHistory = [];
        this.pts = 0;
        console.log('CovSubRenderController cleaned up');
    }

    handleMessage(message, context) {
        try {
            console.log('=== MESSAGE HANDLER DEBUG ===');
            console.log('Received message:', message);
            console.log('Message object:', message.object);
            console.log('Message module:', message.module);
            console.log('Context:', context);
            
            if (message.object === 'assistant.transcript' || message.object === 'assistant.transcription' || message.object === 'user.transcription') {
                // Handle transcription messages
                console.log('Found transcription message:', message.object);
                this.handleTranscriptionMessage(message, context);
            } else if (message.object === 'message.info' || message.object === 'message.error') {
                // Handle image upload responses
                console.log('✅ Found image message response:', message);
                console.log('Message object:', message.object);
                console.log('Message module:', message.module);
                this.handleImageMessageResponse(message, context);
            } else if (message.text || message.content) {
                // Handle any message with text content as potential transcription
                console.log('Found message with text content, treating as transcription:', message);
                this.handleTranscriptionMessage(message, context);
            } else {
                console.log('❌ Unhandled message type:', message.type || message.customType || message.object, message);
            }
        } catch (error) {
            console.error('Error handling message:', error);
            if (this.onDebugLog) {
                this.onDebugLog(`Error handling message: ${error.message}`);
            }
        }
    }

    handleTranscriptionMessage(message, context) {
        // Clean up old processed keys to prevent memory bloat
        const currentTime = Date.now();
        const timeThreshold = 30000; // 30 seconds threshold for cleanup
        for (const [key, timestamp] of this.processedKeys.entries()) {
            if (currentTime - timestamp > timeThreshold) {
                this.processedKeys.delete(key);
            }
        }
        
        // Create unique key using messageId and turnId for precise deduplication
        const turnId = message.turn_id || message.turnId || '';
        const messageId = message.message_id || message.messageId || '';
        const text = message.text || message.content || '';
        
        // Create a unique key using messageId (most reliable) or turnId + text
        const uniqueKey = messageId || `${turnId}:${text.trim()}`;
        
        // Check if we've already processed this exact message
        if (this.processedKeys.has(uniqueKey)) {
            console.log('🔄 Skipping duplicate message (exact match):', uniqueKey);
            return;
        }
        
        // Mark this message as processed
        this.processedKeys.set(uniqueKey, currentTime);
        
        // Determine if this is a final transcription
        let isFinal = message.is_final || message.final || false;
        
        // Use turn_status to help determine finality (turn_status: 1 = final, 0 = in progress)
        if (message.turn_status !== undefined) {
            isFinal = message.turn_status === 1;
        }
        
        // DEBUG: Log full message structure to understand available fields
        console.log('DEBUG - Full message structure:', JSON.stringify(message, null, 2));
        
        // Determine speaker based on message type/object - use consistent naming
        let speaker;
        let agentUserId = context.publisher;
        
        if (message.type === EMessageType.AGENT_TRANSCRIPTION || 
            message.customType === 'assistant.transcription' ||
            message.object === 'assistant.transcription' ||
            message.object === 'assistant.transcript') {
            // Use the expected agent ID from UI if available, otherwise use context.publisher
            const displayAgentId = this.expectedAgentId || context.publisher;
            speaker = `Assistant (${displayAgentId})`;
            agentUserId = context.publisher; // This is the agent's UID
        } else if (message.type === EMessageType.USER_TRANSCRIPTION ||
                   message.customType === 'user.transcription' ||
                   message.object === 'user.transcription') {
            // Use user_id from the message if available, otherwise fallback
            const userId = message.user_id || message.userId || 'unknown-user';
            speaker = `User (${userId})`;
            agentUserId = userId; // Use actual user ID from transcription
        } else {
            // Fallback to existing logic
            speaker = message.speaker || context.publisher || 'unknown';
        }

        // For assistant transcriptions, we need different logic since they don't always have 'final' flag
        if (message.object === 'assistant.transcription' || 
            message.type === EMessageType.AGENT_TRANSCRIPTION ||
            message.customType === 'assistant.transcription') {
            // Store the latest assistant transcription for this agent
            this.pendingAssistantTranscriptions.set(agentUserId, {
                message: message,
                context: context,
                timestamp: Date.now()
            });
            
            // For assistant messages, consider them final if:
            // 1. They explicitly have final=true, OR
            // 2. turn_status === 1, OR  
            // 3. They have end punctuation and turn_status === 0 (in progress)
            isFinal = message.is_final === true || message.final === true || message.turn_status === 1;
        }

        // Safely format timestamp to avoid "Invalid Date"
        let formattedTimestamp;
        try {
            const timestamp = message.timestamp || Date.now();
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) {
                formattedTimestamp = new Date().toLocaleTimeString();
            } else {
                formattedTimestamp = date.toLocaleTimeString();
            }
        } catch (error) {
            formattedTimestamp = new Date().toLocaleTimeString();
        }

        const transcriptionData = {
            agentUserId: agentUserId,
            transcription: {
                text: message.text || message.content || '',
                speaker: speaker,
                isFinal: isFinal,
                timestamp: formattedTimestamp,
                turnId: message.turn_id || null,
                user_id: message.user_id || null,
                messageId: messageId // Add messageId for better tracking
            }
        };

        // Always update chat history for both final and non-final transcriptions
        // This ensures we see live updates as the agent speaks
        const currentChatHistory = [...this.chatHistory];
        
        if (transcriptionData.transcription.isFinal) {
            // For final transcriptions, check if we already have this exact message
            const existingMessage = currentChatHistory.find(item => 
                item.data && 
                item.data.text === transcriptionData.transcription.text &&
                item.data.speaker === transcriptionData.transcription.speaker &&
                !item.id.toString().startsWith('temp-')
            );
            
            if (!existingMessage) {
                currentChatHistory.push({
                    id: Date.now() + Math.random(),
                    timestamp: transcriptionData.transcription.timestamp,
                    agentUserId: transcriptionData.agentUserId,
                    data: transcriptionData.transcription
                });
            } else {
                console.log('Skipping duplicate final message in chat history:', transcriptionData.transcription.text.substring(0, 50) + '...');
            }
        } else {
            // For non-final transcriptions, update or add temporary item
            const tempId = `temp-${transcriptionData.agentUserId}`;
            const existingTempIndex = currentChatHistory.findIndex(item => 
                item.id === tempId || 
                (item.id && item.id.toString().startsWith('temp-') && 
                 item.agentUserId === transcriptionData.agentUserId)
            );
            
            const tempItem = {
                id: tempId,
                timestamp: transcriptionData.transcription.timestamp,
                agentUserId: transcriptionData.agentUserId,
                data: transcriptionData.transcription
            };
            
            if (existingTempIndex >= 0) {
                // Replace existing temp item
                currentChatHistory[existingTempIndex] = tempItem;
            } else {
                // Add new temp item
                currentChatHistory.push(tempItem);
            }
        }

        // Update chat history and notify listeners
        this.chatHistory = currentChatHistory;
        console.log('Chat history updated:', this.chatHistory);
        
        // Notify listeners about the transcription update
        if (this.onTranscriptionUpdate) {
            this.onTranscriptionUpdate(transcriptionData);
        }
        
        // Emit the transcription-updated event for proper event handling
        this.emit(EConversationalAIAPIEvents.TRANSCRIPTION_UPDATED, this.chatHistory);
    }

    // Helper method to remove duplicate messages from chat history
    removeDuplicateMessages() {
        // Remove duplicates based on content + turn_id + speaker + message_id
        const seen = new Set();
        const uniqueMessages = [];
        
        for (const message of this.chatHistory) {
            if (!message.data) continue;
            
            const text = message.data.text || '';
            const turnId = message.data.turn_id || message.data.turnId || '';
            const speaker = message.data.speaker || '';
            const messageId = message.data.message_id || message.data.messageId || '';
            const key = `${text.trim()}:${turnId}:${speaker}:${messageId}`;
            
            if (!seen.has(key)) {
                seen.add(key);
                uniqueMessages.push(message);
            } else {
                console.log('Removing duplicate message:', text.substring(0, 50) + '...');
            }
        }
        
        if (uniqueMessages.length !== this.chatHistory.length) {
            console.log(`Removed ${this.chatHistory.length - uniqueMessages.length} content duplicates`);
            this.chatHistory = uniqueMessages;
            if (this.onChatHistoryUpdated) {
                this.onChatHistoryUpdated([...this.chatHistory]);
            }
        }
    }

    // Helper method to finalize all pending transcriptions when interrupt occurs
    finalizeAllPendingTranscriptions() {
        console.log('Interrupt detected, finalizing all pending transcriptions');
        
        // Finalize all pending assistant transcriptions
        for (const [agentUserId, pending] of this.pendingAssistantTranscriptions.entries()) {
            this.finalizeLastAssistantTranscription(agentUserId);
        }
        
        // Don't clear temporary messages - let them stay as "(live)" until replaced
        // The UI will handle showing the final version when it's ready
    }



    handleAgentStatus(presence) {
        const agentUserId = presence.publisher;
        const stateChanged = presence.stateChanged;
        
        if (stateChanged && stateChanged.state) {
            const event = {
                state: stateChanged.state,
                turnId: stateChanged.turn_id,
                timestamp: presence.timestamp
            };

            // Track agent state changes
            const previousState = this.agentStates.get(agentUserId);
            this.agentStates.set(agentUserId, stateChanged.state);

            // When agent becomes silent, finalize the last assistant transcription
            if (stateChanged.state === 'silent' && previousState === 'speaking') {
                this.finalizeLastAssistantTranscription(agentUserId);
            }

            if (this.onAgentStateChanged) {
                this.onAgentStateChanged(agentUserId, event);
            }

            console.log('Agent state changed:', agentUserId, event);
        }
    }

    finalizeLastAssistantTranscription(agentUserId) {
        // Get the last pending assistant transcription for this agent
        const pending = this.pendingAssistantTranscriptions.get(agentUserId);
        if (!pending) return;

        // Check if we already have this message in chat history to prevent duplicates
        const text = pending.message.text || pending.message.content || '';
        const existingMessage = this.chatHistory.find(item => 
            item.data && 
            item.data.text === text &&
            item.data.speaker && item.data.speaker.includes('Assistant') &&
            !item.id.toString().startsWith('temp-')
        );
        
        if (existingMessage) {
            console.log('Skipping duplicate finalization - message already exists:', text.substring(0, 50) + '...');
            // Clear the pending transcription without adding to chat history
            this.pendingAssistantTranscriptions.delete(agentUserId);
            return;
        }

        // Safely format timestamp for final transcription
        let formattedTimestamp;
        try {
            const timestamp = pending.message.timestamp || Date.now();
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) {
                formattedTimestamp = new Date().toLocaleTimeString();
            } else {
                formattedTimestamp = date.toLocaleTimeString();
            }
        } catch (error) {
            formattedTimestamp = new Date().toLocaleTimeString();
        }

        // Create a final transcription based on the last pending one
        const finalTranscription = {
            agentUserId: agentUserId,
            transcription: {
                text: pending.message.text || pending.message.content || '',
                speaker: this.expectedAgentId ? `Assistant (${this.expectedAgentId})` : `Assistant (${agentUserId})`,
                isFinal: true,
                timestamp: formattedTimestamp,
                turnId: pending.message.turn_id || null
            }
        };

        // Add to permanent chat history
        this.chatHistory.push({
            id: Date.now() + Math.random(),
            timestamp: finalTranscription.transcription.timestamp,
            agentUserId: finalTranscription.agentUserId,
            data: finalTranscription.transcription
        });

        // Clear the pending transcription
        this.pendingAssistantTranscriptions.delete(agentUserId);

        // Notify about the final update
        if (this.onChatHistoryUpdated) {
            this.onChatHistoryUpdated([...this.chatHistory]);
        }

        console.log('Finalized assistant transcription on state change:', finalTranscription);
    }

    handleMetricsMessage(message, context) {
        if (this.onAgentMetrics) {
            this.onAgentMetrics(context.publisher, message);
        }
    }

    handleErrorMessage(message, context) {
        if (this.onAgentError) {
            this.onAgentError(context.publisher, message);
        }
    }

    handleMessageReceipt(message, context) {
        console.log('Message receipt received:', message, context);
        
        // Parse the receipt message to get UUID and status
        try {
            const receiptData = typeof message.message === 'string' ? JSON.parse(message.message) : message.message;
            const uuid = receiptData.uuid;
            const status = receiptData.status || 'unknown';
            
            console.log(`Message receipt for UUID ${uuid}: ${status}`);
            
            // Emit the message receipt event
            if (this.onMessageReceipt) {
                this.onMessageReceipt(context.publisher, {
                    uuid: uuid,
                    status: status,
                    message: receiptData
                });
            }
        } catch (error) {
            console.error('Failed to parse message receipt:', error);
        }
    }

    handleImageMessageResponse(message, context) {
        console.log('Image message response received:', message, context);
        
        try {
            // Forward the image message response to the UI for handling
            if (window.ui && typeof window.ui.handleImageMessageResponse === 'function') {
                window.ui.handleImageMessageResponse(message);
            }
        } catch (error) {
            console.error('Failed to handle image message response:', error);
        }
    }
}

/**
 * Main Conversational AI API class
 */
class ConversationalAIAPI extends EventHelper {
    constructor() {
        super();
        this.rtcEngine = null;
        this.rtmEngine = null;
        this.renderMode = ESubtitleHelperMode.UNKNOWN;
        this.channel = null;
        this.enableLog = false;
        this.covSubRenderController = null;
        this.isInitialized = false;

        this.setupController();
    }

    setupController() {
        this.covSubRenderController = new CovSubRenderController({
            onChatHistoryUpdated: this.onChatHistoryUpdated.bind(this),
            onAgentStateChanged: this.onAgentStateChanged.bind(this),
            onAgentInterrupted: this.onAgentInterrupted.bind(this),
            onDebugLog: this.onDebugLog.bind(this),
            onAgentMetrics: this.onAgentMetrics.bind(this),
            onAgentError: this.onAgentError.bind(this),
            onMessageReceipt: this.onMessageReceiptUpdated.bind(this),
            onMessageError: this.onMessageError.bind(this),
            expectedAgentId: this.expectedAgentId // Pass expected agent ID to controller
        });
    }

    // Singleton pattern
    static instance = null;

    static init(config) {
        if (!ConversationalAIAPI.instance) {
            ConversationalAIAPI.instance = new ConversationalAIAPI();
        }
        
        ConversationalAIAPI.instance.rtcEngine = config.rtcEngine;
        ConversationalAIAPI.instance.rtmEngine = config.rtmEngine;
        ConversationalAIAPI.instance.renderMode = config.renderMode || ESubtitleHelperMode.UNKNOWN;
        ConversationalAIAPI.instance.enableLog = config.enableLog || false;
        ConversationalAIAPI.instance.expectedAgentId = config.expectedAgentId || null; // Store expected agent ID
        ConversationalAIAPI.instance.isInitialized = true;

        console.log('ConversationalAIAPI initialized');
        return ConversationalAIAPI.instance;
    }

    static getInstance() {
        if (!ConversationalAIAPI.instance) {
            throw new Error('ConversationalAIAPI not initialized. Call ConversationalAIAPI.init() first.');
        }
        return ConversationalAIAPI.instance;
    }

    getCfg() {
        if (!this.rtcEngine || !this.rtmEngine) {
            throw new Error('ConversationalAIAPI not initialized');
        }
        return {
            rtcEngine: this.rtcEngine,
            rtmEngine: this.rtmEngine,
            renderMode: this.renderMode,
            channel: this.channel,
            enableLog: this.enableLog
        };
    }

    async subscribeMessage(channel) {
        this.bindRtcEvents();
        this.bindRtmEvents();

        // Validate and sanitize channel name for RTM v2.x
        let validChannelName = channel;
        if (!validChannelName || validChannelName.length === 0) {
            validChannelName = 'default_channel';
        }
        // RTM v2.x channel names should be alphanumeric and underscores, max 64 chars
        validChannelName = validChannelName.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 64);
        
        this.channel = validChannelName;
        this.covSubRenderController.setMode(this.renderMode);
        this.covSubRenderController.run();

        // Subscribe to RTM channel in v2.x using the correct API
        try {
            if (this.rtmEngine) {
                const subscribeOptions = {
                    withMessage: true,
                    withPresence: true,
                    withMetadata: false,
                    withLock: false
                };
                await this.rtmEngine.subscribe(this.channel, subscribeOptions);
                console.log('Subscribed to RTM channel:', this.channel);
            }
        } catch (error) {
            console.error('Failed to subscribe to RTM channel:', error);
        }

        console.log('Subscribed to channel:', this.channel);
    }

    async unsubscribe() {
        this.unbindRtcEvents();
        this.unbindRtmEvents();

        // Unsubscribe from RTM channel in v2.x
        try {
            if (this.rtmEngine && this.channel) {
                await this.rtmEngine.unsubscribe(this.channel);
                console.log('Unsubscribed from RTM channel:', this.channel);
            }
        } catch (error) {
            console.error('Failed to unsubscribe from RTM channel:', error);
        }

        this.channel = null;
        this.covSubRenderController.cleanup();

        console.log('Unsubscribed from channel');
    }

    async destroy() {
        if (ConversationalAIAPI.instance) {
            await ConversationalAIAPI.instance.unsubscribe();
            ConversationalAIAPI.instance.removeAllListeners();
            ConversationalAIAPI.instance.rtcEngine = null;
            ConversationalAIAPI.instance.rtmEngine = null;
            ConversationalAIAPI.instance.isInitialized = false;
            ConversationalAIAPI.instance = null;
        }
        console.log('ConversationalAIAPI destroyed');
    }

    async interrupt(agentUserId) {
        const { rtmEngine, channel } = this.getCfg();
        
        const messageStr = JSON.stringify({
            customType: EMessageType.MSG_INTERRUPTED,
            timestamp: Date.now(),
            targetUserId: agentUserId
        });

        try {
            // Use correct RTM format: publish to agent rtc uid (8888) with correct options
            const publishOptions = {
                channelType: "USER",
                customType: "user.transcription"
            };
            const result = await rtmEngine.publish("8888", messageStr, publishOptions);
            console.log('Successfully sent interrupt message to agent RTC UID 8888');
            return result;
        } catch (error) {
            console.error('Failed to send interrupt message:', error);
            throw new Error('Failed to send interrupt message');
        }
    }

    // Event binding methods
    bindRtcEvents() {
        if (this.rtcEngine) {
            this.rtcEngine.on(ERTCEvents.AUDIO_METADATA, this.handleRtcAudioMetadata.bind(this));
            console.log('RTC events bound');
        }
    }

    unbindRtcEvents() {
        if (this.rtcEngine) {
            this.rtcEngine.off(ERTCEvents.AUDIO_METADATA, this.handleRtcAudioMetadata.bind(this));
            console.log('RTC events unbound');
        }
    }

    bindRtmEvents() {
        if (this.rtmEngine) {
            // RTM v2.x uses addEventListener method
            this.rtmEngine.addEventListener('message', this.handleRtmMessage.bind(this));
            this.rtmEngine.addEventListener('presence', this.handleRtmPresence.bind(this));
            this.rtmEngine.addEventListener('status', this.handleRtmStatus.bind(this));
            console.log('RTM events bound');
        }
    }

    unbindRtmEvents() {
        if (this.rtmEngine) {
            // RTM v2.x uses removeEventListener method
            this.rtmEngine.removeEventListener('message', this.handleRtmMessage.bind(this));
            this.rtmEngine.removeEventListener('presence', this.handleRtmPresence.bind(this));
            this.rtmEngine.removeEventListener('status', this.handleRtmStatus.bind(this));
            console.log('RTM events unbound');
        }
    }

    // Event handlers
    handleRtcAudioMetadata(metadata) {
        try {
            const pts64 = Number(new DataView(metadata.buffer).getBigUint64(0, true));
            this.covSubRenderController.setPts(pts64);
            if (this.enableLog) {
                console.log('RTC audio metadata:', pts64);
            }
        } catch (error) {
            console.error('Error handling RTC audio metadata:', error);
        }
    }

    handleRtmMessage(eventArgs) {
        console.log('TRANSCRIPTION DEBUG - RTM message received:', eventArgs);
        
        // Log all RTM messages for debugging
        if (eventArgs.message) {
            try {
                const parsed = JSON.parse(eventArgs.message);
                console.log('🔍 RTM MESSAGE DEBUG:', {
                    object: parsed.object,
                    text: parsed.text,
                    content: parsed.content,
                    type: parsed.type,
                    customType: parsed.customType,
                    publisher: eventArgs.publisher,
                    fullMessage: parsed
                });
            } catch (e) {
                console.log('🔍 RTM MESSAGE DEBUG (non-JSON):', eventArgs.message);
            }
        }
        
        // Log ALL RTM messages regardless of type
        console.log('🔍 ALL RTM MESSAGE RECEIVED:', {
            channelName: eventArgs.channelName,
            publisher: eventArgs.publisher,
            message: eventArgs.message,
            topicName: eventArgs.topicName,
            channelType: eventArgs.channelType
        });

        try {
            // RTM v2.x event structure is different
            const message = eventArgs.message;
            const publisher = eventArgs.publisher || eventArgs.channelName;
            let messageData = message;
            let parsedMessage;

            console.log('TRANSCRIPTION DEBUG - Message data type:', typeof messageData);
            console.log('TRANSCRIPTION DEBUG - Publisher:', publisher);

            // Handle different message data types
            if (typeof messageData === 'string') {
                try {
                    parsedMessage = JSON.parse(messageData);
                    console.log('TRANSCRIPTION DEBUG - Parsed JSON message:', parsedMessage);
                } catch (parseError) {
                    // If it's not JSON, treat as plain text transcription
                    console.log('TRANSCRIPTION DEBUG - Plain text message received:', messageData);
                    parsedMessage = {
                        type: 'transcription',
                        text: messageData,
                        speaker: publisher,
                        timestamp: Date.now(),
                        isFinal: true
                    };
                }
            } else if (messageData instanceof Uint8Array) {
                const decoder = new TextDecoder('utf-8');
                const messageString = decoder.decode(messageData);
                // console.log('🎤 TRANSCRIPTION DECODED MESSAGE:', messageString);
                console.log('TRANSCRIPTION DEBUG - Decoded binary message:', messageString);
                try {
                    parsedMessage = JSON.parse(messageString);
                    console.log('TRANSCRIPTION DEBUG - Parsed binary message:', parsedMessage);
                } catch (parseError) {
                    console.log('TRANSCRIPTION DEBUG - Plain text from binary:', messageString);
                    parsedMessage = {
                        type: 'transcription',
                        text: messageString,
                        speaker: publisher,
                        timestamp: Date.now(),
                        isFinal: true
                    };
                }
            } else {
                console.warn('TRANSCRIPTION DEBUG - Unsupported message type received:', typeof messageData, messageData);
                return;
            }

            console.log('TRANSCRIPTION DEBUG - Sending to controller:', parsedMessage);
            this.covSubRenderController.handleMessage(parsedMessage, {
                publisher: publisher
            });
        } catch (error) {
            console.error('TRANSCRIPTION DEBUG - Failed to parse RTM message:', error);
        }
    }

    handleRtmPresence(presence) {
        if (this.enableLog) {
            console.log('RTM presence event:', presence);
        }

        const stateChanged = presence.stateChanged;
        if (stateChanged && stateChanged.state && stateChanged.turn_id) {
            this.covSubRenderController.handleAgentStatus(presence);
        }
    }

    handleRtmStatus(status) {
        if (this.enableLog) {
            console.log('RTM status event:', status);
        }
    }

    // Event callback methods
    onChatHistoryUpdated(chatHistory) {
        console.log('📡 onChatHistoryUpdated called with', chatHistory?.length || 0, 'messages');
        if (this.enableLog) {
            console.log('Chat history updated:', chatHistory);
        }
        console.log('📡 Emitting TRANSCRIPTION_UPDATED event with', chatHistory.length, 'messages');
        this.emit(EConversationalAIAPIEvents.TRANSCRIPTION_UPDATED, chatHistory);
    }

    onAgentStateChanged(agentUserId, event) {
        if (this.enableLog) {
            console.log('Agent state changed:', agentUserId, event);
        }
        this.emit(EConversationalAIAPIEvents.AGENT_STATE_CHANGED, agentUserId, event);
    }

    onAgentInterrupted(agentUserId, event) {
        if (this.enableLog) {
            console.log('Agent interrupted:', agentUserId, event);
        }
        this.emit(EConversationalAIAPIEvents.AGENT_INTERRUPTED, agentUserId, event);
    }

    onDebugLog(message) {
        this.emit(EConversationalAIAPIEvents.DEBUG_LOG, message);
    }

    onAgentMetrics(agentUserId, metrics) {
        if (this.enableLog) {
            console.log('Agent metrics:', agentUserId, metrics);
        }
        this.emit(EConversationalAIAPIEvents.AGENT_METRICS, agentUserId, metrics);
    }

    onAgentError(agentUserId, error) {
        console.error('Agent error:', agentUserId, error);
        this.emit(EConversationalAIAPIEvents.AGENT_ERROR, agentUserId, error);
    }

    onMessageReceiptUpdated(agentUserId, messageReceipt) {
        if (this.enableLog) {
            console.log('Message receipt updated:', agentUserId, messageReceipt);
        }
        this.emit(EConversationalAIAPIEvents.MESSAGE_RECEIPT_UPDATED, agentUserId, messageReceipt);
    }

    onMessageError(agentUserId, error) {
        console.error('Message error:', agentUserId, error);
        this.emit(EConversationalAIAPIEvents.MESSAGE_ERROR, agentUserId, error);
    }

    // Utility methods
    isReady() {
        return this.isInitialized && this.rtcEngine && this.rtmEngine;
    }

    getConfig() {
        return {
            renderMode: this.renderMode,
            enableLog: this.enableLog,
            isInitialized: this.isInitialized,
            hasRtcEngine: !!this.rtcEngine,
            hasRtmEngine: !!this.rtmEngine,
            channel: this.channel
        };
    }

    async chat(agentUserId, message) {
        const { rtmEngine, channel } = this.getCfg();
        
        // Validate message based on type
        if (message.messageType === 'TEXT') {
            if (!message.text || message.text.trim() === '') {
                console.error('TEXT message validation failed: text is empty');
                throw new Error('Text message cannot be empty');
            }
        } else if (message.messageType === 'IMAGE') {
            // Check for either url or base64
            if ((!message.url || message.url.trim() === '') && 
                (!message.base64 || message.base64.trim() === '')) {
                console.error('IMAGE message validation failed: neither url nor base64 provided');
                throw new Error('Image URL or base64 data must be provided');
            }
        } else {
            console.error('Unknown message type:', message.messageType);
            throw new Error('Unknown message type: ' + message.messageType);
        }
        
        // Generate a unique ID for the message if not provided
        const uuid = message.uuid || Date.now().toString() + Math.random().toString(36).substring(2);
        
        // Build message data based on type - only include relevant fields
        let messageData;
        if (message.messageType === 'TEXT') {
            messageData = {
                messageType: message.messageType,
                message: message.text,
                uuid: uuid
            };
        } else if (message.messageType === 'IMAGE') {
            messageData = {
                messageType: message.messageType,
                uuid: uuid
            };
            
            // Add either url or base64 based on what's provided
            if (message.url) {
                messageData.image_url = message.url;
            }
            if (message.base64) {
                messageData.image_base64 = message.base64;
            }
        }

        console.log('📤 Preparing to send message:', {
            type: message.messageType,
            data: messageData,
            agentRtcUid: '8888'
        });

        const messageStr = JSON.stringify(messageData);

        try {
            // Use correct RTM format: publish to agent rtc uid (8888) with correct options
            const publishOptions = {
                channelType: "USER",
                customType: message.messageType === "TEXT" ? "user.transcription" : "image.upload"
            };
            const result = await rtmEngine.publish("8888", messageStr, publishOptions);
            console.log('✅ Successfully sent', message.messageType, 'message to agent RTC UID 8888:', messageData);
            return result;
        } catch (error) {
            console.error('❌ Failed to send message:', error);
            throw new Error('Failed to send message: ' + error.message);
        }
    }
}

// Export for global use
if (typeof window !== 'undefined') {
    window.ConversationalAIAPI = ConversationalAIAPI;
    window.EConversationalAIAPIEvents = EConversationalAIAPIEvents;
    window.ESubtitleHelperMode = ESubtitleHelperMode;
    window.EMessageType = EMessageType;
}

// Also support CommonJS/Module export patterns
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ConversationalAIAPI,
        EConversationalAIAPIEvents,
        ESubtitleHelperMode,
        EMessageType
    };
}

export default ConversationalAIAPI;
