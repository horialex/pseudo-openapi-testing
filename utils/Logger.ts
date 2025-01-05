export class Logger {
    private static loggingEnabled = false;

    static enableLogging() {
        this.loggingEnabled = true;
    }

    static disableLogging() {
        this.loggingEnabled = false;
    }

    static logRequest(req: any) {
        if (this.loggingEnabled) {
            console.log('Request Object:', JSON.stringify(req, null, 2));
        }
    }

    static info(message: string) {
        if (this.loggingEnabled) {
            console.log('INFO:', message);
        }
    }

    static warn(message: string) {
        if (this.loggingEnabled) {
            console.warn('WARNING:', message);
        }
    }

    static error(message: string) {
        if (this.loggingEnabled) {
            console.error('ERROR:', message);
        }
    }
}