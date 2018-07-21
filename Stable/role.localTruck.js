/***
Miners just mine and take energy to storage/containers.
The truck will move energy from containers/spawn (if spawn is not in reserve mode) to other structures with this priority:
1) Towers
2) Storage

If there is no energy to move or a need to move energy, perhaps salvage energy on the ground?
***/

var localTruckCreep = {
    /** @param {Creep} creep object **/
    run: function(creep) {
        // What should happen?
        // Take energy to towers that need it
        var reuseVal = 5;
        var towers = creep.room.find(FIND_STRUCTURES, {
            filter: (i) => ((i.structureType==STRUCTURE_TOWER)
                && (i.energy < (i.energyCapacity-100)))
        });
        var storageCont = creep.room.find(FIND_STRUCTURES, {
            filter: (i) => ((i.structureType==STRUCTURE_STORAGE)
                && (i.store['energy'] < i.storeCapacity))
        });
        var primaryStorage = creep.room.find(FIND_STRUCTURES, {
            filter: (i) => ((i.structureType==STRUCTURE_SPAWN || i.structureType==STRUCTURE_EXTENSION)
                && (i.energy < i.energyCapacity))
        });
        // Almost lowest priority, fill the base link with energy.
        // Base link is the first link built in the room.
        var baseLink = creep.room.find(FIND_STRUCTURES, {
            filter: (i) => ((i.structureType==STRUCTURE_LINK))
        });

        // Lastly, scavenge
        var looseEnergy = creep.room.find(FIND_DROPPED_RESOURCES);
        var homeRoom = null;
        if(creep.memory.homeRoom==null)
        {
            for(var spawnP in Game.spawns)
            {
                if(Game.spawns[spawnP].room.name==creep.room.name)
                {
                    creep.memory.homeRoom=Game.spawns[spawnP].room.name;
                    break;
                }
            }
        }
        switch(creep.memory.action)
        {
            // Creep is scavenging energy
            case 'scavenge':
                goScavenge(creep,looseEnergy);
                break;
            // Creep is scavenging energy
            case 'towers':
                fillTowers(creep,towers);
                break;
            // Creep is filling extensions or spawn
            case 'storage':
                handleStorage(creep,primaryStorage);
                break;
            // Creep is filling the base link from storage
            case 'links':
                handleLinks(creep,baseLink);
                break;
            // Creep is chilling out
            case 'idle':
                goIdle(creep);
                break;
            // Creep doesn't have a state set (either new creep or previous job done). State manage
            default:
                setState(creep,towers,primaryStorage,storageCont,baseLink,looseEnergy);
                break;
        }
    }
};
module.exports = localTruckCreep;

function setState(creep,towers,primaryStorage,storageCont,baseLink,looseEnergy)
{
    // Is action set?
    if(creep.memory.action==null || creep.memory.action=='idle')
    {
        // Set appropriate state, filling towers first
        if(primaryStorage.length>0)
        {
            creep.memory.action="storage";
        }
        // Next, it is on to spawn logistics
        else
        {
            // If storage is well spread, fill that base link with energy
            // TODO: Base link must be identifiable by flag set in link memory
            if(baseLink.length>0 && creep.room.memory.base!=null)
            {
                var theBase = Game.getObjectById(creep.room.memory.base);
                if(theBase.energy<600)
                {
                    creep.memory.action="links";
                }
                else
                {
                    if(towers.length>0)
                    {
                        creep.memory.action="towers";
                    }
                    // Finally, if there is any loose energy, go scavenge it
                    else if(looseEnergy.length>0)
                    {
                        creep.memory.action="scavenge";
                    }
                }
            }
            else if(towers.length>0)
            {
                creep.memory.action="towers";
            }
            // Finally, if there is any loose energy, go scavenge it
            else if(looseEnergy.length>0)
            {
                var worth = false;
                for(var i=0;i<looseEnergy.length;i++)
                {
                    if(looseEnergy[i].energy>50)
                    {
                        worth=true;
                        break;
                    }
                }
                if(worth)
                {
                    creep.memory.action="scavenge";
                }
                else
                {
                    creep.memory.action="idle";
                }
            }
        }

    }
    else
    {
        goIdle(creep);
    }
}

function goScavenge(creep,looseEnergy)
{
    var reuseVal = 5;
    if(creep.memory.reuseVal!=null)
    {
        reuseVal=creep.memory.reuseVal;
    }
    // Is energy full in carry parts?
    if(creep.memory.full==null || creep.memory.full==false)
    {
        // Go scavenge energy on the ground
        if(looseEnergy.length)
        {
            if(creep.pickup(looseEnergy[0])==ERR_NOT_IN_RANGE)
            {
                creep.moveTo(looseEnergy[0], {reusePath: reuseVal});
            }
        }
        if(creep.carry.energy==creep.carryCapacity)
        {
            creep.memory.full=true;
        }
    }
    // Otherwise go store this energy
    else
    {
        creep.memory.action="storage";
    }
    if(looseEnergy.length==0)
    {
        creep.memory.action=null;
    }
}

