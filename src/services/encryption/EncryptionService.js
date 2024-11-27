import Logger from '../logger/LoggerService.js';
import config from '../../../config/client.js';
import { SITE_STATE } from '../../../config/paths.js';

class EncryptionService {
    static instance = null;
    #logger;
    #isInitialized = false;
    #encryptionKey = null;
    #algorithm = 'AES-GCM';
    #keyLength = 256;
    #ivLength = 12;
    #saltLength = 16;
    #iterationCount = 100000;

    constructor() {
        if (EncryptionService.instance) {
            return EncryptionService.instance;
        }
        this.#logger = Logger;
        this.#logger.info('EncryptionService initializing');
        this.#initialize();
        EncryptionService.instance = this;
    }

    async #initialize() {
        try {
            // Initialize encryption key
            await this.#initializeKey();
            
            this.#isInitialized = true;
            this.#logger.info('EncryptionService initialized successfully');
        } catch (error) {
            this.#logger.error('EncryptionService initialization error:', error);
            throw error;
        }
    }

    async #initializeKey() {
        try {
            if (SITE_STATE === 'dev') {
                // Use a static key for development
                this.#encryptionKey = await this.#generateKey('development_key');
            } else {
                // In production, generate a secure random key
                this.#encryptionKey = await this.#generateSecureKey();
            }
        } catch (error) {
            this.#logger.error('Error initializing encryption key:', error);
            throw error;
        }
    }

    async #generateKey(passphrase) {
        const encoder = new TextEncoder();
        const salt = crypto.getRandomValues(new Uint8Array(this.#saltLength));
        
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(passphrase),
            'PBKDF2',
            false,
            ['deriveKey']
        );

        return await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt,
                iterations: this.#iterationCount,
                hash: 'SHA-256'
            },
            keyMaterial,
            {
                name: this.#algorithm,
                length: this.#keyLength
            },
            true,
            ['encrypt', 'decrypt']
        );
    }

    async #generateSecureKey() {
        return await crypto.subtle.generateKey(
            {
                name: this.#algorithm,
                length: this.#keyLength
            },
            true,
            ['encrypt', 'decrypt']
        );
    }

    async encrypt(data) {
        try {
            if (!this.#isInitialized || !this.#encryptionKey) {
                throw new Error('Encryption service not initialized');
            }

            // Generate IV
            const iv = crypto.getRandomValues(new Uint8Array(this.#ivLength));
            
            // Convert data to ArrayBuffer
            const encoder = new TextEncoder();
            const encodedData = encoder.encode(JSON.stringify(data));

            // Encrypt
            const encryptedData = await crypto.subtle.encrypt(
                {
                    name: this.#algorithm,
                    iv
                },
                this.#encryptionKey,
                encodedData
            );

            // Combine IV and encrypted data
            const result = new Uint8Array(iv.length + encryptedData.byteLength);
            result.set(iv);
            result.set(new Uint8Array(encryptedData), iv.length);

            // Convert to base64
            return btoa(String.fromCharCode(...result));
        } catch (error) {
            this.#logger.error('Encryption error:', error);
            throw new Error('Encryption failed');
        }
    }

    async decrypt(encryptedData) {
        try {
            if (!this.#isInitialized || !this.#encryptionKey) {
                throw new Error('Encryption service not initialized');
            }

            // Convert from base64
            const data = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
            
            // Extract IV and encrypted data
            const iv = data.slice(0, this.#ivLength);
            const encryptedContent = data.slice(this.#ivLength);

            // Decrypt
            const decryptedData = await crypto.subtle.decrypt(
                {
                    name: this.#algorithm,
                    iv
                },
                this.#encryptionKey,
                encryptedContent
            );

            // Convert back to original format
            const decoder = new TextDecoder();
            return JSON.parse(decoder.decode(decryptedData));
        } catch (error) {
            this.#logger.error('Decryption error:', error);
            throw new Error('Decryption failed');
        }
    }

    async hash(data) {
        try {
            const encoder = new TextEncoder();
            const encodedData = encoder.encode(data);
            
            const hashBuffer = await crypto.subtle.digest('SHA-256', encodedData);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            this.#logger.error('Hashing error:', error);
            throw new Error('Hashing failed');
        }
    }

    async generateSalt() {
        return crypto.getRandomValues(new Uint8Array(this.#saltLength));
    }

    // Key management methods
    async exportKey() {
        try {
            if (!this.#encryptionKey) {
                throw new Error('No encryption key available');
            }

            const exportedKey = await crypto.subtle.exportKey(
                'raw',
                this.#encryptionKey
            );

            return btoa(String.fromCharCode(...new Uint8Array(exportedKey)));
        } catch (error) {
            this.#logger.error('Key export error:', error);
            throw new Error('Key export failed');
        }
    }

    async importKey(keyData) {
        try {
            const rawKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
            
            this.#encryptionKey = await crypto.subtle.importKey(
                'raw',
                rawKey,
                this.#algorithm,
                true,
                ['encrypt', 'decrypt']
            );
        } catch (error) {
            this.#logger.error('Key import error:', error);
            throw new Error('Key import failed');
        }
    }

    // Public utility methods
    isInitialized() {
        return this.#isInitialized;
    }

    getAlgorithmDetails() {
        return {
            name: this.#algorithm,
            keyLength: this.#keyLength,
            ivLength: this.#ivLength,
            saltLength: this.#saltLength,
            iterationCount: this.#iterationCount
        };
    }

    static getInstance() {
        if (!EncryptionService.instance) {
            EncryptionService.instance = new EncryptionService();
        }
        return EncryptionService.instance;
    }
}

// Create and export singleton instance
const encryptionService = EncryptionService.getInstance();
export default encryptionService;