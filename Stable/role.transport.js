/***
This creep is a manually spawned creep used to move large amounts of energy between rooms.

Methodology:
- Memory value "targetStorage" is set. This is the ID of the storage object to move energy to.
- Memory value "sourceStorage" is set. This is the ID of the storage object to source energy from.
- Loop: Get energy, move it to targetStorage. Come back to sourceStorage, repeat.
***/

var transportCreep = {
    /** @param {Creep} creep object **/
    /** goal: move massive amounts of energy between rooms **/
    run: function(creep) {
        // Thieve shit if given a target
        if(creep.memory.transport!=null)
        {
            // Move to the target room if not there
            if(creep.memory.steal==creep.room.name && (creep.memory.full==null || creep.memory.full==false))
            {
                if(creep.pos.x==0 || creep.pos.x==49 || creep.pos.y==0 || creep.pos.y==49)
                {
                    if(creep.pos.y==0)
                    {
                        creep.move(BOTTOM);   
                    }
                    else if(creep.pos.x==0)
                    {
                        creep.move(RIGHT);
                    }
                    else if(creep.pos.y==49)
                    {
                        creep.move(TOP);
                    }
                    else if(creep.pos.x=49)
                    {
                        creep.move(LEFT);
                    }
                }
                // Step 1 - steal from storage
                var targets = creep.room.find(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return (structure.structureType == STRUCTURE_STORAGE) &&
                            (structure.store['energy'] > 0);
                    }
                });
                if(targets.length>0)
                {
                    if(creep.withdraw(targets[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(targets[0]);
                    }
                }
                if(creep.carry.energy==creep.carryCapacity)
                {
                    creep.memory.full=true;
                }
            }
            // otherwise move to the room
            else if(creep.memory.full==null || creep.memory.full==false)
            {
                if(creep.pos.x==0 || creep.pos.x==49 || creep.pos.y==0 || creep.pos.y==49)
                {
                    if(creep.pos.y==0)
                    {
                        creep.move(BOTTOM);   
                    }
                    else if(creep.pos.x==0)
                    {
                        creep.move(RIGHT);
                    }
                    else if(creep.pos.y==49)
                    {
                        creep.move(TOP);
                    }
                    else if(creep.pos.x=49)
                    {
                        creep.move(LEFT);
                    }
                }
                creep.moveTo(new RoomPosition(37, 37, creep.memory.steal));
            }
            else
            {
                // return loot
                if(creep.room.name!="E34N98")
                {
                    creep.moveTo(new RoomPosition(37, 37, "E34N98"));
                }
                else
                {
                    var containers = creep.room.find(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return (structure.structureType == STRUCTURE_CONTAINER) &&
                            (structure.store['energy'] < structure.storeCapacity);
                        }
                    });
                    if(containers.length>0)
                    {
                        if(creep.transfer(containers[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                            creep.moveTo(containers[0]);
                        }
                    }
                    if(creep.carry.energy==0)
                    {
                        creep.memory.full=false;
                    }
                }
            }
        }
        // Otherwise find a flag containing "miner"
        else
        {
            goIdle(creep);
        }
    }
};
module.exports = thiefCreep;

function goIdle(myCreep)
{
    // if a flag is already set, don't loop for it
    if(myCreep.memory.idleFlag!=null)
    {
        if(myCreep.moveTo(Game.flags[myCreep.memory.idleFlag])==ERR_INVALID_TARGET)
        {
            myCreep.memory.idleFlag=null;
        }
    }
    // Otherwise, see if a flag is in the room
    else
    {
        for (var flagName in Game.flags)
        {
            if(flagName.includes("thief") && Game.flags[flagName].pos.roomName==myCreep.room.name)
            {
                myCreep.memory.idleFlag=flagName;
                break;
            }
        }
    }
}
