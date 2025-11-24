const env = process.env.NODE_ENV || 'local';

let config;

switch (env) {
    case 'local':
        config = {
            client: 'mysql2',
            connection: {
                host: 'localhost',
                user: 'root',
                password: '',
                database: 'dev'
            },
            pool: {
                min: 0,
                max: 10
            }
        };
        break;
    case 'test':
        config = {
            client: 'mysql2',
            connection: {
                host: '127.0.0.1',
                user: 'root',
                password: 'dotdy4-Torsoz-rumsan',
                database: 'my_dev',
                timezone: 'Asia/Shanghai',
            },
            pool: {
                min: 0,
                max: 10
            }
        };
        break;
    default:
        config = {
            client: 'mysql2',
            connection: {
                host: 'localhost',
                user: 'root',
                password: '',
                database: 'dev'
            },
            pool: {
                min: 0,
                max: 10
            }
        };
}

module.exports = config;
