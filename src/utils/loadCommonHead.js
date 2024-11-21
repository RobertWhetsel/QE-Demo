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
