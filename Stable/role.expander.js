/***
Expander creep. Goals:
1) Claim controller
2) Mine energy 
3) Build spawn

Repeat steps 2-3 until spawn complete
***/

var expanderCreep = {
	/** @param {Creep} creep object **/
	run: function(creep) {
	    // What is the target?
	    if(creep.memory.targetRoom==null)
	    {
	        if(Game.spawns['Spawn1'].memory.targetRoom!=null)
	        {
	            creep.memory.targetRoom=Game.spawns['Spawn1'].memory.targetRoom;
	        }
	        else
	        {
	            creep.memory.targetRoom="none";
	            goIdle();
	        }
	    }
	    if(creep.memory.targetRoom==creep.room.name)
	    {
	        var borderCheck = checkPerim(creep.pos);
			if(borderCheck!=true)
            {
                creep.move(borderCheck);
            }
            else
            {
                // Step 1 - claim
	    		if(creep.room.controller.owner!="hidden0") {

	                if(creep.claimController(creep.room.controller) == ERR_NOT_IN_RANGE) {
	                	var moveResult = creep.moveTo(creep.room.controller);
	                    if(moveResult!=OK)
	                    {
	                    	if(moveResult==ERR_NO_PATH)
	                    	{
	                    		// Move a direction a few times
	                    		creep.move(LEFT);
	                    	}
	                    }
	                }
	            }
            }
	        
	    }
	    // otherwise move to the room
	    else
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
	}
};
module.exports = expanderCreep;

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
			if(flagName.includes("expander") && Game.flags[flagName].pos.roomName==myCreep.room.name)
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