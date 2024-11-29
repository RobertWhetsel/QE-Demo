/**
 * Global path configuration module
 */

// Initialize paths in window.env
window.env.PathResolver = {
    resolve: function(path) {
        return window.env.SITE_STATE === 'dev' 
            ? window.env.DEV_URL + path
            : window.env.AWS_URL + path;
    },
    
    getAssetPath: function(name) {
        const basePath = window.env.SITE_STATE === 'dev'
            ? window.env.DEV_PATHS.ASSET_PATH
            : window.env.PROD_PATHS.ASSET_PATH;
        return basePath + '/' + name;
    },

    getModulePath: function(name) {
        const basePath = window.env.SITE_STATE === 'dev'
            ? window.env.DEV_PATHS.MODULE_PATH
            : window.env.PROD_PATHS.MODULE_PATH;
        return basePath + '/' + name;
    }
};

// Set style paths
window.env.STYLE_PATHS = {
    base: [
        window.env.DEV_PATHS.STYLE_PATH + '/base/_variables.css',
        window.env.DEV_PATHS.STYLE_PATH + '/base/_reset.css',
        window.env.DEV_PATHS.STYLE_PATH + '/base/_typography.css'
    ],
    layouts: [
        window.env.DEV_PATHS.STYLE_PATH + '/layouts/_containers.css',
        window.env.DEV_PATHS.STYLE_PATH + '/layouts/_grid.css'
    ],
    components: [
        window.env.DEV_PATHS.STYLE_PATH + '/components/_admin-form.css',
        window.env.DEV_PATHS.STYLE_PATH + '/components/_admin-panel.css',
        window.env.DEV_PATHS.STYLE_PATH + '/components/_button.css',
        window.env.DEV_PATHS.STYLE_PATH + '/components/_form.css',
        window.env.DEV_PATHS.STYLE_PATH + '/components/_loading.css',
        window.env.DEV_PATHS.STYLE_PATH + '/components/_login.css',
        window.env.DEV_PATHS.STYLE_PATH + '/components/_navigation.css',
        window.env.DEV_PATHS.STYLE_PATH + '/components/_test-panel.css',
        window.env.DEV_PATHS.STYLE_PATH + '/components/_welcome.css'
    ],
    utilities: [
        window.env.DEV_PATHS.STYLE_PATH + '/utilities/_helpers.css'
    ]
};

