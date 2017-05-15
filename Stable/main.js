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
var upgrader = require("role.upgrader");
var builder = require("role.builder");
var expander = require("role.expander");
var pilgrim = require("role.pilgrim");
var localTruck = require("role.localTruck");
var thief = require("role.thief");

// Globals

// - Maximum creep counts for automation
var localMiners;
var upgraders;
var builders;
var expanders;
var pilgrims;
var localTrucks;

// - Creep body types
var localMinerBody = [WORK, WORK, CARRY, MOVE, MOVE];
var simpleMinerBody = [WORK, CARRY, MOVE, MOVE];
var localUpgraderBody = [WORK, WORK, CARRY, MOVE];
var builderBody = [WORK, CARRY, CARRY, MOVE];
var expanderBody = [CLAIM, MOVE, MOVE];
var pilgrimBody = [MOVE, MOVE, MOVE, CARRY, CARRY, WORK, WORK];
var localTruckBody = [MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY];
var thiefBody = [MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY];

// Primary game loop
module.exports.loop = function () {
    // most of this is spawn based - do this per spawn
    for (var aSpawn in Game.spawns)
    {
        var theSpawn = Game.spawns[aSpawn];
    	// First time init, only runs *once*
    	if(theSpawn.memory.init==null || theSpawn.memory.init==false)
    	{
    		init(theSpawn);
    	}
    	// Calculate what towers should do
    	handleTowers(theSpawn);
    	// Population management - do we need to spawn a creep?
    	populationManager(theSpawn);
    }
	// Handle all creeps currently alive
	manageCreeps();
};