function fillTowers(creep,towers)
{
    var reuseVal = 5;
    if(creep.memory.reuseVal!=null)
    {
        reuseVal=creep.memory.reuseVal;
    }
    if(creep.memory.full==null || creep.memory.full==false)
    {
        // Creep has no energy, go get some
        getEnergy(creep);
    }
    else
    {
        // Take energy to towers that need it
        if(creep.transfer(towers[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            creep.moveTo(towers[0], {reusePath: reuseVal});
        }
    }
    if(creep.carry.energy==0)
    {
        creep.memory.full=false;
    }
    if(towers.length==0)
    {
        creep.memory.action=null;
    }
}

function handleStorage(creep,primaryStorage)
{
    var reuseVal = 5;
    if(creep.memory.reuseVal!=null)
    {
        reuseVal=creep.memory.reuseVal;
    }
    if(creep.memory.full==null || creep.memory.full==false)
    {
        // Creep has no energy, go get some
        getEnergy(creep);
    }
    // storage structure logic
    else
    {
        // if the spawn or extensions need energy, that takes precedence
        // TAKE TO CLOSEST
        // Now that energy storage is identified, loop through the array to find the closest energy storage
        var i=0;
        var winner_index=0;
        var lowest=null;
        var dist=0;

        while(i<primaryStorage.length)
        {
            dist = mapDistance(creep,primaryStorage[i]);
            //console.log("Container["+i+"] distance: " + dist);
            if(lowest==null)
            {
                lowest=dist;
            }
            else if(dist<lowest)
            {
                lowest=dist;
                winner_index=i;
            }
            i++;
        }
        if(primaryStorage.length>0)
        {
            if(creep.transfer(primaryStorage[winner_index], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(primaryStorage[winner_index], {reusePath: reuseVal});
            }
        }
    }
    if(creep.carry.energy==0)
    {
        creep.memory.full=false;
    }
    if(primaryStorage.length==0)
    {
        creep.memory.action=null;
    }
}

function handleLinks(creep,baseLink)
{
    var reuseVal = 5;
    if(creep.memory.reuseVal!=null)
    {
        reuseVal=creep.memory.reuseVal;
    }
    if(creep.memory.full==null || creep.memory.full==false)
    {
        // Creep has no energy, go get some
        getEnergy(creep);
    }
    // storage structure logic
    else
    {
        // Finally, fill that base link with energy
        // Is there a room base link?
        if(creep.room.memory.base!=null)
        {
            baseLink = Game.getObjectById(creep.room.memory.base);
            if(baseLink.energy < baseLink.energyCapacity)
            {
                if(creep.transfer(baseLink, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(baseLink, {reusePath: reuseVal});
                }
            }
            if(baseLink.energy==baseLink.energyCapacity)
            {
                creep.memory.action=null;
            }
        }
        else
        {
            if(baseLink.length>0)
            {
                // link[0] is always the one we fill first.
                if(baseLink[0].energy < baseLink[0].energyCapacity)
                {
                    if(creep.transfer(baseLink[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(baseLink[0], {reusePath: reuseVal});
                    }
                }
            }
        }
    }
    if(creep.carry.energy==0)
    {
        creep.memory.full=false;
    }
    if(baseLink.length)
    {
        if(baseLink[0].energy==baseLink[0].energyCapacity)
        {
            creep.memory.action=null;
        }
    }
}

function goIdle(myCreep)
{
    var reuseVal = 5;
    if(myCreep.memory.reuseVal!=null)
    {
        reuseVal=myCreep.memory.reuseVal;
    }
    // if a flag is already set, don't loop for it
    if(myCreep.memory.idleFlag!=null)
    {
        if(myCreep.moveTo(Game.flags[myCreep.memory.idleFlag], {reusePath: reuseVal})==ERR_INVALID_TARGET)
        {
            myCreep.memory.idleFlag=null;
        }
    }
    // Otherwise, see if a flag is in the room
    else
    {
        for (var flagName in Game.flags)
        {
            if(flagName.includes("truck") && Game.flags[flagName].pos.roomName==myCreep.room.name)
            {
                myCreep.memory.idleFlag=flagName;
                break;
            }
        }
    }
    myCreep.memory.action=null;
}


// getEnergy(creep): Logic for obtaining energy.
// controller note: this is based on controller position, not creep.
function getEnergy(creep)
{
    var reuseVal = 5;
    if(creep.memory.reuseVal!=null)
    {
        reuseVal=creep.memory.reuseVal;
    }
    /*
        Energy logic: Find the closest energy containing item and use it
    */
    var theController = creep.room.controller;
    var creepEnergy = creep.carry.energy;
    var creepCapacity = creep.carryCapacity;
    var withdrawE = creepCapacity - creepEnergy;
    var energyStorage = creep.room.find(FIND_STRUCTURES, {
        filter: (i) => ((i.structureType==STRUCTURE_STORAGE)
            && (i.store['energy'] > 0))
    });
    var containers = creep.room.find(FIND_STRUCTURES, {
        filter: (i) => ((i.structureType==STRUCTURE_CONTAINER)
            && (i.store['energy'] > 0))
    });
    // Now that energy storage is identified, loop through the array to find the closest energy storage
    var i=0;
    var winner_index=0;
    var lowest=null;
    var dist=0;
    if(energyStorage.length>0)
    {
        if(creep.withdraw(energyStorage[0],RESOURCE_ENERGY,withdrawE) == ERR_NOT_IN_RANGE)
        {
            creep.moveTo(energyStorage[0]);
        }
    }
    else if(containers.length>0)
    {
        
        if(creep.withdraw(containers[0],RESOURCE_ENERGY,withdrawE) == ERR_NOT_IN_RANGE)
        {
            creep.moveTo(containers[0], {reusePath: reuseVal});
        }
    }
    if(creep.carry.energy==creep.carryCapacity)
    {
        creep.memory.full=true;
    }
}

// Find a path to a given target
// Return the number of tiles you would have to move from the creeps current position to reach given target
function mapDistance(creep, target)
{
    var distanceCounter = 0;
    var spawn_xPos = creep.pos.x;
    var spawn_yPos = creep.pos.y;
    var i=0;
    // Find the distance via pythagorean theorem to this source

    var source_xPos = target.pos.x;
    var source_yPos = target.pos.y;
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

    return distance;
}