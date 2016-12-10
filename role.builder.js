var roleBuilder = {

    /** @param {Creep} creep **/
    run: function(creep) {
        //console.log("Creep: "+creep.name + " Building: " + creep.memory.building + " Cur Energy: " + creep.carry.energy + " Capacity: " + creep.carryCapacity + " Home Spawn Energy: " + Game.spawns['Home'].energy);
        // This creep will build any constructions that require put together.
        var mySpawn = Game.spawns['Spawn1'];
		var targets = creep.room.find(FIND_CONSTRUCTION_SITES);
        var desiredWallStrength=500; // default wall strength
        if(mySpawn.memory.wallStr!=null)
        {
            desiredWallStrength = mySpawn.memory.wallStr;
        }
        var walls = creep.room.find(FIND_STRUCTURES, {
            filter: (i) => (i.structureType == STRUCTURE_WALL && i.hits < desiredWallStrength)
        });

		if(targets.length || walls.length) 
		{
			// There is something to build
			
			// Grab energy where there is >50 energy to grab - checking container's first
            var withDrawValue = creep.carryCapacity-creep.energy;
            var energyStorage = creep.room.find(FIND_STRUCTURES, {
                    filter: (i) => (i.structureType == STRUCTURE_STORAGE) &&
                                   i.store[RESOURCE_ENERGY] > 200
                });
			var energyStorageContainer = creep.room.find(FIND_STRUCTURES, {
                    filter: (i) => (i.structureType == STRUCTURE_CONTAINER) &&
                                   i.store[RESOURCE_ENERGY] > 200
                });
        	var energySpawn = creep.room.find(FIND_STRUCTURES, {
                filter: (i) => (i.structureType == STRUCTURE_SPAWN) &&
                               i.energy > 250
            });
            if(energyStorage.length>0)
            {
                if( creep.withdraw(energyStorage[0],RESOURCE_ENERGY,withDrawValue) == ERR_NOT_IN_RANGE ) {
                    creep.moveTo(energyStorage[0]);
                }
            }
            else if(energyStorageContainer.length>0)
            {
                if( creep.withdraw(energyStorageContainer[0],RESOURCE_ENERGY,withDrawValue) == ERR_NOT_IN_RANGE ) {
					creep.moveTo(energyStorageContainer[0]);
				}
            }
            // Pull from storage instead
            else if(energySpawn.length>0 && creep.carry.energy == 0)
            {
                var result = creep.withdraw(energySpawn[0],RESOURCE_ENERGY,withDrawValue)
                if( result == ERR_NOT_IN_RANGE ) {
                    creep.moveTo(energySpawn[0]);
                }
                else if (result == OK)
                {
                    creep.memory.building=true;
                }
            }
		}
		else
		{
			creep.memory.building=false;
            creep.moveTo((mySpawn.pos.x+10), mySpawn.pos.y+10);
		}
		if(!creep.memory.building && creep.carry.energy == creep.carryCapacity) {
	        creep.memory.building = true;
	    }
        else if(creep.carry.energy == 0)
        {
            creep.memory.building = false;
        }

	    if(creep.memory.building) {
	        var targets = creep.room.find(FIND_CONSTRUCTION_SITES);
            if(targets.length || walls.length) {
    			if(targets.length)
    			{
    			    creep.say("Building");
                    var result = creep.build(targets[0]);
                    //console.log(result);
                    if( result == ERR_NOT_IN_RANGE ) {
                        creep.moveTo(targets[0]);
                    }
    			}
    			else if (walls.length)
    			{
    			    creep.say("Reinforcing");
    			    if(creep.repair(walls[0]) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(walls[0]);
                    }
    			}
            }
	    }
	}
};

module.exports = roleBuilder;