SELECT g.id, 
    g.resource_type, 
    g.category, 
    g.resource_id, 
    g.parent_id AS parent_id, 
    IFNULL(g.resource_data->>'$.displayName', '') as resource_data_displayname, 
    IFNULL(g.resource_data->>'$.name', '') as resource_data_name,
    IFNULL(g.resource_data->>'$.lifecycleState', '') as lifecycle_state, 
FROM gcp_inventory g
WHERE g.inventory_index_id = (SELECT id FROM inventory_index ORDER BY completed_at_datetime DESC LIMIT 1) 
AND (g.category='resource') 
AND g.resource_type IN ('organization', 'project', 'folder', 'appengine_app', 'kubernetes_cluster', 'cloudsqlinstance')
ORDER BY
   CASE WHEN g.resource_type = 'organization' THEN 0
        WHEN g.resource_type = 'folder' THEN 1
        WHEN g.resource_type = 'project' THEN 2
        ELSE 3
   END ASC;