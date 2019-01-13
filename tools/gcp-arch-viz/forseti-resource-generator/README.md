# Forseti Resource Generator

## Pre-Requisites

* Install forseti 2.0
* Enable Cloud SQL Unsecured Connections and create a firewall rule to allow connections (>> Connections Tab >> 0.0.0.0/0 or network CIDR range to on the IP address :3306 for MySQL)
* Create USER for database access

To get started, make sure you run these commands

```bash
npm install
```

## Running the App

Run the application with node.js.  My current version of node is v10.0.0.

Running "node index.js"

1. Creates a file called "resources.json" with a JSON mapping of all resources from the SQL query (resources table is a moving target and is dependent on your data models)
2. Creates a .CSV called "resources.csv" file for input into the gcp-arch-viz project

## Running Tests

* Unit testing is conducted with jasmine.  Issue the command below to test.

```bash
jasmine
```

## Adding a Test

* create a new spec with the naming convention "[MODULE]Spec"
* jasmine will auto-detect new modules and when running the 'jasmine' command will execute
