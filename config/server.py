class Config:
    DEBUG = False
    TESTING = False
    CSRF_ENABLED = True
    SECRET_KEY = 'this-should-be-changed-in-production'
    SESSION_TYPE = 'filesystem'
    PERMANENT_SESSION_LIFETIME = 3600  # 1 hour
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    CSV_FILE_PATH = "src/models/data/users.csv"
    CSV_HEADERS = ["username", "email", "password", "role", "created"]

class ProductionConfig(Config):
    DEBUG = False
    # Use environment variables in production
    SECRET_KEY = '${SECRET_KEY}'
    CSV_FILE_PATH = '${CSV_FILE_PATH}' if '${CSV_FILE_PATH}' else "src/models/data/users.csv"

class DevelopmentConfig(Config):
    DEBUG = True
    DEVELOPMENT = True
    # Development-specific settings
    SESSION_COOKIE_SECURE = False
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'

class TestingConfig(Config):
    TESTING = True
    DEBUG = True
    # Testing-specific settings
    CSV_FILE_PATH = "src/models/data/test_users.csv"
    WTF_CSRF_ENABLED = False

# Dictionary to map config names to config classes
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
