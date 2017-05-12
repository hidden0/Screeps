var roleController = {
    /** @param {Creep} creep 
        @Description: This creep maintains the controller, vital for gaining leaderboard points and upgrading the room. Simple job.

        Logic Flow / States:
            1 - There is stored energy in the room. Obtain closest *based on controller's position* energy source to upgrade the controller.
                function: getPoints(creep)
            2 - Nothing to do. Hang out at the nearest "idle" flag in the room.
                function: goIdle(creep)
    **/
    run: function(creep) {
        // Tell the creep what to do based on the action value, if null figure out what state to
        switch(creep.memory.action)
        {
            // Creep is gettings points
            case 'points':
                getPoints(creep);
                break;
            // Creep is chilling out
            case 'idle':
                goIdle(creep);
                break;
            // Creep doesn't have a state set (either new creep or previous job done). State manage
            default:
                setState(creep);
                break;
        }
    }
};

// getPoints(creep): Go upgrade the controller!
function getPoints(creep) {
    // Upgrade the controller

    // Do we have energy for the creep?
    if(creep.carry.energy < creep.carryCapacity && creep.memory.points==false)
    {
        // Go get some!
        getEnergy(creep);
    }

    // Else, upgrade the controller
    else
    {
        creep.memory.points=true;
        var output = creep.upgradeController(creep.room.controller);
        if(output == ERR_NOT_IN_RANGE)
        {
            creep.moveTo(creep.room.controller);
        }
        else if(output == ERR_NOT_ENOUGH_ENERGY)
        {
            creep.memory.points=false; // resets need for energy
        }
    }
}
// goIdle(creep): Nothing to do so chill at flag or default positions.
// *TODO* This needs to be unique to a room, so prefixing the name with the room name would be ideal.
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
            if(flagName.includes("upgrader"))
            {
                myCreep.memory.idleFlag=flagName;
                break;
            }
        }
    }
}

// setState(creep): Figure out what state the creep should be in now.
function setState(creep)
{
    // Is there more than 200 spare energy in the room?
    var roomEnergy = creep.room.energyAvailable;
    if(roomEnergy > 200) {
        // Find the closest storage container to the controller that has energy in it
        creep.memory.action="points";
    }
    else {
        creep.memory.action="idle";
    }
}

// getEnergy(creep): Logic for obtaining energy.
// controller note: this is based on controller position, not creep.
function getEnergy(creep)
{
    /*
        Energy logic: Find the closest energy containing item and use it
    */
    var theController = creep.room.controller;
    var creepEnergy = creep.carry.energy;
    var creepCapacity = creep.carry.capacity;
    var withdrawE = creepCapacity - creepEnergy;
    var container = creep.room.find(FIND_STRUCTURES, {
        filter: (i) => ((i.structureType==STRUCTURE_CONTAINER)
            && (i.store['energy'] > 0))
    });
    var energyStorage = creep.room.find(FIND_STRUCTURES, {
        filter: (i) => ((i.structureType==STRUCTURE_SPAWN || i.structureType==STRUCTURE_STORAGE)
            && (i.energy > 0))
    });
    // Now that energy storage is identified, loop through the array to find the closest energy storage
    var i=0;
    var winner_index=0;
    var lowest=null;
    var dist=0;
    if(container.length)
    {
        while(i<container.length)
        {
            dist = mapDistance(creep,container[i]);
            console.log("Container["+i+"] distance: " + dist);
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
        console.log("Container["+winner_index+"] chosen winner: " + lowest);
        if(creep.withdraw(container[winner_index],RESOURCE_ENERGY,withdrawE) == ERR_NOT_IN_RANGE)
        {
            creep.moveTo(container[winner_index]);
        }
    }
    else
    {
        if(creep.withdraw(energyStorage[0],RESOURCE_ENERGY,withdrawE) == ERR_NOT_IN_RANGE)
        {
            creep.moveTo(energyStorage[0]);
        }
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

module.exports = roleController;