// Function to load and inject common head content
export async function loadCommonHead() {
    try {
        // Fetch the common head content
        const response = await fetch('/src/views/components/head.html');
        const headContent = await response.text();
        
        // Find the first script tag in the document head
        const firstScript = document.head.querySelector('script');
        
        // Create a temporary container
        const temp = document.createElement('div');
        temp.innerHTML = headContent;
        
        // Insert each element from the common head before the first script
        // or at the end of head if no script is found
        Array.from(temp.children).forEach(element => {
            if (firstScript) {
                document.head.insertBefore(element, firstScript);
            } else {
                document.head.appendChild(element);
            }
        });
        
        console.log('Common head content loaded successfully');
    } catch (error) {
        console.error('Error loading common head content:', error);
    }
}

// Function to execute scripts in order
async function executeScripts(scripts, container) {
    for (const script of scripts) {
        const newScript = document.createElement('script');
        
        // Copy all attributes
        Array.from(script.attributes).forEach(attr => {
            newScript.setAttribute(attr.name, attr.value);
        });

        // Set script content
        newScript.textContent = script.textContent;

        // Wait for script to load if it's a module
        if (script.type === 'module') {
            await new Promise((resolve, reject) => {
                newScript.onload = resolve;
                newScript.onerror = reject;
                container.appendChild(newScript);
            });
        } else {
            container.appendChild(newScript);
        }
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
        
        // Load navigation first
        const navResponse = await fetch('/src/views/components/nav.html');
        const navContent = await navResponse.text();
        
        // Create nav container and insert content
        const navTemp = document.createElement('div');
        navTemp.innerHTML = navContent;
        
        // Insert nav at start of body
        const navElement = navTemp.firstElementChild;
        document.body.insertBefore(navElement, document.body.firstChild);
        
        // Execute nav scripts
        console.log('Executing nav scripts...');
        const navScripts = Array.from(navTemp.getElementsByTagName('script'));
        await executeScripts(navScripts, navElement);

        // Wait for nav to be ready
        await new Promise(resolve => {
            document.addEventListener('navReady', resolve, { once: true });
        });
        console.log('Nav component ready');

        // Load sidebar after nav is ready
        const sidebarResponse = await fetch('/src/views/components/sidebar.html');
        const sidebarContent = await sidebarResponse.text();
        
        // Create sidebar container and insert content
        const sidebarTemp = document.createElement('div');
        sidebarTemp.innerHTML = sidebarContent;
        
        // Insert sidebar after nav
        const sidebarElement = sidebarTemp.firstElementChild;
        navElement.after(sidebarElement);
        
        // Execute sidebar scripts
        console.log('Executing sidebar scripts...');
        const sidebarScripts = Array.from(sidebarTemp.getElementsByTagName('script'));
        await executeScripts(sidebarScripts, sidebarElement);

        // Wait for sidebar to be ready
        await new Promise(resolve => {
            document.addEventListener('sidebarReady', resolve, { once: true });
        });
        console.log('Sidebar component ready');

        // Dispatch event when all components are ready
        const event = new CustomEvent('componentsReady');
        document.dispatchEvent(event);
        console.log('All components loaded successfully');
    } catch (error) {
        console.error('Error loading common components:', error);
    }
}
