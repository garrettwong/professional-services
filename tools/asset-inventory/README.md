# Cloud Asset Inventory Import To BigQuery

![bigquery console](https://storage.googleapis.com/professional-services-tools-asset-inventory/images/bq.png "Cloud Asset Inventory In BigQuery")

This tools allows import resource and iam policy records exporting by the [Cloud Asset Inventory API](https://cloud.google.com/resource-manager/docs/cloud-asset-inventory/overview) into [BigQuery](https://cloud.google.com/bigquery). Once in BigQuery it's possible to use complex SQL expressions to answer interesting questions like :

- How many disks ar running for each sourceImage broken out by machineType:

  ```
  SELECT instance.timestamp, REGEXP_EXTRACT(instance.resource.data.machineType, '.*/(.*)') AS machine_type, REGEXP_EXTRACT(disk.resource.data.sourceImage, '.*/(.*)') AS source_image, count(*) as num_disks
  FROM `asset_inventory.google_compute_Instance` AS instance
  JOIN UNNEST(instance.resource.data.disk) AS instance_disk
  JOIN `asset_inventory.google_compute_Disk` AS disk
  ON instance_disk.source = disk.resource.data.selfLink and instance.timestamp = disk.timestamp
  where instance.resource.data.status = 'RUNNING'
  group by timestamp,  machine_type, source_image
  ```

- All the external IP addresses currently assigned to my load balancers cloud sql, and compute instances?

    ```
    WITH max_timestamp AS ( SELECT MAX(timestamp) AS timestamp FROM `asset_inventory.google_compute_Instance`)

    SELECT sql_instance.resource.data.selfLink AS resource, address.ipAddress AS address
    FROM `asset_inventory.google_cloud_sql_Instance` AS sql_instance
    JOIN UNNEST(sql_instance.resource.data.ipAddresses) AS address
    JOIN max_timestamp
    ON sql_instance.timestamp = max_timestamp.timestamp
    WHERE address.ipAddress IS NOT NULL

    UNION ALL

    SELECT forwarding_rule.resource.data.selfLink AS resource, forwarding_rule.resource.data.ipAddress AS address
    FROM `asset_inventory.google_compute_ForwardingRule` AS forwarding_rule
    JOIN max_timestamp
    ON forwarding_rule.timestamp = max_timestamp.timestamp
    WHERE forwarding_rule.resource.data.loadBalancingScheme = 'EXTERNAL'

    UNION ALL

    SELECT instance.resource.data.selfLink AS resource, access_config.externalIp AS address
    FROM `asset_inventory.google_compute_Instance` AS instance
    JOIN UNNEST(instance.resource.data.networkInterface) AS network_interface
    JOIN UNNEST(network_interface.accessConfig) AS access_config
    JOIN max_timestamp
    ON instance.timestamp = max_timestamp.timestamp
    WHERE access_config.externalIp IS NOT NULL
    ```

And many more!

## Quick Start

The fastest way to Get data into BigQuery is to invoke the export resources to GCS and invoke the [Dataflow template](https://cloud.google.com/dataflow/docs/guides/templates/overview). You don't even need to download this repository! First, export the assets.

1. Ensure you have the necessary privileges at the organization level. This requires at a minimum the roles to:
   * Create a service account.
   * Grant the service account the ability to export Cloud Asset Inventory. (Apply either roles/viewer or roles/cloudasset.viewer to the project or organization )
   * BigQuery write privileges to create a dataset, create and delete tables.
   * Start Dataflow Jobs.

1. Create a new project and gcloud configuration to host our service (optional, you can use an existing project and gcloud configuration.)

    ```
    export PROJECT_ID=<my-project-id>
    gcloud projects create $PROJECT_ID
    export CONFIG_ACCOUNT=`gcloud config get-value account`
    export CONFIG_ZONE=`gcloud config get-value compute/zone`
    export CONFIG_REGION=`gcloud config get-value compute/region`
    gcloud config configurations create $PROJECT_ID
    gcloud config set account $CONFIG_ACCOUNT
    gcloud config set compute/zone $CONFIG_ZONE
    gcloud config set compute/region $CONFIG_REGION
    gcloud config set project $PROJECT_ID
    gcloud beta billing projects link $PROJECT_ID  --billing-account=`gcloud beta billing accounts list --format='value(ACCOUNT_ID)' --limit 1`
    ```

1. Ensure necessary APIs (compute, asset inventory, bigquery, dataflow) are enabled on the project.
   ```
    gcloud services enable cloudasset.googleapis.com dataflow.googleapis.com compute.googleapis.com bigquery-json.googleapis.com

   ```

1. Get the organization ID, and current project ID. It's possible to export resources of a Project instead of organization if an organization doesn't exist.

    ```
    export ORGANIZATION_ID=`gcloud projects describe $PROJECT_ID --format='value(parent.id)'`
    export PROJECT_ID=`gcloud config get-value project`
    ```

1. Create a service account and authenticate gcloud with it. It's currently ONLY possible to invoke the Cloud Asset Inventory Export API with a service account. A user account will give permission denied errors when writing to the bucket or when the API is called.

    ```
    gcloud iam service-accounts create asset-exporter-service-account
    gcloud iam service-accounts describe asset-exporter-service-account@$PROJECT_ID.iam.gserviceaccount.com
    ```

1. Grant the service account the ability to read asset inventory from the organization and start dataflow jobs.
   ```
    gcloud organizations add-iam-policy-binding $ORGANIZATION_ID --member="serviceAccount:asset-exporter-service-account@$PROJECT_ID.iam.gserviceaccount.com" --role='roles/cloudasset.viewer'
    gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:asset-exporter-service-account@$PROJECT_ID.iam.gserviceaccount.com" --role='roles/dataflow.admin'


    ```
1. Create a GCS bucket in the same project that owns the service account. The export won't work if it's in a different project even if the service account has access to the bucket.

    ```
    export BUCKET=gs://${ORGANIZATION_ID}-assets
    gsutil mb $BUCKET
    ```

1. Create the dataset to hold the resource tables in BigQuey.
   ```
   bq mk asset_inventory
   ```

1. We need to send requests as this service account. The safest way is to create a compute engine VM with a service account then SSH into it.

    ```
    gcloud compute instances create asset-inventory-instance-1 --service-account asset-exporter-service-account@$PROJECT_ID.iam.gserviceaccount.com --scopes cloud-platform
    gcloud compute ssh asset-inventory-instance-1
    export PROJECT_ID=`gcloud config get-value project`
    export ORGANIZATION_ID=`gcloud projects describe $PROJECT_ID --format='value(parent.id)'`
    export BUCKET=gs://${ORGANIZATION_ID}-assets

    ```

    Another approach is to download the private key and activate the service account but this generated key must be kept secure.
    ```
    gcloud iam service-accounts keys create --iam-account=asset-exporter-service-account@$PROJECT_ID.iam.gserviceaccount.com ~/asset-exporter-service-account.json
    gcloud auth activate-service-account  asset-exporter-service-account@$PROJECT_ID.iam.gserviceaccount.com --key-file ~/asset-exporter-service-account.json

    ```


1. Export both the `resource` and `iam_policy` assets of a project or organization to the bucket.  If you have organization level access and wish to export all resources within the organization then define the parent to be:

    ```
    export PARENT="--organization $ORGANIZATION_ID"
    ```

    Or if you only have project level access or wish to export all resources within the project run:

    ```
    export PARENT="--project $PROJECT_ID"
    ```

    We'll need to be running gcloud version __228.0.0 or later. (alpha 2018.11.09)__ Ensure you have the alpha components for gcloud installed with the alpha component.

    Now perform the export:
    ```
     for CONTENT_TYPE in resource iam-policy; do
       gcloud alpha asset export --output-path=$BUCKET/${CONTENT_TYPE}.json --content-type=$CONTENT_TYPE $PARENT
     done;
    ```

    Run the commands output by gcloud to verify the export worked, for example:
    ```
    gcloud alpha asset operations describe projects/1234567890/operations/ExportAssets/23230328344834
    ```

1. Then import the assets into BigQuery with the Dataflow template:

    ```
    export LOAD_TIME=`date -Is`
    export JOB_NAME=cloud-asset-inventory-import-`echo $LOAD_TIME | tr : - | tr '[:upper:]' '[:lower:]' | tr + _`
    gcloud dataflow jobs run $JOB_NAME  --gcs-location gs://professional-services-tools-asset-inventory/latest/import_pipeline --parameters="input=$BUCKET/*.json,stage=$BUCKET/stage,load_time=$LOAD_TIME,group_by=ASSET_TYPE,dataset=asset_inventory,write_disposition=WRITE_APPEND" --staging-location $BUCKET/staging
    ```

    This will output a job id like `2019-01-07_13_48_24-2706414343179069654`

    You can check the status of this job with the command:

    ```
    gcloud dataflow jobs show  `gcloud dataflow jobs list --filter="name=$JOB_NAME" --limit 1 --format 'value(JOB_ID)'`
    ```

    It's also possible to view the job status as well as launch the Dataflow job from the template with the cloud console at: https://console.cloud.google.com/dataflow

    That's it!, your data is in BigQuey.
    You can logout and delete the instance we used to authenticate as the service account:

    ```
    exit
    gcloud compute instances delete asset-inventory-instance-1
    ```

    Goto the BigQuery [page](https://console.cloud.google.com/bigquery) to explore the data or run queries like this from the command line:
    ```
    bq query --nouse_legacy_sql  'select timestamp, instance.resource.data.name from `asset_inventory.google_compute_Instance` as instance where instance.resource.data.status = "RUNNING"  and  timestamp = (select max(timestamp) from `asset_inventory.google_compute_Instance`) limit 1000'
    ```

    The BigQuery dataset will contain a table for each asset type. The timestamp column on each row is when the asset inventory snapshot was created.


## Automated Scheduled Imports By Deploying to App Engine

It's easy to configure a processes to perform these steps every 4 hours so that there is fresh snapshot in BigQuery.  This requires downloading this source repository, changing a config file and deploying an app engine application.

Keep in mind that the App Engine Default service account credentials will be used when running the process which means:

- The default App Engine service account needs asset inventory export privileges for the organization/project,
- The default dataflow service account running the pipeline jobs needs the ability to write to the GCS bucket and load data and update schema into BigQuery, and delete/create BigQuery tables if using write_disposition=WRITE_EMPTY.
- The GCS bucket being written to needs to be owned by the same project that owns the app engine application.


The deployment steps are:

1. Clone this repository:

    ```
    git clone git@github.com:GoogleCloudPlatform/professional-services.git
    ```

1. Edit the configuration file `professional-services/tools/asset-inventory/gae/config.yaml` and supply values for your setup.

    ```
    cd professional-services/tools/asset-inventory/gae/
    sed -i  "s|<ENTER-BUCKET-URL>|$BUCKET|" config.yaml
    sed -i  "s|<ENTER-PARENT>|organizations/$ORGANIZATION_ID|" config.yaml
    sed -i  "s|<ENTER-DATASET>|asset_inventory|" config.yaml
    sed -i  "s|<ENTER-STAGE>|$BUCKET/stage|" config.yaml
    sed -i  "s|<ENTER-PROJECT>|$PROJECT_ID|" config.yaml

    ```


1. Vendor the asset_inventory package with the app engine application:

    ```
    pip install --no-deps ../ -t lib
    ```

1. Create the App Engine application in our project and grant the default service account asset export viewer roles.
   ```
   gcloud app create
   gcloud organizations add-iam-policy-binding $ORGANIZATION_ID --member="serviceAccount:$PROJECT_ID@appspot.gserviceaccount.com" --role='roles/cloudasset.viewer'
   ```

1. Deploy the application to App Engine.

    ```
    gcloud app deploy app.yaml
    ```

1. Deploy the cron task definition to invoke the process every 4 hours (edit the config to whatever schedule you want):

    ```
    gcloud app deploy cron.yaml
    ```

1. Goto the [App Engine cron page](https://console.cloud.google.com/appengine/cronjobs) and manually invoke the cron process to ensure everything works. It will run for a while (a few minutes) as it performs the export starts a Dataflow job.    That's it!

![App Engine Cron](https://storage.googleapis.com/professional-services-tools-asset-inventory/images/cron.png "App Engine Cron")


## Directly running the pipeline.

This repository contains some command line tools that let you run the export/import process with an Apache Beam runner, including the direct runner. This can be useful when you want a more "traditional" way of running the import/export process like via crontab on a machine or for local development.

1. Run setup.py in develop mode. (The project also supports python3.7 if you set the BEAM_EXPERIMENTAL_PY3 environment variable). See [full instructions](https://beam.apache.org/get-started/quickstart-py/#set-up-your-environment) for setting up an Apache Beam development environment:

    ```
    cd professional-services/tools/asset-inventory
    mkdir ~/.venv
    virtualenv ~/.venv/asset-inventory
    source ~/.venv/asset-inventory/bin/activate
    pip install -r requirements.txt
    python setup.py develop --upgrade
    ```

1. Set the GOOGLE_APPLICATION_CREDENTIALS environment variable to the service account json key that will be used to invoke the Cloud Asset Inventory API and invoke the Beam runner. Or run within GCE and rely on the service account of the compute engine instance. Also grant it the bigquery.user role to modify BigQuery tables.

    ```
    gcloud iam service-accounts keys create --iam-account=asset-exporter-service-account@$PROJECT_ID.iam.gserviceaccount.com ~/asset-exporter-service-account.json
    export GOOGLE_APPLICATION_CREDENTIALS=~/asset-exporter-service-account.json
    gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:asset-exporter-service-account@$PROJECT_ID.iam.gserviceaccount.com" --role='roles/bigquery.user'
    gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:asset-exporter-service-account@$PROJECT_ID.iam.gserviceaccount.com" --role='roles/bigquery.dataEditor'

    ```

1. Run the main.py program:

    ```
    python asset_inventory/main.py --parent organizations/$ORGANIZATION_ID --gcs-destination $BUCKET --dataset asset_inventory  --runner direct
    ```


## Troubleshooting.

1. The Cloud Asset Inventory  export operation failed with the error: "PERMISSION_DENIED. Failed to write to: gs://<my-export-path>" yet I know I have write permissions?

    You need to invoke the export API with a service account that's owned by the same project that owns the bucket. See Step 1.1 where you can have gcloud authenticate with a service account. When using the command line tools like asset_inventory/export.py or asset_inventory/main.py  use the  GOOGLE_APPLICATION_CREDENTIALS environment variable to point to the service account key or run then within a compute engine instance with a service account that has the required privileges (see access control section).

1. The Cloud Asset Inventory  export operation failed with the error:  "PermissionDenied: 403 Your application has authenticated using end user credentials from the Google Cloud SDK"

    You have to use a service account and can't use a regular user's credentials.

1. When using the Dataflow runner I get the error:

    ```
      File "/usr/local/lib/python2.7/dist-packages/dill/_dill.py", line 465, in find_class
        return StockUnpickler.find_class(self, module, name)
      File "/usr/lib/python2.7/pickle.py", line 1130, in find_class
        __import__(module)
    ImportError: No module named asset_inventory.import_pipeline
    ```

    You likely forgot the "--setup_file ./setup.py" arguments try something like:

    ```
    python asset-inventory/asset_inventory/main.py --parent projects/$PROJECT --gcs-destination $BUCKET --dataset $DATASET --write_disposition WRITE_APPEND --project $PROJECT --runner dataflow --temp_location gs://$BUCKET_temp --save_main_session   --setup_file ./setup.py
    ```

1. When deploying the App Engine application with "gcloud app deploy app.yaml" I get the error:

    ```
    Build error details: Access to bucket "staging.gcpdentity-asset-export-1.appspot.com" denied. You must grant Storage Object Viewer permission to 159063514943@cloudbuild.gserviceaccount.com.
    ```

    This can occur when the App Engine application was just created. Please try running the "gcloud app deploy" command again after waiting a moment.

1. I get the App Engine error:

   ```
   File "/srv/main.py", line 44, in <module> from asset_inventory import pipeline_runner
   File "/srv/lib/asset_inventory/pipeline_runner.py", line 20, in <module> from googleapiclient.discovery import build
   File "/srv/lib/googleapiclient/discovery.py", line 52, in <module> import httplib2
   File "/srv/lib/httplib2/__init__.py", line 988 raise socket.error, msg
   SyntaxError: invalid syntax
   ```

   You have installed the python2.7 version of httplib2. We need the python3 version. Perhaps you didn't supply the "--no-deps" argument to pip command and you have python2 installed locally. Try removing the gae/lib directory contents and runnng the pip command with the "-no-deps" argument.
