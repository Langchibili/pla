export default {
  beforeCreate(event:any) { const value=event.params.data?.code; if(value!==undefined) { const code=String(value).trim().toUpperCase(); if(!/^[A-Z]{3}$/.test(code)) throw new Error('Currency code must be a three-letter ISO code'); event.params.data.code=code; } },
  beforeUpdate(event:any) { const value=event.params.data?.code; if(value!==undefined) { const code=String(value).trim().toUpperCase(); if(!/^[A-Z]{3}$/.test(code)) throw new Error('Currency code must be a three-letter ISO code'); event.params.data.code=code; } },
};
