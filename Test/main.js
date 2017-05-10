/* Philosophy as it develops */
/*** 

Energy accumulation and appropriate distribution are critical. 
Pros and cons from previous coding engagement below...

Pros:
- Population control
- Creep management by role (via for loop)
- State management, however it could use some heavy revamping
- - Cache everything
- - do it until your done! none of this hit it and revert to idle shit
- Automation over time in terms of scaling up based on controller/energy available
- - This included some structure automation, which would be nice

Cons:
- Nothing was cached, and CPU usage was high
- Function cost was never considered (CPU)
- Deprecated code, need to use better pathing systems

To improve:
- Update code for latest release
- Use more static data, don't try to be dynamic for *everything*
- Add attack code

ToDO:
1) Create a mining role.

The miner should be capable of being assigned a source ID for its entire lifetime
no need to switch to a new source


***/

// Creep Roles
var localMiner = require("role.localMiner");

// Globals
var mainSpawn = Game.spawns['home']; // always call room 1 home for this script to work
// - Maximum creep counts for automation
var localMiners;

// - Creep body types
var localMinerBody = [WORK, CARRY, MOVE, MOVE];

// Primary game loop
module.exports.loop = function () {
	// First time init, only runs *once*
	if(mainSpawn.memory.init==null || mainSpawn.memory.init==false)
	{
		init(mainSpawn);
	}
	// Population management - do we need to spawn a creep?
	populationManager(mainSpawn);
	// Handle all creeps currently alive
	manageCreeps();
};

// sets up counters and maximums for a room. Should be triggered via spawn memory for room
function init(spawnPoint)
{
	// Define maximums
	// Max local miners defined by open_spaces + sources_in_room = total_local_miners
	var sources = spawnPoint.room.find(FIND_SOURCES);
	var open_spaces = 0;
	for(var i = 0; i<sources.length; i++)
	{
		open_spaces += checkOpenSpace(sources[i].pos.x, sources[i].pos.y,spawnPoint.room.name)
	}
	localMiners = open_spaces + sources.length; // total miners we should ever have
	spawnPoint.memory.localMinersMax=localMiners;

	// Kill init script
	spawnPoint.memory.init=true;
}
// Handle the creep population, spawning a creep if necessary
function populationManager(spawnPoint)
{
	// Zero out counters for each creep type
    localMiners 		= {current:0, max:0};

    // Set maximums
    if(spawnPoint.memory.localMinersMax!=null)
    {
    	localMiners.max=spawnPoint.memory.localMinersMax;
    }

	// localMiner management
	localMiners.current	= _.filter(Game.creeps, (creep) => creep.memory.role.includes('localMiner')).length;

	// Spawn needed creeps with if/else-if priortization
	if(localMiners.current<localMiners.max)
	{
		// try to spawn a localMiner
		spawnCreep("localMiner",spawnPoint);
	}
}

// Process creep roles and garbage collection
function manageCreeps()
{
	for (var name in Game.creeps)
    {
        var creep = Game.creeps[name];
        // Clean up dead
        cleanDeadCreeps();

        // Process all creep roles
        switch(creep.memory.role)
        {
        	case 'localMiner':
        		localMiner.run(creep);
        		break;
        }
    }
}

// Keep game memory in check over time
function cleanDeadCreeps()
{
    for(var i in Memory.creeps) {
		if(!Game.creeps[i]) {
			delete Memory.creeps[i];
		}
	}
}

// Map anything that doesn't match "wall" terrain type around given target
function checkOpenSpace(xpos,ypos,roomName)
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
	var y = ypos;
	var x = xpos;
	var iy = y-1;
	var ix = x-1;
	var accessible = 0;
	
	while (iy<(y+2))
	{
	    ix = x-1; // reset
		while (ix<(x+2))
		{
			var terrain = Game.map.getTerrainAt(ix,iy,roomName);
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

function spawnCreep(type,spawnPoint)
{
	if(spawnPoint.memory.creepCount==null)
    {
    	spawnPoint.memory.creepCount=0;
    }
    else
    {
    	spawnPoint.memory.creepCount+=1;
    }
	var creepName = type+spawnPoint.memory.creepCount;
	var newCreep;
	
	switch(type)
	{
		case "localMiner":
			if(trySpawn(creepName,localMinerBody,spawnPoint))
			{
				newCreep = Game.creeps[creepName];
				newCreep.memory.role="localMiner";
				if(newCreep.memory.source==null)
				{
					newCreep.memory.source = setLocalMinerSource(spawnPoint);
				}
			}
			break;
	}
}
function trySpawn(name,body,spawnPoint)
{
	var result = spawnPoint.canCreateCreep(body, name);
	if(result == OK) {
	    spawnPoint.createCreep(body, name);
	    return true;
	}
	else if(result!=ERR_BUSY)
	{
		//console.log("Error spawning " + name + ":" + result);
		return false;
	}
	else
	{
		return false;
	}
}

// Compares open space around a source, number of miners already on the source, and finds the next open spot
// Accounts for open spaces + 1
function setLocalMinerSource(spawnPoint)
{
	var sources = spawnPoint.room.find(FIND_SOURCES);
	var source_spaces = [];
	var creeps_mining = 0;
	var open_spaces = 0;
	var sourceId = null;
	console.log("Sources: " + sources.length);

	for(var i = 0; i<sources.length; i++)
	{
		// Auto add +1 to a source, always have someone in transit
		source_spaces[i] = checkOpenSpace(sources[i].pos.x, sources[i].pos.y,spawnPoint.room.name) + 1; 
		console.log("Source " + sources[i].id + " miners maximum: " + source_spaces[i]);
		open_spaces += source_spaces[i];
	}

	// For each source
	for (var x = 0; x<sources.length; x++)
	{
		// How many other creeps are mining here?
		for (var name in Game.creeps)
		{
			var checkCreep = Game.creeps[name];
			if(checkCreep.memory.source==sources[x].id)
			{
				// Each hit reduces source_spaces[x]
				source_spaces[x]--;
				console.log("Source " + sources[x].id + " found miner. Miners still needed: " + source_spaces[x]);
			}
		}
		if(source_spaces[x]>0)
		{
			// miner still needed here, set the source id to this
			sourceId = sources[x].id;
			break;
		}

		// Exit condition - if we've found a source return id
		if(sourceId!=null)
		{
			break;
		}
	}
	return sourceId;
}