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
            console.log(energyStorage.length);
            if(energyStorage.length>0)
            {
                if( creep.withdraw(energyStorage[0],RESOURCE_ENERGY,50) == ERR_NOT_IN_RANGE ) {
					creep.moveTo(energyStorage[0]);
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

module.exports = roleController;