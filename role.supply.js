var roleSupplier = {
    /** Goal of this creep is to distribute energy effectively **/
    /** @param {Creep} creep **/
    run: function(creep) {
        //console.log("Creep: "+creep.name + " Building: " + creep.memory.building + " Cur Energy: " + creep.carry.energy + " Capacity: " + creep.carryCapacity + " Home Spawn Energy: " + Game.spawns['Home'].energy);
        // Are there energy laden containers/storage, and empty extensions/towers/spawn/anything? Fill them!
        /* Methodology here
            1) Do we have energy?
            - yes/no
            2) Does anything *need* energy?
            - yes/no
            
            3) If 1==yes, and 2==yes, move energy to it
        */
        // Find all storage available
        var energyThresh = 275; // Minimum energy we should see in storage (spawn+ext) before we start moving things about
        var roomEnergy = creep.room.energyAvailable;
        if(creep.memory.action==null)
        {
            creep.memory.action="supplying";
        }
        var action = creep.memory.action;
        // if no action is set, we're just sending energy around to structures
        if(action=="supplying")
        {
            // If there is enough energy laying around
            if(roomEnergy>energyThresh)
            {
                // Start filling towers first, extensions second.
                // Check creep energy
                if(creep.energy<creep.carryCapacity)
                {
                    // Grab energy from a container first, storage second, spawn 3rd
                    getEnergy(creep);
                }
                // Creep has energy, take it to proper target
                else
                {
                    supplyTarget(creep);
                }
            }
        }
        // otherwise structure are full adn we can fill the main storage unit
        else if(action=="store")
        {
            var dstStorage = creep.room.find(FIND_STRUCTURES, {
                    filter: (i) => (i.energy < i.energyCapacity) &&
                        (i.structureType == STRUCTURE_STORAGE)
                });
            if(dstStorage.length > 0)
            {
                if( creep.transfer(dstStorage[0],RESOURCE_ENERGY,creep.energy) == ERR_NOT_IN_RANGE ) {
                    creep.moveTo(dstStorage[0]);
                }
            }
        }
    }
};

/***
See if containers/extensions need filled
***/
function checkSupply(creep)
{
    // Find all energy targets
    var dstTower = creep.room.find(FIND_STRUCTURES, {
        filter: (i) => (i.energy < i.energyCapacity) &&
            (i.structureType == STRUCTURE_TOWER)
    });
    var dstExtension = creep.room.find(FIND_STRUCTURES, {
        filter: (i) => (i.energy < i.energyCapacity) &&
            (i.structureType == STRUCTURE_EXTENSION)
    });
    var dstContainer = creep.room.find(FIND_STRUCTURES, {
        filter: (i) => (i.energy < i.energyCapacity) &&
            (i.structureType == STRUCTURE_CONTAINER)
    });
    if(dstTower.length > 0 || dstExtension.length > 0 || dstContainer.length > 0)
    {
        creep.memory.action="supplying";
    }
}
/***
Creep assumed to have energy at this point. Supply towers, extensions, containers, and storage in that order.

***/
function supplyTarget(creep)
{
    // Find all energy targets
    var dstTower = creep.room.find(FIND_STRUCTURES, {
        filter: (i) => (i.energy < i.energyCapacity) &&
            (i.structureType == STRUCTURE_TOWER)
    });
    var dstExtension = creep.room.find(FIND_STRUCTURES, {
        filter: (i) => (i.energy < i.energyCapacity) &&
            (i.structureType == STRUCTURE_EXTENSION)
    });
    var dstContainer = creep.room.find(FIND_STRUCTURES, {
        filter: (i) => (i.energy < i.energyCapacity) &&
            (i.structureType == STRUCTURE_CONTAINER)
    });

    // first send to towers
    if(dstTower.length > 0)
    {
        if( creep.transfer(dstTower[0],RESOURCE_ENERGY,creep.energy) == ERR_NOT_IN_RANGE ) {
            creep.moveTo(dstTower[0]);
        }
    }
    // Send to extensions
    else if(dstExtension.length > 0)
    {
        if( creep.transfer(dstExtension[0],RESOURCE_ENERGY,creep.energy) == ERR_NOT_IN_RANGE ) {
            creep.moveTo(dstExtension[0]);
        }
    }
    // Finally, send to container
    else if(dstContainer.length > 0)
    {
        if( creep.transfer(dstContainer[0],RESOURCE_ENERGY,creep.energy) == ERR_NOT_IN_RANGE ) {
            creep.moveTo(dstContainer[0]);
        }
    }
    // No real targets, set flag to continue filling main storage from spawn
    else
    {
        creep.memory.action="store";
    }
}
/***
Creep logic for obtaining energy
- Are there containers with energy? use those first
- If no containers, does the main storage have energy? use this next
- Finally, use spawn if it's energy is at 275 >
***/
function getEnergy(creep)
{
    var enContainer = creep.room.find(FIND_STRUCTURES, {
        filter: (i) => (i.structureType == STRUCTURE_CONTAINER) && 
            (i.store[RESOURCE_ENERGY] > 0)
    });
    var enStorage = creep.room.find(FIND_STRUCTURES, {
        filter: (i) => (i.structureType == STRUCTURE_STORAGE) &&
            (i.store[RESOURCE_ENERGY] > 0)
    });
    var enSpawn = creep.room.find(FIND_STRUCTURES, {
        filter: (i) => (i.energy >= 275) &&
            (i.structureType == STRUCTURE_SPAWN)
    });
    var withDrawValue = creep.carryCapacity-creep.energy;

    // Get containers
    if(enContainer.length > 0)
    {
        if( creep.withdraw(enContainer[0],RESOURCE_ENERGY,withDrawValue) == ERR_NOT_IN_RANGE ) {
            creep.moveTo(enContainer[0]);
        }
    }
    // Get from storage
    else if(enStorage.length > 0)
    {
        if( creep.withdraw(enStorage[0],RESOURCE_ENERGY,withDrawValue) == ERR_NOT_IN_RANGE ) {
            creep.moveTo(enStorage[0]);
        }
    }
    // Finally, get from spawn
    else if(enSpawn.length > 0)
    {
        if( creep.withdraw(enSpawn[0],RESOURCE_ENERGY,withDrawValue) == ERR_NOT_IN_RANGE ) {
            creep.moveTo(enSpawn[0]);
        }
    }
}
module.exports = roleSupplier;