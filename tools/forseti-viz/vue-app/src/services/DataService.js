import $ from 'jquery';

class DataService {
    constructor() {

    }

    getForsetiResources() {
        let url = 'http://localhost:8080/api/forseti/resources';
        return $.get(url);
    }

    getViolations(inventoryIndexId) {
        let url = `http://localhost:8080/api/forseti/violations/${inventoryIndexId}`;
        return $.get(url);
    }

    getIam(iamPrefix) {
        let url = `http://localhost:8080/api/forseti/iam/${encodeURIComponent(iamPrefix)}`;
        return $.get(url);
    }

    getForsetiJson() {
        $.get('http://localhost:8080/api/forseti', function (data) {
            console.log('json', data);
        });
    }

    getForsetiCsv() {
        $.get('http://localhost:8080/api/forseti/csv', function (data) {
            console.log('csv', data);
        });
    }
}

export default new DataService();