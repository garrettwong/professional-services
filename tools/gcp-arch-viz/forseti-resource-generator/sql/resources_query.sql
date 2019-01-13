-- prerequisites
/*
    3  forseti inventory list
    4  -- pull the id field, from the previous command, 1541795238950589
    5  forseti model create --inventory 1541795238950589
    6  forseti model create --inventory 1541795238950589 model
    7  forseti model list
*/
SELECT * FROM forseti_security.d389ff143826a43783aa906623cdb887_resources where type = 'organization'; 

-- show joe violations


SELECT distinct(type) FROM forseti_security.d389ff143826a43783aa906623cdb887_resources 
