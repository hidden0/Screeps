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

// Constant
const HOMEBASE = 'W18S11';

// Creep Roles
var localMiner 		= require("role.localMiner");
var upgrader 		= require("role.upgrader");
var builder 		= require("role.builder");
var mason 			= require("role.mason");
var expander 		= require("role.expander");
var pilgrim 		= require("role.pilgrim");
var localTruck 		= require("role.localTruck");
var thief 			= require("role.thief");
var rangedKiller 	= require("role.rangedKiller");

// Globals

// - Maximum creep counts for automation
var localMiners;
var upgraders;
var builders;
var masons;
var expanders;
var pilgrims;
var localTrucks;
var thiefs;
var rangedKillers;

// - Creep body types
/* Todo 
This needs a major over haul. Over time, this should be scalable as such:

Tier 1: same body type across all creep roles
Tier 2: Same thing, but better now
Tier 3: ditto
Tier 4: population reduction and now using super creeps. This happens when lots of extensions exist.
*/
var roomTier;

// Primary game loop
module.exports.loop = function () {
    // Switching to a room based play - for each room:
    for (var theRoom in Game.rooms)
    {
    	var aRoom = Game.rooms[theRoom];
    	// First time init, only runs *once*
    	if(aRoom.memory.init==null || aRoom.memory.init==false)
    	{
    		init(aRoom);
    	}
    	// Population management - do we need to spawn a creep?
	    populationManager(aRoom);
    	// For the room, handle towers/links
    	// Calculate what towers should do
    	handleTowers(aRoom);
    	// Handle the links
    	handleLinks(aRoom);

    	// Debugging output?
    	if(aRoom.memory.debug!=null)
    	{
    		roomStatsUI(aRoom);
    	}
    }
	// Handle all creeps currently alive
	manageCreeps();
};

