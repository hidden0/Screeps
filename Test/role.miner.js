var minerCreep = {
	/** @param {Creep} creep object **/
	run: function(creep) {
    	// Default behavior - find energy and gather if there is space in inventory
    	if(creep.memory.sourceMine==null)
    	{
    		setSource(creep,Game.spawns['Spawn1']);
    	}
    	if(creep.carry.energy < creep.carryCapacity)
        {
            creep.memory.harvesting=true;
        	if(creep.memory.sourceMine!=null)
        	{
				var sourceToMine = Game.getObjectById(creep.memory.sourceMine);
	    		if(creep.harvest(sourceToMine) == ERR_NOT_IN_RANGE) {
	    			creep.moveTo(sourceToMine);
	    		}
	    	}
    	}
    	else
        {
            creep.memory.harvesting=false;
    		// TODO: moving to 'Home' is not a long term solution. Make this the spawn point that made the miner
			// If spawn is full, find storage or extensions
			var targets = creep.room.find(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return (structure.structureType == STRUCTURE_EXTENSION || structure.structureType == STRUCTURE_SPAWN || structure.structureType == STRUCTURE_CONTAINER) &&
                            structure.energy < (structure.energyCapacity);
                    }
            });
            var containersWithRoom = creep.room.find(FIND_STRUCTURES, {
                filter: (i) => i.structureType == STRUCTURE_CONTAINER && 
                               i.store[RESOURCE_ENERGY] < i.storeCapacity
            });
            var storageCont = creep.room.find(FIND_STRUCTURES, {
                filter: (i) => i.structureType == STRUCTURE_STORAGE && 
                               i.store[RESOURCE_ENERGY] < i.storeCapacity
            });
            if(targets.length > 0) {
                //console.log("Moving to spawn to store energy.");
                if(creep.transfer(targets[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(targets[0]);
                }
            }
            // Extensions/spawns are full, find containers
            else if(containersWithRoom.length>0)
            {
                if(creep.transfer(containersWithRoom[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(containersWithRoom[0]);
                }
            }
            else if(storageCont.length>0)
            {
                if(creep.transfer(storageCont[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(storageCont[0]);
                }
            }
            if(!creep.memory.harvesting  && creep.carry.energy == 0)
            {
                setSource(creep,Game.spawns['Spawn1']);
            }
        }
	}
};

// Set source to mine, distribute based on current load
function setSource(creep,spawnPoint)
{
	// for each source, check the source's open space
	// then check how many miners are on it
	// if we pass, go mine
	// if we fail, go to next source
	var i = 0;
	var sourceList = creep.room.find(FIND_SOURCES);
	var openSpace = 0;
	var matchCount = 0;
	var full = false;
	var allOpenSpace = 0;

	// Order the sourceList
	// mapDistance(spawn) will return an array of distances:source.id's to sort and choose from
	var sortedSourceList = mapDistance(spawnPoint);

	// For each source
	while(i<sortedSourceList.length)
	{
		var sourceId = sortedSourceList[i].split(":")[1];
		matchCount=0;
		//console.log(sourceId);
		// How much open space?
		openSpace=checkOpenSpace(sourceId);
		//console.log(openSpace);
		allOpenSpace+=openSpace;
		// How many miners match this ID?
		for (var name in Game.creeps)
		{
			var otherCreep = Game.creeps[name];
			if(otherCreep.memory.sourceMine==sourceId)
			{
				matchCount++;
			}

			// Are we past this source's open space?
			if(matchCount>(openSpace-1))
			{
				full=true;
				break; // break the loop and move to next source
			}
		}

		// Made it through the check loop, was it full?
		if(!full)
		{
			//console.log("Source: " + sourceId + " not full. Assigning miner: " + creep.name);
			// if not, assign miner
			creep.memory.sourceMine=sourceId;
			break;
		}

		i++;
	}

	// Finally out of the loop. Was everything full to the brim? Start over loading
	if(creep.memory.sourceMine==null)
	{
		var randomSource = Math.round(Math.random()*(sourceList.length-1));
		creep.memory.sourceMine=sourceList[randomSource].id;
	}
}
module.exports = minerCreep;

function checkOpenSpace(obj1)
{
	// Return number of tiles in array around x/y that are accessible
	// objPos["x"] and objPos["y"] are the things we like here
	/*
	Check:
	y-1
		x-1, x, x+1
	y
		x-1, [skip], x+1
	y+1
		x-1, x, x+1
	*/
	//console.log(obj);
	var obj = Game.getObjectById(obj1);
	var y = obj.pos.y;
	var x = obj.pos.x;
	var iy = y-1;
	var ix = x-1;
	var accessible = 0;
	
	while (iy<(y+2))
	{
	    ix = x-1; // reset
		while (ix<(x+2))
		{
			var terrain = Game.map.getTerrainAt(ix,iy, obj.room.name);
			//console.log("Y row: " + iy + " X row column: " + ix + " terrain: " + terrain);
			if(terrain!="wall")
			{
			    accessible++;
			}
			ix++;
		}
		iy++;
	}
	return accessible;
}

// Counts distance to all sources in a room for handling distance mod for maximum miners
function mapDistance(spawnPoint)
{
	var distanceCounter = new Array();
	var sources = spawnPoint.room.find(FIND_SOURCES);
	var spawn_xPos = spawnPoint.pos.x;
	var spawn_yPos = spawnPoint.pos.y;
	var i=0;
	while (i<sources.length)
	{
		// Find the distance via pythagorean theorem to this source

		var source_xPos = sources[i].pos.x;
		var source_yPos = sources[i].pos.y;
		var x_1 = 0;
		var x_2 = 0;
		var y_1 = 0;
		var y_2 = 0;
		if(spawn_xPos > source_xPos)
		{
			x_2 = spawn_xPos;
			x_1 = source_xPos;
		}
		else
		{
			x_1 = spawn_xPos;
			x_2 = source_xPos;
		}
		if(spawn_yPos > source_yPos)
		{
			y_2 = spawn_yPos;
			y_1 = source_yPos;
		}
		else
		{
			y_1 = spawn_yPos;
			y_2 = source_yPos;
		}
		var xCalc = ((x_2-x_1)*(x_2-x_1));
		var yCalc = ((y_2-y_1)*(y_2-y_1));

		var distance = Math.sqrt(xCalc+yCalc);
		distanceCounter[i]=distance+":"+sources[i].id;	
		i++;	
	}

	// Sort the list
	distanceCounter.sort(function(a, b){return (a.split(':')[0])-(b.split(':')[0])});

	return distanceCounter;
}