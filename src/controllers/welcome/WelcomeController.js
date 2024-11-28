// src/controllers/welcome/WelcomeController.js
import paths from '../../../config/paths.js';
import { User } from '../../models/user.js';

export class WelcomeController {
    constructor() {
        this.beginButton = document.querySelector('#begin-button');
        this.bindEvents();
    }

    bindEvents() {
        this.beginButton.addEventListener('click', this.handleBeginClick.bind(this));
    }

    async handleBeginClick() {
        const hasUsers = await User.checkExistingUsers();
        window.location.href = hasUsers ? 
            paths.getPagePath('login') : 
            paths.getPagePath('genesisAdmin');
    }
}