// Handles Towers
function handleTowers(aRoom)
{
	// Targetting
	var towers = aRoom.find(
            FIND_MY_STRUCTURES, {filter: {structureType: STRUCTURE_TOWER}});
	var tRepairTargets = aRoom.find(FIND_STRUCTURES, {
                filter: (i) => (i.hits < (i.hitsMax) && (i.structureType!=STRUCTURE_WALL && i.structureType!=STRUCTURE_RAMPART))
            });
	var hostiles = aRoom.find(FIND_HOSTILE_CREEPS);

	// Prioritize hostiles!
    
    if(hostiles.length > 0) 
    {
        var username = hostiles[0].owner.username;
        Game.notify(`User ${username} spotted in room ${aRoom.name}`);
        
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

// Handles Links
function handleLinks(aRoom)
{
	// Base link is always first built link (usually near the storage container)
	var Links = aRoom.find(FIND_STRUCTURES, {
        filter: (i) => ((i.structureType==STRUCTURE_LINK))
    });
    var LinkTargets = aRoom.find(FIND_STRUCTURES, {
        filter: (i) => ((i.structureType==STRUCTURE_LINK)
        		&& (i.energy < i.energyCapacity))
    });
    // Do we have a base link?
    if(Links.length>0)
    {
    	var baseEnergy = Links[0].energy;
    	// Do we have more links to work with?
    	if(Links.length>1)
    	{
    		// Do we have energy to impart to them?
    		var i = 1;
    		var division = Math.round(baseEnergy/(Links.length-1));
    		while(i<=(Links.length-1))
    		{
    		    if(LinkTargets.length)
    		    {
    		        if(Links[i].energy<Links[i].energyCapacity)
    		        {
    			        Links[0].transferEnergy(Links[i]);
    		        }
    		    }
    			i++;
    		}
    	}
    } 
}
// sets up counters and maximums for a room. Should be triggered via spawn memory for room
function init(aRoom)
{
	// Define maximums
	// Max local miners defined by open_spaces + sources_in_room = total_local_miners
	var sources = aRoom.find(FIND_SOURCES);
	var open_spaces = 0;
	roomTier = 0;
	for(var i = 0; i<sources.length; i++)
	{
		open_spaces += checkOpenSpace(sources[i].pos.x, sources[i].pos.y,aRoom)
	}
	console.log(open_spaces);
	localMiners = open_spaces + sources.length; // total miners we should ever have
	console.log(open_spaces + sources.length);
	aRoom.memory.localMinersMax=localMiners;

	// Kill init script
	aRoom.memory.init=true;
}
// Handle the creep population, spawning a creep if necessary
function populationManager(aRoom)
{
	// - # Region: Room based control for population management
	var towers = aRoom.find(FIND_STRUCTURES, {
        filter: (i) => ((i.structureType==STRUCTURE_TOWER))
    });
    var containers = aRoom.find(FIND_STRUCTURES, {
        filter: (i) => ((i.structureType==STRUCTURE_CONTAINER))
    });
    var links = aRoom.find(FIND_STRUCTURES, {
        filter: (i) => ((i.structureType==STRUCTURE_LINK))
    });
    var storageBox = aRoom.find(FIND_STRUCTURES, {
        filter: (i) => ((i.structureType==STRUCTURE_STORAGE))
    });
    var extensions = aRoom.find(FIND_STRUCTURES, {
	    filter: (i) => (i.structureType==STRUCTURE_EXTENSION)
	});
    var defenses = aRoom.find(FIND_STRUCTURES, {
        filter: (i) => ((i.structureType==STRUCTURE_WALL) || (i.structureType==STRUCTURE_RAMPART))
    });
    var spawnsInRoom = aRoom.find(FIND_STRUCTURES, {
	    filter: (i) => (i.structureType==STRUCTURE_SPAWN)
	});
	var sourcesInRoom = aRoom.find(FIND_SOURCES);
	var constructionSitesTotal = aRoom.find(FIND_CONSTRUCTION_SITES);
	// Zero out counters for each creep type
    localMiners 		= {current:0, max:0};
    upgraders 			= {current:0, max:0};
    builders 			= {current:0, max:0};
    masons	 			= {current:0, max:0};
    expanders 			= {current:0, max:0};
    pilgrims 			= {current:0, max:0};
    localTrucks			= {current:0, max:0};
    thiefs			    = {current:0, max:1};
    rangedKillers		= {current:0, max:0};

    // Claim management
    manageExpansion(aRoom);

    var roomTier=0;
    // Tier management * Trial *
    if(extensions.length>10 && links.length>1)
    {
    	roomTier=2;
    	aRoom.memory.roomTier=2;
    }
    if(roomTier<2)
    {
    	// This is the old default behavior up until a room "crosses over"
	    // Set maximums
	    if(aRoom.memory.localMinersMax!=null)
	    {
	    	localMiners.max=aRoom.memory.localMinersMax;
	    }
	    if(aRoom.memory.rangedKillersMax!=null)
	    {
	    	rangedKillers.max=aRoom.memory.rangedKillersMax;
	    }
	    else
	    {
	    	rangedKillers.max=0;
	    }

	    switch(aRoom.controller.level)
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
	    		upgraders.max=3;
	    		builders.max=3;
	    		//upgraders2.max=3;
	    		break;
	    	case 4:
	    		upgraders.max=3;
	    		builders.max=3;
	    		break;
	    	case 5:
	    		upgraders.max=4;
	    		builders.max=3;
	    		break;
	    	default:
	    		upgraders.max=2;
	    		builders.max=3;
	    		break;
	    }
	    // truck management
	    // if there are towers and containers, it's time to have a truck
	    if(towers.length>0 && (containers.length>0 || storageBox.length>0))
	    {
	    	localTrucks.max=1;
	    	if(extensions>10)
	    	{
	    		// one more truck for handling this
	    		localTrucks.max=2;
	    	}
	    }

	    // mason management - are ther ramparts or walls to maintain?
	    if(defenses.length>0)
	    {
	    	masons.max=(Math.round(defenses.length/5));
	    	if(masons.max==0 && defenses.length>0)
	    	{
	    		masons.max=1;
	    	}
	    }

	    // Builder culling
	    if(!constructionSitesTotal.length)
	    {
	        builders.max=0;
	    }
	}
	// Otherwise, we're in a mode where we can just build super creeps
	else
	{
		// Are there any construction sites?
		if(constructionSitesTotal.length>0)
		{
			builders.max=1;
		}
		upgraders.max=3;
		localTrucks.max=1;
		localMiners.max=sourcesInRoom.length*2;
		aRoom.memory.localMinersMax=localMiners.max;
	}
	// population current counts
	// checking room name for current room of spawn being calculated
	// some creeps are global creeps and do not get this check
	regulateCreeps(aRoom);
	// Economy management - go into energy reservation mode if we're below max miners and need energy
	aRoom.memory.energyReserveMode=false;
	var energyCounter = 0;
	energyCounter+=aRoom.energyAvailable;
	if(energyCounter<250)
	{
		if(localMiners.current<localMiners.max)
		{
			aRoom.memory.energyReserveMode=true;
		}
	}
	// - # END Region: Room based control for population management

	// - # Begin Region: Spawn based control - loop through spawns
	for(var aSpawn in Game.spawns)
	{
		var spawnPoint = Game.spawns[aSpawn];
		if(spawnPoint.room.name!=aRoom.name)
		{
			// This spawn is not this room, skip!
			continue;
		}
		// Spawn needed creeps with if/else-if priortization
		if(creepNeeded(localMiners))
		{
			// try to spawn a localMiner
			spawnCreep("localMiner",spawnPoint);
		}
		else if(creepNeeded(builders))
		{
			// try to spawn an upgrader
			spawnCreep("builder",spawnPoint);
		}
		else if(creepNeeded(masons))
		{
			// try to spawn an upgrader
			spawnCreep("mason",spawnPoint);
		}
		else if(creepNeeded(upgraders))
		{
			// try to spawn an upgrader
			spawnCreep("upgrader",spawnPoint);
		}
		else if(creepNeeded(localTrucks))
		{
			// try to spawn an upgrader
			spawnCreep("localTruck",spawnPoint);
		}
		else if(creepNeeded(thiefs) && spawnPoint.memory.spawnThief!=null)
		{
			// try to spawn an upgrader
			spawnCreep("thief",spawnPoint);
		}
		else if(creepNeeded(expanders) && aRoom.name==HOMEBASE)
		{
			// try to spawn an upgrader
			spawnCreep("expander",spawnPoint);
		}
		else if(creepNeeded(pilgrims) && aRoom.name==HOMEBASE)
		{
			// try to spawn an upgrader
			spawnCreep("pilgrim",spawnPoint);
		}
		else if(creepNeeded(rangedKillers) && aRoom.name==HOMEBASE)
		{
			// try to spawn an upgrader
			spawnCreep("rangedKiller",spawnPoint);
		}
	}
}

// Help function for quick pop checks
function regulateCreeps(aRoom)
{
	// This needs to be calc'd on a per-room basis. 
	for (var aCreep in Game.creeps)
    {
        var thisCreep = Game.creeps[aCreep];
        var creepRole = "unknown";
        if(thisCreep.room.name!=aRoom.name)
        {
        	// move to next creep
        	continue;
        }
        if(thisCreep.memory.role!=null)
        {
            creepRole = thisCreep.memory.role;
        }
        switch(creepRole)
        {
            case 'localMiner':
        		localMiners.current++;
        		break;
        	case 'upgrader':
        		upgraders.current++;
        		break;
        	case 'builder':
        		builders.current++;
        		break;
        	case 'mason':
        		masons.current++;
        		break;
        	case 'expander':
        	    expanders.current++;
        	    break;
        	case 'pilgrim':
        	    pilgrims.current++;
        	    break;
        	case 'localTruck':
        	    localTrucks.current++;
        	    break;
        	case 'thief':
        	    thiefs.current++;
        	    break;
        	case 'rangedKiller':
        	    rangedKillers.current++;
        	    break;
        }
    }

    // Output stats
    if(aRoom.memory.debug!=null)
    {
	    var stats = {};
	    stats.localMiners=localMiners;
	    stats.upgraders=upgraders;
	    stats.builders=builders;
	    stats.masons=expanders;
	    stats.pilgrims=pilgrims;
	    stats.localTrucks=localTrucks;
	    stats.thieves=thiefs;
	    stats.rangedKillers=rangedKillers;
	    aRoom.memory.stats=stats;
	}
}

// Another quick current vs max check function
function creepNeeded(popObj)
{
	if(popObj.current < popObj.max)
	{
		return true;
	}
	else
	{
		return false;
	}
}
// Manage expansion of the hive!
function manageExpansion(aRoom)
{
	var claimFlag = null;
    if(aRoom.name==HOMEBASE)
    {
	    for (var flagName in Game.flags)
	    {
	        if(flagName.includes("claim"))
	        {
	            claimFlag=flagName;
	            aRoom.memory.targetRoom=Game.flags[claimFlag].pos.roomName;
	            break;
	        }
	    }

	    if(aRoom.memory.targetRoom!=null)
	    {
	    	var claimTargetRoom = Game.rooms[aRoom.memory.targetRoom];
	    	if(claimTargetRoom!=null)
	    	{
		        var spawnsInRoom = Game.rooms[aRoom.memory.targetRoom].find(FIND_STRUCTURES, {
		                filter: (i) => (i.structureType==STRUCTURE_SPAWN)
		            });
		        var sitesInRoom = Game.rooms[aRoom.memory.targetRoom].find(FIND_CONSTRUCTION_SITES);
		        if(spawnsInRoom.length>0 && sitesInRoom.length<1)
		        {
		            pilgrims.max=0;
		            aRoom.memory.targetRoom=null;
		            Game.flags[claimFlag].remove();
		        }
		        else if(Game.rooms[aRoom.memory.targetRoom].controller.owner.username!="hidden0")
		        {
		            expanders.max=1;
		        }
		        else
		        {
		            pilgrims.max=2;
		        }
	    	}
	    	else
	        {
	            // We know nothing about the room...
	            expanders.max=1;
	        }
	    }
	    else
	    {
	        expanders.max=0;
	        pilgrims.max=0;
	    }
	}
}
// Process creep roles and garbage collection
function manageCreeps()
{
	// Clean up dead
    cleanDeadCreeps();
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
        	case 'mason':
        		mason.run(creep);
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
        	case 'rangedKiller':
        	    rangedKiller.run(creep);
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
			var terrain = Game.map.getTerrainAt(ix,iy,Game.rooms[roomName].name);
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
	var curEnergy = spawnPoint.room.energyAvailable;
	var extCount = spawnPoint.room.find(FIND_STRUCTURES, {
        filter: (i) => (i.structureType==STRUCTURE_EXTENSION)
    });
    var linkCount = spawnPoint.room.find(FIND_STRUCTURES, {
        filter: (i) => (i.structureType==STRUCTURE_LINK)
    });
    var sourceCount = spawnPoint.room.find(FIND_SOURCES);
    var numExtensions = extCount.length;
    var numLinks = linkCount.length;
    var creepBody = bodySelector(type,numExtensions,curEnergy,numLinks,sourceCount,spawnPoint.room.name);
    var roomTier = 0;
    if(spawnPoint.room.memory.roomTier!=null)
    {
    	roomTier=spawnPoint.room.memory.roomTier;
    }
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
		    if(trySpawn(creepName,creepBody,spawnPoint))
			{
				newCreep = Game.creeps[creepName];
				newCreep.memory.role="localMiner";
				if(newCreep.memory.source==null)
				{
					newCreep.memory.source = setLocalMinerSource(spawnPoint);
				}
			}
			break;
		case "upgrader":
			var creepName = type+spawnPoint.memory.creepCount
			if(trySpawn(creepName,creepBody,spawnPoint))
			{
				newCreep = Game.creeps[creepName];
				newCreep.memory.role="upgrader";
			}
			break;
		case "rangedKiller":
			var creepName = type+spawnPoint.memory.creepCount;
			if(trySpawn(creepName,creepBody,spawnPoint))
			{
				newCreep = Game.creeps[creepName];
				newCreep.memory.role="rangedKiller";
			}
			break;
		case "builder":
			var creepName = type+spawnPoint.memory.creepCount;
		    if(trySpawn(creepName,creepBody,spawnPoint))
			{
				newCreep = Game.creeps[creepName];
				newCreep.memory.role="builder";
			}
			break;
		case "mason":
			var creepName = type+spawnPoint.memory.creepCount;
		    if(trySpawn(creepName,creepBody,spawnPoint))
			{
				newCreep = Game.creeps[creepName];
				newCreep.memory.role="mason";
			}
			break;
		case "localTruck":
			var creepName = type+spawnPoint.memory.creepCount;
			if(trySpawn(creepName,creepBody,spawnPoint))
			{
				newCreep = Game.creeps[creepName];
				newCreep.memory.role="localTruck";
			}
			break;
		case "expander":
			var creepName = type+spawnPoint.memory.creepCount;
			if(trySpawn(creepName,creepBody,spawnPoint))
			{
				newCreep = Game.creeps[creepName];
				newCreep.memory.role="expander";
			}
			break;
		case "thief":
			var creepName = type+spawnPoint.memory.creepCount;
			if(trySpawn(creepName,creepBody,spawnPoint))
			{
				newCreep = Game.creeps[creepName];
				newCreep.memory.role="thief";
				newCreep.memory.steal="E33N98";
			}
			break;
		case "pilgrim":
			var creepName = type+spawnPoint.memory.creepCount;
			if(trySpawn(creepName,creepBody,spawnPoint))
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

// This is the function that handles all creep body generation
function bodySelector(type,numExtensions,curEnergy,numLinks,numSources,roomNameBody)
{
	/* Body automation - given the type, number of extensions, and current energy
	it can be calculated how much the cost of a body is and what parts should take precedence
	when generating the body.
	*/
	var potentialEnergy = (numExtensions * 50) + 300; // this is the maximum creep building potential we have at the moment
	var creepTier = 0;
	var body;
	var stats = {};
	if(potentialEnergy>400 && curEnergy>400)
	{
		creepTier = 1; // first increase in tier, we can get more done at this stage
	}
	if(potentialEnergy>600 && numSources.length>1 && curEnergy>600)
	{
		creepTier = 2; // 7 Extensions - we can have a max potential of 650 energy
	}
	if(potentialEnergy>750 && numSources.length>1 && curEnergy>750)
	{
		creepTier = 3; // 10 Extensions - we can have a max potential of 800 energy
	}
	if(potentialEnergy>750 && numLinks>1 && numSources.length>1 && curEnergy>750)
	{
		creepTier = 4; // 10 Extensions - we can have a max potential of 800 energy, and there are base links. Time to beef up.
	}
	//console.log("Creep tier " + creepTier);
	stats.creepTier=creepTier;
	stats.curEnergy=curEnergy;
	stats.curSources=numSources;
	stats.numLinks=numLinks;
	stats.potentialEn=potentialEnergy;
	Game.rooms[roomNameBody].memory.spawnStats=stats;
	// Tiering system per type
	switch(type)
	{
		case "localMiner":
			switch(creepTier)
			{
				// Base room spawn for mining
				case 0:
					body = [WORK, CARRY, MOVE, MOVE];
					break;
				// We've got some extensions and storage to work with
				case 1:
					body = [WORK, WORK, CARRY, CARRY, MOVE];
					break;
				// First real miner that can get economy growing quickly
				case 2:
					body = [WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE];
					break;
				// Long haul miner, drains sources quickly
				case 3:
					body = [WORK, WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];
					break;
				// This miner is intended to work stand-alone and is a bit different than most miners
				// Supported by base links and powerful economy
				case 4:
					body = [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
					break;
				default:
					body = [WORK, CARRY, MOVE, MOVE];
					break;
			}
			break;
		case "upgrader":
			switch(creepTier)
			{
				// Base room spawn for upgrading the controller
				case 0:
					body = [WORK, CARRY, MOVE, MOVE];
					break;
				// We've got some extensions and storage to work with
				case 1:
					body = [WORK, WORK, CARRY, CARRY, MOVE];
					break;
				// First real upgrader that can get controller upgrading quickly
				case 2:
					body = [WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE];
					break;
				// Long haul upgrader, all the GCL!
				case 3:
					body = [WORK, WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE];
					break;
				// This upgrader is intended to work stand-alone and is a bit different than most miners
				// Supported by base links and powerful economy
				case 4:
					body = [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE];
					break;
				default:
					body = [WORK, CARRY, MOVE, MOVE];
					break;
			}
			break;
		case "mason":
			switch(creepTier)
			{
				// Base room spawn for upgrading the controller
				case 0:
					body = [WORK, CARRY, CARRY, MOVE];
					break;
				// We've got some extensions and storage to work with
				case 1:
					body = [WORK, WORK, CARRY, CARRY, MOVE];
					break;
				// First real mason that can get controller upgrading quickly
				case 2:
					body = [WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE];
					break;
				// Long haul mason, all the GCL!
				case 3:
					body = [WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE];
					break;
				// This mason is intended to work stand-alone and is a bit different than most miners
				// Supported by base links and powerful economy
				case 4:
					body = [WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE];
					break;
				default:
					body = [WORK, CARRY, MOVE, MOVE];
					break;
			}
			break;
		case "builder":
			switch(creepTier)
			{
				// Base room spawn for upgrading the controller
				case 0:
					body = [WORK, CARRY, CARRY, MOVE];
					break;
				// We've got some extensions and storage to work with
				case 1:
					body = [WORK, WORK, CARRY, CARRY, MOVE];
					break;
				// First real builder that can get controller upgrading quickly
				case 2:
					body = [WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE];
					break;
				// Long haul builder, all the GCL!
				case 3:
					body = [WORK, WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE];
					break;
				// This builder is intended to work stand-alone and is a bit different than most miners
				// Supported by base links and powerful economy
				case 4:
					body = [WORK, WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE];
					break;
				default:
					body = [WORK, CARRY, MOVE, MOVE];
					break;
			}
			break;
		case "expander":
			switch(creepTier)
			{
				// Base room spawn for upgrading the controller
				default:
					body = [CLAIM, MOVE, MOVE, MOVE, MOVE];
					break;
			}
			break;
		case "rangedKiller":
			switch(creepTier)
			{
				// Base room spawn for upgrading the controller
				default:
					body = [RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, WORK, CARRY];
					break;
			}
			break;
		case "thief":
			switch(creepTier)
			{
				// Base room spawn for upgrading the controller
				default:
					body = [MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY];
					break;
			}
			break;
		case "localTruck":
			switch(creepTier)
			{
				// Base room spawn for upgrading the controller
				default:
					body = [MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY];
					break;
			}
			break;
		case "pilgrim":
			switch(creepTier)
			{
				// Base room spawn for upgrading the controller
				default:
					body = [MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, WORK, WORK, WORK, WORK];
					break;
			}
			break;
	}
	//console.log(costCalculator(body));
	return body;
}
// Calculates cost of creep spawn
function costCalculator(body)
{
	var theCost = 0;
	var bodyCost = {};

	bodyCost.work = 100;
	bodyCost.move = 50;
	bodyCost.carry = 50;
	bodyCost.attack = 80;
	bodyCost.rangedAttack = 150;
	bodyCost.heal = 250;
	bodyCost.claim = 600;
	bodyCost.tough = 10;

	for(var i=0; i<body.length; i++)
	{
		switch(body[i])
		{
			case WORK:
				theCost+=bodyCost.work;
				break;
			case MOVE:
				theCost+=bodyCost.move;
				break;
			case CARRY:
				theCost+=bodyCost.carry;
				break;
			case ATTACK:
				theCost+=bodyCost.attack;
				break;
			case RANGED_ATTACK:
				theCost+=bodyCost.rangedAttack;
				break;
			case HEAL:
				theCost+=bodyCost.heal;
				break;
			case CLAIM:
				theCost+=bodyCost.claim;
				break;
			case TOUGH:
				theCost+=bodyCost.tough;
				break;
		}
	}

	return theCost;
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
	console.log("Sources: " + sources.length);

	for(var i = 0; i<sources.length; i++)
	{
		// Auto add +1 to a source, always have someone in transit
		source_spaces[i] = checkOpenSpace(sources[i].pos.x, sources[i].pos.y,spawnPoint.room.name) + 1; 
		console.log(source_spaces[i]);
		open_spaces += source_spaces[i];
	}
	console.log("Open spaces: " + open_spaces);
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

// Prints room stats to the screen for easy debugging
function roomStatsUI(aRoom)
{
	// For each room containing an "output" flag...
	var outputFlag = null;
    for (var flagName in Game.flags)
    {
        if(flagName.includes("output") && Game.flags[flagName].room.name==aRoom.name)
        {
            aRoom.memory.debugOutput=flagName;
            break;
        }
    }

    if(aRoom.memory.debugOutput!=null)
    {
    	var outputFlagTarget = Game.flags[aRoom.memory.debugOutput];
    	if(outputFlagTarget!=null)
    	{
	        // Draw the debug window
	        debugWindow(outputFlagTarget.pos.x,outputFlagTarget.pos.y,aRoom.name);
    	}
    }
}

// Pass output flag position coordinates to this function, and print debug output to the room UI
function debugWindow(originX,originY,roomName)
{
	// Stats
	var stats = {};
	var creepTier;
	var spawnStats = {};
	if(Game.rooms[roomName].memory.stats!=null)
	{
		stats = Game.rooms[roomName].memory.stats;
		spawnStats = Game.rooms[roomName].memory.spawnStats;
	}
	// Shapes
	new RoomVisual(roomName).rect(originX-5, originY-3, 10, 5, {fill: '#fff', opacity: '1', stroke: '#f00'});

	// Text
	var roomEnergy = Game.rooms[roomName].energyAvailable;
	var minersTxt = "Miners Max: " + stats.localMiners.max + "\t\tMiners now: " + stats.localMiners.current;
	new RoomVisual(roomName).text(minersTxt, originX-1.5, originY-2.5, {color: 'green', font: 0.5});
	var upgradersTxt = "Upgraders Max: " + stats.upgraders.max + "\t\tUpgraders now: " + stats.upgraders.current;
	new RoomVisual(roomName).text(upgradersTxt, originX-0.63, originY-2.0, {color: 'green', font: 0.5});
	var buildersTxt = "Builders Max: " + stats.builders.max + "\t\tBuilders now: " + stats.builders.current;
	new RoomVisual(roomName).text(buildersTxt, originX-1.195, originY-1.5, {color: 'green', font: 0.5});
	var trucksTxt = "Trucks Max: " + stats.localTrucks.max + "\t\tTrucks now: " + stats.localTrucks.current;
	new RoomVisual(roomName).text(trucksTxt, originX-1.5, originY-1, {color: 'green', font: 0.5});

	var energyStats = "Energy available in room: " + roomEnergy;
	new RoomVisual(roomName).text(energyStats, originX-1.5, originY, {color: 'blue', font: 0.5});

	var creepTierStats = "Room creep tier: " + spawnStats.creepTier;
	new RoomVisual(roomName).text(creepTierStats, originX-2.88, originY+0.5, {color: 'blue', font: 0.5});

	var curEnergyTxt = "LastCurEnergy: " + spawnStats.curEnergy;
	new RoomVisual(roomName).text(curEnergyTxt, originX, originY+1, {color: 'blue', font: 0.5});

	var linksSourcesTxt = "Sources: " + spawnStats.curSources.length + " Links: " + spawnStats.numLinks + " Potential: " + spawnStats.potentialEn;
	new RoomVisual(roomName).text(linksSourcesTxt, originX, originY+1.5, {color: 'blue', font: 0.5});
}