// Handles Towers
function handleTowers(theSpawn)
{
	// Targetting
	var towers = theSpawn.room.find(
            FIND_MY_STRUCTURES, {filter: {structureType: STRUCTURE_TOWER}});
	var tRepairTargets = theSpawn.room.find(FIND_STRUCTURES, {
                filter: (i) => (i.hits < (i.hitsMax) && i.structureType!=STRUCTURE_WALL)
            });
	var hostiles = theSpawn.room.find(FIND_HOSTILE_CREEPS);

	// Prioritize hostiles!
    
    if(hostiles.length > 0) 
    {
        var username = hostiles[0].owner.username;
        Game.notify(`User ${username} spotted in room ${theSpawn.room.name}`);
        
        towers.forEach(tower => tower.attack(hostiles[0]));
    }
    // Otherwise repair things
    else
    {
        var i=0;
        while(i<towers.length)
        {
            if(towers[i].energy>200)
            {
                towers[i].repair(tRepairTargets[0]);
            }
            i++;
        }
	}
}
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
    upgraders 			= {current:0, max:0};
    builders 			= {current:0, max:0};
    expanders 			= {current:0, max:0};
    pilgrims 			= {current:0, max:0};
    localTrucks			= {current:0, max:0};
    thiefs				= {current:0, max:1};
    // Set maximums
    if(spawnPoint.memory.localMinersMax!=null)
    {
    	localMiners.max=spawnPoint.memory.localMinersMax;
    }

    switch(spawnPoint.room.controller.level)
    {
    	case 1:
    		upgraders.max=2;
    		builders.max=3;
    		break;
    	case 2:
    		upgraders.max=3;
    		builders.max=3;
    		break;
    	case 3:
    		upgraders.max=2;
    		builders.max=3;
    		//upgraders2.max=3;
    		break;
    	default:
    		upgraders.max=2;
    		builders.max=3;
    		break;
    }
    // truck management
    // if there are towers and containers, it's time to have a truck
    var towers = spawnPoint.room.find(FIND_STRUCTURES, {
        filter: (i) => ((i.structureType==STRUCTURE_TOWER))
    });
    var containers = spawnPoint.room.find(FIND_STRUCTURES, {
        filter: (i) => ((i.structureType==STRUCTURE_CONTAINER))
    });
    if(towers.length>0 && containers.length>0)
    {
    	localTrucks.max=1;
    }
    // Claim management
    // #region - claims

    var claimFlag = null;
    if(spawnPoint.name=='home')
    {
	    for (var flagName in Game.flags)
	    {
	        if(flagName.includes("claim"))
	        {
	            claimFlag=flagName;
	            spawnPoint.memory.targetRoom=Game.flags[claimFlag].pos.roomName;
	            break;
	        }
	    }

	    if(spawnPoint.memory.targetRoom!=null)
	    {
	    	if(Game.rooms[spawnPoint.memory.targetRoom]!=null)
		    	{
		    	    if(Game.rooms[spawnPoint.memory.targetRoom].controller.owner!=null)
		    	    {
		                if(Game.rooms[spawnPoint.memory.targetRoom].controller.owner.username!="hidden0")
		                {
		                    expanders.max=1;
		                }
		                else
		                {
		                    expanders.max=0;
		                }
		    	    }
		            else
		            {
		                expanders.max=1;   
		            }
		    	}
		        var spawnsInRoom = Game.rooms[spawnPoint.memory.targetRoom].find(FIND_STRUCTURES, {
		                filter: (i) => (i.structureType==STRUCTURE_SPAWN)
		            });
		        if(spawnsInRoom.length>0)
		        {
		            pilgrims.max=0;
		            spawnPoint.memory.targetRoom=null;
		            Game.flags[claimFlag].remove();
		        }
		        else
		        {
		            pilgrims.max=2;
		        }
	    	
	    	if(claimFlag!=null)
	    	{
	    		expanders.max=1;
	    	}
	    }
	    else
	    {
	        expanders.max=0;
	        pilgrims.max=0;
	    }
	}
	// #endregion - claims

	// population current counts
	// checking room name for current room of spawn being calculated
	// some creeps are global creeps and do not get this check

	localMiners.current	= _.filter(Game.creeps, (creep) => creep.memory.role.includes('localMiner') && creep.room.name==spawnPoint.room.name).length;
	upgraders.current	= _.filter(Game.creeps, (creep) => creep.memory.role.includes('upgrader') && creep.room.name==spawnPoint.room.name).length;
	builders.current	= _.filter(Game.creeps, (creep) => creep.memory.role.includes('builder') && creep.room.name==spawnPoint.room.name).length;
	localTrucks.current	= _.filter(Game.creeps, (creep) => creep.memory.role.includes('localTruck') && creep.room.name==spawnPoint.room.name).length;
	expanders.current	= _.filter(Game.creeps, (creep) => creep.memory.role.includes('expander')).length;
	pilgrims.current	= _.filter(Game.creeps, (creep) => creep.memory.role.includes('pilgrim')).length;
	thiefs.current		= _.filter(Game.creeps, (creep) => creep.memory.role.includes('thief')).length;

	// Economy management - go into energy reservation mode if we're below max miners and need energy
	spawnPoint.memory.energyReserveMode=false;
	var energyCounter = 0;
	var i = 0;

	var extensions = spawnPoint.room.find(FIND_STRUCTURES, {
	            filter: (i) => (i.structureType==STRUCTURE_EXTENSION)
	        });
	while (i<extensions.length)
	{
		energyCounter+=extensions[i].energy;
		i++;
	}
	energyCounter+=spawnPoint.energy;
	if(energyCounter<250)
	{
		if(localMiners.current<localMiners.max)
		{
			spawnPoint.memory.energyReserveMode=true;
		}
	}
	// Spawn needed creeps with if/else-if priortization
	if(localMiners.current<localMiners.max)
	{
		// try to spawn a localMiner
		
		spawnCreep("localMiner",spawnPoint);
	}
	else if(upgraders.current<upgraders.max)
	{
		// try to spawn an upgrader
		spawnCreep("upgrader",spawnPoint);
	}
	else if(builders.current<builders.max)
	{
		// try to spawn an upgrader
		spawnCreep("builder",spawnPoint);
	}
	else if(localTrucks.current<localTrucks.max)
	{
		// try to spawn an upgrader
		spawnCreep("localTruck",spawnPoint);
	}
	else if(thiefs.current<thiefs.max && spawnPoint.memory.spawnThief!=null)
	{
		// try to spawn an upgrader
		spawnCreep("thief",spawnPoint);
	}
	else if(expanders.current<expanders.max && spawnPoint.name=='home')
	{
		// try to spawn an upgrader
		spawnCreep("expander",spawnPoint);
	}
	else if(pilgrims.current<pilgrims.max && spawnPoint.name=='home')
	{
		// try to spawn an upgrader
		spawnCreep("pilgrim",spawnPoint);
	}
}

