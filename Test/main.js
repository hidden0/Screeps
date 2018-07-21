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
const HOMEBASE = 'W18S15';
const USERNAME = 'hidden0';

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
var spawnList;
var potentialEnergy;
var creepTier;
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

    if(spawnList==null)
    {
    	spawnList = new Array();
    }
    for (var theRoom in Game.rooms)
    {
    	var aRoom = Game.rooms[theRoom];
    	if(aRoom.controller!=null)
    	{
        	if(aRoom.controller.owner!=null)
        	{
        		if(aRoom.controller.owner.username==USERNAME)
        		{
        			// First time init, only runs *once*
    		    	if(aRoom.memory.init==null || aRoom.memory.init==false)
    		    	{
    		    		init(aRoom);
    		    	}
    		    	// Build stuff?
    		    	handleConstruction(aRoom);
    		    	// Population management - do we need to spawn a creep?
    			    populationManager(aRoom);
    		    	// For the room, handle towers/links
    		    	handleTowers(aRoom);
    		    	// Handle the links
    		    	handleLinks(aRoom);
    		        // Handle reserved rooms and remote mining ops
    		        var foundReserved = false;
    		        if(aRoom.controller!=null)
    		        {
    		            if(aRoom.controller.reservation!=null)
    		            {
    		    	        if(aRoom.controller.reservation.username==USERNAME)
    		    	        {
    		    	        	foundReserved=true;
    		    	            handleReservedRooms(aRoom);
    		    	        }
    		            }
    		        }
    		    	// Debugging output?
    		    	if(aRoom.memory.debug!=null)
    		    	{
    		    		roomStatsUI(aRoom);
    		    	}
        		}
        	}
        	else
        	{
        		continue;
        	}
    	}
    }
    if(!foundReserved)
    {
    	Game.rooms[HOMEBASE].memory.reservedRooms=null;
    }
	// Handle all creeps currently alive
	manageCreeps();
};

