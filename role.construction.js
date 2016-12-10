var roleConstruction = {

    /** @param {Creep} creep **/
    run: function(creep) {
        //console.log("Creep: "+creep.name + " Building: " + creep.memory.building + " Cur Energy: " + creep.carry.energy + " Capacity: " + creep.carryCapacity + " Home Spawn Energy: " + Game.spawns['Home'].energy);
        // This creep will build any constructions that require put together.
		var targets = creep.room.find(FIND_CONSTRUCTION_SITES);
        var repTargets;
        if(Game.spawns['Spawn1'].memory.repairBuildings)
        {
            repTargets = creep.room.find(FIND_STRUCTURES, {
                filter: (i) => (i.hits < (i.hitsMax) && i.structureType!=STRUCTURE_WALL)
            });
        }
        else
        {
            repTargets = creep.room.find(FIND_STRUCTURES, {
                filter: (i) => (i.hits > (i.hitsMax) && i.structureType!=STRUCTURE_WALL)
            });
        }
        var walls = creep.room.find(FIND_STRUCTURES, {
            filter: (i) => (i.structureType == STRUCTURE_WALL && i.hits < 10000)
        });
		if(targets.length || repTargets.length || walls.length) 
		{
			// There is something to build
			
			// Grab energy where there is >50 energy to grab - checking container's first
			var energyStorage = creep.room.find(FIND_STRUCTURES, {
                    filter: (i) => (i.structureType == STRUCTURE_CONTAINER) &&
                                   i.store[RESOURCE_ENERGY] > 200
                });
        	var energySpawn = creep.room.find(FIND_STRUCTURES, {
                filter: (i) => (i.structureType == STRUCTURE_SPAWN) &&
                               i.energy > 200
            });
            if(energyStorage.length>0)
            {
                if( creep.withdraw(energyStorage[0],RESOURCE_ENERGY,50) == ERR_NOT_IN_RANGE ) {
					creep.moveTo(energyStorage[0]);
				}
            }
            // Pull from storage instead
            else if(energySpawn.length>0)
            {
                if( energySpawn[0].transferEnergy(creep) == ERR_NOT_IN_RANGE ) {
                    creep.moveTo(energySpawn[0]);
                }
            }
		}
		else
		{
			creep.memory.building=false;
		}
		if(!creep.memory.building && creep.carry.energy == creep.carryCapacity) {
	        creep.memory.building = true;
	        creep.say('building');
	    }

	    if(creep.memory.building) {
	        var targets = creep.room.find(FIND_CONSTRUCTION_SITES);
            if(targets.length || repTargets.length || walls.length) {
    			if(targets.length)
    			{
    			    //creep.say("Build");
    			    if(creep.build(targets[0]) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(targets[0]);
                    }
    			}
    			else if (repTargets.length)
    			{
    			    //creep.say("Repair");
    			    var repairObj;
    			    var lowestHealth=null;
    			    if(creep.memory.repairobj==null)
    			    {
        			    for (var target in repTargets)
        			    {
        			        if(lowestHealth==null)
        			        {
        			            lowestHealth=target.hits;
        			            continue;
        			        }
        			        if(target.hits<lowestHealth)
        			        {
        			            repairObj = target;
        			            lowestHealth=repairObj.hits;
        			        }
        			    }
        			    if(repairObj==null)
        			    {
        			        repairObj=repTargets[0];
        			    }
        			    // lowest hit obj identified
        			    creep.memory.repairobj=repairObj.id;
    			    }
    			    else
    			    {
    			        var repTar = Game.getObjectById(creep.memory.repairobj);
    			        if(creep.repair(repTar) == ERR_NOT_IN_RANGE) {
                            creep.moveTo(repTar);
                        }
                        if(repTar.hits==repTar.hitsMax)
                        {
                            creep.memory.repairobj=null;
                        }
    			    }
    			}
    			else if (walls.length)
    			{
    			    //creep.say("Walls");
    			    if(creep.repair(walls[0]) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(walls[0]);
                    }
    			}
            }
	    }
	}
};

module.exports = roleConstruction;