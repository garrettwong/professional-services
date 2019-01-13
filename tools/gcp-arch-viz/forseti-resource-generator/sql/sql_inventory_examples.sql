-- inventory:
-- resource_data - JSON string
select * from gcp_inventory where resource_type in ('firewall', 'folder', 'project');
select distinct (resource_type) from gcp_inventory;
select resource_data from gcp_inventory; 

-- resource table: build relationships
select * from d389ff143826a43783aa906623cdb887_resources;

-- shared vpc
select * from d389ff143826a43783aa906623cdb887_resources where type_name;
select distinct (type_name) from d389ff143826a43783aa906623cdb887_resources;
select * from d389ff143826a43783aa906623cdb887_resources where type_name like 'network%';
-- {"autoCreateSubnetworks": true, "creationTimestamp": "2018-10-17T10:51:27.717-07:00", "description": "Default network for the project", "id": "9166398486162884720", "name": "default", "routingConfig": {"routingMode": "REGIONAL"}, "selfLink": "https://www.googleapis.com/compute/v1/projects/gwc-core/global/networks/default", "subnetworks": ["https://www.googleapis.com/compute/v1/projects/gwc-core/regions/europe-north1/subnetworks/default", "https://www.googleapis.com/compute/v1/projects/gwc-core/regions/us-east1/subnetworks/default", "https://www.googleapis.com/compute/v1/projects/gwc-core/regions/asia-south1/subnetworks/default", "https://www.googleapis.com/compute/v1/projects/gwc-core/regions/asia-northeast1/subnetworks/default", "https://www.googleapis.com/compute/v1/projects/gwc-core/regions/asia-east2/subnetworks/default", "https://www.googleapis.com/compute/v1/projects/gwc-core/regions/europe-west3/subnetworks/default", "https://www.googleapis.com/compute/v1/projects/gwc-core/regions/europe-west1/subnetworks/default", "https://www.googleapis.com/compute/v1/projects/gwc-core/regions/southamerica-east1/subnetworks/default", "https://www.googleapis.com/compute/v1/projects/gwc-core/regions/northamerica-northeast1/subnetworks/default", "https://www.googleapis.com/compute/v1/projects/gwc-core/regions/us-east4/subnetworks/default", "https://www.googleapis.com/compute/v1/projects/gwc-core/regions/us-west2/subnetworks/default", "https://www.googleapis.com/compute/v1/projects/gwc-core/regions/asia-east1/subnetworks/default", "https://www.googleapis.com/compute/v1/projects/gwc-core/regions/australia-southeast1/subnetworks/default", "https://www.googleapis.com/compute/v1/projects/gwc-core/regions/europe-west2/subnetworks/default", "https://www.googleapis.com/compute/v1/projects/gwc-core/regions/us-west1/subnetworks/default", "https://www.googleapis.com/compute/v1/projects/gwc-core/regions/us-central1/subnetworks/default", "https://www.googleapis.com/compute/v1/projects/gwc-core/regions/asia-southeast1/subnetworks/default", "https://www.googleapis.com/compute/v1/projects/gwc-core/regions/europe-west4/subnetworks/default"]}

-- service accounts
 select * from d389ff143826a43783aa906623cdb887_resources where type_name like 'serviceaccount%'
