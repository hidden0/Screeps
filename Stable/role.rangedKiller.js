/***
localMiner is built for simplicity. It will be assigned a sourceId and mine it for it's lifetime
It will return energy to the nearest storage source with available space.
If idle, it will find a flag on the room with the word "miner" in it.
***/

var rangedKiller = {
    /** @param {Creep} creep object **/
    /** goal: kill closest enemy target in targetRoom **/
    run: function(creep) {
        var reUsePath = 20;
        // Path - am I in a room with enemies?
        var enemies = creep.room.find(FIND_HOSTILE_CREEPS);
        var enemiesStr = creep.room.find(FIND_HOSTILE_STRUCTURES);
        var foundEnemies = false;
        for(var i = 0; i<enemies.length; i++)
        {
            if(enemies[i].owner!="hidden0")
            {
                foundEnemies=true;
                creep.memory.enemies=true;
                break;
            }
        }
        for (var i = 0; i<enemiesStr.length; i++)
        {
            if(enemiesStr[i].owner!="hidden0")
            {
                foundEnemies=true;
                creep.memory.enemies=true;
                break;
            }
        }
        if(foundEnemies==false)
        {
            creep.memory.enemies=false;
        }

        // if my targetRoom variable in memory isn't empty and I'm in the wrong room, do this:
        if(creep.memory.targetRoom!=null && creep.room.name!=creep.memory.targetRoom)
        {
            var borderCheck = checkPerim(creep.pos);
            if(borderCheck!=true)
            {
                creep.move(borderCheck);
            }
            else
            {
                creep.moveTo(new RoomPosition(37, 37, creep.memory.targetRoom));
            }
        }
        // FINALLY: I'm in the target room!
        else if(creep.memory.targetRoom!=null && creep.room.name==creep.memory.targetRoom)
        {
            // Here is attack logic. For this run, there is a tower that is gonna wreck me. I'm going to dismantle it first.
            var enemyTowers = creep.room.find(FIND_STRUCTURES);
            if(enemyTowers.length)
            {
                // Go dismantle that sucker
            }
            // If in a room with enemies do this:
            if(creep.memory.enemies==true)
            {
                var targets = creep.room.find(FIND_HOSTILE_STRUCTURES, {
                    filter: (i) => ((i.structureType==STRUCTURE_SPAWN || i.structureType==STRUCTURE_TOWER))
                });
                // enemies found, kill nearest
                //var targets=creep.room.find(FIND_HOSTILE_STRUCTURES);
                if(targets.length > 0) {
                    if(creep.rangedAttack(targets[0])==ERR_NOT_IN_RANGE)
                    {
                        creep.moveTo(targets[0]);
                    }
                }
            }
        }
        else if(foundEnemies)
        {
            if(creep.rangedAttack(enemies[0])==ERR_NOT_IN_RANGE)
            {
                creep.moveTo(enemies[0]);
            }
        }
        // Otherwise find a flag containing "soldier"
        else
        {
            goIdle(creep);
        }
    }
};

module.exports = rangedKiller;

function goIdle(myCreep)
{
    var reUsePath = 20;
    // if a flag is already set, don't loop for it
    if(myCreep.memory.idleFlag!=null)
    {
        if(myCreep.moveTo(Game.flags[myCreep.memory.idleFlag], {reusePath: reUsePath})==ERR_INVALID_TARGET)
        {
            myCreep.memory.idleFlag=null;
        }
    }
    // Check for an attack flag
    else if (myCreep.memory.targetRoom==null)
    {
        for (var flagName in Game.flags)
        {
            if(flagName.includes("attack"))
            {
                myCreep.memory.targetRoom=Game.flags[flagName].pos.roomName;
                break;
            }
        }
    }
    // Otherwise, see if a flag is in the room
    else
    {
        for (var flagName in Game.flags)
        {
            if(flagName.includes("soldier") && Game.flags[flagName].pos.roomName==myCreep.room.name)
            {
                myCreep.memory.idleFlag=flagName;
                break;
            }
        }
    }
}

function checkPerim(cPos)
{
    if(cPos.x==0 || cPos.x==49 || cPos.y==0 || cPos.y==49)
    {
        if(cPos.y==0)
        {
            return BOTTOM;
        }
        else if(cPos.x==0)
        {
            return RIGHT;
        }
        else if(cPos.y==49)
        {
            return TOP;
        }
        else if(cPos.x=49)
        {
            return LEFT;
        }
    }
    else
    {
        return true;
    }
}