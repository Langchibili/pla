const GOALKEEPER_KEYS = new Set(['reflexes','diving','handling','kicking','throwing','positioning','gkPositioning','oneOnOnes','commandOfArea','aerialReach','penaltySaving','sweepingSpeed']);
function validate(data:any) {
  if(data.position_number!==undefined && (!Number.isInteger(Number(data.position_number)) || Number(data.position_number)<1 || Number(data.position_number)>99)) throw new Error('Player position_number must be an integer between 1 and 99');
  if(data.height_cm!==undefined && (!Number.isInteger(Number(data.height_cm)) || Number(data.height_cm)<160 || Number(data.height_cm)>205)) throw new Error('Player height must be between 160 and 205 cm');
  if(data.weight_kg!==undefined && (!Number.isInteger(Number(data.weight_kg)) || Number(data.weight_kg)<55 || Number(data.weight_kg)>100)) throw new Error('Player weight must be between 55 and 100 kg');
  if(data.height_cm!==undefined && data.weight_kg!==undefined) { const expected=Number(data.height_cm)-100; if(Number(data.weight_kg)<expected*0.75 || Number(data.weight_kg)>expected*1.25) throw new Error('Player weight must be within ±25% of the configured height-based reference (height_cm - 100 kg)'); }
  const attrs=data.attributes;
  if(attrs && typeof attrs==='object' && !Array.isArray(attrs)) {
    for(const [key,value] of Object.entries(attrs)) if(!Number.isFinite(Number(value)) || Number(value)<1 || Number(value)>100) throw new Error(`Player attribute ${key} must be between 1 and 100`);
    const core=['sprintSpeed','acceleration','agility','dribbling'];
    const budget=core.reduce((sum,key)=>sum+Number(attrs[key]??0),0);
    if(data.premium_tier!=='elite' && budget>360) throw new Error('Player stat budget exceeds 360 across sprintSpeed, acceleration, agility and dribbling; elite cards may exceed it');
    if(data.primary_position==='GK') {
      for(const [key,value] of Object.entries(attrs)) if(!GOALKEEPER_KEYS.has(key) && Number(value)>55) throw new Error(`Goalkeepers' outfield attribute ${key} cannot exceed 55`);
    }
  }
  const gk=data.goalkeeper_attributes;
  if(gk && typeof gk==='object' && !Array.isArray(gk)) for(const [key,value] of Object.entries(gk)) if(!Number.isFinite(Number(value))||Number(value)<1||Number(value)>100) throw new Error(`Goalkeeper attribute ${key} must be between 1 and 100`);
}
export default { beforeCreate(event:any){validate(event.params.data??{});}, beforeUpdate(event:any){validate(event.params.data??{});} };
