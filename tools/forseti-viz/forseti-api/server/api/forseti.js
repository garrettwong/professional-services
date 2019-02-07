import {
    Router
} from 'express';
import ForsetiService from '../lib/forseti-service';

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