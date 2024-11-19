/**
 * Component Loader Utility
 * Handles dynamic loading and insertion of HTML components
 */
class ComponentLoader {
    /**
     * Insert a component into a specified element
     * @param {string} targetSelector - CSS selector for target element
     * @param {string} componentPath - Path to the component HTML file
     * @param {Object} data - Optional data to pass to the component
     * @returns {Promise} - Resolves when component is loaded and inserted
     */
    static async insertComponent(targetSelector, componentPath, data = {}) {
        try {
            const targetElement = document.querySelector(targetSelector);
            if (!targetElement) {
                console.error(`Target element not found: ${targetSelector}`);
                return;
            }

            const response = await fetch(componentPath);
            if (!response.ok) {
                throw new Error(`Failed to load component: ${componentPath}`);
            }

            let html = await response.text();

            // Replace any template variables in the format {{variableName}}
            Object.entries(data).forEach(([key, value]) => {
                const regex = new RegExp(`{{${key}}}`, 'g');
                html = html.replace(regex, value);
            });

            // Create a temporary container to parse the HTML
            const temp = document.createElement('div');
            temp.innerHTML = html;

            // Extract scripts before inserting HTML
            const scripts = Array.from(temp.getElementsByTagName('script'));
            
            // Remove scripts from the HTML
            scripts.forEach(script => script.remove());

            // Insert the HTML without scripts
            targetElement.innerHTML = temp.innerHTML;

            // Execute scripts in sequence
            for (const script of scripts) {
                const newScript = document.createElement('script');
                
                // Copy all attributes
                Array.from(script.attributes).forEach(attr => {
                    newScript.setAttribute(attr.name, attr.value);
                });

                // Create a promise to handle script loading
                await new Promise((resolve, reject) => {
                    // Handle both inline and external scripts
                    if (script.src) {
                        newScript.onload = resolve;
                        newScript.onerror = reject;
                        newScript.src = script.src;
                    } else {
                        newScript.textContent = script.textContent;
                        resolve();
                    }

                    // Add the script to the document
                    targetElement.appendChild(newScript);
                });
            }

            return targetElement;
        } catch (error) {
            console.error('Error loading component:', error);
            throw error;
        }
    }
}

export default ComponentLoader;
