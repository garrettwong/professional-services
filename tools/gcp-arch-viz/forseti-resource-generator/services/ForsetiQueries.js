const fs = require('fs');

const _secrets = require('../config/secrets').secrets;
const CsvHelper = require('../lib/CsvHelper');
const GetSql = require('../lib/GetSql');
const MySQLDatabaseConnection = require('../lib/MySQLDatabaseConnection');
const mySqlDbConn = MySQLDatabaseConnection.getConnection(_secrets.host, _secrets.user, _secrets.password, _secrets.database);

mySqlDbConn.query(GetSql.getSql('./sql/get_violations.sql'), function (error, results, fields) {
  if (error) throw error;

  let fileName = 'violations.json';
  fs.unlink(`./output/${fileName}`, function (err) {
    fs.appendFile(`./output/${fileName}`, JSON.stringify(results), function (err) {
      if (err) return console.log(err);
    });
  });
});

// creates json output of organizational resources
mySqlDbConn.query(GetSql.getSql('./sql/get_resource_query.sql'), function (error, results, fields) {
  if (error) throw error;

  let fileName = 'resources.json';
  fs.unlink(`./output/${fileName}`, function (err) {
    fs.appendFile(`./output/${fileName}`, JSON.stringify(results), function (err) {
      if (err) return console.log(err);
    });
  });
});

mySqlDbConn.query(GetSql.getSql('./sql/get_demo_query.sql'), function (error, results, fields) {
  if (error) throw error;

  let fileName = 'resources.csv';
  fs.unlink(`./output/${fileName}`, function (err) {
    let csv = CsvHelper.convertToCsvWithDoubleQuoteSurroundedStrings(results);

    fs.appendFile(`./output/${fileName}`, csv, function (err) {
      if (err) return console.log(err);
    });
  });
});

mySqlDbConn.end();