// Automate construction if it makes sense to
function handleConstruction(aRoom)
{
	var constructCoolDown = 5000;
	var conSites = 0;
	var containerEnergy = 0;
    var storageBoxEnergy = 0;
    var buildX = 0;
    var buildY = 0;
    var origin = null;

    var containers = aRoom.find(FIND_STRUCTURES, {
        filter: (i) => ((i.structureType==STRUCTURE_CONTAINER))
    });
    var storageBox = aRoom.find(FIND_STRUCTURES, {
        filter: (i) => ((i.structureType==STRUCTURE_STORAGE))
    });
    var extensions = aRoom.find(FIND_STRUCTURES, {
	    filter: (i) => (i.structureType==STRUCTURE_EXTENSION)
	});
	var spawns = aRoom.find(FIND_STRUCTURES, {
	    filter: (i) => (i.structureType==STRUCTURE_SPAWN)
	});
	if(!spawns.length)
	{
		return;
	}
	var sourcesInRoom = aRoom.find(FIND_SOURCES);
	var constructionSitesTotal = aRoom.find(FIND_CONSTRUCTION_SITES);
    for (var i=0; i<containers.length; i++)
    {
    	containerEnergy+=containers[i].store['energy'];
    }
    if(storageBox.length)
    {
    	storageBoxEnergy = storageBox[0].store['energy'];
    }
    var totalEnergy = aRoom.energyAvailable + containerEnergy + storageBoxEnergy;

    var maxStructs = {
    	extensions:{ current: extensions.length, max: 0 },
    	containers:{ current: containers.length, max: 5 },
    	storage: { current: storageBox.length, max: 1 },
    	spawn: { current: spawns.length, max: 0}
    };

    switch(aRoom.controller.level)
    {
    	case 1:
    		maxStructs.extensions.max=0;
    		maxStructs.spawn.max=1;
    		break;
    	case 2:
    		maxStructs.extensions.max=5;
    		maxStructs.spawn.max=1;
    		break;
    	case 3:
    		maxStructs.extensions.max=10;
    		maxStructs.spawn.max=1;
    		break;
    	case 4:
    		maxStructs.extensions.max=20;
    		maxStructs.spawn.max=1;
    		break;
    	case 5:
    		maxStructs.extensions.max=30;
    		maxStructs.spawn.max=1;
    		break;
    	case 6:
    		maxStructs.extensions.max=40;
    		maxStructs.spawn.max=1;
    		break;
    	case 7:
    		maxStructs.extensions.max=50;
    		maxStructs.spawn.max=2;
    		break;
    	case 8:
    		maxStructs.extensions.max=60;
    		maxStructs.spawn.max=3;
    		break;
    }
    // Set spawn 1 origin
    origin=spawns[0];
    targetLoc = { x: 0, y: 0 };
    if(aRoom.memory.coolDown!=null)
    {
    	if(aRoom.memory.coolDown>constructCoolDown)
    	{
    		aRoom.memory.building=false;
    		aRoom.memory.coolDown=0;
    	}
    	else
    	{
    		aRoom.memory.building=true;
    		aRoom.memory.coolDown++;
    	}
    }
	else
	{
		aRoom.memory.building=false;
	}
    if(!aRoom.memory.building)
    {
	    if(maxStructs.containers.current==0)
	    {
	    	// Build the first container
	    	targetLoc.x=origin.pos.x;
	    	targetLoc.y=origin.pos.y+2;
	    	aRoom.createConstructionSite(targetLoc.x,targetLoc.y,STRUCTURE_CONTAINER);
	    	aRoom.memory.building=true;
	    }
	    else
	    {
	    	// Build one extension at a time
	    	if(maxStructs.extensions.current<maxStructs.extensions.max && containers[0].store['energy']>1500)
	    	{
	    		if(maxStructs.extensions.current==0)
	    		{
	    			targetLoc.x=origin.pos.x-5;
	    			targetLoc.y=origin.pos.y-1;
	    		}
	    		else if(maxStructs.extensions.current>=1 && maxStructs.extensions.current<6)
	    		{
	    			var lastExt = extensions[extensions.length-1];
	    			targetLoc.x=lastExt.pos.x+2;
	    			targetLoc.y=lastExt.pos.y;
	    		}
	    		else if(maxStructs.extensions.current==6)
	    		{
	    			var firstExt = extensions[0];
	    			targetLoc.x=firstExt.pos.x;
	    			targetLoc.y=firstExt.pos.y+4;
	    		}
	    		else if(maxStructs.extensions.current>=7 && maxStructs.extensions.current<11)
	    		{
	    			var lastExt = extensions[extensions.length];
	    			targetLoc.x=lastExt.pos.x+2;
	    			targetLoc.y=lastExt.pos.y;
	    		}
	    		aRoom.createConstructionSite(targetLoc.x,targetLoc.y,STRUCTURE_EXTENSION);
	    	}
	    }
	    if(aRoom.memory.coolDown==null)
	    {
	    	aRoom.memory.coolDown=0;
	    }
	}
}
// Handle remote reserved rooms and mining ops
function handleReservedRooms(aRoom)
{
	// Add this to the list of remote rooms for home base to track
	var remoteRoom = aRoom.name;
	var homeBase = Game.rooms[HOMEBASE];
	var roomList = null;
	// Is it part of the list already?
	if(homeBase.memory.reservedRooms==null)
	{
		homeBase.memory.reservedRooms=remoteRoom;
	}
	else
	{
		// Check the whole string to see if the room is in the list already
		roomList = homeBase.memory.reservedRooms.split(",");
		if(roomList.length)
		{
			var i = 0;
			var found = false;
			while(i<roomList.length)
			{
				if(roomList[i]==remoteRoom)
				{
					found=true;
					break;
				}
				i++;
			}
		}
		if(!found)
		{
			homeBase.memory.reservedRooms+="," + remoteRoom;
		}
	}
	// At this point we know all reserved rooms and that is all this function needs to do.
}

