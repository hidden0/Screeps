var miningRole = require("role.miner");
var controllerRole = require("role.controller");
var buildRole = require("role.builder");
var supplyRole = require("role.supply");
var expandRole = require("role.expand");

// Maximum creep counts for automation
var miners;
var controllers;
var builders;
var suppliers;

var creepId;

/* Creep body definitions */
var basicCreepBody = [WORK, CARRY, MOVE];
var l2CreepBody = [WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE];
var l2SupplyBody= [CARRY,CARRY,CARRY,CARRY,MOVE,MOVE];
var l2MinerBody = [WORK,WORK,WORK,MOVE,CARRY,CARRY,MOVE];
var l2BuilderBody = [WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE,MOVE];
var l2ControllerBody = [WORK,WORK,WORK,WORK,CARRY,MOVE,MOVE];
var expanderBody = [CLAIM,MOVE,MOVE,MOVE,MOVE,MOVE];

module.exports.loop = function () {
	// Added: For multiple room logic
	// -- Is this necessary per how the game logic works?
	for (var mySpawn in Game.spawns)
	{
		// Can any of this be skipped after an initial run?
		var liveSpawn = Game.spawns[mySpawn];
	    // Init checks for loop start
	    init(liveSpawn); // Maybe skippable?
	    // Handle creeps
	    manageCreeps(liveSpawn); // NEEDED
	    // Handle memory for spawn
	    handleSpawnMemory(liveSpawn); // Skippable most of the time
	    // Tell towers what to do
	    handleTowers(liveSpawn); // NEEDED
	}
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
        Game.notify(`User ${username} spotted in room ${theSpawn.roomName}`);
        
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
function handleSpawnMemory(theSpawn)
{
    theSpawn.memory.optimalMiners=miners.max;
    if(theSpawn.memory.command!=null)
    {
        var command = theSpawn.memory.command;
        switch(command)
        {
        	case "spawnController":
        		spawnCreep("controller",theSpawn);
            	theSpawn.memory.command=null;
        		break;
        	case "spawnController2":
        		spawnCreep("controller2",theSpawn);
            	theSpawn.memory.command=null;
        		break;
        	case "spawnMiner":
        		spawnCreep("miner",theSpawn);
            	theSpawn.memory.command=null;
        		break;
        	case "spawnMiner2":
        		spawnCreep("miner2",theSpawn);
            	theSpawn.memory.command=null;
        		break;
        	case "spawnBuilder":
        		spawnCreep("builder",theSpawn);
            	theSpawn.memory.command=null;
        		break;
        	case "spawnBuilder2":
        		spawnCreep("builder2",theSpawn);
            	theSpawn.memory.command=null;
        		break;
        	case "spawnSupply":
        		spawnCreep("supply",theSpawn);
            	theSpawn.memory.command=null;
        		break;
        	case "spawnExpansion":
        		spawnCreep("expand",theSpawn);
            	theSpawn.memory.command=null;
        		break;
        	default:
        		theSpawn.memory.command=null;
        		break;
        }
    }
}

function trySpawn(name,body,theSpawn)
{
	var result = theSpawn.canCreateCreep(body, name);
	if(result == OK) {
	    theSpawn.createCreep(body, name);
	    theSpawn.memory.creepId+=1;
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
function spawnCreep(type,theSpawn)
{
	var creepName = type+theSpawn.memory.creepId;
	var newCreep;

	switch(type)
	{
		case "expand":
			if(trySpawn(creepName,expanderBody,theSpawn))
			{
				newCreep = Game.creeps[creepName];
				newCreep.memory.role="expand";
			}
			break;
		case "supply":
			if(trySpawn(creepName,l2SupplyBody,theSpawn))
			{
				newCreep = Game.creeps[creepName];
				newCreep.memory.role="supply";
			}
			break;
		case "miner":
			if(trySpawn(creepName,basicCreepBody,theSpawn))
			{
				newCreep = Game.creeps[creepName];
				newCreep.memory.role="miner";
			}
			break;
		case "miner2":
			if(trySpawn(creepName,l2MinerBody,theSpawn))
			{
				newCreep = Game.creeps[creepName];
				newCreep.memory.role="miner";
			}
			break;
		case "builder":
			if(trySpawn(creepName,basicCreepBody,theSpawn))
			{
				newCreep = Game.creeps[creepName];
				newCreep.memory.role="builder";
			}
			break;
		case "builder2":
			if(trySpawn(creepName,l2BuilderBody,theSpawn))
			{
				newCreep = Game.creeps[creepName];
				newCreep.memory.role="builder";
			}
			break;
		case "controller":
			if(trySpawn(creepName,basicCreepBody,theSpawn))
			{
				newCreep = Game.creeps[creepName];
				newCreep.memory.role="controller";
			}
			break;
		case "controller2":
			if(trySpawn(creepName,l2ControllerBody,theSpawn))
			{
				newCreep = Game.creeps[creepName];
				newCreep.memory.role="controller";
			}
			break;
	}
}

function init(theSpawn)
{
	// Initialize creep ID for unique names

	if(theSpawn.memory.creepId==null)
	{
		theSpawn.memory.creepId=0;
	}

	// Game starts at level 0

	if(theSpawn.memory.level==null)
	{
		theSpawn.memory.level=0;
	}

	// Always control the level intelligently

	checkLevel(theSpawn);

    // Reset all counters if init has not been processed
	// Zero out counters for each creep type
    miners 		= {current:0, max:0};
    controllers = {current:0, max:0};
    builders 	= {current:0, max:0};
    suppliers 	= {current:0, max:0};

    // Set proper maximums
    miners.max 		= setMaxMiners(theSpawn);
    controllers.max	= setMaxByLevel(theSpawn);
    builders.max 	= setMaxBuilders(theSpawn)
    suppliers.max 	= setMaxSupply();

    // Set that we"ve checked this
    theSpawn.memory.initRan=true;

    theSpawn.memory.initCheck = Game.time;

    // Set a wall strength to aim for
    theSpawn.memory.wallStr = 15000;

	miners.current 		= 0;
    controllers.current	= 0;
    builders.current 	= 0;
    suppliers.current 	= 0;
	
	// Update current counts

    miners.current	 	= _.filter(Game.creeps, (creep) => creep.memory.role.includes('miner')).length;
    controllers.current	= _.filter(Game.creeps, (creep) => creep.memory.role.includes('controller')).length;
   	builders.current	= _.filter(Game.creeps, (creep) => creep.memory.role.includes("builder")).length;
   	suppliers.current	= _.filter(Game.creeps, (creep) => creep.memory.role.includes('supply')).length;
}

function manageCreeps(theSpawn)
{
    for (var name in Game.creeps)
    {
        var creep = Game.creeps[name];
        // Clean up dead
        cleanDeadCreeps();
        //console.log("Creep : " + creep.name);
        // Process all creep roles
        switch(creep.memory.role)
        {
        	case 'miner':
        		miningRole.run(creep);
        		break;
        	case "controller":
        		controllerRole.run(creep);
        		break;
        	case "controller2":
        		controllerRole.run(creep);
        		break;
        	case "builder":
        		buildRole.run(creep);
        		break;
        	case "supply":
        		supplyRole.run(creep);
        		break;
        	case "expand":
        		expandRole.run(creep);
        		break;
        }
    }
    
	// Automate miner population
	var cLevel = theSpawn.memory.level;
	//console.log("---------------------------------");
	//console.log("Miners - Cur:" + miners.current + " - Max:" + miners.max);
	//console.log("Builders - Cur:" + builders.current + " - Max:" + builders.max);
	//console.log("Controllers - Cur:" + controllers.current + " - Max:" + controllers.max);
    if(miners.current<miners.max)
    {
		// spawn a normal miner if we have to
		if(cLevel>=1)
		{
			// We can spawn a big creep
			//console.log("Spawning miner2");
			spawnCreep("miner2",theSpawn);
		}
		else if (cLevel==0)
		{
			// Quick builder/controller build boost
			if(miners.current<3)
			{
				spawnCreep("miner",theSpawn);
			}
			else if(controllers.current==0 && miners.current > 6)
			{
				spawnCreep("controller",theSpawn);
			}
			else if(builders.current==0 && miners.current > 6)
			{
				spawnCreep("builder",theSpawn);
			}
			else
			{
				// Spawn a little creep
				spawnCreep("miner",theSpawn);
			}
		}
    }
	if(controllers.current<controllers.max && miners.current > 6)
	{
	    if(cLevel>=1)
	    {
	        // Build a level 2 builder/upgrader
	        spawnCreep("controller2",theSpawn);
	    }
	    else if (cLevel==0)
	    {
		    spawnCreep("controller",theSpawn);
	    }
	}
	if(builders.current<builders.max && miners.current > 6)
	{
		var targets = theSpawn.room.find(FIND_CONSTRUCTION_SITES);

	    if(cLevel>=1)
	    {
	        // Build a level 2 builder/upgrader
	        spawnCreep("builder2",theSpawn);
	    }
	    else if (cLevel==0 && targets.length)
	    {
		    spawnCreep("builder",theSpawn);
	    }
	}
	if(suppliers.current<suppliers.max && miners.current > 6)
	{
		//console.log(suppliers.max);
	    if(cLevel>=1)
	    {
	        // Build a level 2 builder/upgrader
	        spawnCreep("supply",theSpawn);
	    }
	    else if (cLevel==0)
	    {
		    spawnCreep("supply",theSpawn);
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

function mapSources(theSpawn)
{
	//(available miner space) + roundUp(distance to selected storage / distance_modifer[like 15]) = number of miners for room to maintain
	var numSources = theSpawn.room.find(FIND_SOURCES);
	var totalOpenSpaces = 0;
	var totalDistance = mapDistance(theSpawn);
	var distanceMod = Math.round(totalDistance/8);
	var i=0;
	while (i<numSources.length)
	{
	    //console.log("Source: " + numSources[i].id);
		// for each found source, count number open spaces
		var sourceObj = Game.getObjectById(numSources[i].id);
		//console.log(sourceObj);
		var curOpenSpaces = checkOpenSpace(sourceObj);
		// We know this nodes open space listing, so setup miners to mine on it
		
		totalOpenSpaces += curOpenSpaces;
		i++;
	}
	
	// check distance from storage maybe? Let"s keep it simple for now
	//console.log("Total minable spaces: " + totalOpenSpaces);
	theSpawn.memory.energyScan=false;
	return totalOpenSpaces+distanceMod;	
}
function checkOpenSpace(obj)
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
	var y = obj.pos["y"];
	var x = obj.pos["x"];
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

// Checks the current game level and updates memory
/* TODO: This needs heavily tweaked. The impacts of the current values work up until now,
but gameplay is about to reach another tier (i.e. attacking/defending/building/transferring/multiple room control)
and the impact of this is not known as of yet.
*/
function checkLevel(theSpawn)
{
	var theRoom = theSpawn.room;
	var cLevel = 0; // start at creep level 0
    var targets=null;
    var totalEnergy = theSpawn.room.energyAvailable;
	targets = theRoom.find(FIND_STRUCTURES, {
			filter: (structure) => {
				return (structure.structureType == STRUCTURE_EXTENSION)
			}
	});
    if(targets != null && totalEnergy>400)
    {
        cLevel = 1;

        if(totalEnergy > 1000 && totalEnergy < 2000)
        {
        	cLevel = 2;
        }
        else if (totalEnergy > 2000 && totalEnergy < 3000)
        {
        	if(targets.length>8)
        	{
        		cLevel = 3;
        	}
        	else
        	{
        		cLevel = 2;
        	}
        }
        else
        {
        	cLevel = 1;
        }
    }
    else
    {
        cLevel = 0;
    }

    theSpawn.memory.level=cLevel;
}

// Sets the maximum buildre/supplier/controller per game level defined by operator (ME! :) )
function setMaxByLevel(theSpawn)
{
	var level = theSpawn.room.controller.level;
	var max = Math.round(level*1.5);
	if(max==0)
	{
		max=3;
	}
	return max;
}

// Counts open spaces to mine, and does some math to account for distance to the mining nodes
// Returns max miners for a room to be efficient at all times
// -- On small maps with optimum distance, this is still a bit over zealous
function setMaxMiners(theSpawn)
{
	var openSpaces 		= mapSources(theSpawn);
	var totalDistance	= mapDistance(theSpawn);
	var distanceMod 	= Math.round(totalDistance/20);

	return openSpaces+distanceMod-2;
}

function setMaxBuilders(theSpawn)
{
	var targets = theSpawn.room.find(FIND_CONSTRUCTION_SITES);
	var max = 1;
	if(targets.length>0)
	{
		max = Math.round(targets.length/10);
	}
	return max;
}
function setMaxSupply()
{
    /*
	var targets = theSpawn.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return (structure.structureType == STRUCTURE_EXTENSION);
            }
    });
    var maxSupply = Math.round(targets.length/8);*/
	return 1;
}

// Counts distance to all sources in a room for handling distance mod for maximum miners
function mapDistance(spawnPoint)
{
	var distanceCounter = 0;
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
		distanceCounter+=distance;	
		i++;	
	}

	return distanceCounter;
}