// Set core paths
window.env.CORE_PATHS = {
    controllers: {
        admin: {
            admin: window.env.DEV_PATHS.MODULE_PATH + '/controllers/admin/admin.controller.js',
            genesisAdmin: window.env.DEV_PATHS.MODULE_PATH + '/controllers/admin/genesisAdmin.controller.js',
            userCreation: window.env.DEV_PATHS.MODULE_PATH + '/controllers/admin/userCreation.controller.js'
        },
        auth: {
            login: window.env.DEV_PATHS.MODULE_PATH + '/controllers/auth/login.controller.js',
            register: window.env.DEV_PATHS.MODULE_PATH + '/controllers/auth/register.controller.js'
        },
        base: {
            base: window.env.DEV_PATHS.MODULE_PATH + '/controllers/base/base.controller.js'
        },
        components: {
            navigation: window.env.DEV_PATHS.MODULE_PATH + '/controllers/components/navigation.controller.js',
            sidebar: window.env.DEV_PATHS.MODULE_PATH + '/controllers/components/sidebar.controller.js'
        },
        dashboard: window.env.DEV_PATHS.MODULE_PATH + '/controllers/dashboard/dashboard.controller.js',
        messages: window.env.DEV_PATHS.MODULE_PATH + '/controllers/messages/messages.controller.js',
        report: window.env.DEV_PATHS.MODULE_PATH + '/controllers/report/report.controller.js',
        research: {
            research: window.env.DEV_PATHS.MODULE_PATH + '/controllers/research/research.controller.js',
            researchDashboard: window.env.DEV_PATHS.MODULE_PATH + '/controllers/research/researchDashboard.controller.js'
        },
        search: window.env.DEV_PATHS.MODULE_PATH + '/controllers/search/search.controller.js',
        spreadsheet: window.env.DEV_PATHS.MODULE_PATH + '/controllers/spreadsheet/spreadsheet.controller.js',
        survey: {
            survey: window.env.DEV_PATHS.MODULE_PATH + '/controllers/survey/survey.controller.js',
            surveyManager: window.env.DEV_PATHS.MODULE_PATH + '/controllers/survey/surveyManager.controller.js'
        },
        task: window.env.DEV_PATHS.MODULE_PATH + '/controllers/task/task.controller.js',
        test: window.env.DEV_PATHS.MODULE_PATH + '/controllers/test/test.controller.js',
        user: {
            settings: window.env.DEV_PATHS.MODULE_PATH + '/controllers/user/settings.controller.js',
            userProfile: window.env.DEV_PATHS.MODULE_PATH + '/controllers/user/userProfile.controller.js',
            volunteerDashboard: window.env.DEV_PATHS.MODULE_PATH + '/controllers/user/volunteerDashboard.controller.js'
        },
        welcome: window.env.DEV_PATHS.MODULE_PATH + '/controllers/welcome/welcome.controller.js'
    },
    models: {
        data: window.env.DEV_PATHS.MODULE_PATH + '/models/data.model.js',
        database: window.env.DEV_PATHS.MODULE_PATH + '/models/database.model.js',
        index: window.env.DEV_PATHS.MODULE_PATH + '/models/index.model.js',
        user: window.env.DEV_PATHS.MODULE_PATH + '/models/user.model.js'
    },
    services: {
        analytics: window.env.DEV_PATHS.MODULE_PATH + '/services/analytics/analytics.service.js',
        auth: window.env.DEV_PATHS.MODULE_PATH + '/services/auth/auth.service.js',
        base: window.env.DEV_PATHS.MODULE_PATH + '/services/base/base.service.js',
        cache: window.env.DEV_PATHS.MODULE_PATH + '/services/cache/cache.service.js',
        data: window.env.DEV_PATHS.MODULE_PATH + '/services/data/data.service.js',
        database: window.env.DEV_PATHS.MODULE_PATH + '/services/database/database.service.js',
        error: window.env.DEV_PATHS.MODULE_PATH + '/services/error/errorHandler.service.js',
        export: window.env.DEV_PATHS.MODULE_PATH + '/services/export/export.service.js',
        form: window.env.DEV_PATHS.MODULE_PATH + '/services/form/formHandler.service.js',
        init: window.env.DEV_PATHS.MODULE_PATH + '/services/init/init.service.js',
        navigation: window.env.DEV_PATHS.MODULE_PATH + '/services/navigation/navigation.service.js',
        notification: window.env.DEV_PATHS.MODULE_PATH + '/services/notification/notification.service.js',
        queue: window.env.DEV_PATHS.MODULE_PATH + '/services/queue/queue.service.js',
        report: window.env.DEV_PATHS.MODULE_PATH + '/services/report/report.service.js',
        router: window.env.DEV_PATHS.MODULE_PATH + '/services/router/router.service.js',
        search: window.env.DEV_PATHS.MODULE_PATH + '/services/search/Search.service.js',
        state: {
            font: window.env.DEV_PATHS.MODULE_PATH + '/services/state/fontManager.service.js',
            theme: window.env.DEV_PATHS.MODULE_PATH + '/services/state/themeManager.service.js'
        },
        storage: window.env.DEV_PATHS.MODULE_PATH + '/services/storage/storage.service.js',
        validation: window.env.DEV_PATHS.MODULE_PATH + '/services/validation/validation.service.js',
        websocket: window.env.DEV_PATHS.MODULE_PATH + '/services/websocket/webSocket.service.js'
    },
    utils: {
        tests: {
            testPage: window.env.DEV_PATHS.MODULE_PATH + '/utils/tests/test-page.view.html',
            testLogger: window.env.DEV_PATHS.MODULE_PATH + '/utils/tests/test-logger.view.html',
            testUser: window.env.DEV_PATHS.MODULE_PATH + '/utils/tests/test-user.view.html'
        },
        logging: {
            logger: window.env.DEV_PATHS.MODULE_PATH + '/utils/logging/logger.utils.js'
        },
        common: {
            loadCommonHead: window.env.DEV_PATHS.MODULE_PATH + '/utils/loadCommonHead.utils.js',
            standardization: window.env.DEV_PATHS.MODULE_PATH + '/utils/standardization.utils.js',
            utilities: window.env.DEV_PATHS.MODULE_PATH + '/utils/utilities.utils.js'
        }
    },
    views: {
        pages: {
            adminPanel: window.env.DEV_PATHS.VIEW_PATH + '/pages/admin-control-panel.view.html',
            auth: window.env.DEV_PATHS.VIEW_PATH + '/pages/auth.view.html',
            availableSurveys: window.env.DEV_PATHS.VIEW_PATH + '/pages/available-surveys.view.html',
            base: window.env.DEV_PATHS.VIEW_PATH + '/pages/base.view.html',
            completedSurveys: window.env.DEV_PATHS.VIEW_PATH + '/pages/completed-surveys.view.html',
            dashboard: window.env.DEV_PATHS.VIEW_PATH + '/pages/dashboard.view.html',
            forgotPassword: window.env.DEV_PATHS.VIEW_PATH + '/pages/forgot-password.view.html',
            genesisAdmin: window.env.DEV_PATHS.VIEW_PATH + '/pages/genesis-admin.view.html',
            login: window.env.DEV_PATHS.VIEW_PATH + '/pages/login.view.html',
            messages: window.env.DEV_PATHS.VIEW_PATH + '/pages/messages.view.html',
            researchDashboard: window.env.DEV_PATHS.VIEW_PATH + '/pages/research-dashboard.view.html',
            research: window.env.DEV_PATHS.VIEW_PATH + '/pages/research.view.html',
            settings: window.env.DEV_PATHS.VIEW_PATH + '/pages/settings.view.html',
            spreadsheet: window.env.DEV_PATHS.VIEW_PATH + '/pages/spreadsheet.view.html',
            survey: window.env.DEV_PATHS.VIEW_PATH + '/pages/survey.view.html',
            tasks: window.env.DEV_PATHS.VIEW_PATH + '/pages/tasks.view.html',
            userProfile: window.env.DEV_PATHS.VIEW_PATH + '/pages/user-profile.view.html',
            volunteerDashboard: window.env.DEV_PATHS.VIEW_PATH + '/pages/volunteer-dashboard.view.html'
        },
        components: {
            admin: {
                userCreationForm: window.env.DEV_PATHS.VIEW_PATH + '/components/admin/user-creation-form.view.html'
            },
            head: window.env.DEV_PATHS.VIEW_PATH + '/components/head.view.html',
            header: window.env.DEV_PATHS.VIEW_PATH + '/components/header.view.html',
            nav: window.env.DEV_PATHS.VIEW_PATH + '/components/nav.view.html',
            shared: {
                layout: window.env.DEV_PATHS.VIEW_PATH + '/components/shared/layout.view.html'
            },
            sidebar: window.env.DEV_PATHS.VIEW_PATH + '/components/sidebar.view.html'
        }
    }
};

// Export the PathResolver for module usage
export default window.env.PathResolver;