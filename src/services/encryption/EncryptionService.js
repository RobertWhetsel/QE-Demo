class EncryptionService {
    #enabled = window.env.SITE_STATE !== 'dev';
    #debugMode = window.env.SITE_STATE === 'dev';
    #algorithm = 'AES-GCM';
    #keyLength = 256;
    #key = null;

    constructor() {
        if (this.#debugMode) {
            console.log('EncryptionService initializing');
        }
        this.#initialize();
    }

    async #initialize() {
        try {
            if (this.#enabled) {
                await this.#generateKey();
            }

            if (this.#debugMode) {
                console.log('EncryptionService initialized successfully');
            }
        } catch (error) {
            console.error('EncryptionService initialization error:', error);
            throw error;
        }
    }

    async #generateKey() {
        try {
            this.#key = await window.crypto.subtle.generateKey(
                {
                    name: this.#algorithm,
                    length: this.#keyLength
                },
                true,
                ['encrypt', 'decrypt']
            );

            if (this.#debugMode) {
                console.log('Encryption key generated');
            }
        } catch (error) {
            console.error('Error generating encryption key:', error);
            throw error;
        }
    }

    async encrypt(data) {
        if (!this.#enabled) {
            return data;
        }

        try {
            // Convert data to string if it's not already
            const text = typeof data === 'string' ? data : JSON.stringify(data);
            
            // Generate initialization vector
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            
            // Convert text to ArrayBuffer
            const textEncoder = new TextEncoder();
            const encodedData = textEncoder.encode(text);
            
            // Encrypt the data
            const encryptedData = await window.crypto.subtle.encrypt(
                {
                    name: this.#algorithm,
                    iv: iv
                },
                this.#key,
                encodedData
            );
            
            // Combine IV and encrypted data
            const combined = new Uint8Array(iv.length + encryptedData.byteLength);
            combined.set(iv);
            combined.set(new Uint8Array(encryptedData), iv.length);
            
            // Convert to base64
            const base64 = btoa(String.fromCharCode(...combined));

            if (this.#debugMode) {
                console.log('Data encrypted successfully');
            }

            return base64;
        } catch (error) {
            console.error('Encryption error:', error);
            throw error;
        }
    }

    async decrypt(encryptedData) {
        if (!this.#enabled) {
            return encryptedData;
        }

        try {
            // Convert base64 to array
            const combined = new Uint8Array(
                atob(encryptedData)
                    .split('')
                    .map(char => char.charCodeAt(0))
            );
            
            // Extract IV and data
            const iv = combined.slice(0, 12);
            const data = combined.slice(12);
            
            // Decrypt the data
            const decryptedData = await window.crypto.subtle.decrypt(
                {
                    name: this.#algorithm,
                    iv: iv
                },
                this.#key,
                data
            );
            
            // Convert ArrayBuffer to string
            const textDecoder = new TextDecoder();
            const decryptedText = textDecoder.decode(decryptedData);

            if (this.#debugMode) {
                console.log('Data decrypted successfully');
            }

            // Try to parse as JSON if possible
            try {
                return JSON.parse(decryptedText);
            } catch {
                return decryptedText;
            }
        } catch (error) {
            console.error('Decryption error:', error);
            throw error;
        }
    }

    isEnabled() {
        return this.#enabled;
    }

    getAlgorithm() {
        return this.#algorithm;
    }

    async changeKey() {
        if (!this.#enabled) return;

        try {
            await this.#generateKey();
            if (this.#debugMode) {
                console.log('Encryption key changed successfully');
            }
            return true;
        } catch (error) {
            console.error('Error changing encryption key:', error);
            return false;
        }
    }
}

// Create and export singleton instance
const encryption = new EncryptionService();
export default encryption;
