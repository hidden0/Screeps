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
        var enemies = creep.room.find(FIND_CREEPS);
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
        if(foundEnemies==false)
        {
            creep.memory.enemies=false;
        }
        if(creep.memory.enemies==true)
        {
            // enemies found, kill nearest
            var targets=creep.pos.findInRange(FIND_HOSTILE_CREEPS, 3);
            if(targets.length > 0) {
                creep.rangedAttack(targets[0]);
            }
            else
            {
                creep.moveTo(targets[0]);
            }
        }
		if(creep.memory.targetRoom!=null)
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