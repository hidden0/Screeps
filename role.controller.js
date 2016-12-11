var roleController = {

    /** @param {Creep} creep **/
    run: function(creep) {
        //console.log("Creep: "+creep.name + " Building: " + creep.memory.building + " Cur Energy: " + creep.carry.energy + " Capacity: " + creep.carryCapacity + " Home Spawn Energy: " + Game.spawns['Home'].energy);
        if(creep.carry.energy < creep.carryCapacity && Game.spawns['Spawn1'].room.energyAvailable>600  && !creep.memory.building)
        {
            //console.log("Should be going home");
            creep.memory.grab=true;
            // Grab energy where there is >50 energy to grab - checking container's first
			var energyStorage = creep.room.find(FIND_STRUCTURES, {
                    filter: (i) => (i.structureType == STRUCTURE_CONTAINER || i.structureType == STRUCTURE_STORAGE) &&
                                   i.store[RESOURCE_ENERGY] > 50
                });
        	var energySpawn = creep.room.find(FIND_STRUCTURES, {
                filter: (i) => (i.structureType == STRUCTURE_SPAWN) &&
                               i.energy > 200
            });

            var closestStorage = mapDistance(creep);
            if(closestStorage.length>0)
            {
                var container = Game.getObjectById(closestStorage[0].split(":")[1]);
                if( creep.withdraw(container,RESOURCE_ENERGY,creep.carryCapacity) == ERR_NOT_IN_RANGE ) {
					creep.moveTo(container);
				}
            }
        }
        else
        {
            creep.memory.grab=false;
        }
	    if(creep.memory.building && creep.carry.energy == 0) {
            creep.memory.building = false;
            //creep.say('harvesting');
	    }
	    if(!creep.memory.building && creep.carry.energy == creep.carryCapacity) {
	        creep.memory.building = true;
	    }

	    if(creep.memory.building) {
	        // Upgrade controller
            //creep.say("Upgrading");
	        if(creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller);
            }
	    }
	    else if(Game.spawns['Spawn1'].room.energyAvailable<600) {
	        var sources = creep.room.find(FIND_SOURCES);
            if(creep.harvest(sources[0]) == ERR_NOT_IN_RANGE && !creep.memory.grab) {
                creep.moveTo(sources[0]);
            }
	    }
	}
};

// Counts distance to an energy container in a room for handling distance
function mapDistance(creep)
{
    var distanceCounter = new Array();
    var energyStorage = creep.room.find(FIND_STRUCTURES, {
        filter: (i) => (i.structureType == STRUCTURE_CONTAINER || i.structureType == STRUCTURE_STORAGE) &&
                       i.store[RESOURCE_ENERGY] > 50
    });
    var spawn_xPos = creep.pos.x;
    var spawn_yPos = creep.pos.y;
    var i=0;
    while (i<energyStorage.length)
    {
        // Find the distance via pythagorean theorem to this source

        var source_xPos = energyStorage[i].pos.x;
        var source_yPos = energyStorage[i].pos.y;
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
        distanceCounter[i]=distance+":"+energyStorage[i].id;  
        i++;    
    }

    // Sort the list
    distanceCounter.sort(function(a, b){return (a.split(':')[0])-(b.split(':')[0])});

    return distanceCounter;
}
module.exports = roleController;