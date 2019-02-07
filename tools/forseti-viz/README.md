# Forseti-Viz

* The goal of this solution is Forseti Integration with D3 to help customers understand their GCP Organizational Structure, while quickly communicating details such as violations across the organization.  Additionally, we want to make the user experience a smooth and easy experience with minimal configuration.  

## Overview

* This solution has a frontend and backend component.  
* The frontend, "vue-app/" and the backend, "forseti-api/" will need to be run concurrently.  
* The frontend is configured is use port 8081, while the backend runs on port 8080.  

## Pre-Requisites

* node.js - (I'm currently using v10.0.0)
* vue-cli - https://cli.vuejs.org/guide/installation.html

## Getting Started - API

* Create a source.env file

```bash
cd forseti-api/
cat > source.env << EOF
export CLOUDSQL_HOSTNAME="[IP HERE]"
export CLOUDSQL_USERNAME="[YOUR_USER_HERE]"
export CLOUDSQL_PASSWORD="[YOUR_PASSWORD_HERE]"
export CLOUDSQL_SCHEMA="forseti_security"
EOF
```

* Install packages and Running

```bash
npm install

# to run --> this will be hosted on localhost:8080/
npm start
```

## Getting Started - Vue

* Install packages and run

```bash
npm install
# run --> on localhost:8081/
npm start
```

## References

* [Medium](https://medium.com/p/23<F8>70a4b048cd)