// Process creep roles and garbage collection
function manageCreeps()
{
	for (var name in Game.creeps)
    {
        var creep = Game.creeps[name];

        // Process all creep roles
        switch(creep.memory.role)
        {
        	case 'localMiner':
        		localMiner.run(creep);
        		break;
        	case 'upgrader':
        		upgrader.run(creep);
        		break;
        	case 'builder':
        		builder.run(creep);
        		break;
        	case 'expander':
        	    expander.run(creep);
        	    break;
        	case 'pilgrim':
        	    pilgrim.run(creep);
        	    break;
        	case 'localTruck':
        	    localTruck.run(creep);
        	    break;
        	case 'thief':
        	    thief.run(creep);
        	    break;
        }
    }
    // Clean up dead
    cleanDeadCreeps();
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
// This or trySpawn needs further optimization
function spawnCreep(type,spawnPoint)
{
	var newCreep;
	if(spawnPoint.memory.creepCount==null)
		{
			spawnPoint.memory.creepCount=0;
		}
		else
	    {
	    	spawnPoint.memory.creepCount+=1;
	    }
	switch(type)
	{
		case "localMiner":
			var creepName = type+spawnPoint.memory.creepCount;
			if(trySpawn(creepName,localMinerBody,spawnPoint))
			{
				newCreep = Game.creeps[creepName];
				newCreep.memory.role="localMiner";
				if(newCreep.memory.source==null)
				{
					newCreep.memory.source = setLocalMinerSource(spawnPoint);
				}
			}
			else
			{
				// Are there any extensions?
				var extCount = spawnPoint.room.find(FIND_STRUCTURES, {
                filter: (i) => (i.structureType==STRUCTURE_EXTENSION)
            });
				if(extCount.length<2)
				{
				    if(trySpawn(creepName,simpleMinerBody,spawnPoint))
	    			{
	    				newCreep = Game.creeps[creepName];
	    				newCreep.memory.role="localMiner";
	    				if(newCreep.memory.source==null)
	    				{
	    					newCreep.memory.source = setLocalMinerSource(spawnPoint);
	    				}
	    			}
    			}
			}
			break;
		case "upgrader":
			var creepName = type+spawnPoint.memory.creepCount;
			if(trySpawn(creepName,localUpgraderBody,spawnPoint))
			{
				newCreep = Game.creeps[creepName];
				newCreep.memory.role="upgrader";
			}
			break;
		case "builder":
			var creepName = type+spawnPoint.memory.creepCount;
			if(trySpawn(creepName,builderBody,spawnPoint))
			{
				newCreep = Game.creeps[creepName];
				newCreep.memory.role="builder";
			}
			break;
		case "localTruck":
			var creepName = type+spawnPoint.memory.creepCount;
			if(trySpawn(creepName,localTruckBody,spawnPoint))
			{
				newCreep = Game.creeps[creepName];
				newCreep.memory.role="localTruck";
			}
			break;
		case "expander":
			var creepName = type+spawnPoint.memory.creepCount;
			if(trySpawn(creepName,expanderBody,spawnPoint))
			{
				newCreep = Game.creeps[creepName];
				newCreep.memory.role="expander";
			}
			break;
		case "thief":
			var creepName = type+spawnPoint.memory.creepCount;
			if(trySpawn(creepName,thiefBody,spawnPoint))
			{
				newCreep = Game.creeps[creepName];
				newCreep.memory.role="thief";
				newCreep.memory.steal="E33N98";
			}
			break;
		case "pilgrim":
			var creepName = type+spawnPoint.memory.creepCount;
			if(trySpawn(creepName,pilgrimBody,spawnPoint))
			{
				newCreep = Game.creeps[creepName];
				newCreep.memory.role="pilgrim";
			}
			break;
	}
}
// This or spawnCreep needs further optimization
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
// This function has been vetted as successful and well optimized!
function setLocalMinerSource(spawnPoint)
{
	var sources = spawnPoint.room.find(FIND_SOURCES);
	var source_spaces = [];
	var creeps_mining = 0;
	var open_spaces = 0;
	var sourceId = null;


	for(var i = 0; i<sources.length; i++)
	{
		// Auto add +1 to a source, always have someone in transit
		source_spaces[i] = checkOpenSpace(sources[i].pos.x, sources[i].pos.y,spawnPoint.room.name) + 1; 
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