// Handles Towers
function handleTowers(aRoom)
{
	// Targetting
	var towers = aRoom.find(
            FIND_MY_STRUCTURES, {filter: {structureType: STRUCTURE_TOWER}});
	var tRepairTargets = aRoom.find(FIND_STRUCTURES, {
                filter: (i) => (i.hits < (i.hitsMax))
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
            if(towers[i].energy>200 && tRepairTargets.length)
            {
                var threshold = tRepairTargets[0].hitsMax;
                // Get lowest health structure
                var weakestStructure = findWeakest(tRepairTargets); // returns an integer representing the array index of weakest structure
                if(tRepairTargets[weakestStructure].structureType==STRUCTURE_RAMPART || tRepairTargets[weakestStructure].structureType==STRUCTURE_WALL)
                {
                    threshold = 2000;
                    if(towers[i].room.memory.wallStr!=null)
                    {
                        threshold=towers[i].room.memory.wallStr;   
                    }
                }
                if(tRepairTargets[weakestStructure].hits<threshold)
                {
                    towers[i].repair(tRepairTargets[weakestStructure]);
                }
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
    	var base = null;
    	// Find the base link. Identified by aRoom.memory.base=true
    	if(aRoom.memory.base!=null)
    	{
    		base = Game.getObjectById(aRoom.memory.base);
    	}
    	if(base!=null)
    	{
	    	var baseEnergy = base.energy;
	    	// Do we have more links to work with?
	    	if(Links.length>0)
	    	{
	    		// Do we have energy to impart to them?
	    		var i = 0;
	    		var division = Math.round(baseEnergy/(Links.length-1));
	    		while(i<Links.length)
	    		{
	    		    if(LinkTargets.length && Links[i].id!=base.id)
	    		    {
	    		        if(Links[i].energy<Links[i].energyCapacity)
	    		        {
	    			        base.transferEnergy(Links[i]);
	    		        }
	    		    }
	    			i++;
	    		}
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
	var pad = 3;
	if(aRoom.memory.tier!=null)
	{
		switch(true)
		{
			case (aRoom.memory.tier==0):
				pad=2;
				break;
			case (aRoom.memory.tier==1):
				pad=2;
				break;
			case (aRoom.memory.tier==2):
				pad=2;
				break;
			case (aRoom.memory.tier>=3):
				pad=1;
				break;
		}
	}
	var tier = 0;
	if(aRoom.memory.tier!=null)
	{
	    tier = aRoom.memory.tier;
	}
	for(var i = 0; i<sources.length; i++)
	{
		open_spaces += checkOpenSpace(sources[i].pos.x, sources[i].pos.y,aRoom.name)
	}
	localMiners = open_spaces + sources.length + pad; // total miners we should ever have
	if(localMiners>7)
	{
	    localMiners=7;
	}
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
    // population current counts

    // Check new miner maxims
    potentialEnergy = (extensions.length * 50) + 300; // this is the maximum creep building potential we have at the moment
    if(aRoom.memory.tier!=null)
    {
    	creepTier=aRoom.memory.tier;
    }
    else
    {
    	creepTier=0;
    }
    if(aRoom.memory.tierHold==null && aRoom.memory.tierTickCount==null)
    {
    	aRoom.memory.tierHold=75; // ticks to hold creep tier
    	aRoom.memory.tierTickCount=0; // current tick
    }
	if(extensions.length>=5 && extensions.length <=8 && aRoom.memory.tierTickCount>aRoom.memory.tierHold)
	{
		creepTier = 1; // first increase in tier, we can get more done at this stage
		if(aRoom.memory.tier!=null)
		{
			aRoom.memory.init=false;
		}
		aRoom.memory.tierTickCount=0;
	}
	else if(extensions.length>=9 && extensions.length <=14 && aRoom.memory.tierTickCount>aRoom.memory.tierHold)
	{
		creepTier = 2; // 7 Extensions - we can have a max potential of 650 energy
		// bonus round
		if(!constructionSitesTotal.length && extensions.length >=12)
		{
			creepTier=3;
		}
		if(aRoom.memory.tier!=null)
		{
			aRoom.memory.init=false;
		}
		aRoom.memory.tierTickCount=0;
	}
	else if(extensions.length>=15 && extensions.length<=19 && aRoom.memory.tierTickCount>aRoom.memory.tierHold)
	{
		creepTier = 3; // 10 Extensions - we can have a max potential of 800 energy
		if(aRoom.memory.tier!=null)
		{
			aRoom.memory.init=false;
		}
		aRoom.memory.tierTickCount=0;
	}
	else if(extensions.length>=20 && links.length>1 && sourcesInRoom.length>1 && aRoom.energyAvailable>1200 && aRoom.memory.tierTickCount>aRoom.memory.tierHold)
	{
		creepTier = 4; // 10 Extensions - we can have a max potential of 800 energy, and there are base links. Time to beef up.
		aRoom.memory.localMinersMax=2; // one per source
		aRoom.memory.tierTickCount=0;
	}
	else if(extensions.length>=20)
	{
		creepTier = 3; // 10 Extensions - we can have a max potential of 800 energy
		if(aRoom.memory.tier!=null)
		{
			aRoom.memory.init=false;
		}
		aRoom.memory.tierTickCount=0;
	}
	aRoom.memory.tier=creepTier;
	// Increment tick count
	aRoom.memory.tierTickCount++;
	// checking room name for current room of spawn being calculated
	// some creeps are global creeps and do not get this check
	regulateCreeps(aRoom);
    // Claim management
    var claimFlag = null;
    if(aRoom.name==HOMEBASE)
    {
	    for (var flagName in Game.flags)
	    {
	        if(flagName.includes("claim") || flagName.includes("reserve"))
	        {
	            claimFlag=flagName;
	            aRoom.memory.targetRoom=Game.flags[claimFlag].pos.roomName;
	            if(flagName.includes("reserve"))
	            {
	            	aRoom.memory.targetAction="reserve";
	            }
	            else if(flagName.includes("claim"))
	            {
	            	aRoom.memory.targetAction="claim";
	            }
	            break;
	        }
	        else
            {
            	aRoom.memory.targetAction=null;
            	aRoom.memory.targetRoom=null;
            }
	    }

	    if(aRoom.memory.targetRoom!=null)
	    {
	    	var claimTargetRoom = Game.rooms[aRoom.memory.targetRoom];
	    	if(claimTargetRoom!=null)
	    	{
		        var spawnsInRoom = Game.rooms[aRoom.memory.targetRoom].find(FIND_STRUCTURES, {
		                filter: (i) => (i.structureType==STRUCTURE_SPAWN && i.owner.username==USERNAME)
		            });
		        var sitesInRoom = Game.rooms[aRoom.memory.targetRoom].find(FIND_CONSTRUCTION_SITES);
		        if(spawnsInRoom.length>0 && sitesInRoom.length<1)
		        {
		            pilgrims.max=0;
		            aRoom.memory.targetRoom=null;
		            Game.flags[claimFlag].remove();
		        }
		        else if(Game.rooms[aRoom.memory.targetRoom].controller.owner==null)
		        {
		            expanders.max=1;
		        }
		        else if(Game.rooms[aRoom.memory.targetRoom].controller.owner.username!=null)
		        {
		            if(Game.rooms[aRoom.memory.targetRoom].controller.owner.username!=USERNAME)
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

    // Set maximums
    if(aRoom.memory.localMinersMax!=null)
    {
    	localMiners.max=aRoom.memory.localMinersMax;
    }
    if(aRoom.memory.localMinersMaxOverride!=null)
    {
        localMiners.max=aRoom.memory.localMinersMaxOverride;
    }
    if(aRoom.memory.rangedKillersMax!=null)
    {
    	rangedKillers.max=aRoom.memory.rangedKillersMax;
    }
    else
    {
    	rangedKillers.max=0;
    }
    
    var containerEnergy = 0;
    var storageBoxEnergy = 0;
    var extEnergy = 0;
    for (var i=0; i<containers.length; i++)
    {
    	containerEnergy+=containers[i].store['energy'];
    }
    for (var i=0; i<extensions.length; i++)
    {
    	extEnergy+=extensions[i].energy;
    }
    if(storageBox.length)
    {
    	storageBoxEnergy = storageBox[0].store['energy'];
    }
    var totalEnergy = aRoom.energyAvailable + containerEnergy + storageBoxEnergy;
    var totalEnergyU = totalEnergy - extEnergy;
    // Upgraders maxim set by available energy to dump into points
    if(totalEnergyU>=500 && totalEnergyU<=1500)
    {
    	upgraders.max=1;
    }
    else if(totalEnergyU>=1501 && totalEnergyU<=4000)
    {
    	upgraders.max=2;
    }
    else if(totalEnergyU>=4001 && totalEnergyU<=5500)
    {
    	upgraders.max=3;
    }
    else if(totalEnergyU>=5501 && totalEnergyU<=10000)
    {
    	upgraders.max=4;
    }
    else if(totalEnergyU>=10001)
    {
    	upgraders.max=4;
    }
    else if(aRoom.controller.level==1)
    {
    	upgraders.max=1;
    }
    else
    {
    	upgraders.max=0;
    }

    // Builder maxim set by same as upgraders with different ranges
    if(totalEnergyU>=200 && totalEnergyU<=1000)
    {
    	builders.max=1;
    }
    else if(totalEnergyU>=1001 && totalEnergyU<=6000)
    {
    	builders.max=2;
    }
    else if(totalEnergyU>=6001)
    {
    	builders.max=3;
    }
    else
    {
    	builders.max=0;
    }
    // truck management
    // if there are towers and containers, it's time to have a truck
    if(towers.length>0 && (containers.length>0 || storageBox.length>0))
    {
    	localTrucks.max=1;
    	if(extensions.length>20)
    	{
    		// one more truck for handling this
    		localTrucks.max=2;
    	}
    }

    // mason management - are ther ramparts or walls to maintain?
    if(defenses.length>0)
    {
    	masons.max=1;
    }

    // Builder culling
    if(!constructionSitesTotal.length)
    {
        builders.max=0;
    }
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
        if(thisCreep.memory.role!=null)
        {
            creepRole = thisCreep.memory.role;
        }
        // exceptions to rule of per-room - expanders / pilgrims / remote-miners
        if(creepRole!="unknown" && creepRole!="expander" && creepRole!="pilgrim")
        {
            if(thisCreep.room.name!=aRoom.name)
            {
            	// move to next creep
            	continue;
            }
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
function checkOpenSpace(xpos,ypos,roomName1)
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
			var terrain = Game.map.getTerrainAt(ix,iy,roomName1);
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
	if(spawnPoint.spawning==null)
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
	    var spawnNumber = spawnPoint.name[spawnPoint.name.length-1];
		switch(type)
		{
			case "localMiner":
				var creepName = "Miner_T"+creepTier+"_S"+spawnNumber+"_"+spawnPoint.memory.creepCount;
			    if(trySpawn(creepName,creepBody,spawnPoint))
				{
					newCreep = Game.creeps[creepName];
					newCreep.memory.role="localMiner";
					// Run a check to see if we're at creep tier 4 and the 2 miners should be spread out evenly
	        		if(creepTier>=4 && aRoom.memory.localMinersMax==2)
	        		{
	        			if(creep.memory.source==null)
	        			{
		        			var sourcesInRoom = aRoom.find(FIND_SOURCES);
		        			if(aRoom.memory.sourceAssignment==null)
		        			{
		        				aRoom.memory.sourceAssignment = sourcesInRoom[0].id;
		        				creep.memory.source=sourcesInRoom[0].id;
		        			}
		        			else
		        			{
		        				creep.memory.source=sourcesInRoom[1].id;
		        				aRoom.memory.sourceAssignment=null;
		        			}
	        			}
	        		}
					if(newCreep.memory.source==null)
					{
						newCreep.memory.source = setLocalMinerSource(spawnPoint);
					}
				}
				break;
			case "upgrader":
				var creepName = "Upgrader_T"+creepTier+"_S"+spawnNumber+"_"+spawnPoint.memory.creepCount
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
				var creepName = "Builder_T"+creepTier+"_S"+spawnNumber+"_"+spawnPoint.memory.creepCount;
			    if(trySpawn(creepName,creepBody,spawnPoint))
				{
					newCreep = Game.creeps[creepName];
					newCreep.memory.role="builder";
					newCreep.memory.reuseVal=10;
				}
				break;
			case "mason":
				var creepName = type+spawnPoint.memory.creepCount;
			    if(trySpawn(creepName,creepBody,spawnPoint))
				{
					newCreep = Game.creeps[creepName];
					newCreep.memory.role="mason";
					newCreep.memory.reuseVal=10;
				}
				break;
			case "localTruck":
				var creepName = "Truck_T"+creepTier+"_S"+spawnNumber+"_"+spawnPoint.memory.creepCount;
				if(trySpawn(creepName,creepBody,spawnPoint))
				{
					newCreep = Game.creeps[creepName];
					newCreep.memory.role="localTruck";
					newCreep.memory.reuseVal=20;
				}
				break;
			case "expander":
				var creepName = type+spawnPoint.memory.creepCount;
				if(trySpawn(creepName,creepBody,spawnPoint))
				{
					newCreep = Game.creeps[creepName];
					newCreep.memory.role="expander";
					newCreep.memory.reuseVal=25;
				}
				break;
			case "thief":
				var creepName = type+spawnPoint.memory.creepCount;
				if(trySpawn(creepName,creepBody,spawnPoint))
				{
					newCreep = Game.creeps[creepName];
					newCreep.memory.role="thief";
					newCreep.memory.steal="E33N98";
					newCreep.memory.reuseVal=25;
				}
				break;
			case "pilgrim":
				var creepName = type+spawnPoint.memory.creepCount;
				if(trySpawn(creepName,creepBody,spawnPoint))
				{
					newCreep = Game.creeps[creepName];
					newCreep.memory.role="pilgrim";
					newCreep.memory.reuseVal=25;
				}
				break;
		}
	}
}
// This or spawnCreep needs further optimization
function trySpawn(name,body,spawnPoint)
{
    console.log("Trying Spawn");
	if(spawnPoint.memory.failCount!=null)
	{
		if(spawnPoint.memory.failCount>100)
		{
			// spawn basic miner
			body = [WORK, CARRY, MOVE, MOVE];
		}
	}
	var result = spawnPoint.canCreateCreep(body, name);
	if(result == OK) {
	    spawnPoint.createCreep(body, name);
	    spawnPoint.memory.failCount=0;
	    return true;
	}
	else if(result!=ERR_BUSY)
	{
		//console.log("Error spawning " + name + ":" + result);
		if(spawnPoint.memory.failCount==null)
		{
			spawnPoint.memory.failCount=0;
		}
		else
		{
			spawnPoint.memory.failCount++;
		}
		return false;
	}
	else
	{
		if(spawnPoint.memory.failCount==null)
		{
			spawnPoint.memory.failCount=0;
		}
		else
		{
			spawnPoint.memory.failCount++;
		}
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
	var body;
	var stats = {};

	//console.log("Creep tier " + creepTier);
	stats.creepTier=creepTier;
	stats.curEnergy=curEnergy;
	stats.curSources=numSources;
	stats.numLinks=numLinks;
	stats.potentialEn=potentialEnergy;
	Game.rooms[roomNameBody].memory.spawnStats=stats;
	// Tiering system per type
	/*
	work = 100
	move/carry = 50
	claim = 600
	tough = 10
	attack = 80
	*/
	switch(type)
	{
		case "localMiner":
			switch(true)
			{
				// Base room spawn for mining
				// cost = 250 : extensions 5
				case (creepTier==0):
					body = [WORK, CARRY, MOVE, MOVE];
					break;
				// We've got some extensions and storage to work with
				// cost = 250 : extensions 5
				case (creepTier==1):
					body = [WORK, CARRY, CARRY, MOVE];
					break;
				// First real miner that can get economy growing quickly
				// cost = 450 : extensions 9
				case (creepTier==2):
					body = [WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE];
					break;
				// Long haul miner, drains sources quickly
				// cost = 800 : extensions 16
				case (creepTier>=3):
					body = [WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];
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
					body = [WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE];
					break;
				// This upgrader is intended to work stand-alone and is a bit different than most miners
				// Supported by base links and powerful economy
				case 4:
					body = [WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE];
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
					body = [WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];
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
					if(Game.rooms[HOMEBASE].memory.targetRoom!=null)
					{
						if(Game.rooms[HOMEBASE].memory.targetAction=="reserve")
						{
							body = [CLAIM, CLAIM, CLAIM, CLAIM, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
						}
					}						
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
				case 3:
					body = [MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY];
					break;
				case 4:
					body = [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY];
					break;
				// Base room spawn for upgrading the controller
				default:
					body = [MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY];
					break;
			}
			break;
		case "pilgrim":
			switch(true)
			{
				case (creepTier>=0 && creepTier<=3):
					body = [CARRY,CARRY,CARRY,CARRY,WORK,WORK,WORK,WORK,MOVE,MOVE,MOVE,MOVE];
					break;
				case (creepTier==4):
					body = [CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,CARRY,WORK,WORK,WORK,MOVE,MOVE,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE];
					break;
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

	if(sourceId==null)
	{
		// choose a random one
		var rand = Math.floor(Math.random() * sources.length);
		sourceId = sources[rand].id;
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

	var creepTierStats = "Room creep tier: " + Game.rooms[roomName].memory.tier;
	new RoomVisual(roomName).text(creepTierStats, originX-2.88, originY+0.5, {color: 'blue', font: 0.5});

	var curEnergyTxt = "LastCurEnergy: " + spawnStats.curEnergy;
	new RoomVisual(roomName).text(curEnergyTxt, originX, originY+1, {color: 'blue', font: 0.5});

	var linksSourcesTxt = "Sources: " + spawnStats.curSources.length + " Links: " + spawnStats.numLinks + " Potential: " + spawnStats.potentialEn;
	new RoomVisual(roomName).text(linksSourcesTxt, originX, originY+1.5, {color: 'blue', font: 0.5});
}

// A function to find the lowest health object to repair given an array of structures
function findWeakest(structuresList)
{
    var i = 0;
    var winner = 0;
    var memHits = 100000000;
    var newMemHits = 0;
    while (i<structuresList.length)
    {
        newMemHits = structuresList[i].hits;
        if(newMemHits<memHits)
        {
            memHits=newMemHits;
            winner=i;
            
        }
        i++;
    }
    return winner;
}