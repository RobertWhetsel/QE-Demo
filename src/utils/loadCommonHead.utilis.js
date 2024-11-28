// Function to load and inject common head content
export async function loadCommonHead() {
    try {
        console.log('Loading common head content');
        
        // Load common head content
        const response = await fetch(paths.getComponentPath('head'));
        const headContent = await response.text();
        
        // Create temporary container and insert content
        const temp = document.createElement('div');
        temp.innerHTML = headContent;
        
        // Process each element from head content
        Array.from(temp.children).forEach(element => {
            // If it's a script, handle it specially
            if (element.tagName === 'SCRIPT') {
                const script = document.createElement('script');
                
                // Copy attributes
                Array.from(element.attributes).forEach(attr => {
                    script.setAttribute(attr.name, attr.value);
                });
                
                script.textContent = element.textContent;
                document.head.appendChild(script);
            } else {
                document.head.appendChild(element);
            }
        });
        
        console.log('Common head content loaded successfully');
    } catch (error) {
        console.error('Error loading common head content:', error);
        throw error;
    }
}

// Function to load and inject navigation and sidebar
export async function loadCommonComponents() {
    try {
        console.log('Loading common components...');
        
        // Wait for user data to be ready
        await new Promise(resolve => {
            if (window.QE?.currentUser) {
                resolve();
            } else {
                document.addEventListener('userDataReady', resolve, { once: true });
            }
        });
        
        // Load navigation
        const navResponse = await fetch(paths.getComponentPath('nav'));
        const navContent = await navResponse.text();
        
        // Create nav container and insert content
        const navTemp = document.createElement('div');
        navTemp.innerHTML = navContent;
        const navElement = navTemp.firstElementChild;
        document.body.insertBefore(navElement, document.body.firstChild);
        
        // Load sidebar
        const sidebarResponse = await fetch(paths.getComponentPath('sidebar'));
        const sidebarContent = await sidebarResponse.text();
        
        // Create sidebar container and insert content
        const sidebarTemp = document.createElement('div');
        sidebarTemp.innerHTML = sidebarContent;
        const sidebarElement = sidebarTemp.firstElementChild;
        navElement.after(sidebarElement);
        
        // Dispatch event when components are ready
        document.dispatchEvent(new CustomEvent('componentsReady'));
        console.log('All components loaded successfully');
    } catch (error) {
        console.error('Error loading common components:', error);
        throw error;
    }
}
