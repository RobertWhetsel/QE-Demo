// State Manager implementation using Observable pattern
class StateManager {
    constructor() {
        this.state = {
            users: [],
            pendingUsers: [],
            teams: [],
            workspaces: [],
            tasks: [],
            surveys: [],
            feedbackLog: []
        };
        
        this.observers = new Map();
        this.initialized = false;
    }

    // Initialize state from sessionStorage
    initialize() {
        if (this.initialized) return;
        
        try {
            const storedData = sessionStorage.getItem('appData');
            if (storedData) {
                this.state = JSON.parse(storedData);
            }
            this.initialized = true;
            this.notifyAll();
        } catch (error) {
            console.error('Error initializing state:', error);
        }
    }

    // Subscribe to state changes
    subscribe(key, callback) {
        if (!this.observers.has(key)) {
            this.observers.set(key, new Set());
        }
        this.observers.get(key).add(callback);

        // Return unsubscribe function
        return () => {
            const observers = this.observers.get(key);
            if (observers) {
                observers.delete(callback);
                if (observers.size === 0) {
                    this.observers.delete(key);
                }
            }
        };
    }

    // Notify observers of state changes
    notify(key) {
        const observers = this.observers.get(key);
        if (observers) {
            observers.forEach(callback => {
                try {
                    callback(this.state[key]);
                } catch (error) {
                    console.error(`Error notifying observer for ${key}:`, error);
                }
            });
        }
    }

    // Notify all observers
    notifyAll() {
        Object.keys(this.state).forEach(key => this.notify(key));
    }

    // Get state
    getState(key) {
        return key ? this.state[key] : this.state;
    }

    // Update state
    setState(key, value) {
        try {
            if (typeof key === 'string') {
                this.state[key] = value;
                this.notify(key);
            } else if (typeof key === 'object') {
                this.state = { ...this.state, ...key };
                Object.keys(key).forEach(k => this.notify(k));
            }
            
            sessionStorage.setItem('appData', JSON.stringify(this.state));
            return true;
        } catch (error) {
            console.error('Error updating state:', error);
            return false;
        }
    }

    // User management
    addUser(user) {
        if (!user?.username) throw new Error('Invalid user data');
        
        const users = [...this.state.users];
        if (users.some(u => u.username === user.username)) {
            throw new Error('Username already exists');
        }
        
        users.push(user);
        return this.setState('users', users);
    }

    updateUser(updatedUser) {
        if (!updatedUser?.username) throw new Error('Invalid user data');
        
        const users = [...this.state.users];
        const index = users.findIndex(u => u.username === updatedUser.username);
        if (index === -1) throw new Error('User not found');
        
        users[index] = { ...users[index], ...updatedUser };
        return this.setState('users', users);
    }

    addPendingUser(user) {
        if (!user?.username) throw new Error('Invalid user data');
        
        const pendingUsers = [...this.state.pendingUsers];
        if (pendingUsers.some(u => u.username === user.username)) {
            throw new Error('Username already exists in pending users');
        }
        
        pendingUsers.push(user);
        return this.setState('pendingUsers', pendingUsers);
    }

    assignRole(username, role) {
        const pendingUsers = [...this.state.pendingUsers];
        const users = [...this.state.users];
        
        const userIndex = pendingUsers.findIndex(u => u.username === username);
        if (userIndex === -1) throw new Error('User not found in pending users');
        
        const user = pendingUsers.splice(userIndex, 1)[0];
        user.role = role;
        users.push(user);
        
        this.setState({
            pendingUsers,
            users
        });
        return true;
    }

    // Team management
    addTeam(team) {
        if (!team?.name) throw new Error('Invalid team data');
        
        const teams = [...this.state.teams];
        if (teams.some(t => t.name === team.name)) {
            throw new Error('Team already exists');
        }
        
        teams.push(team);
        return this.setState('teams', teams);
    }

    // Workspace management
    addWorkspace(workspace) {
        if (!workspace?.name) throw new Error('Invalid workspace data');
        
        const workspaces = [...this.state.workspaces];
        if (workspaces.some(w => w.name === workspace.name)) {
            throw new Error('Workspace already exists');
        }
        
        workspaces.push(workspace);
        return this.setState('workspaces', workspaces);
    }

    // Task management
    addTask(task) {
        if (!task?.id) throw new Error('Invalid task data');
        
        const tasks = [...this.state.tasks];
        if (tasks.some(t => t.id === task.id)) {
            throw new Error('Task ID already exists');
        }
        
        tasks.push(task);
        return this.setState('tasks', tasks);
    }

    updateTask(taskId, updates) {
        const tasks = [...this.state.tasks];
        const index = tasks.findIndex(t => t.id === taskId);
        if (index === -1) throw new Error('Task not found');
        
        tasks[index] = { ...tasks[index], ...updates };
        return this.setState('tasks', tasks);
    }

    deleteTask(taskId) {
        const tasks = this.state.tasks.filter(t => t.id !== taskId);
        return this.setState('tasks', tasks);
    }
}

// Export singleton instance
const stateManager = new StateManager();
stateManager.initialize();
export default stateManager;
