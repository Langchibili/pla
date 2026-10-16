const GOALKEEPER_KEYS = new Set(['reflexes','diving','handling','kicking','throwing','gkPositioning','oneOnOnes','commandOfArea','aerialReach','penaltySaving','sweepingSpeed']);
function validate(data:any) {
  if(data.display_position_number!==undefined && !/^P-[1-9][0-9]?$/.test(String(data.display_position_number))) throw new Error('MVP player labels must use the P-1, P-2 … P-99 format');
  if(data.current_attributes && typeof data.current_attributes==='object' && !Array.isArray(data.current_attributes)) {
    for(const [key,value] of Object.entries(data.current_attributes)) if(!Number.isFinite(Number(value))||Number(value)<1||Number(value)>100) throw new Error(`Player attribute ${key} must be between 1 and 100`);
    const budget=['sprintSpeed','acceleration','agility','dribbling'].reduce((sum,key)=>sum+Number(data.current_attributes[key]??0),0);
    if(data.player_tier!=='elite' && budget>360) throw new Error('Player stat budget exceeds the standard-card budget');
    if(data.primary_position==='GK') for(const [key,value] of Object.entries(data.current_attributes)) if(!GOALKEEPER_KEYS.has(key) && Number(value)>55) throw new Error(`Goalkeepers' outfield attribute ${key} cannot exceed 55`);
  }
}
export default { beforeCreate(event:any){validate(event.params.data??{});}, beforeUpdate(event:any){validate(event.params.data??{});} };
