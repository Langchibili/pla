function validate(data:any) {
  if(data.profile_version!==undefined && !/^\d+\.\d+\.\d+([+-][a-z0-9.-]+)?$/i.test(String(data.profile_version))) throw new Error('profile_version should use semantic version format, e.g. 1.0.0');
  const pitch=data.pitch_spec;
  if(pitch && typeof pitch==='object') {
    for(const key of ['lengthM','widthM','goalWidthM','goalHeightM']) if(pitch[key]!==undefined && (!Number.isFinite(Number(pitch[key]))||Number(pitch[key])<=0)) throw new Error(`physics pitch ${key} must be positive`);
  }
  const ball=data.ball_spec;
  if(ball && typeof ball==='object') {
    for(const key of ['radiusM','massKg','gravityMps2','airDensity','dragCoefficient','tickRateHz','substepsPerTick']) if(ball[key]!==undefined && (!Number.isFinite(Number(ball[key]))||Number(ball[key])<=0)) throw new Error(`physics ball ${key} must be positive`);
  }
}
export default { beforeCreate(event:any){validate(event.params.data??{});},beforeUpdate(event:any){validate(event.params.data??{});} };
