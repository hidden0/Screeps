var roleBuilder = {
    /** @param {Creep} creep **/
    /***
        Description: To maintain the hive. The builder ensures all buildings are constructed, and walls maintained.

        Logic Flow (priority by number with 1 being highest priority)
            - 1) Wall upkeep. The spawn will hold a value for wallStr in memory, and this should be the
                minimum wall strength of all walls in the current room. Maintain this first!
                creep.memory.action = 'walls';
            - 2) Constructions sites. The builder, if not busy with walls, will build construction sites if they exist.
                creep.memory.action = 'sites';
            - 3) Chill out at the builder flag (idle mode). Just be ready for scenario 1 or 2.
                creep.memory.action = 'idle';
    ***/
    run: function(creep) {
        // Tell the creep what to do based on the action value, if null figure out what state to
        switch(creep.memory.action)
        {
            // Creep is reinforcing walls
            case 'walls':
                reinforceWalls(creep);
                break;
            // Creep is building construction sites
            case 'sites':
                buildSites(creep);
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

module.exports = roleBuilder;

// Methods region

// reinforceWalls(creep): Find a wall that is below target strength and reinforce.
function reinforceWalls(creep)
{
    var walls;
    var wallStr = 500; // default wall strength so nothing is ever at 1
    var targetWall; // The wall this creep is currently working on
    if(Game.spawns['Spawn1'].memory.wallStr!=null)
    {
        wallStr = Game.spawn['Spawn1'].memory.wallStr;
    }
    // Do we have energy for the creep?
    if(creep.energy < creep.carry.capacity)
    {
        // Go get some!
        getEnergy(creep);
    }
    // If we do have energy, great! Fix walls
    else
    {
        // Does the creep have a target already?
        if(creep.memory.targetWall!=null)
        {
            // Repair the wall to the necessary strength
            targetWall = Game.getObjectById(creep.memory.targetWall);
            if(creep.repair(targetWall) == ERR_NOT_IN_RANGE)
            {
                creep.moveTo(targetWall);
            }
            // Remember to unset this target from memory when we hit our target strength
            if(targetWall.hits >= wallStr)
            {
                creep.memory.targetWall=null;
            }
        }
        // Creep doesn't have a target, so find the closest one and keep it in memory
        else
        {
            // Find all walls and store them in memory
            walls = creep.room.findClosest(FIND_STRUCTURES, {
                filter: (i) => (i.hits < (wallStr) && i.structureType==STRUCTURE_WALL)
            });

            // Set the target
            creep.memory.targetWall = walls[0];
        }
    }
}
// buildSites(creep): No walls to be built, so build sites if they exist.
function buildSites(creep)
{
    var constructionSites = null; // Assume no sites every tick
}
// goIdle(creep): Nothing to do so chill at flag or default positions.
function goIdle(creep)
{
    var idlePos = null; // Assume there is no flag set for an idle position
}
// setState(creep): Figure out what state the creep should be in now.
function setState(creep)
{

}
// getEnergy(creep): Logic for obtaining energy.
function getEnergy(creep)
{
    /*
        Energy logic: Find the closest energy containing item and use it
    */
    var creepEnergy = creep.carry.energy;
    var creepCapacity = creep.carry.capacity;
    var withdrawE = creepCapacity - creepEnergy;
    var energyStorage = creep.room.findClosest(FIND_STRUCTURES, {
        filter: (i) => ((i.structureType==STRUCTURE_SPAWN || i.structureType==STRUCTURE_CONTAINER || i.structureType==STRUCTURE_STORAGE)
            && i.energy > 0)
    });
    if(creep.withdraw(energyStorage[0],RESOURCE_ENERGY,withdrawE) == ERR_NOT_IN_RANGE)
    {
        creep.moveTo(energyStorage[0]);
    }
}