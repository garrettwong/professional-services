import {
    Router
} from 'express';
import ForsetiService from '../services/forseti-service';

export default ({
    config,
    db
}) => {
    let forsetiApi = Router();

    /**
     * @desc returns .json file content
     */
    forsetiApi.get('/', function (req, res) {
        ForsetiService.getResourcesJson(function (error, results) {
            if (error) throw error;
            let json = results;
            res.json(json);
        });
    });

    /**
     * @desc returns resources
     */
    forsetiApi.get('/resources', function (req, res) {
        ForsetiService.getResources(function (error, results) {
            if (error) throw error;
            let json = results;
            res.json(json);
        });
    });

    /**
     * @desc returns grpc call for iam explain
     */
    forsetiApi.get('/iam/:iamPrefix', function (req, res) {
        let iamPrefix = req.params.iamPrefix;

        console.log('lol', iamPrefix);

        ForsetiService.getIam(iamPrefix, function (error, results) {
            if (error)
                console.log('Error: ', error);
            else {
                for (let i = 0; i < results.accesses.length; i++) {
                    for (let j = 0; j < results.accesses[i].resources.length; j++) {
                        console.log(results.accesses[i]);
                        console.log(results.accesses[i].resources[j]);
                    }
                }

                console.log('scrodal', results.accesses);

                res.json(results.accesses);
            }
        });
    })


    /**
     * @desc returns violations
     */
    forsetiApi.get('/violations/:inventoryIndexId', function (req, res) {
        let inventoryIndexId = req.params.inventoryIndexId;

        ForsetiService.getViolations(inventoryIndexId, function (error, results) {
            if (error) throw error;
            let json = results;
            res.json(json);
        });
    });

    return forsetiApi;
}