class MySQLDatabaseConnection {
    constructor(host, user, password, database) {
        const mysql = require('mysql');

        this.connection = mysql.createConnection({
            host: host,
            user: user,
            password: password,
            database: database
        });

        this.connection.connect();
    }

    getActiveConnection() {
        return this.connection;
    }

    /*
        @param sql - string
        @param callback - function(error, results, fields) {}
     */
    query(sql, callback) {
        return this.connection.query(sql, callback);
    }

    end() {
        this.connection.end();
    }
}

export default MySQLDatabaseConnection;