#!/usr/bin/env python
#
# Copyright 2019 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Import Cloud Asset Inventory exports into BigQuery.

Apache Beam pipeline to load Cloud Asset Inventory exports in GCS json objects
into a BigQuery daset. There are options for appending to tables or truncating
them. The dataset must exist prior to import.

Most all export are small and can likely be processed very quickly by a single
machine with the direct runner. In some situations there might be a very large
number of assets like GCS buckets or BigQuery tables which will benefit from the
scalability of the Dataflow runner or perhaps you wish to process the file from
environments that are not easily suited to large memory single machines like
Cloud Functions or App Engine.
"""

from datetime import datetime
import json
import logging
import pprint

import apache_beam as beam
from apache_beam.io import ReadFromText
from apache_beam.io.filesystems import FileSystems
from apache_beam.options.pipeline_options import PipelineOptions
from apache_beam.options.value_provider import StaticValueProvider
from apache_beam.transforms import core
from asset_inventory import bigquery_schema
from six import string_types

from google.api_core.exceptions import BadRequest
from google.cloud import bigquery


class JsonCoder(object):
    """A coder interpreting each line as a JSON string."""

    def encode(self, x):
        return json.dumps(x)

    def decode(self, x):
        return json.loads(x)


class AssignGroupByKey(beam.DoFn):
    """Split assets based on input feature:

    The group_by value can be either:

    - ASSET_TYPE so we have a table for that asset type like
    `google.compute.Instance`.

    - ASSET_TYPE_VERSION to have a table for each asset type and version like
      `google.compute.Instance.v1alpha`

    - NAME for when merging the iam_policy and the resource together as an
      intermediary step prior to load.
    """

    def __init__(self, group_by):
        if isinstance(group_by, string_types):
            group_by = StaticValueProvider(str, group_by)
        self.group_by = group_by

    def process(self, element):
        key = 'ASSET_TYPE'
        group_by = self.group_by.get()
        if group_by == 'NAME':
            key = element['asset_type'] + '.' + element['name']
        elif group_by == 'ASSET_TYPE':
            key = element['asset_type']
        elif group_by == 'ASSET_TYPE_VERSION':
            version = ''
            if 'resource' in element:
                version = element['resource']['version']
                key = element['asset_type'] + '.' + version
        yield (key, element)


class BigQuerySchemaCombineFn(core.CombineFn):
    """Reduce a list of schemas into a single schema."""

    def create_accumulator(self):
        return []

    def merge_accumulators(self, accumulators):
        return bigquery_schema.merge_schemas(accumulators)

    def extract_output(self, schema):
        return schema

    def add_input(self, schema, element):
        new_schema = bigquery_schema.translate_json_to_schema(element)
        return bigquery_schema.merge_schemas([schema, new_schema])


class BigQuerySanitize(beam.DoFn):
    """Make the json acceptible to BigQuery."""

    def __init__(self, load_time):
        if isinstance(load_time, string_types):
            load_time = StaticValueProvider(str, load_time)
        self.load_time = load_time

    def process(self, element):
        element = bigquery_schema.sanitize_property_value(element)
        # add load timestamp.
        element['timestamp'] = self.load_time.get()
        yield element


class CombinePolicyResource(beam.DoFn):
    """Unions two json documents.

    Used when merging both the iam_policy and asset into a single document to be
    represented as a single BigQuery row when loaded in the same table.

    """

    def process(self, element):
        combined = {}
        for content in element[1]:
            combined.update(content)
        yield combined


class WriteToGCS(beam.DoFn):
    """Stage in GCE the files to load into BigQuery.

    All written objects are prefixed by the input stage_dir and loadtime. There
    is an object for each group-key, either an object per asset type, or for
    each asset type version.

    There is nothing cleaning up these objects so it might be prudent to have a
    lifecycle policy on the GCS destination bucket to purge old files.

    """

    def __init__(self, stage_dir, load_time):
        if isinstance(stage_dir, string_types):
            stage_dir = StaticValueProvider(str, stage_dir)
        if isinstance(load_time, string_types):
            load_time = StaticValueProvider(str, load_time)

        self.stage_dir = stage_dir
        self.load_time = load_time
        self.open_files = {}

    def get_path_for_key_name(self, key_name):
        stage_dir = self.stage_dir.get()
        load_time = self.load_time.get()
        return FileSystems.join(stage_dir, load_time, key_name + '.json')

    def start_bundle(self):
        self.open_files = {}

    def _get_file_for_element(self, element):
        key_name = element[0]
        if key_name in self.open_files:
            return self.open_files[key_name], None
        file_path = self.get_path_for_key_name(key_name)
        file_handle = FileSystems.create(file_path, mime_type='text/json')
        self.open_files[key_name] = file_handle
        return file_handle, file_path

    def process(self, element):
        file_handle, created_file_path = self._get_file_for_element(element)
        for asset_line in element[1]:
            file_handle.write(json.dumps(asset_line).encode())
            file_handle.write(b'\n')
        if created_file_path:
            yield (element[0], created_file_path)

    def finish_bundle(self):
        for _, file_handle in self.open_files.items():
            file_handle.close()


class BigQueryDoFn(beam.DoFn):
    """Super class for a DoFn that requires BigQuery dataset information."""

    def __init__(self, dataset, write_disposition):
        if isinstance(dataset, string_types):
            dataset = StaticValueProvider(str, dataset)
        if isinstance(write_disposition, string_types):
            write_disposition = StaticValueProvider(str, write_disposition)
        self.write_disposition = write_disposition
        self.dataset = dataset
        self.bigquery_client = None
        self.dataset_location = None
        self.load_jobs = {}

    def get_dataset_ref(self):
        dataset = self.dataset.get()
        if '.' in dataset:
            return bigquery.DatasetReference.from_string(dataset)
        else:
            return self.bigquery_client.dataset(dataset)

    def get_dataset_location(self):
        if self.dataset:
            return self.bigquery_client.get_dataset(
                self.get_dataset_ref()).location
        return None

    def start_bundle(self):
        if not self.bigquery_client:
            self.bigquery_client = bigquery.Client()
        self.dataset_location = self.get_dataset_location()
        self.load_jobs = {}


class DeleteDataSetTables(BigQueryDoFn):
    """Delete tables when truncating and not appending.

    If we are not keeping old data around, it safer to delete all tables in the
    dataset before loading so that no old asset types remain.
    """

    def process(self, _):
        # don't delete tables if we are appending to them.
        if self.write_disposition.get() == 'WRITE_APPEND':
            yield False
        else:
            dataset_ref = self.get_dataset_ref()
            for table_list_item in self.bigquery_client.list_tables(
                dataset_ref):
                if table_list_item.table_id.startswith('google_'):
                    self.bigquery_client.delete_table(
                        table_list_item.reference)
            yield True


class LoadToBigQuery(BigQueryDoFn):
    """Load each writen GCS object to BigQuery.
    The Beam python SDK doesn't support dynamic BigQuery destinations yet so
    this must be done within the workers.
    """

    def __init__(self, dataset, write_disposition, load_time):
        super(LoadToBigQuery, self).__init__(dataset, write_disposition)
        if isinstance(load_time, string_types):
            load_time = StaticValueProvider(str, load_time)
        self.load_time = load_time

    def process(self, element, schemas, _):
        """Element is a tuple of key_ name and iterable of filesystem paths."""

        dataset_ref = self.get_dataset_ref()
        key_name = element[0]
        object_paths = [object_path for object_path in element[1]]
        table_ref = dataset_ref.table(key_name.replace('.', '_'))
        job_config = bigquery.LoadJobConfig()
        write_disposition = self.write_disposition.get()
        job_config.write_disposition = write_disposition
        if write_disposition == 'WRITE_APPEND':
            job_config.schema_update_options = [
                bigquery.job.SchemaUpdateOption.ALLOW_FIELD_ADDITION]
        # use load_time as a timestamp.
        job_config.time_partitioning = bigquery.table.TimePartitioning(
            field='timestamp')
        job_config.schema = schemas[key_name]
        job_config.source_format = bigquery.SourceFormat.NEWLINE_DELIMITED_JSON
        try:
            load_job = self.bigquery_client.load_table_from_uri(
                object_paths,
                table_ref,
                location=self.dataset_location,
                job_config=job_config)
            self.load_jobs[key_name] = load_job
        except BadRequest as e:
            logging.error('error in load_job %s, %s, %s, %s',
                          str(object_paths), str(table_ref),
                          str(self.dataset_location),
                          str(job_config.to_api_repr()))
            raise e

    def finish_bundle(self):
        self.bigquery_client = None
        # wait for the load jobs to complete
        for _, load_job in self.load_jobs.items():
            try:
                load_job.result()
            except BadRequest as e:
                logging.error('error in load_job %s', load_job.self_link)
                raise e


class ImportAssetOptions(PipelineOptions):
    """Required options.

    All options are required, but are not marked as such to support creation
    of Dataflow templates.
    """

    @classmethod
    def _add_argparse_args(cls, parser):
        parser.add_value_provider_argument(
            '--group_by',
            default=StaticValueProvider(str, 'ASSET_TYPE'),
            choices=['ASSET_TYPE', 'ASSET_TYPE_VERSION'],
            help='How to group exported resources into Bigquery tables.')

        parser.add_value_provider_argument(
            '--write_disposition',
            default=StaticValueProvider(str, 'WRITE_APPEND'),
            choices=['WRITE_APPEND', 'WRITE_EMPTY'],
            help='To append to or overwrite BigQuery tables..')

        parser.add_value_provider_argument(
            '--input', help='A glob of all input asset json files to process.')

        parser.add_value_provider_argument(
            '--stage',
            help='GCS location to write intermediary BigQuery load files.')

        parser.add_value_provider_argument(
            '--load_time',
            default=StaticValueProvider(str, datetime.now().isoformat()),
            help='Load time of the data (YYYY-MM-DD[HH:MM:SS])).')

        parser.add_value_provider_argument(
            '--dataset', help='BigQuery dataset to load to.')


def run(argv=None):
    """Construct the pipeline."""

    options = ImportAssetOptions(argv)

    p = beam.Pipeline(options=options)

    # Delete bigquery dataset on pipeline start.
    deleted_tables = (
        p | beam.Create([None])  # dummy PCollection to trigger delete tables.
        | 'delete_tables' >> beam.ParDo(
            DeleteDataSetTables(options.dataset, options.write_disposition)))

    # Cleanup json documents.
    sanitized_assets = (
        p | 'read' >> ReadFromText(options.input, coder=JsonCoder())
        |
        'bigquery_sanitize' >> beam.ParDo(BigQuerySanitize(options.load_time)))

    # Joining all iam_policy objects with resources of the same name.
    merged_iam_and_asset = (
        sanitized_assets | 'name_key' >> beam.ParDo(AssignGroupByKey('NAME'))
        | 'group_by_name' >> beam.GroupByKey()
        | 'combine_policy' >> beam.ParDo(CombinePolicyResource()))

    # split into BigQuery tables.
    keyed_assets = merged_iam_and_asset | 'group_by_key' >> beam.ParDo(
        AssignGroupByKey(options.group_by))

    # Generate BigQuery schema for each table.
    schemas = keyed_assets | 'to_schema' >> core.CombinePerKey(
        BigQuerySchemaCombineFn())

    # Write to GCS and load to BigQuery.
    # pylint: disable=expression-not-assigned
    (keyed_assets | 'group_assets_by_key' >> beam.GroupByKey()
     | 'write_to_gcs' >> beam.ParDo(
         WriteToGCS(options.stage, options.load_time))
     | 'group_written_objets_by_key' >> beam.GroupByKey()
     | 'load_to_bigquery' >> beam.ParDo(
         LoadToBigQuery(options.dataset, options.write_disposition,
                        options.load_time), beam.pvalue.AsDict(schemas),
         beam.pvalue.AsSingleton(deleted_tables)))

    return p.run()


if __name__ == '__main__':
    logging.basicConfig()
    logging.getLogger().setLevel(logging.INFO)
    pipeline_result = run()
    logging.info('waiting on pipeline : %s', pprint.pformat(pipeline_result))
    state = pipeline_result.wait_until_finish()
    logging.info('final state: %s', state)
