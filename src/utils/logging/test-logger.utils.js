import Logger from './logger.js';

async function testLogger() {
    // Test different log levels
    await Logger.info('Testing info level logging');
    await Logger.warn('Testing warn level logging');
    await Logger.error('Testing error level logging');
    await Logger.debug('Testing debug level logging');

    // Test logging with additional data
    await Logger.info('Testing with object data', { user: 'test', action: 'login' });
    
    // Test logging with multiple arguments
    await Logger.info('Multiple arguments test', 'arg1', 'arg2', { key: 'value' });

    // Ensure buffer is flushed
    await Logger.flush();
    
    console.log('Logger testing complete - check browser console and localStorage for results');
}

testLogger();
