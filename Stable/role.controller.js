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
    if(creep.carry.energy < creep.carryCapacity)
    {
        // Go get some!
        getEnergy(creep);
    }

    // Else, upgrade the controller
    else
    {
        if(creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE)
        {
            creep.moveTo(creep.room.controller);
        }
    }
}
// goIdle(creep): Nothing to do so chill at flag or default positions.
// *TODO* This needs to be unique to a room, so prefixing the name with the room name would be ideal.
function goIdle(creep)
{
    if(Game.flags['idle'])
    {
        creep.moveTo(Game.flags['idle']);
    }
    else
    {
        creep.moveTo((creep.room.controller.pos.x+10), creep.room.controller.pos.y+10);
    }

    // Check to see if we need to go idle again
    var roomEnergy = creep.room.energyAvailable;
    if(roomEnergy > 200) {
        // Find the closest storage container to the controller that has energy in it
        creep.memory.action=null;
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
    var energyStorage = creep.room.find(FIND_STRUCTURES, {
        filter: (i) => ((i.structureType==STRUCTURE_SPAWN || i.structureType==STRUCTURE_CONTAINER || i.structureType==STRUCTURE_STORAGE)
            && i.energy > 0)
    });
    if(creep.withdraw(energyStorage[0],RESOURCE_ENERGY,withdrawE) == ERR_NOT_IN_RANGE)
    {
        creep.moveTo(energyStorage[0]);
    }
}

module.exports = roleController;