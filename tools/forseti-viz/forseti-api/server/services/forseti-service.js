/* forseti-service */
import MySQLDbConnection from './mysql-db-connection';

function getMySqlDbConnection() {
    let secrets = {
        hostname: process.env.CLOUDSQL_HOSTNAME,
        user: process.env.CLOUDSQL_USERNAME,
        pass: process.env.CLOUDSQL_PASSWORD,
        schema: process.env.CLOUDSQL_SCHEMA
    };
    console.log(secrets);

    let mySqlDbConn = new MySQLDbConnection(secrets.hostname, secrets.user, secrets.pass, secrets.schema);
    return mySqlDbConn;
}
class ForsetiService {
    constructor() {

    }

    /*
     * @param cb 
        function (error, results, fields) {
            if (error) throw error;
            
            console.log('durr', results, fields);

            return results;
        });
     */
    getResources(cb) {
        let sql = `
        SELECT g.id, g.resource_type, g.category, g.resource_id, g.parent_id AS parent_id, 
            IFNULL(g.resource_data->>'$.displayName', '') as resource_data_displayname, 
            IFNULL(g.resource_data->>'$.name', '') as resource_data_name, g.resource_data->>'$.lifecycleState' as qq,
            g.inventory_index_id
        FROM gcp_inventory g 
        WHERE g.inventory_index_id = (SELECT id 
                FROM inventory_index 
                ORDER BY completed_at_datetime DESC LIMIT 1) 
            AND (g.category='resource') 
            AND g.resource_type IN ('organization', 'project', 'folder', 'appengine_app', 'kubernetes_cluster', 'cloudsqlinstance', 'instance') 
            ORDER BY CASE 
                WHEN g.resource_type = 'organization' THEN 0 
                WHEN g.resource_type = 'folder' THEN 1 
                WHEN g.resource_type = 'project' THEN 2 ELSE 3 END ASC;`;

        try {
            let mySqlDbConn = getMySqlDbConnection();
            mySqlDbConn.query(sql, cb);
        } catch (ex) {
            console.log(ex);
        }
    }

    /*
     * @param cb 
        function (error, results, fields) {
            if (error) throw error;
            
            console.log('durr', results, fields);

            return results;
        });
     */
    getViolations(inventoryIndexId, cb) {
        let getInventoryIndexId = '(SELECT id FROM inventory_index ORDER BY completed_at_datetime DESC LIMIT 1)';
        if (inventoryIndexId === null || inventoryIndexId === 0) getInventoryIndexId = inventoryIndexId;

        let sql = `
        SELECT ii.id as inventory_index_id, si.id as scanner_index_id, v.* FROM violations v 
        JOIN scanner_index si
        ON v.scanner_index_id = si.id
        JOIN inventory_index ii
        ON si.inventory_index_id = ii.id
        WHERE ii.id = ${getInventoryIndexId};`;

        try {
            let mySqlDbConn = getMySqlDbConnection();
            mySqlDbConn.query(sql, cb);
        } catch (ex) {
            console.log(ex);
        }
    }

    /**
     * gets the iam explain of a given prefix
     * @param {*} iamPrefix 'user/garrettwong@gwongcloud.com'
     * @param {*} cb function for callback processing
     */
    getIam(iamPrefix, cb) {
        var PROTO_PATH = 'explain.proto';
        var grpc = require('grpc');
        var protoLoader = require('@grpc/proto-loader');
        // Suggested options for similarity to existing grpc.load behavior
        var packageDefinition = protoLoader.loadSync(
            PROTO_PATH, {
                keepCase: true,
                longs: String,
                enums: String,
                defaults: true,
                oneofs: true
            });
        var protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
        // The protoDescriptor object has the full package hierarchy
        var ex = protoDescriptor.explain;
        console.log(ex);

        let channel = ':50051';
        let res = new ex.Explain(channel, grpc.credentials.createInsecure());
        console.log(res);

        var meta = new grpc.Metadata();
        // meta.add('handle', 'f240aa3a5bc9fd9acfaf50fdd3620534');
        meta.add('handle', '21254f1de747879237a95cb552e80828');

        console.log('reckless', iamPrefix);
        
        res.getAccessByMembers({
            member_name: iamPrefix
        }, meta, cb);
    }

    /*
     * @param cb 
        function (error, results, fields) {
            if (error) throw error;
            
            console.log('durr', results, fields);

            return results;
        });
     */
    getResourcesJson(cb) {
        let sql = "SELECT g.id, g.resource_type, g.category, g.resource_id, g.parent_id AS parent_id, IFNULL(g.resource_data->>'$.displayName', '') as resource_data_displayname, IFNULL(g.resource_data->>'$.name', '') as resource_data_name, g.resource_data->>'$.lifecycleState' as qq FROM gcp_inventory g WHERE g.inventory_index_id = (SELECT id FROM inventory_index ORDER BY completed_at_datetime DESC LIMIT 1) AND (g.category='resource') AND g.resource_type IN ('organization', 'project', 'folder', 'appengine_app', 'kubernetes_cluster', 'cloudsqlinstance') ORDER BY CASE WHEN g.resource_type = 'organization' THEN 0 WHEN g.resource_type = 'folder' THEN 1 WHEN g.resource_type = 'project' THEN 2 ELSE 3 END ASC;";

        try {
            let mySqlDbConn = getMySqlDbConnection();
            mySqlDbConn.query(sql, cb);
        } catch (ex) {
            console.log(ex);
        }
    }
}

export default new ForsetiService();