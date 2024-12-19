//@ts-check

export class SecretsProvider {

    get database_host() {
        return process.env.DATABASE_HOST ?? "localhost";
    }

    get database_user() {
        return process.env.DATABASE_USERNAME ?? "root";
    }

    get database_pass() {
        return process.env.DATABASE_PASSWORD ?? "root";
    }

    get database_port() {
        return parseInt(process.env.DATABASE_PORT ?? "3306");
    }

    get log_level() {
        return 0b11111;
    }

}