function normaliseCode(value: unknown, label: string, maxLength: number) {
  if (typeof value !== 'string') return;
  const code = value.trim().toUpperCase();
  if (code.length < 2 || code.length > maxLength || !/^[A-Z0-9]+$/.test(code)) throw new Error(`${label} must be an uppercase ISO-style code`);
  return code;
}
export default {
  beforeCreate(event:any) {
    const data=event.params.data??{};
    if(data.iso_code!==undefined) data.iso_code=normaliseCode(data.iso_code,'Country iso_code',3);
    if(data.name!==undefined && typeof data.name==='string') data.name=data.name.trim();
    if(data.dial_code!==undefined && typeof data.dial_code==='string') data.dial_code=data.dial_code.trim();
  },
  beforeUpdate(event:any) {
    const data=event.params.data??{};
    if(data.iso_code!==undefined) data.iso_code=normaliseCode(data.iso_code,'Country iso_code',3);
    if(data.name!==undefined && typeof data.name==='string') data.name=data.name.trim();
  },
};
